#!/usr/bin/env python3
"""Public TLS, headers, routing and byte-for-byte verification, including rollback."""
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

URL = 'https://qa.jaredgoldberg.org'
PRODUCTION_ORIGIN='https://jaredgoldberg.org'
MIME={'.html':['text/html'],'.css':['text/css'],'.js':['application/javascript','text/javascript'],
      '.woff2':['font/woff2'],'.svg':['image/svg+xml'],'.png':['image/png'],
      '.jpg':['image/jpeg'],'.jpeg':['image/jpeg'],'.webp':['image/webp'],
      '.json':['application/json'],'.txt':['text/plain'],'.xml':['application/xml','text/xml']}
APPROVED_EXTERNAL_URLS={
    'https://jaredgoldberg.ca/writing/the-future-of-work-is-a-design-problem/',
    'https://jaredgoldberg.ca/writing/dignity-is-a-systems-output/',
    'https://jaredgoldberg.ca/projects/the-money-club/',
    'https://jaredgoldberg.ca/projects/capital-works/',
    'https://jaredgoldberg.ca/projects/',
    'https://jaredgoldberg.ca/work/china.html',
    'https://jaredgoldberg.ca/work/loblaw.html',
    'https://jaredgoldberg.ca/work/walmart.html',
    'https://jaredgoldberg.ca/work/canadian-tire.html',
}
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
APPROVED_IDENTITY_URLS={
    PRODUCTION_ORIGIN+'/#website',
    PRODUCTION_ORIGIN+'/#person',
    *(PRODUCTION_ORIGIN+path for path in CANONICAL_PATHS),
    *(PRODUCTION_ORIGIN+path+'#webpage' for path in CANONICAL_PATHS),
}
APPROVED_PUBLIC_IMAGES={
    'images/art-manufacture-value.png',
    'images/learning-work-agency.png',
    'images/media-archives-and-memory.png',
    'images/narcissus-as-narcosis-ios-interface-1024.jpg',
    'images/narcissus-as-narcosis-ios-interface-640.jpg',
    'images/narcissus-as-narcosis-login-composition-480.jpg',
    'images/narcissus-as-narcosis-login-composition-707.jpg',
    'images/narcissus-as-narcosis-portrait-01-480.jpg',
    'images/narcissus-as-narcosis-portrait-01-768.jpg',
    'images/narcissus-as-narcosis-portrait-02-480.jpg',
    'images/narcissus-as-narcosis-portrait-02-768.jpg',
    'images/narcissus-as-narcosis-portrait-03-480.jpg',
    'images/narcissus-as-narcosis-portrait-03-768.jpg',
    'images/narcissus-as-narcosis-portrait-04-480.jpg',
    'images/narcissus-as-narcosis-portrait-04-768.jpg',
    'images/systems-and-institutions.png',
}

def verify_html_policy(html,expected_path=None):
    production_urls=set(re.findall(r'https?://jaredgoldberg\.(?:ca|org)[^\s\"\x27<>]*',html))
    unexpected=production_urls-APPROVED_EXTERNAL_URLS-APPROVED_IDENTITY_URLS
    if unexpected:
        raise ValueError('Unexpected production URL: '+', '.join(sorted(unexpected)))
    if expected_path is None:return
    canonical=PRODUCTION_ORIGIN+expected_path
    canonicals=re.findall(r'<link rel="canonical" href="([^"]+)">',html)
    if canonicals != [canonical]:raise ValueError('Canonical URL mismatch')
    scripts=re.findall(r'<script type="application/ld\+json">([^<]+)</script>',html)
    if len(scripts)!=1:raise ValueError('Identity structured data missing or duplicated')
    data=json.loads(scripts[0]);graph={item['@id']:item for item in data.get('@graph',[])}
    if data.get('@context')!='https://schema.org':raise ValueError('Structured data context mismatch')
    if graph.get(PRODUCTION_ORIGIN+'/#website',{}).get('@type')!='WebSite':raise ValueError('WebSite identity mismatch')
    if graph.get(PRODUCTION_ORIGIN+'/#person',{}).get('@type')!='Person':raise ValueError('Person identity mismatch')
    page=graph.get(canonical+'#webpage',{})
    if page.get('@type')!='WebPage' or page.get('url')!=canonical:raise ValueError('WebPage identity mismatch')

