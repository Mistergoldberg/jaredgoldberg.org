#!/usr/bin/env python3
"""Verify a production artifact locally or byte-for-byte over public HTTPS."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

URL='https://jaredgoldberg.org'
MIME={'.html':['text/html'],'.css':['text/css'],'.js':['application/javascript','text/javascript'],
      '.woff2':['font/woff2'],'.svg':['image/svg+xml'],'.png':['image/png'],
      '.jpg':['image/jpeg'],'.jpeg':['image/jpeg'],'.webp':['image/webp'],
      '.json':['application/json'],'.txt':['text/plain'],'.xml':['application/xml','text/xml']}
PRETTY_ROUTES={
    '/media-archives-and-memory/':'media-archives-and-memory/index.html',
    '/community-service/':'community-service/index.html',
    '/systems-and-institutions/':'systems-and-institutions/index.html',
    '/art/':'art/index.html',
}
CANONICAL_PATHS=['/',*PRETTY_ROUTES]
CANONICAL_REDIRECTS={
    '/index.html':'/',
    **{route.rstrip('/'):route for route in PRETTY_ROUTES},
    **{route+'index.html':route for route in PRETTY_ROUTES},
}

def verify_seo_artifact(directory):
    directory=Path(directory)
    namespace={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
    root=ET.fromstring((directory/'sitemap.xml').read_bytes())
    locations=[item.text for item in root.findall('s:url/s:loc',namespace)]
    if locations != [URL+path for path in CANONICAL_PATHS]:raise ValueError('Sitemap URL inventory mismatch')
    if root.findall('.//s:lastmod',namespace):raise ValueError('Sitemap must not claim unavailable modification dates')
    html_routes={'index.html':'/',**{name:path for path,name in PRETTY_ROUTES.items()}}
    for name,path in html_routes.items():
        html=(directory/name).read_text();canonical=URL+path
        if re.findall(r'<link rel="canonical" href="([^"]+)">',html)!=[canonical]:raise ValueError('Canonical URL mismatch: '+name)
        scripts=re.findall(r'<script type="application/ld\+json">([^<]+)</script>',html)
        if len(scripts)!=1:raise ValueError('Identity structured data missing or duplicated: '+name)
        data=json.loads(scripts[0]);graph={item['@id']:item for item in data.get('@graph',[])}
        if data.get('@context')!='https://schema.org':raise ValueError('Structured data context mismatch')
        if graph.get(URL+'/#website',{}).get('@type')!='WebSite':raise ValueError('WebSite identity mismatch')
        if graph.get(URL+'/#person',{}).get('@type')!='Person':raise ValueError('Person identity mismatch')
        if graph.get(canonical+'#webpage',{}).get('url')!=canonical:raise ValueError('WebPage identity mismatch')

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
    schema=manifest.get('schema')
    if schema not in (2,3) or (manifest.get('site'),manifest.get('environment'))!=('jaredgoldberg.org','production') or release!=expected:
        raise ValueError('Invalid production release identity')
    actual={str(path.relative_to(directory)) for path in directory.rglob('*') if path.is_file()}
    if actual!=set(manifest['files'])|{'artifact-manifest.json'}: raise ValueError('Unexpected/missing artifact files')
    for name,digest in manifest['files'].items():
        if hashlib.sha256((directory/name).read_bytes()).hexdigest()!=digest: raise ValueError('Artifact checksum mismatch: '+name)
    robots=(directory/'robots.txt').read_text()
    if schema==3:
        if robots!='User-agent: *\nAllow: /\nSitemap: https://jaredgoldberg.org/sitemap.xml\n':raise ValueError('Production robots policy mismatch')
        verify_seo_artifact(directory)
    elif robots!='User-agent: *\nAllow: /\n':raise ValueError('Legacy production robots policy mismatch')
    for html in directory.rglob('*.html'):
        if re.search(r'noindex|nofollow',html.read_text(),re.I): raise ValueError('QA robots policy leaked into production')
    if any('above-the-fold-prototype' in name or 'fixture' in name for name in actual):
        raise ValueError('Prototype or development fixture leaked into production')
    return manifest

def verify_public(directory,base=URL):
    directory=Path(directory);manifest=verify_artifact(directory)
    status,headers,_=request(base.replace('https://','http://')+'/')
    if status not in (301,308) or 'location: https://' not in headers: raise ValueError('HTTP does not redirect to HTTPS')
    artifact_routes=['/'+name for name in manifest['files'] if not name.endswith('index.html')]
    names=['/',*artifact_routes,'/artifact-manifest.json']
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
    for source,target in CANONICAL_REDIRECTS.items():
        status,headers,_=request(base+source)
        if status not in (301,308) or f'location: {base+target}\n' not in headers:raise ValueError(source+': canonical redirect mismatch')
    for alternate in [base.replace('https://','https://www.')+'/',base.replace('https://','http://www.')+'/']:
        status,headers,_=request(alternate)
        if status not in (301,308) or f'location: {base}/\n' not in headers:raise ValueError('Alternate host redirect mismatch')
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
