import importlib.util
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('release',Path(__file__).resolve().parents[1]/'ops/qa-release.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
verify_spec=importlib.util.spec_from_file_location('verify_qa',Path(__file__).resolve().parents[1]/'scripts/verify-qa.py')
verify_module=importlib.util.module_from_spec(verify_spec);verify_spec.loader.exec_module(verify_module)
SHA='a'*40
BASE='baseline-20260919T020000Z-'+SHA[:12]
NEXT='20260919T020001Z-'+SHA[:12]

class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.root=Path(self.tmp.name).resolve()
        self.store=module.Releases(self.root)
        self.production=self.root/'production';self.production.mkdir()
        (self.root/'current').symlink_to(self.production)
        self.store.acquire('a'*32)
    def tearDown(self):
        for path in self.root.rglob('*'):
            if not path.is_symlink(): path.chmod(0o755 if path.is_dir() else 0o644)
        self.tmp.cleanup()
    def artifact(self,identifier,extra_files=None):
        self.store.prepare(identifier)
        path=self.store.path(identifier)
        (path/'index.html').write_text('<meta name="robots" content="noindex, nofollow">QA')
        (path/'robots.txt').write_text('User-agent: *\nDisallow: /\n')
        (path/'release.json').write_text(json.dumps({'site':'jaredgoldberg.org','environment':'qa','gitSha':SHA}))
        for name, content in (extra_files or {}).items():
            file=path/name;file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(content)
        manifest={'gitSha':SHA,'files':{str(file.relative_to(path)):hashlib.sha256(file.read_bytes()).hexdigest() for file in path.rglob('*') if file.is_file()}}
        (path/'artifact-manifest.json').write_text(json.dumps(manifest))
        self.store.seal(identifier,hashlib.sha256((path/'artifact-manifest.json').read_bytes()).hexdigest())
        return path
    def test_atomic_release_and_prevalidated_rollback_preserve_production(self):
        self.artifact(BASE);self.artifact(NEXT)
        self.store.switch(BASE,None,bootstrap=True)
        self.store.switch(NEXT,BASE)
        self.assertEqual(self.store.target(),NEXT)
        self.store.switch(BASE,NEXT)
        self.assertEqual(self.store.target(),BASE)
        self.assertEqual((self.root/'current').resolve(),self.production)
        ledger=[json.loads(line) for line in (self.store.state/'ledger.jsonl').read_text().splitlines()]
        self.assertEqual(ledger[-1]['previous'],NEXT)
        self.assertEqual(ledger[-1]['current'],BASE)
    def test_missing_rollback_or_stale_expected_target_refused(self):
        self.artifact(BASE);self.artifact(NEXT)
        with self.assertRaises(ValueError):self.store.switch(NEXT,None)
        self.store.switch(BASE,None,bootstrap=True)
        with self.assertRaises(ValueError):self.store.switch(NEXT,NEXT)
        self.assertEqual(self.store.target(),BASE)
    def test_corruption_and_unexpected_files_refused(self):
        path=self.artifact(BASE)
        path.chmod(0o755);(path/'index.html').chmod(0o644)
        (path/'index.html').write_text('corrupt')
        with self.assertRaises(ValueError):self.store.validate(BASE)
    def test_sealed_modes_and_overwrite_refused(self):
        path=self.artifact(BASE)
        self.assertEqual(path.stat().st_mode&0o777,0o555)
        self.assertEqual((path/'index.html').stat().st_mode&0o777,0o444)
        with self.assertRaises(FileExistsError):self.store.prepare(BASE)
    def test_release_accepts_static_image_assets(self):
        path=self.artifact(BASE,{'images/above-the-fold-prototype.png':b'png fixture'})
        self.assertEqual((path/'images/above-the-fold-prototype.png').stat().st_mode&0o777,0o444)
    def test_symlinks_wrong_manifest_hash_and_wrong_sha_refused(self):
        path=self.artifact(BASE)
        with self.assertRaises(ValueError):self.store.seal(BASE,'0'*64)
        path.chmod(0o755);(path/'leak').symlink_to(self.production)
        with self.assertRaises(ValueError):self.store.validate(BASE)
        with self.assertRaises(ValueError):self.store.path('../current')
    def test_lock_exclusion_and_failed_bootstrap_returns_to_absence(self):
        with self.assertRaises(FileExistsError):self.store.acquire('b'*32)
        with self.assertRaises(ValueError):self.store.unlock('b'*32)
        self.artifact(BASE);self.store.switch(BASE,None,bootstrap=True)
        self.store.remove_failed_bootstrap(BASE)
        self.assertIsNone(self.store.target())
        self.assertEqual((self.root/'current').resolve(),self.production)
        self.store.unlock('a'*32)

    def test_feature_deployment_provenance_is_validated_and_recorded(self):
        self.artifact(BASE);path=self.artifact(NEXT)
        self.store.switch(BASE,None,bootstrap=True)
        manifest_hash=hashlib.sha256((path/'artifact-manifest.json').read_bytes()).hexdigest()
        values=[NEXT,SHA,manifest_hash,'refs/heads/ops/feature-branch-qa-deploy',SHA,'b'*40,'b'*40]
        provenance=self.store.provenance(values)
        self.store.switch(NEXT,BASE,provenance=provenance)
        entry=json.loads((self.store.state/'ledger.jsonl').read_text().splitlines()[-1])
        self.assertEqual(entry['sourceRef'],'refs/heads/ops/feature-branch-qa-deploy')
        self.assertEqual(entry['sourceRefSha'],SHA)
        self.assertEqual(entry['manifestSha256'],manifest_hash)
        with self.assertRaises(ValueError):
            self.store.provenance([*values[:-1],'c'*40])


class RollbackGateTests(unittest.TestCase):
    def test_failed_public_gate_restores_and_verifies_previous(self):
        spec=importlib.util.spec_from_file_location('deploy_qa',Path(__file__).resolve().parents[1]/'scripts/deploy-qa.py')
        deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)
        state={'target':BASE};calls=[]
        def remote(action,*args):
            calls.append((action,*args))
            if action=='switch':
                self.assertEqual(state['target'],args[1]);state['target']=args[0]
            if action=='inspect':return json.dumps({'previous':state['target']})
        class Verifier:
            def verify(self,directory):
                if directory=='candidate':raise ValueError('Public bytes mismatch')
                calls.append(('verified-previous',))
        with self.assertRaises(ValueError):deploy.activate_with_rollback(remote,Verifier(),NEXT,BASE,'candidate','previous')
        self.assertEqual(state['target'],BASE)
        self.assertIn(('verified-previous',),calls)
        self.assertIn(('record','automatic-rollback',NEXT,BASE),calls)
    def test_browser_failure_after_http_success_rolls_back(self):
        spec=importlib.util.spec_from_file_location('deploy_qa',Path(__file__).resolve().parents[1]/'scripts/deploy-qa.py')
        deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)
        state={'target':BASE};calls=[]
        def remote(action,*args):
            calls.append((action,*args))
            if action=='switch':state['target']=args[0]
            if action=='inspect':return json.dumps({'previous':state['target']})
        class Verifier:
            def verify(self,directory):calls.append(('http-verified',directory))
        def browser():raise ValueError('Browser accessibility gate failed')
        with self.assertRaises(ValueError):deploy.activate_with_rollback(remote,Verifier(),NEXT,BASE,'candidate','previous',browser)
        self.assertEqual(state['target'],BASE)
        self.assertIn(('http-verified','previous'),calls)
        self.assertNotIn(('record','verified',BASE,NEXT),calls)
        self.assertIn(('record','automatic-rollback',NEXT,BASE),calls)
    def test_lost_activation_response_is_reconciled(self):
        spec=importlib.util.spec_from_file_location('deploy_qa',Path(__file__).resolve().parents[1]/'scripts/deploy-qa.py')
        deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)
        state={'target':BASE}
        def remote(action,*args):
            if action=='switch':
                state['target']=args[0]
                if args[0]==NEXT:raise OSError('SSH response lost after rename')
            if action=='inspect':return json.dumps({'previous':state['target']})
        class Verifier:
            def verify(self,directory):pass
        with self.assertRaises(OSError):deploy.activate_with_rollback(remote,Verifier(),NEXT,BASE,'candidate','previous')
        self.assertEqual(state['target'],BASE)


