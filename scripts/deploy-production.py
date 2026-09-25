#!/usr/bin/env python3
"""Build and verify an exact production commit; --apply performs a guarded switch."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tarfile
import tempfile
from datetime import datetime, timezone
import uuid

ROOT=Path(__file__).resolve().parent.parent
HOST='root@5.161.223.134'
REMOTE='/var/www/jaredgoldberg.org'
SSH=['ssh','-o','BatchMode=yes','-o','ConnectTimeout=10',HOST]
EXPECTED_REMOTE='https://github.com/Mistergoldberg/jaredgoldberg.org.git'
FULL_SHA=re.compile(r'[a-f0-9]{40}')
RELEASE_ID=re.compile(r'(?:\d{14}|\d{8}T\d{6}Z-[a-f0-9]{12})')

def run(args,**kwargs): return subprocess.run(args,check=True,**kwargs)
def git_output(*args,root=ROOT): return subprocess.check_output(['git','-C',str(root),*args],text=True).strip()

def remote_head(ref,root=ROOT):
    lines=[line.split('\t',1) for line in git_output('ls-remote','--heads','origin',ref,root=root).splitlines() if line]
    if len(lines)!=1 or lines[0][1]!=ref or not FULL_SHA.fullmatch(lines[0][0]):
        raise ValueError('Remote branch is missing or ambiguous: '+ref)
    return lines[0][0]

def repository_gate(sha,source_branch,expected_main_sha,apply=False,root=ROOT):
    if not FULL_SHA.fullmatch(sha) or not FULL_SHA.fullmatch(expected_main_sha): raise ValueError('Use full Git SHAs')
    checks=[(('rev-parse','HEAD'),sha),(('remote','get-url','origin'),EXPECTED_REMOTE),(('status','--porcelain'),''),
        (('branch','--show-current'),source_branch)]
    for command,expected in checks:
        if git_output(*command,root=root)!=expected: raise ValueError('Repository gate failed: git '+' '.join(command))
    source_ref='refs/heads/'+source_branch
    source_sha=remote_head(source_ref,root)
    main_sha=remote_head('refs/heads/main',root)
    if source_sha!=sha or main_sha!=expected_main_sha: raise ValueError('Authoritative remote ref moved')
    if subprocess.run(['git','-C',str(root),'merge-base','--is-ancestor',expected_main_sha,sha]).returncode:
        raise ValueError('Candidate does not descend from expected main')
    if apply and (source_branch!='main' or sha!=expected_main_sha):
        raise ValueError('Production apply requires the exact authoritative remote main tip')
    return {'sourceRef':source_ref,'sourceRefSha':source_sha,'expectedMainSha':expected_main_sha,'observedMainSha':main_sha}

def load(path,name):
    spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

def activate_with_rollback(remote,candidate,previous,verify_candidate,verify_previous,provenance):
    try:
        remote('switch',candidate,previous,'deploy',*provenance)
        verify_candidate()
        remote('record','verified',previous,candidate,*provenance)
    except BaseException:
        actual=json.loads(remote('inspect'))['current']
        if actual==candidate:
            remote('switch',previous,candidate)
            verify_previous()
            remote('record','automatic-rollback',candidate,previous)
        elif actual!=previous:
            raise RuntimeError('Unexpected production target during recovery; inspect server ledger')
        raise

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sha',required=True)
    parser.add_argument('--source-branch',required=True)
    parser.add_argument('--expected-main-sha',required=True)
    parser.add_argument('--expected-current-release',required=True)
    parser.add_argument('--legacy-release',required=True)
    parser.add_argument('--legacy-index-sha256',required=True)
    parser.add_argument('--apply',action='store_true')
    args=parser.parse_args()
    os.chdir(ROOT)
    if not RELEASE_ID.fullmatch(args.expected_current_release) or not re.fullmatch(r'\d{14}',args.legacy_release):
        parser.error('Use validated production release IDs')
    if not re.fullmatch(r'[a-f0-9]{64}',args.legacy_index_sha256): parser.error('Use the full legacy homepage SHA-256')
    source=repository_gate(args.sha,args.source_branch,args.expected_main_sha,args.apply)
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    release=stamp+'-'+args.sha[:12]
    out=ROOT/'artifacts'/('production-'+release)
    out.mkdir(parents=True,exist_ok=False)
    checkout_tmp=tempfile.TemporaryDirectory(prefix='jaredgoldberg-org-production-')
    checkout=Path(checkout_tmp.name)
    archive=run(['git','archive','--format=tar',args.sha],capture_output=True).stdout
    run(['tar','-xf','-','-C',str(checkout)],input=archive)
    run(['npm','ci','--no-audit','--no-fund'],cwd=checkout)
    qa_env={**os.environ,'BUILD_SHA':args.sha,'BUILD_ID':'qa-preflight-'+args.sha[:12]}
    run(['npm','test'],cwd=checkout,env=qa_env)
    production_env={**os.environ,'BUILD_SHA':args.sha,'BUILD_ID':release}
    run(['npm','run','test:production'],cwd=checkout,env=production_env)
    shutil.copytree(checkout/'dist',out/'site')
    if (checkout/'test-results').exists(): shutil.copytree(checkout/'test-results',out/'test-results')
    verifier=load(checkout/'scripts/verify-production.py','verify_production')
    manifest=verifier.verify_artifact(out/'site')
    manifest_hash=hashlib.sha256((out/'site/artifact-manifest.json').read_bytes()).hexdigest()

    # Safe local simulation uses the preserved legacy homepage fingerprint and the
    # same release-operation implementation that runs over SSH during an apply.
    operations=load(checkout/'ops/production-release.py','production_release')
    with tempfile.TemporaryDirectory(prefix='production-release-simulation-') as tmp:
        simulation_root=Path(tmp);legacy=simulation_root/'releases'/args.legacy_release
        legacy.mkdir(parents=True);shutil.copy2(ROOT/'index.html',legacy/'index.html')
        if hashlib.sha256((legacy/'index.html').read_bytes()).hexdigest()!=args.legacy_index_sha256:
            raise ValueError('Tracked legacy homepage does not match the declared rollback fingerprint')
        (simulation_root/'current').symlink_to(legacy)
        store=operations.Releases(simulation_root);token='a'*32;store.acquire(token)
        store.prepare(release);shutil.copytree(out/'site',store.path(release),dirs_exist_ok=True)
        store.seal(release,manifest_hash,args.legacy_release,args.legacy_index_sha256)
        provenance=[release,args.sha,manifest_hash,'refs/heads/main',args.sha]
        # Simulate a post-switch failure and automatic restoration.
        store.switch(release,args.legacy_release,args.legacy_release,args.legacy_index_sha256,
            store.provenance(provenance,args.legacy_release,args.legacy_index_sha256))
        store.switch(args.legacy_release,release,args.legacy_release,args.legacy_index_sha256)
        store.record('automatic-rollback',release,args.legacy_release)
        if store.target()!=args.legacy_release: raise ValueError('Rollback simulation did not restore legacy target')
        store.unlock(token)
    simulation={'status':'passed','candidate':release,'restoredTarget':args.legacy_release,
        'legacyIndexSha256':args.legacy_index_sha256,'manifestSha256':manifest_hash,
        'scenario':'post-switch failure automatically restored the preserved legacy release'}
    (out/'simulation.json').write_text(json.dumps(simulation,indent=2)+'\n')
    record={'id':release,'gitSha':args.sha,'environment':'production','status':'prepared-not-deployed',
        'manifestSha256':manifest_hash,'expectedCurrentRelease':args.expected_current_release,
        'legacyRollbackRelease':args.legacy_release,'legacyIndexSha256':args.legacy_index_sha256,**source}
    (out/'deployment.json').write_text(json.dumps(record,indent=2)+'\n')
    print('Prepared and simulated exact-SHA production artifact: '+str(out),flush=True)
    if not args.apply: return

    template_hash=hashlib.sha256((checkout/'ops/nginx/jaredgoldberg.org.conf').read_bytes()).hexdigest()
    live=run([*SSH,"set -eu; openssl x509 -in /etc/letsencrypt/live/jaredgoldberg.org/fullchain.pem -noout -checkhost jaredgoldberg.org; nginx -t; sha256sum /etc/nginx/sites-available/jaredgoldberg.org | cut -d' ' -f1"],capture_output=True,text=True).stdout.strip().splitlines()[-1]
    if live!=template_hash: raise ValueError('Active production Nginx vhost does not match the reviewed template')
    code=(checkout/'ops/production-release.py').read_text();token=uuid.uuid4().hex
    def remote(action,*params):
        for value in params:
            if not re.fullmatch(r'[A-Za-z0-9._/-]+',value): raise ValueError('Unsafe remote argument')
        command=[args.legacy_release,args.legacy_index_sha256,action,token,*params]
        return run([*SSH,'python3 - '+' '.join(command)],input=code,capture_output=True,text=True).stdout.strip()
    def upload(directory,identifier):
        remote('prepare',identifier)
        archive_path=out/(identifier+'.tar')
        allowed=set(json.loads((directory/'artifact-manifest.json').read_text())['files'])|{'artifact-manifest.json'}
        actual={str(path.relative_to(directory)) for path in directory.rglob('*') if path.is_file()}
        if actual!=allowed: raise ValueError('Upload source differs from manifest allowlist')
        with tarfile.open(archive_path,'w') as tar:
            for name in sorted(allowed): tar.add(directory/name,arcname=name,recursive=False)
        with archive_path.open('rb') as payload:
            run([*SSH,f'tar --no-same-owner -xf - -C {REMOTE}/releases/{identifier}'],stdin=payload)
        remote('seal',identifier,manifest_hash)
    def download(identifier):
        remote('validate',identifier)
        directory=out/('previous-'+identifier)
        run(['scp','-q','-r',f'{HOST}:{REMOTE}/releases/{identifier}',str(directory)])
        verifier.verify_artifact(directory);return directory
    remote('acquire')
    try:
        repository_gate(args.sha,args.source_branch,args.expected_main_sha,True)
        current=json.loads(remote('inspect'))['current']
        if current!=args.expected_current_release: raise ValueError('Production target moved from the expected baseline')
        previous_dir=None
        if current==args.legacy_release:
            verifier.verify_legacy(verifier.URL,args.legacy_index_sha256)
        else:
            previous_dir=download(current);verifier.verify_public(previous_dir)
        upload(out/'site',release)
        provenance=[release,args.sha,manifest_hash,'refs/heads/main',args.sha]
        def verify_previous():
            if current==args.legacy_release: verifier.verify_legacy(verifier.URL,args.legacy_index_sha256)
            else: verifier.verify_public(previous_dir)
        def verify_candidate():
            verifier.verify_public(out/'site')
            run(['npm','run','test:public:production'],cwd=checkout,env=production_env)
        activate_with_rollback(remote,release,current,verify_candidate,verify_previous,provenance)
        record['status']='verified';record['previous']=current
        (out/'deployment.json').write_text(json.dumps(record,indent=2)+'\n')
        print(json.dumps(record,indent=2))
    finally: remote('unlock')

if __name__=='__main__': main()
