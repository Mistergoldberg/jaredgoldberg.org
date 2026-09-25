import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { startServer } from '../scripts/serve.mjs';

const publicQA=process.env.QA_PUBLIC==='1';
const results=publicQA?'test-results/public-qa':'test-results';
const googleTagUrl='https://www.googletagmanager.com/gtag/js?id=G-N6X517GEQ2';
const sizes=[[1440,900],[1024,768],[768,1024],[720,450],[667,375],[430,932],[393,852],[390,844],[375,667],[320,568]];
const screenshotSizes=new Set(['1440x900','1024x768','390x844','320x568']);
const mobileSizes=[[430,932],[393,852],[390,844],[375,667],[320,568],[667,375],[720,450]];
const sectionPages=[
  {slug:'media-archives-and-memory',title:'Media, Archives and Memory',sections:2,links:2},
  {slug:'community-service',title:'Community Service',sections:3,links:3},
  {slug:'systems-and-institutions',title:'Systems and Institutions',sections:4,links:4},
  {slug:'art',title:'Art',sections:4,links:1},
];
const relativeLuminance=hex=>{
  const channels=hex.match(/[\da-f]{2}/gi).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
  return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
};
const contrastRatio=(left,right)=>{
  const values=[relativeLuminance(left),relativeLuminance(right)].sort((a,b)=>b-a);
  return (values[0]+.05)/(values[1]+.05);
};
const newContext=async(browser,options)=>{
  const context=await browser.newContext(options);
  await context.route(googleTagUrl,route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
  return context;
};
const observe=(page,base)=>{
  const state={errors:[],external:[],badResponses:[],requests:[]};
  page.on('pageerror',error=>state.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error') state.errors.push(message.text());});
  page.on('request',request=>{state.requests.push(request.url());if(new URL(request.url()).origin!==new URL(base).origin) state.external.push(request.url());});
  page.on('response',response=>{if(response.status()>=400) state.badResponses.push(response.url());});
  return state;
};

test('four-route index, navigation, focus, motion and accessibility gates', {timeout:180000},async(t)=>{
  const server=publicQA?null:await startServer({port:0});
  const base=publicQA?'https://qa.jaredgoldberg.org':`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{});
  await mkdir(`${results}/screenshots`,{recursive:true});
  const report={url:base,browser:browser.version(),page:'four-route institutional index',viewports:[],sections:[],mobileSticky:[]};
  try {
    for(const [width,height] of sizes) await t.test(`home ${width}x${height}`,async()=>{
      const context=await newContext(browser,{viewport:{width,height},isMobile:width<768,hasTouch:width<768});
      const page=await context.newPage(),network=observe(page,base);
      assert.equal((await page.goto(base)).status(),200);
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.locator('link[rel=canonical]').count(),0);
      assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex, nofollow');
      assert.match(await page.locator('meta[name=description]').getAttribute('content'),/^Jared Goldberg makes art, software/);
      const analytics=await page.evaluate(()=>window.dataLayer?.map(entry=>[entry[0],entry[1] instanceof Date?'date':entry[1]]));
      assert.deepEqual(analytics,[['js','date'],['config','G-N6X517GEQ2']]);
      const computed=await page.evaluate(()=>({fontFamily:getComputedStyle(document.body).fontFamily,fonts:document.fonts.size,overflow:document.documentElement.scrollWidth>innerWidth,menuTrigger:document.querySelector('[data-menu-toggle]').getBoundingClientRect().toJSON()}));
      assert.equal(computed.overflow,false);assert.ok(computed.menuTrigger.width>=44&&computed.menuTrigger.height>=44);assert.match(computed.fontFamily,/Raleway.*Avenir Next.*Segoe UI/);
      const shellWidths=await page.locator('.home-hero > .layout-shell, .home-index > .layout-shell, .site-footer .layout-shell').evaluateAll(shells=>shells.map(shell=>shell.getBoundingClientRect().width));
      assert.equal(shellWidths.length,3);for(const shellWidth of shellWidths) assert.ok(Math.abs(shellWidth-shellWidths[0])<.5);
      if(width<768) {
        const gutters=await page.locator('main .layout-shell').evaluateAll((shells,viewportWidth)=>shells.map(shell=>{const rect=shell.getBoundingClientRect();return {left:rect.left,right:viewportWidth-rect.right};}),width);
        for(const gutter of gutters) assert.ok(Math.abs(gutter.left-gutter.right)<.5);
      }
      assert.equal(await page.getByRole('heading',{level:1,name:'Jared Goldberg',exact:true}).count(),1);
      assert.equal(await page.getByRole('heading',{level:2,name:"Explore Jared's practice",exact:true}).count(),1);
      assert.equal(await page.getByText("An institutional index of Jared's practice",{exact:true}).count(),1);
      assert.equal(await page.locator('.site-footer__identity').innerText(),'JAREDGOLDBERG.ORG');
      assert.equal(await page.getByRole('heading',{level:3}).count(),4);
      assert.equal(await page.locator('.index-entry').count(),4);
      assert.equal(await page.locator('.index-entry a').count(),4);
      assert.deepEqual(await page.locator('.index-entry a').evaluateAll(links=>links.map(link=>link.getAttribute('href'))),sectionPages.map(item=>`/${item.slug}/`));
      assert.equal(await page.locator('main img, main picture, .media-placeholder').count(),0);
      const displayType=await page.locator('h1').evaluate(element=>{const style=getComputedStyle(element),lines=[...element.children].map(line=>line.getBoundingClientRect().toJSON());return {fontWeight:style.fontWeight,lineHeightRatio:parseFloat(style.lineHeight)/parseFloat(style.fontSize),trackingRatio:parseFloat(style.letterSpacing)/parseFloat(style.fontSize),overflow:element.scrollWidth>element.clientWidth,lines};});
      assert.equal(displayType.fontWeight,'900');assert.ok(Math.abs(displayType.lineHeightRatio-.9)<.001);assert.ok(Math.abs(displayType.trackingRatio+.03)<.001);assert.equal(displayType.overflow,false);assert.ok(displayType.lines.every(line=>line.width<=width));assert.ok(Math.abs(displayType.lines[1].top-displayType.lines[0].bottom)<1);
      const heroHighlights=await page.evaluate(()=>[...document.querySelectorAll('.home-hero h1 > span'),document.querySelector('.home-hero__role')].map(element=>({color:getComputedStyle(element).color,background:getComputedStyle(element).backgroundColor})));
      for(const highlight of heroHighlights){assert.equal(highlight.color,'rgb(255, 255, 255)');assert.equal(highlight.background,'rgb(0, 0, 0)');}
      const homeRhythm=await page.evaluate(()=>{const hero=document.querySelector('.home-hero').getBoundingClientRect(),nameLines=[...document.querySelectorAll('.home-hero h1 > span')].map(line=>line.getBoundingClientRect()),introduction=document.querySelector('.home-hero__introduction').getBoundingClientRect(),indexHeader=document.querySelector('.home-index__header').getBoundingClientRect(),indexTitle=document.querySelector('.home-index__header h2').getBoundingClientRect(),indexIntroduction=document.querySelector('.home-index__header p').getBoundingClientRect();return {heroHeight:hero.height,introductionToGoldberg:introduction.top-nameLines[1].top,indexTitleWidth:indexTitle.width,indexHeaderWidth:indexHeader.width,indexIntroductionLeft:indexIntroduction.left,indexTitleLeft:indexTitle.left,indexIntroductionTop:indexIntroduction.top,indexTitleBottom:indexTitle.bottom};});
      if(width>=768){assert.ok(homeRhythm.heroHeight<=705);assert.ok(Math.abs(homeRhythm.introductionToGoldberg)<2);assert.ok(homeRhythm.indexTitleWidth/homeRhythm.indexHeaderWidth>.6);}
      assert.ok(Math.abs(homeRhythm.indexIntroductionLeft-homeRhythm.indexTitleLeft)<1);assert.ok(homeRhythm.indexIntroductionTop>homeRhythm.indexTitleBottom);
      const accent=await page.evaluate(()=>{const style=getComputedStyle(document.documentElement);return {value:style.getPropertyValue('--color-accent').trim(),contrast:style.getPropertyValue('--color-focus-contrast').trim(),surfaces:['--color-background','--color-surface','--color-surface-muted'].map(token=>style.getPropertyValue(token).trim()),dark:style.getPropertyValue('--color-text-primary').trim()};});
      assert.equal(accent.value,'#990202');for(const surface of accent.surfaces) assert.ok(contrastRatio(accent.value,surface)>=4.5);assert.ok(contrastRatio(accent.contrast,accent.dark)>=3);
      const fontPolicy=JSON.parse(await readFile('tests/font-policy.json','utf8'));for(const font of fontPolicy.requiredFiles) assert.ok(network.requests.includes(base+'/'+font));
      await page.screenshot({path:`${results}/screenshots/home-${width}x${height}-closed.png`});
      if(screenshotSizes.has(`${width}x${height}`)) await page.screenshot({path:`${results}/screenshots/home-${width}x${height}-full.png`,fullPage:true});
      assert.deepEqual((await new AxeBuilder({page}).analyze()).violations,[]);
      await page.keyboard.press('Tab');assert.equal(await page.locator('.skip-link').evaluate(element=>element===document.activeElement),true);
      await page.keyboard.press('Tab');const trigger=page.locator('[data-menu-toggle]');assert.equal(await trigger.evaluate(element=>element===document.activeElement),true);
      const triggerFocus=await trigger.evaluate(element=>({outline:getComputedStyle(element).outlineColor,inner:getComputedStyle(element).boxShadow}));assert.equal(triggerFocus.outline,'rgb(153, 2, 2)');assert.match(triggerFocus.inner,/rgb\(255, 255, 255\)/);
      await page.keyboard.press('Enter');await page.locator('.menu-panel.is-open').waitFor();
      const close=page.getByRole('button',{name:'Close menu',exact:true});assert.equal(await close.evaluate(element=>element===document.activeElement),true);assert.equal(await page.locator('main').getAttribute('inert'),'');
      await page.locator('.menu-panel__sheet').evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
      const sheetWidth=await page.locator('.menu-panel__sheet').evaluate(element=>element.getBoundingClientRect().width);const expectedSheetWidth=width<768?Math.min(384,width-44):width<1024?Math.min(384,width-48):Math.min(448,width-48);assert.ok(Math.abs(sheetWidth-expectedSheetWidth)<1);
      assert.equal(await page.locator('.menu-panel a[aria-current=page]').getAttribute('href'),'/');
      await page.screenshot({path:`${results}/screenshots/home-${width}x${height}-menu.png`});assert.deepEqual((await new AxeBuilder({page}).analyze()).violations,[]);
      const explore=page.locator('.menu-panel summary').filter({hasText:"Explore Jared's practice"});
      await page.keyboard.press('Shift+Tab');assert.equal(await explore.evaluate(element=>element===document.activeElement),true);
      await page.keyboard.press('Tab');assert.equal(await close.evaluate(element=>element===document.activeElement),true);
      await explore.click();
      const interactive=page.locator('.menu-panel__sheet a, .menu-panel__sheet button, .menu-panel__sheet summary');for(const element of await interactive.all()){if(!await element.isVisible())continue;const rect=await element.evaluate(item=>item.getBoundingClientRect().toJSON());assert.ok(rect.width>=44&&rect.height>=44);}
      await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(element=>element===document.activeElement),true);assert.equal(await page.locator('main').getAttribute('inert'),null);
      await page.emulateMedia({reducedMotion:'reduce'});await trigger.click();const duration=await page.locator('.menu-panel__sheet').evaluate(element=>parseFloat(getComputedStyle(element).transitionDuration));assert.ok(duration<.001);await page.keyboard.press('Escape');
      assert.deepEqual(network.errors,[]);assert.deepEqual(network.external,[googleTagUrl]);assert.deepEqual(network.badResponses,[]);
      report.viewports.push({width,height,...computed,homeRhythm,sheetWidth,headings:{h1:1,h2:1,h3:4},indexEntries:4,axeViolations:0,consoleErrors:0,externalRequests:1,reducedMotionSeconds:duration});
      await context.close();
    });

    for(const item of sectionPages) for(const [width,height] of [[1440,900],[768,1024],[390,844]]) await t.test(`${item.slug} ${width}x${height}`,async()=>{
      const context=await newContext(browser,{viewport:{width,height},isMobile:width<768,hasTouch:width<768});
      const page=await context.newPage(),network=observe(page,base),url=`${base}/${item.slug}/`;
      assert.equal((await page.goto(url)).status(),200);await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.getByRole('heading',{level:1,name:item.title,exact:true}).count(),1);
      assert.equal(await page.locator('main').getByText('JAREDGOLDBERG.ORG',{exact:true}).count(),0);
      assert.equal(await page.getByText('PRACTICE SECTION',{exact:true}).count(),0);
      assert.equal(await page.getByRole('heading',{level:2,name:'Table of contents',exact:true}).count(),1);
      assert.equal(await page.getByText('On this page',{exact:true}).count(),0);
      assert.equal(await page.locator('.article-section').count(),item.sections);
      assert.equal(await page.locator('.section-page__destinations a.text-link--external').count(),item.links);
      assert.equal(await page.locator('.section-page__toc a').count(),item.sections);
      assert.equal(await page.locator('.section-page__siblings a').count(),4);
      assert.equal(await page.getByRole('heading',{level:2,name:"Explore Jared's practice",exact:true}).count(),1);
      assert.equal(await page.locator('.site-footer__identity').innerText(),'JAREDGOLDBERG.ORG');
      assert.equal(await page.locator('.section-page__siblings a[aria-current=page]').getAttribute('href'),`/${item.slug}/`);
      assert.equal(await page.locator('main img, main picture').count(),0);assert.equal(await page.locator('.media-placeholder[aria-hidden=true]').count(),1);
      const media=await page.locator('.media-frame--banner').evaluate(element=>{const rect=element.getBoundingClientRect();return {ratio:rect.width/rect.height,overflow:document.documentElement.scrollWidth>innerWidth};});
      assert.equal(media.overflow,false);assert.ok(Math.abs(media.ratio-(width<768?1:16/9))<.02);
      const rhythm=await page.evaluate(()=>{const header=document.querySelector('.site-header--overlay'),headerRect=header.getBoundingClientRect(),title=document.querySelector('.section-page__hero h1').getBoundingClientRect(),media=document.querySelector('.media-frame--banner').getBoundingClientRect(),layout=document.querySelector('.section-page__layout').getBoundingClientRect(),tocElement=document.querySelector('.section-page__toc'),tocNav=tocElement.querySelector('nav'),toc=tocElement.getBoundingClientRect(),tocItems=[...tocElement.querySelectorAll('li')].map(item=>item.getBoundingClientRect().toJSON()),article=document.querySelector('.section-page__article').getBoundingClientRect(),firstParagraph=document.querySelector('.article-section p').getBoundingClientRect(),sections=[...document.querySelectorAll('.article-section')];return {headerPosition:getComputedStyle(header).position,headerHeight:headerRect.height,headerBottom:headerRect.bottom,titleTop:title.top,titleToMedia:media.top-title.bottom,titleRightDelta:media.right-title.right,tocPosition:getComputedStyle(tocNav).position,tocTopOffset:parseFloat(getComputedStyle(tocNav).top),tocItems,mediaToLayout:layout.top-media.bottom,columnGap:article.left-toc.right,articleRightDelta:media.right-article.right,paragraphRightDelta:article.right-firstParagraph.right,sectionGaps:sections.slice(1).map((section,index)=>section.querySelector('h2').getBoundingClientRect().top-sections[index].querySelector('p:last-child').getBoundingClientRect().bottom)};});
      assert.ok(Math.abs(rhythm.titleRightDelta)<1);
      if(width>=768){assert.equal(rhythm.headerPosition,'sticky');assert.ok(Math.abs(rhythm.headerHeight-76)<1);assert.ok(Math.abs(rhythm.titleTop-rhythm.headerBottom-32)<1);assert.ok(Math.abs(rhythm.titleToMedia-24)<1);assert.equal(rhythm.tocPosition,'sticky');assert.ok(rhythm.tocTopOffset>=rhythm.headerHeight+15);assert.ok(Math.abs(rhythm.columnGap-25.888)<1);assert.ok(Math.abs(rhythm.articleRightDelta)<1);assert.ok(Math.abs(rhythm.paragraphRightDelta)<1);}
      else {assert.equal(rhythm.tocPosition,'static');assert.equal(new Set(rhythm.tocItems.map(rect=>Math.round(rect.left))).size,1);for(let index=1;index<rhythm.tocItems.length;index+=1)assert.ok(rhythm.tocItems[index].top>=rhythm.tocItems[index-1].bottom);}
      assert.ok(rhythm.mediaToLayout<=(width<768?33:49));
      assert.ok(rhythm.sectionGaps.every(gap=>gap<=(width<768?49:65)));
      if(width>=768){await page.evaluate(()=>scrollTo({top:document.querySelectorAll('.article-section')[1]?.offsetTop??document.querySelector('.section-page__layout').offsetTop,behavior:'instant'}));await page.evaluate(()=>new Promise(requestAnimationFrame));const sticky=await page.evaluate(()=>{const header=document.querySelector('.site-header--overlay').getBoundingClientRect(),toc=document.querySelector('.section-page__toc nav').getBoundingClientRect();return {headerTop:header.top,headerBottom:header.bottom,tocTop:toc.top};});assert.ok(Math.abs(sticky.headerTop)<1);assert.ok(sticky.tocTop>=sticky.headerBottom+15);if(item.slug==='community-service'&&width===1440)await page.screenshot({path:`${results}/screenshots/community-service-1440x900-sticky.png`});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));}
      for(const link of await page.locator('.section-page__destinations a').all()){assert.equal(await link.getAttribute('target'),null);assert.equal(await link.locator('.text-link__external-mark').count(),1);}
      for(const element of await page.locator('main h1, main h2, main p, main a').all()) assert.equal(await element.evaluate(node=>node.scrollWidth>node.clientWidth),false);
      assert.deepEqual((await new AxeBuilder({page}).analyze()).violations,[]);
      await page.screenshot({path:`${results}/screenshots/${item.slug}-${width}x${height}-full.png`,fullPage:true});
      const trigger=page.locator('[data-menu-toggle]');await trigger.click();await page.locator('.menu-panel.is-open').waitFor();
      const current=page.locator('.menu-panel a[aria-current=page]');assert.equal(await current.getAttribute('href'),`/${item.slug}/`);assert.equal(await current.isVisible(),true);
      await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(element=>element===document.activeElement),true);
      assert.deepEqual(network.errors,[]);assert.deepEqual(network.external,[googleTagUrl]);assert.deepEqual(network.badResponses,[]);
      report.sections.push({slug:item.slug,width,height,articleSections:item.sections,externalLinks:item.links,mediaRatio:media.ratio,rhythm,axeViolations:0,consoleErrors:0});
      await context.close();
    });

    for(const item of sectionPages) for(const [width,height] of [[1024,450],[768,450]]) await t.test(`${item.slug} keeps contents below header through Continue at ${width}x${height}`,async()=>{
      const context=await newContext(browser,{viewport:{width,height}});const page=await context.newPage(),url=`${base}/${item.slug}/`;
      assert.equal((await page.goto(url)).status(),200);await page.evaluate(()=>document.fonts.ready);
      await page.evaluate(()=>{const section=document.querySelector('.section-page__destinations'),max=document.documentElement.scrollHeight-innerHeight;scrollTo({top:Math.min(max,section.offsetTop+Math.max(0,section.offsetHeight-innerHeight/2)),behavior:'instant'});});
      await page.evaluate(()=>new Promise(requestAnimationFrame));
      const state=await page.evaluate(()=>{const header=document.querySelector('.site-header--overlay').getBoundingClientRect(),toc=document.querySelector('.section-page__toc nav'),tocRect=toc.getBoundingClientRect(),siblings=document.querySelector('.section-page__siblings').getBoundingClientRect();return {headerTop:header.top,headerBottom:header.bottom,tocTop:tocRect.top,tocBottom:tocRect.bottom,tocMaxHeight:parseFloat(getComputedStyle(toc).maxHeight),viewportHeight:innerHeight,siblingsTop:siblings.top,overflow:document.documentElement.scrollWidth>innerWidth};});
      assert.ok(Math.abs(state.headerTop)<1);assert.ok(state.tocTop>=state.headerBottom+15);assert.ok(state.tocBottom<=state.viewportHeight-15);assert.equal(state.overflow,false);
      if(item.slug==='community-service'&&width===1024)await page.screenshot({path:`${results}/screenshots/community-service-1024x450-continue.png`});
      await context.close();
    });

    await t.test('200% equivalent reflow keeps every route and menu usable',async()=>{
      for(const path of ['/',...sectionPages.map(item=>`/${item.slug}/`)]){
        const context=await newContext(browser,{viewport:{width:720,height:450}});const page=await context.newPage();await page.goto(base+path);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        for(const element of await page.locator('main h1, main h2, main h3, main p, main a').all()) assert.equal(await element.evaluate(item=>item.scrollWidth>item.clientWidth),false);
        await page.getByRole('button',{name:'Open menu',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.keyboard.press('Escape');await context.close();
      }
    });

    await t.test('mobile trigger stays iconic and sticky throughout the index',async()=>{
      for(const [width,height] of mobileSizes){
        const context=await newContext(browser,{viewport:{width,height},isMobile:true,hasTouch:true});const page=await context.newPage(),network=observe(page,base);await page.goto(base);await page.evaluate(async()=>{await document.fonts.ready;document.documentElement.style.scrollBehavior='auto';});
        const trigger=page.locator('[data-menu-toggle]');const top=await trigger.evaluate(element=>{const rect=element.getBoundingClientRect(),icon=element.querySelector('.menu-trigger__icon'),iconRect=icon.getBoundingClientRect();return {rect:rect.toJSON(),headerPosition:getComputedStyle(element.closest('header')).position,headerHeight:element.closest('header').getBoundingClientRect().height,labelDisplay:getComputedStyle(element.querySelector('.menu-trigger__label')).display,visibleText:element.innerText.trim(),icon:{width:iconRect.width,height:iconRect.height,shadow:getComputedStyle(icon).boxShadow}};});
        assert.equal(top.headerPosition,'sticky');assert.equal(top.headerHeight,0);assert.equal(top.rect.width,44);assert.equal(top.rect.height,44);assert.ok(top.rect.left>=16&&top.rect.right<=width-16);assert.equal(top.labelDisplay,'none');assert.equal(top.visibleText,'');assert.equal(top.icon.width,18);assert.equal(top.icon.height,1);
        const maxScroll=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight),positions=[];for(const fraction of [0,.5,1]){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),Math.round(maxScroll*fraction));await page.evaluate(()=>new Promise(requestAnimationFrame));const state=await trigger.evaluate((element,topY)=>{const rect=element.getBoundingClientRect();return {scrollY,rect:rect.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth,topDelta:Math.abs(rect.top-topY)};},top.rect.top);assert.ok(state.topDelta<1);assert.equal(state.overflow,false);const before=state.scrollY;await trigger.click();await page.getByRole('button',{name:'Close menu',exact:true}).click();await page.locator('.menu-panel__sheet').evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));assert.equal(await page.evaluate(()=>scrollY),before);positions.push({fraction,scrollY:before,top:state.rect.top});}
        assert.deepEqual(network.errors,[]);assert.deepEqual(network.badResponses,[]);report.mobileSticky.push({width,height,top,positions,consoleErrors:0,failedResponses:0});await context.close();
      }
    });
    await writeFile(`${results}/browser-report.json`,JSON.stringify(report,null,2)+'\n');
  } finally {await browser.close();if(server)await new Promise(done=>server.close(done));}
});
