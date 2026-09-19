#!/usr/bin/env python3
"""Run on the verified server only: validate a staged QA vhost before activation.
No existing unrelated Nginx file is edited. The staging file must be named by
an explicit argument; mode is bootstrap or https. Existing QA files are guarded
by an expected checksum for HTTPS replacement.
"""
from pathlib import Path
import hashlib
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone

NAME='qa.jaredgoldberg.org'
BASE=Path('/var/www/jaredgoldberg.org')
AVAILABLE=Path('/etc/nginx/sites-available')/NAME
ENABLED=Path('/etc/nginx/sites-enabled')/NAME

def main():
    mode,staged_name,*expected=sys.argv[1:]
    if mode not in ('bootstrap','https'):raise ValueError('Invalid install mode')
    staged=Path(staged_name).resolve()
    text=staged.read_text()
    names=re.findall(r'^\s*server_name\s+([^;]+);',text,re.M)
    if not names or any(name!=NAME for name in names):raise ValueError('Unexpected server_name')
    if 'default_server' in text:raise ValueError('QA cannot be the default server')
    if mode=='bootstrap':
        if AVAILABLE.exists() or AVAILABLE.is_symlink() or ENABLED.exists() or ENABLED.is_symlink():raise ValueError('QA paths already exist')
    else:
        if not ENABLED.is_symlink() or ENABLED.resolve()!=AVAILABLE:raise ValueError('Unexpected enabled QA path')
        if len(expected)!=1 or hashlib.sha256(AVAILABLE.read_bytes()).hexdigest()!=expected[0]:raise ValueError('QA configuration changed since inspection')
    for file in Path('/etc/nginx/sites-enabled').iterdir():
        if file==ENABLED:continue
        if re.search(r'\bqa\.jaredgoldberg\.org\b',file.read_text()):raise ValueError('Server-name collision')
    for file in Path('/etc/nginx/conf.d').glob('*.conf'):
        if NAME in file.read_text():raise ValueError('Server-name collision in conf.d')
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    evidence=BASE/'shared'/'qa-infrastructure'/stamp
    evidence.mkdir(parents=True,mode=0o700)
    candidate=evidence/'candidate.conf';shutil.copyfile(staged,candidate)
    original=Path('/etc/nginx/nginx.conf').read_text()
    anchor='include /etc/nginx/sites-enabled/*;'
    if original.count(anchor)!=1:raise ValueError('Unexpected Nginx include topology')
    includes='\n'.join(f'include {file};' for file in sorted(Path('/etc/nginx/sites-enabled').iterdir()) if file!=ENABLED)
    wrapper=evidence/'nginx-validation.conf'
    wrapper.write_text(original.replace(anchor,includes+f'\ninclude {candidate};'))
    # Nginx resolves nested relative includes from the main config directory.
    # Test an exclusive temporary wrapper in /etc/nginx, retaining the evidence copy.
    runtime_wrapper=Path('/etc/nginx')/('.qa-validation-'+stamp+'.conf')
    with runtime_wrapper.open('x') as stream:stream.write(wrapper.read_text())
    try:subprocess.run(['nginx','-t','-c',str(runtime_wrapper)],check=True)
    finally:runtime_wrapper.unlink()
    previous=AVAILABLE.read_bytes() if mode=='https' else None
    if previous is not None:(evidence/'previous.conf').write_bytes(previous)
    temp=AVAILABLE.with_name('.qa.jaredgoldberg.org-new')
    try:
        with temp.open('xb') as stream:stream.write(candidate.read_bytes())
        temp.chmod(0o644);os.replace(temp,AVAILABLE)
        if mode=='bootstrap':ENABLED.symlink_to(AVAILABLE)
        subprocess.run(['nginx','-t'],check=True)
        subprocess.run(['systemctl','reload','nginx'],check=True)
    except BaseException:
        temp.unlink(missing_ok=True)
        if previous is None:
            if ENABLED.is_symlink() and ENABLED.resolve()==AVAILABLE:ENABLED.unlink()
        else:
            restore=evidence/'restore.conf';restore.write_bytes(previous);restore.chmod(0o644);os.replace(restore,AVAILABLE)
        # Existing configuration is restored on disk. Never restart Nginx.
        subprocess.run(['nginx','-t'],check=True)
        raise
    print('Activated QA vhost after successful validation; evidence: '+str(evidence))
    print('Installed SHA256: '+hashlib.sha256(AVAILABLE.read_bytes()).hexdigest())

if __name__=='__main__':main()
