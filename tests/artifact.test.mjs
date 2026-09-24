import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { files, digest } from '../scripts/build.mjs';
import { startServer } from '../scripts/serve.mjs';

test('artifact contains only intended public files, verified checksums and local references',async()=>{
  const googleTagUrl='https://www.googletagmanager.com/gtag/js?id=G-N6X517GEQ2';
  const approvedExternalLinks=new Set([
    'https://jaredgoldberg.ca/writing/the-future-of-work-is-a-design-problem/',
    'https://jaredgoldberg.ca/writing/dignity-is-a-systems-output/',
  ]);
  const names=await files('dist');
  const manifest=JSON.parse(await readFile('dist/artifact-manifest.json','utf8'));
  assert.deepEqual(names.filter(x=>x!=='artifact-manifest.json').sort(),Object.keys(manifest.files).sort());
  for(const name of names) {
    assert.match(name,/^(index\.html|robots\.txt|favicon\.svg|release\.json|artifact-manifest\.json|assets\/[\w.-]+\.(css|js)|images\/[\w.-]+\.(png|jpe?g|webp)|fonts\/OFL\.txt|fonts\/[\w.-]+\.(woff2?|ttf|otf))$/);
    const buffer=await readFile(join('dist',name));
    if(name!=='artifact-manifest.json') assert.equal(digest(buffer),manifest.files[name]);
    if(/\.(woff2?|ttf|otf|png|jpe?g|webp)$/.test(name)) continue;
    const content=buffer.toString();
    assert.doesNotMatch(content,/GTM-[A-Z0-9]+|UA-\d+-\d+|cloudflareinsights|data-track|application\/ld\+json|rel=["']canonical|property=["']og:|https:\/\/jaredgoldberg\.org/i);
    for(const match of content.matchAll(/(?:src|href)=["']([^"']+)|url\(["']?([^\s)"']+)/g)) {
      const ref=match[1]||match[2];
      if(ref===googleTagUrl) continue;
      if(/^(https?:)?\/\//.test(ref)) {
        assert.ok(approvedExternalLinks.has(ref),`Unapproved external destination: ${ref}`);
        continue;
      }
      const path=ref.split(/[?#]/)[0];
      if(path) assert.ok(names.includes(path==='/'?'index.html':path.replace(/^\//,'')),`Missing ${ref}`);
      if(ref.includes('#')) assert.ok((await readFile('dist/index.html','utf8')).includes(`id="${ref.split('#')[1]}"`),`Missing anchor ${ref}`);
    }
  }
  assert.match(await readFile('dist/robots.txt','utf8'),/User-agent: \*\s+Disallow: \//);
  const html=await readFile('dist/index.html','utf8');
  assert.equal(html.match(/G-N6X517GEQ2/g)?.length,2);
  assert.match(html,/<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-N6X517GEQ2"><\/script>/);
  assert.match(html,/window\.dataLayer = window\.dataLayer \|\| \[\];\s+function gtag\(\)\{dataLayer\.push\(arguments\);\}\s+gtag\('js', new Date\(\)\);\s+gtag\('config', 'G-N6X517GEQ2'\);/);
  assert.match(html,/<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(html,/maximum-scale|user-scalable=no/);
  assert.doesNotMatch(html,/menu-panel__icon|>×<|>○<|>\+<|emoji/i);
  assert.match(html,/data-menu-toggle aria-label="Open menu"/);
  assert.match(html,/menu-trigger__label">Menu<\/span><span class="menu-trigger__icon" aria-hidden="true">/);
  assert.match(html,/<meta name="description" content="Jared Goldberg works across art, software, archives, education, professional systems and public writing\.">/);
  assert.match(html,/<h1 id="home-title" aria-label="Jared Goldberg"><span aria-hidden="true">Jared<\/span><span aria-hidden="true">Goldberg<\/span><\/h1>/);
  for(const id of ['inquiries','projects','archive','writing','ecosystem','start']) assert.match(html,new RegExp(`<section id="${id}"`));
  assert.equal(html.match(/class="record record--inquiry"/g)?.length,5);
  assert.equal(html.match(/class="record record--project"/g)?.length,7);
  assert.equal(html.match(/class="writing-record"/g)?.length,2);
  assert.equal(html.match(/class="start-route"/g)?.length,4);
  assert.equal(html.match(/data-destination-status="pending"/g)?.length,6);
  assert.match(html,/Institutional project in development/);
  assert.match(html,/Developing proposal/);
  assert.match(html,/Employer-owned work/);
  assert.match(html,/In-store retail media systems/);
  assert.match(html,/The Conditions of Dignity Are a Systems Output/);
  assert.match(html,/https:\/\/jaredgoldberg\.ca\/writing\/the-future-of-work-is-a-design-problem\//);
  assert.match(html,/https:\/\/jaredgoldberg\.ca\/writing\/dignity-is-a-systems-output\//);
  assert.doesNotMatch(html,/<main[\s\S]*?<img\b/);
  assert.doesNotMatch(html,/TEMPORARY QA FIXTURE|Content-pattern stress test|Destination pending<\/a>/);
  assert.equal(digest(await readFile('dist/images/above-the-fold-prototype.png')),'907e026d74ec626d044cdac1b88c2e9ba7d9d6c926be680f62e8a953384c7e82');
  assert.match(html,/menu-panel__close-icon/);
  assert.match(html,/menu-panel__chevron/);
});

test('required licensed webfont is unmodified and embedded locally',async()=>{
  const policy=JSON.parse(await readFile('tests/font-policy.json','utf8'));
  const manifest=JSON.parse(await readFile('dist/artifact-manifest.json','utf8'));
  const actual=Object.keys(manifest.files).filter(x=>/\.(woff2?|ttf|otf)$/.test(x));
  assert.deepEqual(actual.sort(),policy.requiredFiles.slice().sort());
  const css=await readFile(join('dist',Object.keys(manifest.files).find(x=>x.endsWith('.css'))),'utf8');
  const rules=css.replace(/\/\*[\s\S]*?\*\//g,'');
  if(!policy.requiredFiles.length) assert.doesNotMatch(rules,/@font-face/);
  for(const file of policy.requiredFiles) {
    assert.ok(rules.includes('/'+file));
    assert.equal(digest(await readFile(join('dist',file))),policy.sha256);
  }
  assert.match(await readFile('dist/fonts/OFL.txt','utf8'),/SIL OPEN FONT LICENSE Version 1.1/);
  assert.match(rules,/font-weight: 100 900/);
  assert.match(rules,/font-display: swap/);
  assert.ok(policy.weights.includes(200));
  assert.match(rules,/--font-weight-extralight:\s*200/);
  assert.match(rules,/font-weight:\s*var\(--font-weight-extralight\)/);
  assert.match(rules,/--line-height-display:\s*0\.90/);
  assert.match(rules,/--tracking-display:\s*-0\.03em/);
  assert.match(rules,/h1\s*\{[^}]*font-weight:\s*var\(--font-weight-heavy\)[^}]*line-height:\s*var\(--line-height-display\)[^}]*letter-spacing:\s*var\(--tracking-display\)/s);
  assert.match(rules,/--color-accent:\s*#990202/);
  assert.match(rules,/--color-focus:\s*var\(--color-accent\)/);
  assert.match(rules,/--color-focus-contrast:\s*#ffffff/);
  assert.match(rules,/--color-link:\s*var\(--color-accent\)/);
  assert.match(rules,/\.media-frame--banner\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/s);
  assert.match(rules,/@media \(max-width: 47\.99rem\)[\s\S]*?\.media-frame--banner\s*\{\s*aspect-ratio:\s*1/s);
  assert.doesNotMatch(rules,/#1f5fff/i);
});

test('HTTP routes, QA headers, hashed cache rules and private paths',async()=>{
  const server=await startServer({port:0});
  const url=`http://127.0.0.1:${server.address().port}`;
  try {
    for(const file of await files('dist')) {
      const response=await fetch(url+'/'+file);
      assert.equal(response.status,200,file);
      assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
      assert.match(response.headers.get('cache-control'),/\.[a-f0-9]{16}\.(css|js)$/.test(file)?/immutable/:/no-store/);
    }
    assert.equal((await fetch(url+'/')).status,200);
    for(const path of ['/missing','/.git/config','/src/navigation.js','/docs/qa-runbook.md','/package.json']) assert.equal((await fetch(url+path)).status,404,path);
    assert.equal((await fetch(url+'/',{method:'POST'})).status,405);
  } finally { await new Promise(done=>server.close(done)); }
});
