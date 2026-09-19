#!/usr/bin/env python3
"""Public byte-for-byte artifact verification, also used after rollback."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

URL = 'https://qa.jaredgoldberg.org'

def request(url):
    with tempfile.TemporaryDirectory(prefix='qa-http-') as tmp:
        headers, body = Path(tmp)/'headers', Path(tmp)/'body'
        result = subprocess.run(['curl','--silent','--show-error','--max-time','20',
            '--dump-header',str(headers),'--output',str(body),'--write-out','%{http_code}',url],check=True,capture_output=True,text=True)
        return int(result.stdout), headers.read_text().lower(), body.read_bytes()

def verify(directory, base=URL):
    directory = Path(directory)
    manifest = json.loads((directory/'artifact-manifest.json').read_text())
    for name in ['/',*('/'+name for name in manifest['files']),'/artifact-manifest.json']:
        status, headers, body = request(base+name)
        if status != 200: raise ValueError(f'{name}: expected HTTP 200, got {status}')
        if not re.search(r'^x-robots-tag:.*noindex.*nofollow',headers,re.M): raise ValueError(f'{name}: missing noindex header')
        hashed = bool(re.search(r'\.[a-f0-9]{16}\.(css|js)$',name))
        if not re.search(r'^cache-control:.*'+('immutable' if hashed else 'no-store'),headers,re.M): raise ValueError(f'{name}: incorrect cache policy')
        local = directory / ('index.html' if name=='/' else name.lstrip('/'))
        if body != local.read_bytes(): raise ValueError(f'{name}: public artifact byte mismatch')
    for name in ['/.git/config','/package.json','/missing-qa-route']:
        status, headers, _ = request(base+name)
        if status != 404: raise ValueError(f'{name}: expected 404, got {status}')
        if 'noindex' not in headers: raise ValueError('Missing noindex on 404')
    print('Public QA artifact and headers verified: '+manifest['gitSha'])

if __name__ == '__main__': verify(sys.argv[1])
