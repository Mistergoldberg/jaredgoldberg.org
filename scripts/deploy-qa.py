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
EXPECTED_REMOTE = 'https://github.com/Mistergoldberg/jaredgoldberg.org.git'
FULL_SHA = re.compile(r'[a-f0-9]{40}')

def run(args, **kwargs):
    return subprocess.run(args,check=True,**kwargs)

def git_output(*args, root=ROOT):
    return subprocess.check_output(['git','-C',str(root),*args],text=True).strip()

def remote_head(ref, root=ROOT):
    output=git_output('ls-remote','--heads','origin',ref,root=root)
    lines=[line.split('\t',1) for line in output.splitlines() if line]
    if len(lines)!=1 or len(lines[0])!=2 or lines[0][1]!=ref or not FULL_SHA.fullmatch(lines[0][0]):
        raise ValueError('Remote branch is missing or ambiguous: '+ref)
    return lines[0][0]

def repository_gate(sha, source_branch=None, expected_main_sha=None, rollback=False,
                    root=ROOT, expected_remote=EXPECTED_REMOTE):
    if not FULL_SHA.fullmatch(sha):
        raise ValueError('Use full 40-character SHA')
    checks=[(('rev-parse','HEAD'),sha),
            (('remote','get-url','origin'),expected_remote),
            (('status','--porcelain'),'')]
    if rollback:
        checks.append((('branch','--show-current'),'main'))
    else:
        if not source_branch or not expected_main_sha:
            raise ValueError('Candidate deployments require --source-branch and --expected-main-sha')
        if not FULL_SHA.fullmatch(expected_main_sha):
            raise ValueError('Use a full 40-character expected main SHA')
        try:
            git_output('check-ref-format','--branch',source_branch,root=root)
        except subprocess.CalledProcessError as error:
            raise ValueError('Invalid source branch') from error
        checks.append((('branch','--show-current'),source_branch))
    for command, expected in checks:
        if git_output(*command,root=root)!=expected:
            raise ValueError('Repository gate failed: git '+' '.join(command))
    if rollback:
        return None
    source_ref='refs/heads/'+source_branch
    source_sha=remote_head(source_ref,root=root)
    observed_main_sha=remote_head('refs/heads/main',root=root)
    if source_sha!=sha:
        raise ValueError('Remote source branch tip does not match deployment SHA')
    if observed_main_sha!=expected_main_sha:
        raise ValueError('Remote main changed from the expected baseline')
    ancestry=subprocess.run(['git','-C',str(root),'merge-base','--is-ancestor',expected_main_sha,sha])
    if ancestry.returncode!=0:
        raise ValueError('Deployment SHA does not descend from the expected main baseline')
    return {'sourceRef':source_ref,'sourceRefSha':source_sha,
            'expectedMainSha':expected_main_sha,'observedMainSha':observed_main_sha}