class NginxTemplateTests(unittest.TestCase):
    def test_qa_vhost_allows_image_files_and_preserves_noarchive(self):
        text=(Path(__file__).resolve().parents[1]/'ops/nginx/qa.jaredgoldberg.org.conf').read_text()
        self.assertIn(r'location ~ ^/images/[a-zA-Z0-9_.-]+\.(png|jpe?g|webp)$ { try_files $uri =404; }',text)
        for route in verify_module.PRETTY_ROUTES:
            self.assertIn(f'location = {route}',text)
        self.assertEqual(text.count('X-Robots-Tag "noindex, nofollow, noarchive"'),3)


class PublicHtmlPolicyTests(unittest.TestCase):
    def test_only_approved_jaredgoldberg_urls_are_allowed(self):
        verify_module.verify_html_policy(' '.join(sorted(verify_module.APPROVED_EXTERNAL_URLS)))
        with self.assertRaisesRegex(ValueError,'Unexpected production URL'):
            verify_module.verify_html_policy('https://jaredgoldberg.ca/unverified/')
        with self.assertRaisesRegex(ValueError,'Unexpected production URL'):
            verify_module.verify_html_policy('https://jaredgoldberg.org/')

    def test_canonical_remains_forbidden(self):
        with self.assertRaisesRegex(ValueError,'Unexpected canonical URL'):
            verify_module.verify_html_policy('<link rel="canonical" href="https://example.com/">')


if __name__=='__main__':unittest.main()