def verify_sitemap(directory):
    root=ET.fromstring((Path(directory)/'sitemap.xml').read_bytes())
    namespace={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
    locations=[item.text for item in root.findall('s:url/s:loc',namespace)]
    if locations != [PRODUCTION_ORIGIN+path for path in CANONICAL_PATHS]:raise ValueError('Sitemap URL inventory mismatch')
    if root.findall('.//s:lastmod',namespace):raise ValueError('Sitemap must not claim unavailable modification dates')

def request(url):
    with tempfile.TemporaryDirectory(prefix='qa-http-') as tmp:
        headers, body = Path(tmp)/'headers', Path(tmp)/'body'
        result = subprocess.run(['curl','--silent','--show-error','--max-time','20',
            '--dump-header',str(headers),'--output',str(body),'--write-out','%{http_code}',url],check=True,capture_output=True,text=True)
        return int(result.stdout), headers.read_text().lower(), body.read_bytes()

def verify_pretty_routes(directory, base=URL):
    directory = Path(directory)
    for route,local_name in PRETTY_ROUTES.items():
        local=directory/local_name
        status,headers,body=request(base+route)
        if local.exists():
            if status != 200 or body != local.read_bytes():
                raise ValueError(f'{route}: pretty route mismatch')
        elif status != 404:
            raise ValueError(f'{route}: legacy release route must remain unavailable')
        if 'noindex' not in headers or 'no-store' not in headers:
            raise ValueError(f'{route}: missing QA headers')

def verify(directory, base=URL):
    directory = Path(directory)
    manifest = json.loads((directory/'artifact-manifest.json').read_text())
    release = json.loads((directory/'release.json').read_text())
    if manifest.get('schema') in (2,3):
        expected={'site':'jaredgoldberg.org','environment':'qa','gitSha':manifest.get('gitSha'),
                  'buildId':manifest.get('buildId'),'artifactManifest':'artifact-manifest.json'}
        images={name for name in manifest['files'] if name.startswith('images/')}
        if release != expected or not images.issubset(APPROVED_PUBLIC_IMAGES):
            raise ValueError('Invalid current QA release identity or allowlist')
    elif manifest.get('schema') != 1:
        raise ValueError('Unsupported QA artifact schema')
    for path in ['/','/index.html?qa=redirect']:
        status,headers,_=request(base.replace('https://','http://')+path)
        if status not in (301,308) or f'location: {base+path}\n' not in headers:
            raise ValueError('HTTP must redirect directly to the same QA HTTPS path')
    artifact_routes=['/'+name for name in manifest['files'] if not name.endswith('index.html')]
    for name in ['/',*artifact_routes,'/artifact-manifest.json']:
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
    if manifest.get('schema') in (2,3) and any('above-the-fold-prototype' in name or 'fixture' in name for name in manifest['files']):
        raise ValueError('Prototype or development fixture leaked into QA')
    if manifest.get('schema') == 3:verify_sitemap(directory)
    html_routes={'index.html':'/',**{name:path for path,name in PRETTY_ROUTES.items()}}
    for html in directory.rglob('*.html'):
        name=str(html.relative_to(directory))
        verify_html_policy(html.read_text(),html_routes.get(name) if manifest.get('schema')==3 else None)
    verify_pretty_routes(directory,base)
    for source,target in CANONICAL_REDIRECTS.items():
        status,headers,_=request(base+source)
        if status not in (301,308) or f'location: {base+target}\n' not in headers:
            raise ValueError(f'{source}: canonical redirect mismatch')
    for name in ['/.git/config','/.env','/package.json','/src/navigation.js','/scripts/deploy-qa.py',
                 '/docs/qa-runbook.md','/assets/','/fonts/','/images/','/assets/main.js.map','/missing-qa-route']:
        status, headers, _ = request(base+name)
        if status != 404: raise ValueError(f'{name}: expected 404, got {status}')
        if 'noindex' not in headers or 'no-store' not in headers: raise ValueError('Missing QA headers on 404')
    print('Public QA TLS, MIME, artifact, redirects and headers verified: '+manifest['gitSha'],flush=True)

if __name__ == '__main__': verify(sys.argv[1])
