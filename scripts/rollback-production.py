#!/usr/bin/env python3
"""Restore a previously verified production release without inferring legacy Git identity."""
import argparse
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import tempfile
import uuid

ROOT=Path(__file__).resolve().parent.parent
HOST='root@5.161.223.134';REMOTE='/var/www/jaredgoldberg.org'
SSH=['ssh','-o','BatchMode=yes','-o','ConnectTimeout=10',HOST]
EXPECTED_REMOTE='https://github.com/Mistergoldberg/jaredgoldberg.org.git'
NEW_ID=re.compile(r'\d{8}T\d{6}Z-[a-f0-9]{12}')

def run(command,**kwargs): return subprocess.run(command,check=True,**kwargs)
def git(*args): return subprocess.check_output(['git','-C',str(ROOT),*args],text=True).strip()
def load(path,name):
    spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sha',required=True,help='Exact clean local and remote main SHA')
    parser.add_argument('--expected-current-release',required=True)
    parser.add_argument('--target',required=True)
    parser.add_argument('--legacy-release',required=True)
    parser.add_argument('--legacy-index-sha256',required=True)
    args=parser.parse_args()
    if not re.fullmatch(r'[a-f0-9]{40}',args.sha) or not re.fullmatch(r'[a-f0-9]{64}',args.legacy_index_sha256):
        parser.error('Use full SHA values')
    for release in (args.expected_current_release,args.target):
        if not re.fullmatch(r'(?:\d{14}|\d{8}T\d{6}Z-[a-f0-9]{12})',release): parser.error('Invalid release ID')
    checks=[(git('rev-parse','HEAD'),args.sha),(git('branch','--show-current'),'main'),
        (git('status','--porcelain'),''),(git('remote','get-url','origin'),EXPECTED_REMOTE)]
    if any(actual!=expected for actual,expected in checks): raise ValueError('Rollback requires an exact clean main checkout')
    remote_main=git('ls-remote','--heads','origin','refs/heads/main').split('\t',1)[0]
    if remote_main!=args.sha: raise ValueError('Remote main moved')
    verifier=load(ROOT/'scripts/verify-production.py','verify_production')
    code=(ROOT/'ops/production-release.py').read_text();token=uuid.uuid4().hex
    def remote(action,*params):
        for value in params:
            if not re.fullmatch(r'[A-Za-z0-9._/-]+',value): raise ValueError('Unsafe remote argument')
        command=[args.legacy_release,args.legacy_index_sha256,action,token,*params]
        return run([*SSH,'python3 - '+' '.join(command)],input=code,capture_output=True,text=True).stdout.strip()
    with tempfile.TemporaryDirectory(prefix='production-rollback-') as tmp:
        root=Path(tmp)
        def download(identifier):
            directory=root/identifier
            run(['scp','-q','-r',f'{HOST}:{REMOTE}/releases/{identifier}',str(directory)])
            verifier.verify_artifact(directory);return directory
        def public_check(identifier,directory=None):
            if identifier==args.legacy_release: verifier.verify_legacy(verifier.URL,args.legacy_index_sha256)
            else: verifier.verify_public(directory)
        run([*SSH,'openssl x509 -in /etc/letsencrypt/live/jaredgoldberg.org/fullchain.pem -noout -checkhost jaredgoldberg.org && nginx -t'])
        remote('acquire')
        try:
            current=json.loads(remote('inspect'))['current']
            if current!=args.expected_current_release: raise ValueError('Production target moved from expected current release')
            remote('eligible',args.target)
            current_dir=None if current==args.legacy_release else download(current)
            target_dir=None if args.target==args.legacy_release else download(args.target)
            public_check(current,current_dir)
            try:
                remote('switch',args.target,current)
                public_check(args.target,target_dir)
                remote('record','manual-rollback',current,args.target)
            except BaseException:
                actual=json.loads(remote('inspect'))['current']
                if actual==args.target:
                    remote('switch',current,args.target)
                    public_check(current,current_dir)
                    remote('record','rollback-failed-restored',args.target,current)
                raise
            print(json.dumps({'status':'verified','previous':current,'current':args.target},indent=2))
        finally: remote('unlock')

if __name__=='__main__': main()
