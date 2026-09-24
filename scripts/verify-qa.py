#!/usr/bin/env python3
"""Public TLS, headers, routing and byte-for-byte verification, including rollback."""
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

URL = 'https://qa.jaredgoldberg.org'
MIME={'.html':['text/html'],'.css':['text/css'],'.js':['application/javascript','text/javascript'],
      '.woff2':['font/woff2'],'.svg':['image/svg+xml'],'.png':['image/png'],
      '.jpg':['image/jpeg'],'.jpeg':['image/jpeg'],'.webp':['image/webp'],
      '.json':['application/json'],'.txt':['text/plain']}
APPROVED_EXTERNAL_URLS={
    'https://jaredgoldberg.ca/writing/the-future-of-work-is-a-design-problem/',
    'https://jaredgoldberg.ca/writing/dignity-is-a-systems-output/',
}

def verify_html_policy(html):
    if re.search(r'rel=[\"\x27]canonical',html):
        raise ValueError('Unexpected canonical URL')
    production_urls=set(re.findall(r'https?://jaredgoldberg\.(?:ca|org)[^\s\"\x27<>]*',html))
    unexpected=production_urls-APPROVED_EXTERNAL_URLS
    if unexpected:
        raise ValueError('Unexpected production URL: '+', '.join(sorted(unexpected)))

def request(url):
    with tempfile.TemporaryDirectory(prefix='qa-http-') as tmp:
        headers, body = Path(tmp)/'headers', Path(tmp)/'body'
        result = subprocess.run(['curl','--silent','--show-error','--max-time','20',
            '--dump-header',str(headers),'--output',str(body),'--write-out','%{http_code}',url],check=True,capture_output=True,text=True)
        return int(result.stdout), headers.read_text().lower(), body.read_bytes()

def verify(directory, base=URL):
    directory = Path(directory)
    manifest = json.loads((directory/'artifact-manifest.json').read_text())
    for path in ['/','/index.html?qa=redirect']:
        status,headers,_=request(base.replace('https://','http://')+path)
        if status not in (301,308) or f'location: {base+path}\n' not in headers:
            raise ValueError('HTTP must redirect directly to the same QA HTTPS path')
    for name in ['/',*('/'+name for name in manifest['files']),'/artifact-manifest.json']:
        status, headers, body = request(base+name)
        if status != 200: raise ValueError(f'{name}: expected HTTP 200, got {status}')
        if not re.search(r'^x-robots-tag:.*noindex.*nofollow',headers,re.M): raise ValueError(f'{name}: missing noindex header')
        for header in ['x-content-type-options: nosniff','x-frame-options: deny','referrer-policy: same-origin']:
            if header not in headers: raise ValueError(f'{name}: missing {header}')
        hashed = bool(re.search(r'\.[a-f0-9]{16}\.(css|js)$',name))
        if not re.search(r'^cache-control:.*'+('public, max-age=31536000, immutable' if hashed else 'no-store'),headers,re.M): raise ValueError(f'{name}: incorrect cache policy')
        local = directory / ('index.html' if name=='/' else name.lstrip('/'))
        media=re.search(r'^content-type:\s*([^;\n\r]+)',headers,re.M)
        if not media or media[1] not in MIME[local.suffix]:raise ValueError(f'{name}: wrong MIME type')
        if body != local.read_bytes(): raise ValueError(f'{name}: public artifact byte mismatch')
    if (directory/'robots.txt').read_text().strip()!='User-agent: *\nDisallow: /':raise ValueError('Robots must disallow all')
    html=(directory/'index.html').read_text()
    verify_html_policy(html)
    for name in ['/.git/config','/.env','/package.json','/src/navigation.js','/scripts/deploy-qa.py',
                 '/docs/qa-runbook.md','/assets/','/fonts/','/images/','/assets/main.js.map','/missing-qa-route']:
        status, headers, _ = request(base+name)
        if status != 404: raise ValueError(f'{name}: expected 404, got {status}')
        if 'noindex' not in headers or 'no-store' not in headers: raise ValueError('Missing QA headers on 404')
    print('Public QA TLS, MIME, artifact, redirects and headers verified: '+manifest['gitSha'],flush=True)

if __name__ == '__main__': verify(sys.argv[1])
