#!/usr/bin/env python3
"""Prepare an exact committed artifact; --apply publishes only the fixed QA host."""
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

ROOT = Path(__file__).resolve().parent.parent
HOST = 'root@5.161.223.134'
REMOTE = '/var/www/jaredgoldberg.org'
SSH = ['ssh','-o','BatchMode=yes','-o','ConnectTimeout=10',HOST]

def run(args, **kwargs):
    return subprocess.run(args,check=True,**kwargs)

def load_verifier():
    spec=importlib.util.spec_from_file_location('verify_qa',ROOT/'scripts/verify-qa.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module

def artifact_manifest(directory,sha):
    (directory/'release.json').write_text(json.dumps({'site':'jaredgoldberg.org','environment':'qa','gitSha':sha},indent=2)+'\n')
    files={str(path.relative_to(directory)):hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(directory.rglob('*')) if path.is_file()}
    (directory/'artifact-manifest.json').write_text(json.dumps({'schema':1,'gitSha':sha,'files':files},indent=2)+'\n')

def activate_with_rollback(remote, verifier, candidate, previous, candidate_dir, previous_dir):
    try:
        remote('switch',candidate,previous)
        verifier.verify(candidate_dir)
        remote('record','verified',previous,candidate)
    except BaseException:
        # A lost SSH response may occur after the atomic rename. Inspect before recovery.
        actual=json.loads(remote('inspect'))['previous']
        if actual == candidate:
            remote('switch',previous,candidate)
            verifier.verify(previous_dir)
            remote('record','automatic-rollback',candidate,previous)
        elif actual != previous:
            raise RuntimeError('Unexpected QA target during recovery; inspect server ledger')
        raise

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sha',required=True,help='Full SHA of clean main HEAD')
    parser.add_argument('--apply',action='store_true',help='Publish after all prerequisites and gates pass')
    parser.add_argument('--bootstrap',action='store_true',help='Initialize first QA maintenance baseline before candidate')
    parser.add_argument('--rollback',help='Previously validated QA release ID; no new artifact built')
    args=parser.parse_args()
    os.chdir(ROOT)
    if not re.fullmatch(r'[a-f0-9]{40}',args.sha): parser.error('Use full 40-character SHA')
    for command, expected in [(['rev-parse','HEAD'],args.sha),(['branch','--show-current'],'main'),(['remote','get-url','origin'],'https://github.com/Mistergoldberg/jaredgoldberg.org.git'),(['status','--porcelain'],'')]:
        actual=subprocess.check_output(['git',*command],text=True).strip()
        if actual!=expected: raise ValueError('Repository gate failed: git '+' '.join(command))
    if args.rollback and (args.bootstrap or not args.apply): parser.error('--rollback requires --apply and cannot bootstrap')
    verifier=load_verifier()
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    release=stamp+'-'+args.sha[:12]
    out=ROOT/'artifacts'/release
    out.mkdir(parents=True,exist_ok=False)
    code=(ROOT/'ops/qa-release.py').read_text()
    token=uuid.uuid4().hex
    def remote(action,*params):
        # Every dynamic command argument is a validated SHA, ID, token, or fixed operation.
        for value in params:
            if not re.fullmatch(r'[A-Za-z0-9-]+',value): raise ValueError('Unsafe remote argument')
        return run([*SSH,'python3 - '+ ' '.join([action,token,*params])],input=code,capture_output=True,text=True).stdout.strip()
    def upload(directory,identifier):
        remote('prepare',identifier)
        archive=out/(identifier+'.tar')
        with tarfile.open(archive,'w') as tar:
            for file in sorted(directory.rglob('*')):
                if file.is_file(): tar.add(file,arcname=str(file.relative_to(directory)),recursive=False)
        with archive.open('rb') as payload:
            run([*SSH,f'tar --no-same-owner -xf - -C {REMOTE}/releases/{identifier}'],stdin=payload)
        remote('seal',identifier,hashlib.sha256((directory/'artifact-manifest.json').read_bytes()).hexdigest())
    def download(identifier):
        remote('validate',identifier)
        directory=out/('previous-'+identifier);directory.mkdir()
        # scp reads only a prevalidated QA artifact; no production secrets/source tree.
        run(['scp','-q','-r',f'{HOST}:{REMOTE}/releases/{identifier}/.',str(directory)])
        return directory
    if not args.rollback:
        with tempfile.TemporaryDirectory(prefix='jaredgoldberg-org-build-') as tmp:
            checkout=Path(tmp)
            archive=run(['git','archive','--format=tar',args.sha],capture_output=True).stdout
            run(['tar','-xf','-','-C',str(checkout)],input=archive)
            env={**os.environ,'QA_BUILD_SHA':args.sha}
            run(['npm','ci','--no-audit','--no-fund'],cwd=checkout,env=env)
            run(['npm','test'],cwd=checkout,env=env)
            shutil.copytree(checkout/'dist',out/'site')
            shutil.copytree(checkout/'test-results',out/'test-results')
            shutil.copytree(checkout/'ops/qa-baseline',out/'baseline')
            artifact_manifest(out/'baseline',args.sha)
        (out/'deployment.json').write_text(json.dumps({'id':release,'gitSha':args.sha,'status':'prepared','url':verifier.URL},indent=2)+'\n')
        print('Prepared exact-SHA artifact: '+str(out),flush=True)
    if not args.apply: return
    # Read-only prerequisites, before acquiring a server lock or creating releases.
    run([*SSH,'test -f /etc/nginx/sites-enabled/qa.jaredgoldberg.org && '
        'test -f /etc/letsencrypt/live/qa.jaredgoldberg.org/fullchain.pem && '
        "openssl x509 -in /etc/letsencrypt/live/qa.jaredgoldberg.org/fullchain.pem -noout -checkhost qa.jaredgoldberg.org && "
        'nginx -t'])
    # A working HTTPS path must already return QA-specific headers. Never follow redirects.
    status,headers,_=verifier.request(verifier.URL+'/release.json')
    if status not in (200,404) or 'noindex' not in headers or 'no-store' not in headers:
        raise ValueError('QA DNS/TLS/vhost/cache preflight failed; no deployment attempted')
    remote('acquire')
    previous=None
    try:
        previous=json.loads(remote('inspect'))['previous']
        if previous is None:
            if not args.bootstrap or args.rollback: raise ValueError('No QA rollback target. Use --bootstrap for the first deployment only.')
            baseline='baseline-'+release
            upload(out/'baseline',baseline)
            try:
                remote('switch',baseline,'none','bootstrap')
                verifier.verify(out/'baseline')
            except BaseException:
                if json.loads(remote('inspect'))['previous'] == baseline:
                    remote('remove-bootstrap',baseline)
                raise
            remote('record','baseline-verified','none',baseline)
            previous=baseline
        elif args.bootstrap: raise ValueError('QA already exists; omit --bootstrap')
        previous_dir=download(previous)
        verifier.verify(previous_dir)  # Prevalidate rollback bytes and the public routing path.
        if args.rollback:
            candidate=args.rollback
            if not re.fullmatch(r'(?:baseline-)?\d{8}T\d{6}Z-[a-f0-9]{12}',candidate): raise ValueError('Invalid rollback ID')
            remote('eligible',candidate)
            candidate_dir=download(candidate)
        else:
            candidate=release;candidate_dir=out/'site'
            upload(candidate_dir,candidate)
        activate_with_rollback(remote,verifier,candidate,previous,candidate_dir,previous_dir)
        record={'id':candidate,'gitSha':args.sha,'previous':previous,'target':f'{REMOTE}/releases/{candidate}',
            'rollbackCommand':f'python3 scripts/deploy-qa.py --sha {args.sha} --apply --rollback {previous}',
            'url':verifier.URL,'status':'verified'}
        (out/'deployment.json').write_text(json.dumps(record,indent=2)+'\n')
        print(json.dumps(record,indent=2))
    finally:
        remote('unlock')

if __name__=='__main__': main()
