import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest


spec=importlib.util.spec_from_file_location('deploy_qa',Path(__file__).resolve().parents[1]/'scripts/deploy-qa.py')
deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)


class RepositoryGateTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        root=Path(self.tmp.name)
        self.remote=root/'remote.git'
        self.repo=root/'repo'
        self.git_run('init','--bare',str(self.remote),cwd=root)
        self.git_run('init','-b','main',str(self.repo),cwd=root)
        self.git_run('config','user.name','QA Test',cwd=self.repo)
        self.git_run('config','user.email','qa@example.invalid',cwd=self.repo)
        (self.repo/'site.txt').write_text('baseline\n')
        self.git_run('add','site.txt',cwd=self.repo)
        self.git_run('commit','-m','baseline',cwd=self.repo)
        self.base=self.output('rev-parse','HEAD',cwd=self.repo)
        self.git_run('remote','add','origin',str(self.remote),cwd=self.repo)
        self.git_run('push','-u','origin','main',cwd=self.repo)
        self.git_run('switch','-c','ops/feature-branch-qa-deploy',cwd=self.repo)
        (self.repo/'site.txt').write_text('candidate\n')
        self.git_run('commit','-am','candidate',cwd=self.repo)
        self.candidate=self.output('rev-parse','HEAD',cwd=self.repo)
        self.git_run('push','-u','origin','ops/feature-branch-qa-deploy',cwd=self.repo)

    def tearDown(self):
        self.tmp.cleanup()

    def git_run(self,*args,cwd):
        return subprocess.run(['git',*args],cwd=cwd,check=True,capture_output=True,text=True)

    def output(self,*args,cwd):
        return subprocess.check_output(['git',*args],cwd=cwd,text=True).strip()

    def gate(self,sha=None,branch='ops/feature-branch-qa-deploy',base=None):
        return deploy.repository_gate(sha or self.candidate,branch,base or self.base,
            root=self.repo,expected_remote=str(self.remote))

    def test_accepts_clean_pushed_feature_tip_and_unchanged_main(self):
        result=self.gate()
        self.assertEqual(result,{'sourceRef':'refs/heads/ops/feature-branch-qa-deploy',
            'sourceRefSha':self.candidate,'expectedMainSha':self.base,
            'observedMainSha':self.base})

    def test_rejects_unpushed_candidate(self):
        (self.repo/'site.txt').write_text('unpushed\n')
        self.git_run('commit','-am','unpushed',cwd=self.repo)
        with self.assertRaisesRegex(ValueError,'Remote source branch tip'):
            self.gate(sha=self.output('rev-parse','HEAD',cwd=self.repo))

    def test_rejects_remote_main_drift(self):
        self.git_run('--git-dir',str(self.remote),'update-ref','refs/heads/main',self.candidate,cwd=self.repo)
        with self.assertRaisesRegex(ValueError,'Remote main changed'):
            self.gate()

    def test_rejects_dirty_worktree_and_wrong_branch(self):
        (self.repo/'site.txt').write_text('dirty\n')
        with self.assertRaisesRegex(ValueError,'status --porcelain'):
            self.gate()
        self.git_run('restore','site.txt',cwd=self.repo)
        self.git_run('switch','main',cwd=self.repo)
        with self.assertRaisesRegex(ValueError,'branch --show-current'):
            self.gate(sha=self.base)

    def test_rejects_candidate_outside_expected_main_history(self):
        self.git_run('switch','--orphan','ops/orphan',cwd=self.repo)
        (self.repo/'site.txt').unlink(missing_ok=True)
        (self.repo/'orphan.txt').write_text('orphan\n')
        self.git_run('add','orphan.txt',cwd=self.repo)
        self.git_run('commit','-m','orphan',cwd=self.repo)
        orphan=self.output('rev-parse','HEAD',cwd=self.repo)
        self.git_run('push','-u','origin','ops/orphan',cwd=self.repo)
        with self.assertRaisesRegex(ValueError,'does not descend'):
            self.gate(sha=orphan,branch='ops/orphan')

    def test_preserves_clean_main_manual_rollback_gate(self):
        self.git_run('switch','main',cwd=self.repo)
        self.assertIsNone(deploy.repository_gate(self.base,rollback=True,root=self.repo,
            expected_remote=str(self.remote)))


if __name__=='__main__':
    unittest.main()