def load_verifier():
    spec=importlib.util.spec_from_file_location('verify_qa',ROOT/'scripts/verify-qa.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module

def artifact_manifest(directory,sha):
    (directory/'release.json').write_text(json.dumps({'site':'jaredgoldberg.org','environment':'qa','gitSha':sha},indent=2)+'\n')
    files={str(path.relative_to(directory)):hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(directory.rglob('*')) if path.is_file()}
    (directory/'artifact-manifest.json').write_text(json.dumps({'schema':1,'gitSha':sha,'files':files},indent=2)+'\n')

def activate_with_rollback(remote, verifier, candidate, previous, candidate_dir, previous_dir,
                           public_gate=None, provenance=()):
    try:
        remote('switch',candidate,previous,*(() if not provenance else ('deploy',*provenance)))
        verifier.verify(candidate_dir)
        if public_gate: public_gate()
        remote('record','verified',previous,candidate,*provenance)
    except BaseException:
        # A lost SSH response may occur after the atomic rename. Inspect before recovery.
        actual=json.loads(remote('inspect'))['previous']
        if actual == candidate:
            remote('switch',previous,candidate)
            verifier.verify(previous_dir)
            remote('record','automatic-rollback',candidate,previous,*provenance)
        elif actual != previous:
            raise RuntimeError('Unexpected QA target during recovery; inspect server ledger')
        raise

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sha',required=True,help='Full SHA of the clean checked-out source commit')
    parser.add_argument('--source-branch',help='Pushed candidate branch whose remote tip must equal --sha')
    parser.add_argument('--expected-main-sha',help='Full origin/main baseline that must remain unchanged')
    parser.add_argument('--apply',action='store_true',help='Publish after all prerequisites and gates pass')
    parser.add_argument('--bootstrap',action='store_true',help='Initialize first QA maintenance baseline before candidate')
    parser.add_argument('--rollback',help='Previously validated QA release ID; no new artifact built')
    args=parser.parse_args()
    os.chdir(ROOT)
    if args.rollback and (args.bootstrap or not args.apply): parser.error('--rollback requires --apply and cannot bootstrap')
    if args.rollback and (args.source_branch or args.expected_main_sha):
        parser.error('Manual rollback preserves the clean-main interface; omit feature-source arguments')
    if not args.rollback and (not args.source_branch or not args.expected_main_sha):
        parser.error('Candidate deployments require --source-branch and --expected-main-sha')
    source=repository_gate(args.sha,args.source_branch,args.expected_main_sha,bool(args.rollback))
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
            if not re.fullmatch(r'[A-Za-z0-9._/-]+',value): raise ValueError('Unsafe remote argument')
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
        directory=out/('previous-'+identifier)
        if directory.exists():raise ValueError('Previous artifact destination already exists')
        # scp reads only a prevalidated QA artifact; no production secrets/source tree.
        run(['scp','-q','-r',f'{HOST}:{REMOTE}/releases/{identifier}',str(directory)])
        return directory
    env={**os.environ,'QA_BUILD_SHA':args.sha}
    env.pop('QA_PUBLIC',None)
    checkout=ROOT
    if not args.rollback:
        build_workspace=tempfile.TemporaryDirectory(prefix='jaredgoldberg-org-build-')
        tmp=build_workspace.name
        checkout=Path(tmp)
        archive=run(['git','archive','--format=tar',args.sha],capture_output=True).stdout
        run(['tar','-xf','-','-C',str(checkout)],input=archive)
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
        # Recheck authoritative Git refs after the build and before any upload or switch.
        source=repository_gate(args.sha,args.source_branch,args.expected_main_sha,bool(args.rollback))
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
        provenance=()
        if source:
            provenance=(candidate,args.sha,
                hashlib.sha256((candidate_dir/'artifact-manifest.json').read_bytes()).hexdigest(),
                source['sourceRef'],source['sourceRefSha'],source['expectedMainSha'],source['observedMainSha'])
        def public_gate():
            try:
                run(['npm','run','test:public'],cwd=checkout,env=env)
            finally:
                if (checkout/'test-results/public-qa').exists():
                    shutil.copytree(checkout/'test-results/public-qa',out/'public-qa')
        activate_with_rollback(remote,verifier,candidate,previous,candidate_dir,previous_dir,
            public_gate if not candidate.startswith('baseline-') else None,provenance)
        record={'id':candidate,'gitSha':json.loads((candidate_dir/'release.json').read_text())['gitSha'],'previous':previous,'target':f'{REMOTE}/releases/{candidate}',
            'rollbackCommand':f'python3 scripts/deploy-qa.py --sha {args.expected_main_sha or args.sha} --apply --rollback {previous}',
            'url':verifier.URL,'status':'verified',
            'manifestSha256':hashlib.sha256((candidate_dir/'artifact-manifest.json').read_bytes()).hexdigest()}
        if source: record.update(source)
        (out/'deployment.json').write_text(json.dumps(record,indent=2)+'\n')
        print(json.dumps(record,indent=2))
    finally:
        remote('unlock')

if __name__=='__main__': main()
