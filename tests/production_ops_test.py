import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('production_release',ROOT/'ops/production-release.py')
release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)
deploy_spec=importlib.util.spec_from_file_location('deploy_production',ROOT/'scripts/deploy-production.py')
deploy=importlib.util.module_from_spec(deploy_spec);deploy_spec.loader.exec_module(deploy)

SHA='a'*40
LEGACY='20260918213922'
LEGACY_HASH=hashlib.sha256(b'legacy homepage').hexdigest()
CANDIDATE='20260925T230000Z-'+SHA[:12]

class ProductionReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name).resolve()
        legacy=self.root/'releases'/LEGACY;legacy.mkdir(parents=True);(legacy/'index.html').write_bytes(b'legacy homepage')
        (self.root/'current').symlink_to(legacy)
        self.store=release.Releases(self.root);self.store.acquire('a'*32)

    def tearDown(self):
        for path in self.root.rglob('*'):
            if not path.is_symlink(): path.chmod(0o755 if path.is_dir() else 0o644)
        self.tmp.cleanup()

    def candidate(self,extra=None):
        self.store.prepare(CANDIDATE);path=self.store.path(CANDIDATE)
        files={'index.html':b'production','robots.txt':b'User-agent: *\nAllow: /\n'}
        files.update(extra or {})
        metadata={'site':'jaredgoldberg.org','environment':'production','gitSha':SHA,
            'buildId':CANDIDATE,'artifactManifest':'artifact-manifest.json'}
        files['release.json']=(json.dumps(metadata)+'\n').encode()
        for name,content in files.items():
            target=path/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(content)
        manifest={'schema':2,'site':'jaredgoldberg.org','environment':'production','gitSha':SHA,'buildId':CANDIDATE,
            'files':{name:hashlib.sha256(content).hexdigest() for name,content in files.items()}}
        (path/'artifact-manifest.json').write_text(json.dumps(manifest))
        manifest_hash=hashlib.sha256((path/'artifact-manifest.json').read_bytes()).hexdigest()
        return path,manifest_hash

    def test_exact_sha_provenance_and_legacy_fingerprint(self):
        path,manifest_hash=self.candidate()
        self.store.seal(CANDIDATE,manifest_hash,LEGACY,LEGACY_HASH)
        provenance=self.store.provenance([CANDIDATE,SHA,manifest_hash,'refs/heads/main',SHA],LEGACY,LEGACY_HASH)
        self.store.switch(CANDIDATE,LEGACY,LEGACY,LEGACY_HASH,provenance)
        self.assertEqual(self.store.target(),CANDIDATE)
        with self.assertRaisesRegex(ValueError,'exact remote main'):
            self.store.provenance([CANDIDATE,SHA,manifest_hash,'refs/heads/feature',SHA],LEGACY,LEGACY_HASH)
        with self.assertRaisesRegex(ValueError,'homepage hash'):
            self.store.validate(LEGACY,LEGACY,'0'*64)

    def test_allowlist_and_mode_isolation_are_enforced(self):
        with self.assertRaisesRegex(ValueError,'filename'):
            path,manifest_hash=self.candidate({'images/above-the-fold-prototype.png':b'prototype'})
            self.store.seal(CANDIDATE,manifest_hash,LEGACY,LEGACY_HASH)

class AutomaticRollbackTests(unittest.TestCase):
    def test_failed_post_switch_verification_restores_previous(self):
        state={'target':LEGACY};calls=[]
        def remote(action,*args):
            calls.append((action,*args))
            if action=='switch':
                self.assertEqual(state['target'],args[1]);state['target']=args[0]
            if action=='inspect': return json.dumps({'current':state['target']})
        def fail(): raise ValueError('public route mismatch')
        with self.assertRaisesRegex(ValueError,'public route mismatch'):
            deploy.activate_with_rollback(remote,CANDIDATE,LEGACY,fail,lambda:calls.append(('previous-verified',)),
                [CANDIDATE,SHA,'b'*64,'refs/heads/main',SHA])
        self.assertEqual(state['target'],LEGACY)
        self.assertIn(('previous-verified',),calls)
        self.assertIn(('record','automatic-rollback',CANDIDATE,LEGACY),calls)

if __name__=='__main__': unittest.main()
