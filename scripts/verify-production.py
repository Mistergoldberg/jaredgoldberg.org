#!/usr/bin/env python3
"""Verify a production artifact locally or byte-for-byte over public HTTPS."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

URL='https://jaredgoldberg.org'
MIME={'.html':['text/html'],'.css':['text/css'],'.js':['application/javascript','text/javascript'],
      '.woff2':['font/woff2'],'.svg':['image/svg+xml'],'.json':['application/json'],'.txt':['text/plain']}
PRETTY_ROUTES={
    '/media-archives-and-memory/':'media-archives-and-memory/index.html',
    '/community-service/':'community-service/index.html',
    '/systems-and-institutions/':'systems-and-institutions/index.html',
    '/art/':'art/index.html',
}

def request(url):
    with tempfile.TemporaryDirectory(prefix='production-http-') as tmp:
        headers,body=Path(tmp)/'headers',Path(tmp)/'body'
        result=subprocess.run(['curl','--silent','--show-error','--max-time','20','--dump-header',str(headers),
            '--output',str(body),'--write-out','%{http_code}',url],check=True,capture_output=True,text=True)
        return int(result.stdout),headers.read_text().lower(),body.read_bytes()

def verify_artifact(directory):
    directory=Path(directory)
    manifest=json.loads((directory/'artifact-manifest.json').read_text())
    release=json.loads((directory/'release.json').read_text())
    expected={'site':'jaredgoldberg.org','environment':'production','gitSha':manifest.get('gitSha'),
        'buildId':manifest.get('buildId'),'artifactManifest':'artifact-manifest.json'}
    if (manifest.get('schema'),manifest.get('site'),manifest.get('environment'))!=(2,'jaredgoldberg.org','production') or release!=expected:
        raise ValueError('Invalid production release identity')
    actual={str(path.relative_to(directory)) for path in directory.rglob('*') if path.is_file()}
    if actual!=set(manifest['files'])|{'artifact-manifest.json'}: raise ValueError('Unexpected/missing artifact files')
    for name,digest in manifest['files'].items():
        if hashlib.sha256((directory/name).read_bytes()).hexdigest()!=digest: raise ValueError('Artifact checksum mismatch: '+name)
    if (directory/'robots.txt').read_text()!='User-agent: *\nAllow: /\n': raise ValueError('Production robots policy mismatch')
    for html in directory.rglob('*.html'):
        if re.search(r'noindex|nofollow',html.read_text(),re.I): raise ValueError('QA robots policy leaked into production')
    if any('above-the-fold-prototype' in name or 'fixture' in name for name in actual):
        raise ValueError('Prototype or development fixture leaked into production')
    return manifest

def verify_public(directory,base=URL):
    directory=Path(directory);manifest=verify_artifact(directory)
    status,headers,_=request(base.replace('https://','http://')+'/')
    if status not in (301,308) or 'location: https://' not in headers: raise ValueError('HTTP does not redirect to HTTPS')
    names=['/',*('/'+name for name in manifest['files']),'/artifact-manifest.json']
    for name in names:
        status,headers,body=request(base+name)
        if status!=200: raise ValueError(f'{name}: expected 200, got {status}')
        if re.search(r'^x-robots-tag:.*(?:noindex|nofollow)',headers,re.M): raise ValueError(f'{name}: QA robots header leaked')
        for header in ['x-content-type-options: nosniff','x-frame-options: deny','referrer-policy: same-origin']:
            if header not in headers: raise ValueError(f'{name}: missing {header}')
        hashed=bool(re.search(r'\.[a-f0-9]{16}\.(css|js)$',name))
        policy='public, max-age=31536000, immutable' if hashed else 'no-cache'
        if not re.search(r'^cache-control:.*'+policy,headers,re.M): raise ValueError(f'{name}: incorrect cache policy')
        local=directory/('index.html' if name=='/' else name.lstrip('/'))
        media=re.search(r'^content-type:\s*([^;\n\r]+)',headers,re.M)
        if not media or media[1] not in MIME[local.suffix]: raise ValueError(f'{name}: wrong MIME type')
        if body!=local.read_bytes(): raise ValueError(f'{name}: public artifact byte mismatch')
    for route,local_name in PRETTY_ROUTES.items():
        status,_,body=request(base+route)
        if status!=200 or body!=(directory/local_name).read_bytes(): raise ValueError(route+': pretty route mismatch')
    for name in ['/.git/config','/.env','/package.json','/src/navigation.js','/scripts/deploy-production.py',
                 '/docs/qa-runbook.md','/images/above-the-fold-prototype.png','/missing-production-route']:
        if request(base+name)[0]!=404: raise ValueError(name+': expected 404')
    print('Public production artifact, routes, assets and headers verified: '+manifest['gitSha'],flush=True)

def verify_legacy(base,expected_hash):
    status,headers,body=request(base+'/')
    if status!=200 or hashlib.sha256(body).hexdigest()!=expected_hash:
        raise ValueError('Legacy rollback homepage identity mismatch')
    if 'https://' not in base: raise ValueError('Legacy rollback must be verified over HTTPS')
    return {'indexSha256':expected_hash}

if __name__=='__main__':
    if len(sys.argv) not in (2,3) or (len(sys.argv)==3 and sys.argv[1]!='--local'):
        raise SystemExit('usage: verify-production.py [--local] ARTIFACT_DIRECTORY')
    directory=sys.argv[-1]
    if len(sys.argv)==3:
        manifest=verify_artifact(directory)
        print('Local production artifact verified: '+manifest['gitSha'])
    else: verify_public(directory)
