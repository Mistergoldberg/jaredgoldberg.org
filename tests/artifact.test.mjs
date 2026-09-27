import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { files, digest, publicFiles } from '../scripts/build.mjs';
import { startServer } from '../scripts/serve.mjs';

test('artifact contains only intended public files, verified checksums and local references',async()=>{
  const googleTagUrl='https://www.googletagmanager.com/gtag/js?id=G-N6X517GEQ2';
  const approvedExternalLinks=new Set([
    'https://pixilation.org/',
    'https://picarty.com/',
    'https://jaredgoldberg.ca/writing/',
    'https://jaredgoldberg.ca/writing/medium-is-the-message/',
    'https://the-money-club.org/',
    'https://jaredgoldberg.ca/projects/the-money-club/maiden-voyage/',
    'https://jaredgoldberg.ca/writing/the-money-club-as-a-deployable-education-system/',
    'https://jaredgoldberg.ca/projects/capital-works/',
    'https://jaredgoldberg.ca/writing/the-future-of-work-is-a-design-problem/',
    'https://jaredgoldberg.ca/writing/dignity-is-a-systems-output/',
    'https://jaredgoldberg.ca/work/index.html',
    'https://jaredgoldberg.ca/work/china.html',
    'https://jaredgoldberg.ca/work/loblaw.html',
    'https://jaredgoldberg.ca/work/walmart.html',
    'https://jaredgoldberg.ca/work/canadian-tire.html',
    'https://jaredgoldberg.ca/writing/real-systems-incentives/',
    'https://duchamped.com/',
    'https://duchamped.com/duchamped/',
    'https://duchamped.com/the-pitch/',
  ]);
  const names=await files('dist');
  const manifest=JSON.parse(await readFile('dist/artifact-manifest.json','utf8'));
  const release=JSON.parse(await readFile('dist/release.json','utf8'));
  assert.equal(manifest.schema,2);
  assert.equal(manifest.environment,'qa');
  assert.equal(manifest.site,'jaredgoldberg.org');
  assert.equal(manifest.gitSha,release.gitSha);
  assert.equal(manifest.buildId,release.buildId);
  assert.equal(release.artifactManifest,'artifact-manifest.json');
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
      if(name==='favicon.svg'&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(ref)) continue;
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
  assert.match(html,/<link rel="preload" href="\/fonts\/1Ptug8zYS_SKggPNyC0IT4ttDfA\.woff2" as="font" type="font\/woff2" crossorigin>/);
  assert.doesNotMatch(html,/maximum-scale|user-scalable=no/);
  assert.doesNotMatch(html,/menu-panel__icon|>×<|>○<|>\+<|emoji/i);
  assert.match(html,/data-menu-toggle aria-label="Open menu"/);
  assert.match(html,/menu-trigger__label">Menu<\/span><span class="menu-trigger__icon" aria-hidden="true">/);
  assert.match(html,/<title>Art, Archives and Systems \| Practice Index<\/title>/);
  assert.match(html,/<meta name="description" content="An index of art, digital archives, participatory software, education projects and work with large institutions\.">/);
  assert.match(html,/<h1 id="home-title" aria-label="Art, archives and systems in practice">/);
  assert.match(html,/Four ways into the work/);
  assert.match(html,/About this index/);
  assert.match(html,/© 2026 Jared Goldberg/);
  assert.match(html,/<footer class="site-footer"[\s\S]*?<p class="site-footer__identity type-utility">JAREDGOLDBERG\.ORG<\/p>/);
  assert.match(html,/<section id="practice-index"/);
  assert.equal(html.match(/class="index-entry"/g)?.length,4);
  for(const route of ['media-archives-and-memory','community-service','systems-and-institutions','art']) assert.match(html,new RegExp(`href="/${route}/"`));
  assert.doesNotMatch(html,/<main[\s\S]*?<img\b|Destination pending|Five areas of inquiry|Selected projects and initiatives/);
  const sectionFiles=['media-archives-and-memory','community-service','systems-and-institutions','art'];
  const sectionTitles=[
    '640 × 480, Pixilation and Picarty | Media Archives',
    'The Money Club and Capability Works | Learning and Work',
    'How Institutions Make Decisions | Systems and Retail',
    'Duchamped, The Pitch and Artistic Value | Art',
  ];
  const sectionHeadings=[
    'Digital image archives, pixilation and participatory photography',
    'What does a person need in order to act?',
    'How institutions make decisions',
    'Art and the manufacture of value',
  ];
  const sectionHtml=await Promise.all(sectionFiles.map(slug=>readFile(`dist/${slug}/index.html`,'utf8')));
  for(const [index,pageHtml] of sectionHtml.entries()) {
    assert.equal(pageHtml.match(/G-N6X517GEQ2/g)?.length,2);
    assert.ok(pageHtml.includes(`<title>${sectionTitles[index]}</title>`));
    assert.ok(pageHtml.includes(`<h1><span class="heading-highlight">${sectionHeadings[index]}</span></h1>`));
    assert.match(pageHtml,/class="media-frame media-frame--banner media-frame--position-center media-placeholder" aria-hidden="true"/);
    assert.doesNotMatch(pageHtml,/section-page__identity|section-page__kicker/);
    assert.match(pageHtml,/<h2 id="table-of-contents-title"><span class="heading-highlight">Table of contents<\/span><\/h2>/);
    assert.match(pageHtml,/Explore Jared(?:'|&#39;)s practice/);
    assert.match(pageHtml,/<footer class="site-footer"[\s\S]*?<p class="site-footer__identity type-utility">JAREDGOLDBERG\.ORG<\/p>/);
    assert.match(pageHtml,/© 2026 Jared Goldberg/);
    assert.doesNotMatch(pageHtml,/Explore the practice/);
    assert.doesNotMatch(pageHtml,/>On this page</);
    assert.doesNotMatch(pageHtml,/<main[\s\S]*?<img\b|Editorial QA not for publication/);
  }
  assert.match(sectionHtml[1],/The market used virtual cash\./);
  assert.match(sectionHtml[1],/That relationship has not been demonstrated by an operating employment platform\./);
  assert.match(sectionHtml[1],/https:\/\/jaredgoldberg\.ca\/projects\/capital-works\//);
  assert.match(sectionHtml[2],/https:\/\/jaredgoldberg\.ca\/work\/canadian-tire\.html/);
  assert.match(sectionHtml[3],/They are not evidence here of independently verified market value, investment performance or an operating securities platform\./);
  assert.match(sectionHtml[3],/https:\/\/duchamped\.com\//);
  assert.deepEqual(publicFiles.slice().sort(),['favicon.svg','fonts/1Ptug8zYS_SKggPNyC0IT4ttDfA.woff2','fonts/OFL.txt']);
  assert.doesNotMatch(names.join('\n'),/above-the-fold-prototype|fixture|test-results/);
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

test('favicon embeds the approved PNG artwork losslessly',async()=>{
  const favicon=await readFile('dist/favicon.svg','utf8');
  assert.match(favicon,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 677 677">/);
  const embedded=favicon.match(/<image width="677" height="677" href="data:image\/png;base64,([A-Za-z0-9+/=]+)"\/>/);
  assert.ok(embedded,'Expected an embedded PNG favicon');
  assert.equal(digest(Buffer.from(embedded[1],'base64')),'53d1047bd69bd42fe824e1a8027f8c19b39dd3d1bfcef421048a2a261d92980c');
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
