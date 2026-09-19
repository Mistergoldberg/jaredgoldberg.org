#!/usr/bin/env python3
"""QA-only release operations. Executed over SSH stdin; never alters production current."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from datetime import datetime, timezone

ROOT = Path('/var/www/jaredgoldberg.org')
ID = re.compile(r'^(?:baseline-)?\d{8}T\d{6}Z-[a-f0-9]{12}$')

class Releases:
    def __init__(self, root=ROOT):
        self.root = Path(root)
        self.releases = self.root / 'releases'
        self.current = self.root / 'qa-current'
        self.state = self.root / 'shared' / 'qa'

    def path(self, release):
        if not ID.fullmatch(release):
            raise ValueError('Invalid QA release ID')
        path = self.releases / release
        if path.is_symlink() or path.resolve() != path:
            raise ValueError('Release must be a direct directory, without symlink parents')
        return path

    def target(self):
        if not self.current.exists() and not self.current.is_symlink():
            return None
        if not self.current.is_symlink():
            raise ValueError('qa-current must be a symlink')
        path = self.current.resolve(strict=True)
        if path.parent != self.releases or self.path(path.name) != path:
            raise ValueError('Unexpected QA target')
        return path.name

    def acquire(self, token):
        self.state.mkdir(parents=True, exist_ok=True, mode=0o700)
        lock = self.state / 'lock'
        lock.mkdir(mode=0o700)  # Refuses an existing deployment lock.
        (lock / 'owner').write_text(token)

    def lock(self, token):
        if (self.state / 'lock' / 'owner').read_text() != token:
            raise ValueError('Deployment lock mismatch')

    def unlock(self, token):
        self.lock(token)
        (self.state / 'lock' / 'owner').unlink()
        (self.state / 'lock').rmdir()

    def prepare(self, release):
        self.releases.mkdir(exist_ok=True)
        self.path(release).mkdir(mode=0o755)  # Never reuse/overwrite a release.

    def validate(self, release):
        path = self.path(release)
        if (self.root / 'current').resolve() == path:
            raise ValueError('QA must not share the production target')
        manifest = json.loads((path / 'artifact-manifest.json').read_text())
        sha = manifest['gitSha']
        if not re.fullmatch(r'[a-f0-9]{40}', sha) or not release.endswith(sha[:12]):
            raise ValueError('Release SHA mismatch')
        release_info = json.loads((path / 'release.json').read_text())
        if release_info != {'site': 'jaredgoldberg.org', 'environment': 'qa', 'gitSha': sha}:
            raise ValueError('Not a QA artifact')
        actual = set()
        for file in path.rglob('*'):
            if file.is_symlink():
                raise ValueError('Symlink inside release')
            if file.is_file():
                actual.add(str(file.relative_to(path)))
        if actual != set(manifest['files']) | {'artifact-manifest.json'}:
            raise ValueError('Unexpected/missing release files')
        for name, expected in manifest['files'].items():
            if not re.fullmatch(r'(?:index\.html|robots\.txt|favicon\.svg|release\.json|assets/[\w.-]+\.(?:css|js)|fonts/OFL\.txt|fonts/[\w.-]+\.(?:woff2?|ttf|otf))', name):
                raise ValueError('Invalid artifact filename')
            if hashlib.sha256((path / name).read_bytes()).hexdigest() != expected:
                raise ValueError('Artifact checksum mismatch: ' + name)
        if 'Disallow: /' not in (path / 'robots.txt').read_text():
            raise ValueError('QA robots policy missing')
        if 'noindex, nofollow' not in (path / 'index.html').read_text():
            raise ValueError('QA HTML robots policy missing')
        return manifest

    def seal(self, release, manifest_hash):
        self.validate(release)
        path = self.path(release)
        if hashlib.sha256((path / 'artifact-manifest.json').read_bytes()).hexdigest() != manifest_hash:
            raise ValueError('Uploaded manifest differs from local artifact')
        for file in path.rglob('*'):
            file.chmod(0o555 if file.is_dir() else 0o444)
        path.chmod(0o555)

    def switch(self, release, expected, bootstrap=False):
        if self.target() != expected:
            raise ValueError('QA changed since prevalidation')
        if expected is not None:
            self.validate(expected)
        elif not bootstrap:
            raise ValueError('No prevalidated rollback target; bootstrap first')
        self.validate(release)
        if bootstrap and not release.startswith('baseline-'):
            raise ValueError('First target must be an explicit QA baseline')
        temporary = self.root / ('.qa-current-' + str(os.getpid()))
        try:
            temporary.symlink_to(self.path(release))
            os.replace(temporary, self.current)
        finally:
            temporary.unlink(missing_ok=True)
        self.record('activate', expected, release)

    def remove_failed_bootstrap(self, expected):
        if self.target() != expected or not expected.startswith('baseline-'):
            raise ValueError('Bootstrap cleanup target mismatch')
        self.current.unlink()  # Return to previous absent QA root, never production.
        self.record('bootstrap-failed', expected, None)

    def record(self, action, previous, current):
        self.state.mkdir(parents=True, exist_ok=True, mode=0o700)
        with (self.state / 'ledger.jsonl').open('a') as stream:
            stream.write(json.dumps({'at':datetime.now(timezone.utc).isoformat(), 'action':action, 'previous':previous, 'current':current})+'\n')


def main():
    action, token, *args = sys.argv[1:]
    if not re.fullmatch(r'[a-f0-9]{32}', token):
        raise ValueError('Invalid lock token')
    store = Releases()
    if action == 'acquire':
        store.acquire(token)
    else:
        store.lock(token)
        if action == 'inspect':
            target = store.target()
            if target: store.validate(target)
            print(json.dumps({'previous':target,'production':str((ROOT/'current').resolve())}))
        elif action == 'eligible':
            entries=[json.loads(line) for line in (store.state/'ledger.jsonl').read_text().splitlines()]
            if not any(item['action'] in ('verified','baseline-verified') and item['current']==args[0] for item in entries):
                raise ValueError('Rollback release has never passed public verification')
            store.validate(args[0])
        elif action == 'prepare': store.prepare(args[0])
        elif action == 'seal': store.seal(*args)
        elif action == 'validate': print(json.dumps(store.validate(args[0])))
        elif action == 'switch': store.switch(args[0],None if args[1]=='none' else args[1],len(args)>2 and args[2]=='bootstrap')
        elif action == 'remove-bootstrap': store.remove_failed_bootstrap(args[0])
        elif action == 'record': store.record(args[0],None if args[1]=='none' else args[1],args[2])
        elif action == 'unlock': store.unlock(token)
        else: raise ValueError('Unknown operation')

if __name__ == '__main__': main()
