#!/usr/bin/env python3
"""Production release operations executed over SSH stdin."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from datetime import datetime, timezone

ROOT = Path('/var/www/jaredgoldberg.org')
NEW_ID = re.compile(r'^\d{8}T\d{6}Z-[a-f0-9]{12}$')
LEGACY_ID = re.compile(r'^\d{14}$')
PAGE_INDEXES = {
    'media-archives-and-memory/index.html',
    'community-service/index.html',
    'systems-and-institutions/index.html',
    'art/index.html',
}

class Releases:
    def __init__(self, root=ROOT):
        self.root = Path(root)
        self.releases = self.root / 'releases'
        self.current = self.root / 'current'
        self.state = self.root / 'shared' / 'production'

    def path(self, release):
        if not (NEW_ID.fullmatch(release) or LEGACY_ID.fullmatch(release)):
            raise ValueError('Invalid production release ID')
        path = self.releases / release
        if path.is_symlink() or path.resolve() != path:
            raise ValueError('Release must be a direct directory, without symlink parents')
        return path

    def target(self):
        if not self.current.is_symlink():
            raise ValueError('current must be a symlink')
        path = self.current.resolve(strict=True)
        if path.parent != self.releases or self.path(path.name) != path:
            raise ValueError('Unexpected production target')
        return path.name

    def acquire(self, token):
        self.state.mkdir(parents=True, exist_ok=True, mode=0o700)
        lock = self.state / 'lock'
        lock.mkdir(mode=0o700)
        (lock / 'owner').write_text(token)

    def lock(self, token):
        if (self.state / 'lock' / 'owner').read_text() != token:
            raise ValueError('Deployment lock mismatch')

    def unlock(self, token):
        self.lock(token)
        (self.state / 'lock' / 'owner').unlink()
        (self.state / 'lock').rmdir()

    def prepare(self, release):
        if not NEW_ID.fullmatch(release):
            raise ValueError('New releases require an exact-SHA release ID')
        self.releases.mkdir(exist_ok=True)
        self.path(release).mkdir(mode=0o755)

    def validate(self, release, legacy_release, legacy_index_hash):
        path = self.path(release)
        if LEGACY_ID.fullmatch(release):
            if release != legacy_release or not re.fullmatch(r'[a-f0-9]{64}', legacy_index_hash):
                raise ValueError('Legacy rollback identity mismatch')
            if hashlib.sha256((path / 'index.html').read_bytes()).hexdigest() != legacy_index_hash:
                raise ValueError('Legacy rollback homepage hash mismatch')
            return {'legacyRelease':release,'indexSha256':legacy_index_hash}
        manifest = json.loads((path / 'artifact-manifest.json').read_text())
        sha = manifest.get('gitSha')
        build_id = manifest.get('buildId')
        if (manifest.get('schema'),manifest.get('site'),manifest.get('environment')) != (2,'jaredgoldberg.org','production'):
            raise ValueError('Not a production artifact')
        if not re.fullmatch(r'[a-f0-9]{40}',sha or '') or not release.endswith(sha[:12]) or build_id != release:
            raise ValueError('Production release identity mismatch')
        expected_release = {'site':'jaredgoldberg.org','environment':'production','gitSha':sha,
            'buildId':build_id,'artifactManifest':'artifact-manifest.json'}
        if json.loads((path / 'release.json').read_text()) != expected_release:
            raise ValueError('Production metadata mismatch')
        actual=set()
        for file in path.rglob('*'):
            if file.is_symlink(): raise ValueError('Symlink inside release')
            if file.is_file(): actual.add(str(file.relative_to(path)))
        if actual != set(manifest['files']) | {'artifact-manifest.json'}:
            raise ValueError('Unexpected/missing production files')
        pattern=r'(?:index\.html|robots\.txt|favicon\.svg|release\.json|assets/[\w.-]+\.(?:css|js)|fonts/OFL\.txt|fonts/[\w.-]+\.(?:woff2?|ttf|otf))'
        for name, expected in manifest['files'].items():
            if name not in PAGE_INDEXES and not re.fullmatch(pattern,name):
                raise ValueError('Invalid production artifact filename')
            if hashlib.sha256((path/name).read_bytes()).hexdigest()!=expected:
                raise ValueError('Artifact checksum mismatch: '+name)
        if (path/'robots.txt').read_text() != 'User-agent: *\nAllow: /\n':
            raise ValueError('Production robots policy mismatch')
        for html in path.rglob('*.html'):
            if 'noindex' in html.read_text().lower() or 'nofollow' in html.read_text().lower():
                raise ValueError('QA robots policy leaked into production HTML')
        return manifest

    def seal(self, release, manifest_hash, legacy_release, legacy_index_hash):
        self.validate(release,legacy_release,legacy_index_hash)
        path=self.path(release)
        if hashlib.sha256((path/'artifact-manifest.json').read_bytes()).hexdigest()!=manifest_hash:
            raise ValueError('Uploaded manifest differs from local artifact')
        for file in path.rglob('*'): file.chmod(0o555 if file.is_dir() else 0o444)
        path.chmod(0o555)

    def provenance(self, values, legacy_release, legacy_index_hash):
        if len(values)!=5: raise ValueError('Incomplete production provenance')
        release,git_sha,manifest_hash,source_ref,source_ref_sha=values
        if not all(re.fullmatch(r'[a-f0-9]{40}',value) for value in (git_sha,source_ref_sha)):
            raise ValueError('Invalid provenance SHA')
        if source_ref!='refs/heads/main' or source_ref_sha!=git_sha:
            raise ValueError('Production source must be the exact remote main tip')
        if not re.fullmatch(r'[a-f0-9]{64}',manifest_hash): raise ValueError('Invalid manifest hash')
        manifest=self.validate(release,legacy_release,legacy_index_hash)
        actual=hashlib.sha256((self.path(release)/'artifact-manifest.json').read_bytes()).hexdigest()
        if manifest['gitSha']!=git_sha or actual!=manifest_hash: raise ValueError('Provenance mismatch')
        return {'releaseId':release,'gitSha':git_sha,'manifestSha256':manifest_hash,
            'sourceRef':source_ref,'sourceRefSha':source_ref_sha}

    def switch(self, release, expected, legacy_release, legacy_index_hash, provenance=None):
        if self.target()!=expected: raise ValueError('Production changed since prevalidation')
        self.validate(expected,legacy_release,legacy_index_hash)
        self.validate(release,legacy_release,legacy_index_hash)
        temporary=self.root/('.current-'+str(os.getpid()))
        try:
            temporary.symlink_to(self.path(release))
            os.replace(temporary,self.current)
        finally: temporary.unlink(missing_ok=True)
        self.record('activate',expected,release,provenance)

    def record(self, action, previous, current, provenance=None):
        self.state.mkdir(parents=True,exist_ok=True,mode=0o700)
        entry={'at':datetime.now(timezone.utc).isoformat(),'action':action,'previous':previous,'current':current}
        if provenance: entry.update(provenance)
        with (self.state/'ledger.jsonl').open('a') as stream: stream.write(json.dumps(entry)+'\n')

def main():
    legacy_release,legacy_hash,action,token,*args=sys.argv[1:]
    if not LEGACY_ID.fullmatch(legacy_release) or not re.fullmatch(r'[a-f0-9]{64}',legacy_hash):
        raise ValueError('Invalid preserved legacy rollback identity')
    if not re.fullmatch(r'[a-f0-9]{32}',token): raise ValueError('Invalid lock token')
    store=Releases()
    if action=='acquire': store.acquire(token);return
    store.lock(token)
    if action=='inspect':
        target=store.target();print(json.dumps({'current':target,'validated':store.validate(target,legacy_release,legacy_hash)}))
    elif action=='prepare': store.prepare(args[0])
    elif action=='seal': store.seal(args[0],args[1],legacy_release,legacy_hash)
    elif action=='validate': print(json.dumps(store.validate(args[0],legacy_release,legacy_hash)))
    elif action=='eligible':
        store.validate(args[0],legacy_release,legacy_hash)
        if NEW_ID.fullmatch(args[0]):
            ledger=store.state/'ledger.jsonl'
            entries=[json.loads(line) for line in ledger.read_text().splitlines()] if ledger.exists() else []
            if not any(item['action']=='verified' and item['current']==args[0] for item in entries):
                raise ValueError('Rollback release has never passed public verification')
    elif action=='switch':
        provenance=None
        if len(args)>2:
            if args[2]!='deploy': raise ValueError('Invalid switch mode')
            provenance=store.provenance(args[3:],legacy_release,legacy_hash)
        store.switch(args[0],args[1],legacy_release,legacy_hash,provenance)
    elif action=='record':
        provenance=store.provenance(args[3:],legacy_release,legacy_hash) if len(args)>3 else None
        store.record(args[0],args[1],args[2],provenance)
    elif action=='unlock': store.unlock(token)
    else: raise ValueError('Unknown operation')

if __name__=='__main__': main()
