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
  assert.match(html,/<title>Jared Goldberg — Artist, systems designer and writer<\/title>/);
  assert.match(html,/<meta name="description" content="Jared Goldberg makes art, software, public projects and large work systems\./);
  assert.match(html,/<h1 id="home-title" aria-label="Jared Goldberg"><span class="heading-highlight" aria-hidden="true">Jared<\/span><span class="heading-highlight" aria-hidden="true">Goldberg<\/span><\/h1>/);
  assert.match(html,/An institutional index of Jared's practice/);
  assert.match(html,/Four ways into the work/);
  assert.match(html,/How does a photograph change when it becomes a sequence, a playable archive or material for another artist(?:'|&#39;)s self-portrait\? Follow 640 × 480, Pixilation and Narcissus as Narcosis through Picarty\./);
  assert.match(html,/What must a system provide before a person can act\? The Money Club tests an education method with young people\. Capability Works proposes a way to rebuild jobs around actual capabilities\./);
  assert.match(html,/How do factories and retailers turn decisions into products, shelf space and media\? Read an institutional account of the roles, measures and incentives behind Goldberg(?:'|&#39;)s work in China and Canadian retail\./);
  assert.match(html,/What happens when an artist changes the frame around an object, a name or a price\? Enter Duchamped, the historical stage name Jared the Jew, and <em>The Pitch<\/em>\./);
  assert.match(html,/Explore the image archives and participatory media/);
  assert.match(html,/Explore the education and employment projects/);
  assert.match(html,/Explore the systems and institutions/);
  assert.match(html,/Explore the art practice/);
  assert.doesNotMatch(html,/Explore the practice|An institutional index of one practice/);
  assert.match(html,/<footer class="site-footer"[\s\S]*?<p class="site-footer__identity type-utility">JAREDGOLDBERG\.ORG<\/p>/);
  assert.match(html,/<section id="practice-index"/);
  assert.equal(html.match(/class="index-entry"/g)?.length,4);
  for(const route of ['media-archives-and-memory','community-service','systems-and-institutions','art']) assert.match(html,new RegExp(`href="/${route}/"`));
  assert.doesNotMatch(html,/<main[\s\S]*?<img\b|Destination pending|Five areas of inquiry|Selected projects and initiatives/);
  const sectionFiles=['media-archives-and-memory','community-service','systems-and-institutions','art'];
  const sectionImages=[
    ['media-archives-and-memory.png','A six-frame collage of a person holding a Pretec DC530 camera, the camera alone, and overexposed light.',1920,1080],
    ['learning-work-agency.png','A compass surrounded by community networks, public buildings, construction drawings and a classroom.',1536,1024],
    ['systems-and-institutions.png','A compass surrounded by shipping, transit, energy and industrial infrastructure.',1536,1024],
    ['art-manufacture-value.png','A gloved hand holds a specimen cup labelled The subversive Artist.',1481,987],
  ];
  const sectionHtml=await Promise.all(sectionFiles.map(slug=>readFile(`dist/${slug}/index.html`,'utf8')));
  for(const [index,pageHtml] of sectionHtml.entries()) {
    const [imageName,imageAlt,imageWidth,imageHeight]=sectionImages[index];
    assert.equal(pageHtml.match(/G-N6X517GEQ2/g)?.length,2);
    assert.match(pageHtml,new RegExp(`<h1><span class="heading-highlight">${['Media, archives and memory','Learning, work and agency','Systems and institutions','Art and the manufacture of value'][index]}<\\/span><\\/h1>`));
    assert.ok(pageHtml.includes(`<img src="/images/${imageName}" alt="${imageAlt}" width="${imageWidth}" height="${imageHeight}" loading="eager" decoding="async" fetchpriority="high">`));
    assert.doesNotMatch(pageHtml,/media-placeholder|Image pending/);
    assert.doesNotMatch(pageHtml,/section-page__identity|section-page__kicker/);
    assert.match(pageHtml,/<h2 id="table-of-contents-title"><span class="heading-highlight">Table of contents<\/span><\/h2>/);
    assert.match(pageHtml,/Explore Jared(?:'|&#39;)s practice/);
    assert.match(pageHtml,/<footer class="site-footer"[\s\S]*?<p class="site-footer__identity type-utility">JAREDGOLDBERG\.ORG<\/p>/);
    assert.doesNotMatch(pageHtml,/Explore the practice/);
    assert.doesNotMatch(pageHtml,/>On this page</);
    assert.equal(pageHtml.match(/<img\b/g)?.length,index===0?7:1);
    assert.doesNotMatch(pageHtml,/Editorial QA not for publication/);
  }
  assert.match(sectionHtml[1],/This is not yet a proven employment platform\./);
  assert.match(sectionHtml[1],/https:\/\/jaredgoldberg\.ca\/projects\/capital-works\//);
  assert.match(sectionHtml[2],/https:\/\/jaredgoldberg\.ca\/work\/canadian-tire\.html/);
  assert.match(sectionHtml[3],/<em>Sperme d’artiste<\/em>/);
  assert.match(sectionHtml[3],/https:\/\/duchamped\.com\//);
  assert.equal(sectionHtml[0].match(/<title>640 × 480, Pixilation and Narcissus as Narcosis<\/title>/g)?.length,1);
  assert.equal(sectionHtml[0].match(/<meta name="description" content="How 640 × 480, Pixilation and Narcissus as Narcosis use archives, interfaces and participation to change how photographs are made and read\.">/g)?.length,1);
  assert.doesNotMatch(sectionHtml[0],/<title>[^<]*Jared Goldberg/);
  assert.match(sectionHtml[0],/<li><a href="#narcissus-as-narcosis">Narcissus as Narcosis<\/a><\/li>/);
  const narcissusHtml=sectionHtml[0].match(/<section class="article-section" aria-labelledby="narcissus-as-narcosis">[\s\S]*?<\/section>/)?.[0];
  assert.ok(narcissusHtml);
  assert.match(narcissusHtml,/<h2 id="narcissus-as-narcosis"><span class="heading-highlight">Narcissus as Narcosis: the subject is part of the system<\/span><\/h2>/);
  assert.equal(narcissusHtml.match(/<p>/g)?.length,9);
  assert.equal(narcissusHtml.match(/<img\b/g)?.length,6);
  assert.equal(narcissusHtml.match(/ loading="lazy"/g)?.length,6);
  assert.equal(narcissusHtml.match(/ srcset="/g)?.length,6);
  assert.equal(narcissusHtml.match(/ sizes="/g)?.length,6);
  assert.match(narcissusHtml,/Selected Orchestrated Self Portraits from Narcissus as Narcosis\./);
  assert.match(narcissusHtml,/Mashup interface, iOS app, 2012–2016\./);
  assert.match(narcissusHtml,/<p><em>Narcissus as Narcosis<\/em> begins where/);
  assert.match(narcissusHtml,/<p>Picarty is Mashup(?:'|&#39;)s current web form/);
  assert.doesNotMatch(narcissusHtml,/href="https:\/\/(?:duchamped\.com\/narcussis-explained|picarty\.com)\//);
  assert.match(narcissusHtml,/class="narcissus-figure narcissus-figure--portrait-row-height"/);
  assert.doesNotMatch(narcissusHtml,/duchamped\.com\/wp-content\/uploads/);
  assert.match(sectionHtml[0],/>Try the current Mashup interface at Picarty</);
  assert.deepEqual(publicFiles.slice().sort(),[
    'favicon.svg',
    'fonts/1Ptug8zYS_SKggPNyC0IT4ttDfA.woff2',
    'fonts/OFL.txt',
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
  ]);
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
