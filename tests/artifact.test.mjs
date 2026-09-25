import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { files, digest } from '../scripts/build.mjs';
import { startServer } from '../scripts/serve.mjs';

test('artifact contains only intended public files, verified checksums and local references',async()=>{
  const googleTagUrl='https://www.googletagmanager.com/gtag/js?id=G-N6X517GEQ2';
  const approvedExternalLinks=new Set([
    'https://pixilation.org/',
    'https://picarty.com/',
    'https://jaredgoldberg.ca/projects/the-money-club/',
    'https://jaredgoldberg.ca/projects/capital-works/',
    'https://jaredgoldberg.ca/projects/',
    'https://jaredgoldberg.ca/work/china.html',
    'https://jaredgoldberg.ca/work/loblaw.html',
    'https://jaredgoldberg.ca/work/walmart.html',
    'https://jaredgoldberg.ca/work/canadian-tire.html',
    'https://duchamped.com/',
  ]);
  const names=await files('dist');
  const manifest=JSON.parse(await readFile('dist/artifact-manifest.json','utf8'));
  assert.deepEqual(names.filter(x=>x!=='artifact-manifest.json').sort(),Object.keys(manifest.files).sort());
  for(const name of names) {
    assert.match(name,/^(?:[a-z-]+\/)?index\.html$|^(?:robots\.txt|favicon\.svg|release\.json|artifact-manifest\.json|assets\/[\w.-]+\.(css|js)|images\/[\w.-]+\.(png|jpe?g|webp)|fonts\/OFL\.txt|fonts\/[\w.-]+\.(woff2?|ttf|otf))$/);
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
      const target=path==='/'?'index.html':path.endsWith('/')?path.replace(/^\//,'')+'index.html':path.replace(/^\//,'');
      if(path) assert.ok(names.includes(target),`Missing ${ref}`);
      if(ref.includes('#')) {
        const anchorFile=path?target:name;
        assert.ok((await readFile(join('dist',anchorFile),'utf8')).includes(`id="${ref.split('#')[1]}"`),`Missing anchor ${ref}`);
      }
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
  assert.match(html,/<meta name="description" content="Jared Goldberg makes art, software, public projects and large work systems\./);
  assert.match(html,/<h1 id="home-title" aria-label="Jared Goldberg"><span aria-hidden="true">Jared<\/span><span aria-hidden="true">Goldberg<\/span><\/h1>/);
  assert.match(html,/<section id="practice-index"/);
  assert.equal(html.match(/class="index-entry"/g)?.length,4);
  for(const route of ['media-archives-and-memory','community-service','systems-and-institutions','art']) assert.match(html,new RegExp(`href="/${route}/"`));
  assert.doesNotMatch(html,/<main[\s\S]*?<img\b|Destination pending|Five areas of inquiry|Selected projects and initiatives/);
  const sectionFiles=['media-archives-and-memory','community-service','systems-and-institutions','art'];
  const sectionHtml=await Promise.all(sectionFiles.map(slug=>readFile(`dist/${slug}/index.html`,'utf8')));
  for(const [index,pageHtml] of sectionHtml.entries()) {
    assert.equal(pageHtml.match(/G-N6X517GEQ2/g)?.length,2);
    assert.match(pageHtml,new RegExp(`<h1>${['Media, Archives and Memory','Community Service','Systems and Institutions','Art'][index]}<\\/h1>`));
    assert.match(pageHtml,/class="media-frame media-frame--banner media-placeholder" aria-hidden="true"/);
    assert.doesNotMatch(pageHtml,/section-page__identity|section-page__kicker/);
    assert.doesNotMatch(pageHtml,/<main[\s\S]*?<img\b|Editorial QA not for publication/);
  }
  assert.match(sectionHtml[1],/This is not yet a proven employment platform\./);
  assert.match(sectionHtml[1],/https:\/\/jaredgoldberg\.ca\/projects\/capital-works\//);
  assert.match(sectionHtml[2],/https:\/\/jaredgoldberg\.ca\/work\/canadian-tire\.html/);
  assert.match(sectionHtml[3],/<em>Sperme d’artiste<\/em>/);
  assert.match(sectionHtml[3],/https:\/\/duchamped\.com\//);
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
  assert.doesNotMatch(rules,/counter-(?:reset|increment):\s*inquiry|content:\s*"0"\s*counter\(inquiry\)/);
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
    for(const path of ['/media-archives-and-memory/','/community-service/','/systems-and-institutions/','/art/']) assert.equal((await fetch(url+path)).status,200,path);
    for(const path of ['/missing','/.git/config','/src/navigation.js','/docs/qa-runbook.md','/package.json']) assert.equal((await fetch(url+path)).status,404,path);
    assert.equal((await fetch(url+'/',{method:'POST'})).status,405);
  } finally { await new Promise(done=>server.close(done)); }
});
