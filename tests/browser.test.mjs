import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { startServer } from '../scripts/serve.mjs';

const publicQA=process.env.QA_PUBLIC==='1';
const results=publicQA?'test-results/public-qa':'test-results';
const googleTagUrl='https://www.googletagmanager.com/gtag/js?id=G-N6X517GEQ2';
const writingUrls=[
  'https://jaredgoldberg.ca/writing/the-future-of-work-is-a-design-problem/',
  'https://jaredgoldberg.ca/writing/dignity-is-a-systems-output/',
];
const sizes=[[1440,900],[1024,768],[768,1024],[720,450],[667,375],[430,932],[393,852],[390,844],[375,667],[320,568]];
const screenshotSizes=new Set(['1440x900','1024x768','390x844','320x568']);
const mobileSizes=[[430,932],[393,852],[390,844],[375,667],[320,568],[667,375],[720,450]];
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

test('institutional index, navigation, focus, motion and accessibility gates', {timeout:180000},async(t)=>{
  const server=publicQA?null:await startServer({port:0});
  const base=publicQA?'https://qa.jaredgoldberg.org':`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{});
  await mkdir(`${results}/screenshots`,{recursive:true});
  const report={url:base,browser:browser.version(),page:'institutional index homepage',viewports:[],mobileSticky:[]};
  try {
    for(const [width,height] of sizes) await t.test(`${width}x${height}`,async()=>{
      const context=await newContext(browser,{viewport:{width,height},isMobile:width<768,hasTouch:width<768});
      const page=await context.newPage();
      const errors=[],external=[],badResponses=[],requests=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
      page.on('request',request=>{requests.push(request.url());if(new URL(request.url()).origin!==base) external.push(request.url());});
      page.on('response',response=>{if(response.status()>=400) badResponses.push(response.url());});
      assert.equal((await page.goto(base)).status(),200);
      await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.locator('link[rel=canonical]').count(),0);
      assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex, nofollow');
      assert.equal(await page.locator('meta[name=description]').getAttribute('content'),'Jared Goldberg works across art, software, archives, education, professional systems and public writing.');
      const analytics=await page.evaluate(()=>window.dataLayer?.map(entry=>[entry[0],entry[1] instanceof Date?'date':entry[1]]));
      assert.deepEqual(analytics,[['js','date'],['config','G-N6X517GEQ2']]);
      const computed=await page.evaluate(()=>({fontFamily:getComputedStyle(document.body).fontFamily,fonts:document.fonts.size,overflow:document.documentElement.scrollWidth>innerWidth,menuTrigger:document.querySelector('[data-menu-toggle]').getBoundingClientRect().toJSON()}));
      assert.equal(computed.overflow,false);
      assert.ok(computed.menuTrigger.width>=44&&computed.menuTrigger.height>=44);
      assert.match(computed.fontFamily,/Raleway.*Avenir Next.*Segoe UI/);
      if(width<768) {
        const gutters=await page.locator('main .layout-shell').evaluateAll((shells,viewportWidth)=>shells.map(shell=>{const rect=shell.getBoundingClientRect();return {left:rect.left,right:viewportWidth-rect.right};}),width);
        for(const gutter of gutters) assert.ok(Math.abs(gutter.left-gutter.right)<.5,`Unequal mobile gutters: ${JSON.stringify(gutter)}`);
      }

      assert.equal(await page.getByRole('heading',{level:1,name:'Jared Goldberg',exact:true}).count(),1);
      assert.equal(await page.getByRole('heading',{level:2}).count(),6);
      assert.equal(await page.getByRole('heading',{level:3}).count(),18);
      const displayType=await page.locator('h1').evaluate(element=>{
        const style=getComputedStyle(element),lines=[...element.children].map(line=>line.getBoundingClientRect().toJSON());
        return {fontWeight:style.fontWeight,lineHeightRatio:parseFloat(style.lineHeight)/parseFloat(style.fontSize),trackingRatio:parseFloat(style.letterSpacing)/parseFloat(style.fontSize),overflow:element.scrollWidth>element.clientWidth,lines};
      });
      assert.equal(displayType.fontWeight,'900');
      assert.ok(Math.abs(displayType.lineHeightRatio-.9)<.001);
      assert.ok(Math.abs(displayType.trackingRatio+.03)<.001);
      assert.equal(displayType.overflow,false);
      assert.ok(displayType.lines.every(line=>line.width<=width));
      assert.ok(Math.abs(displayType.lines[1].top-displayType.lines[0].bottom)<1);
      const unaffectedType=await page.evaluate(()=>{
        const ratios=style=>({lineHeight:parseFloat(style.lineHeight)/parseFloat(style.fontSize),tracking:parseFloat(style.letterSpacing)/parseFloat(style.fontSize)});
        return {body:ratios(getComputedStyle(document.querySelector('.home-hero__introduction p'))),nav:ratios(getComputedStyle(document.querySelector('[data-menu-toggle]'))),utility:ratios(getComputedStyle(document.querySelector('.section-index')))};
      });
      assert.ok(Math.abs(unaffectedType.body.lineHeight-1.55)<.001);
      assert.ok(Math.abs(unaffectedType.body.tracking-.002)<.001);
      assert.ok(Math.abs(unaffectedType.nav.tracking-.11)<.001);
      assert.ok(Math.abs(unaffectedType.utility.tracking-.11)<.001);

      const accent=await page.evaluate(()=>{const style=getComputedStyle(document.documentElement);return {value:style.getPropertyValue('--color-accent').trim(),focus:style.getPropertyValue('--color-focus').trim(),contrast:style.getPropertyValue('--color-focus-contrast').trim(),surfaces:['--color-background','--color-surface','--color-surface-muted'].map(token=>style.getPropertyValue(token).trim()),dark:style.getPropertyValue('--color-text-primary').trim()};});
      assert.equal(accent.value,'#990202');
      assert.equal(accent.focus,'#990202');
      assert.equal(accent.contrast,'#ffffff');
      for(const surface of accent.surfaces) assert.ok(contrastRatio(accent.value,surface)>=4.5,`Insufficient accent contrast on ${surface}`);
      assert.ok(contrastRatio(accent.value,accent.dark)<3);
      assert.ok(contrastRatio(accent.contrast,accent.dark)>=3);

      assert.equal(await page.locator('#inquiries .record--inquiry').count(),5);
      assert.equal(await page.locator('#projects .record--project').count(),7);
      assert.equal(await page.locator('#writing .writing-record').count(),2);
      assert.equal(await page.locator('#start .start-route').count(),4);
      assert.equal(await page.locator('[data-destination-status=pending]').count(),6);
      assert.equal(await page.locator('[data-destination-status=pending] a, [data-destination-status=pending] button').count(),0);
      assert.equal(await page.locator('main img, main picture').count(),0);
      assert.equal(requests.some(url=>/\.(?:png|jpe?g|webp|avif)(?:\?|$)/i.test(url)),false);
      const externalLinks=await page.locator('#writing a.text-link--external').all();
      assert.equal(externalLinks.length,2);
      assert.deepEqual(await Promise.all(externalLinks.map(link=>link.getAttribute('href'))),writingUrls);
      for(const link of externalLinks) {
        assert.equal(await link.getAttribute('target'),null);
        assert.equal(await link.locator('.text-link__external-mark').count(),1);
      }
      const routes=await page.locator('main a[href^="#"], .menu-panel a[href^="/#"]').all();
      for(const route of routes) {
        const href=await route.getAttribute('href'),id=href.split('#')[1];
        assert.equal(await page.locator(`#${id}`).count(),1,`Missing fragment target: ${href}`);
      }
      assert.equal(await page.getByText('Institutional project in development',{exact:true}).count(),1);
      assert.equal(await page.getByText('Developing proposal',{exact:true}).count(),1);
      assert.equal(await page.getByText('Employer-owned work',{exact:true}).count(),1);
      for(const record of await page.locator('.record, .writing-record, .start-route').all()) assert.equal(await record.evaluate(element=>element.scrollWidth>element.clientWidth),false);
      for(const action of await page.locator('.home-hero .btn').all()) {
        const rect=await action.evaluate(element=>element.getBoundingClientRect().toJSON());
        assert.ok(rect.width>=44&&rect.height>=44);
      }

      const fontPolicy=JSON.parse(await readFile('tests/font-policy.json','utf8'));
      for(const font of fontPolicy.requiredFiles) assert.ok(requests.includes(base+'/'+font),`Font not loaded: ${font}`);
      const cdp=await context.newCDPSession(page);
      await cdp.send('DOM.enable');await cdp.send('CSS.enable');
      const {root}=await cdp.send('DOM.getDocument');
      for(const selector of ['h1',...(width>=768?['[data-menu-toggle]']:[]),'.home-hero__introduction p']) {
        const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
        const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
        assert.ok(fonts.some(font=>font.isCustomFont&&font.familyName.startsWith('Raleway')),`Font fallback on ${selector}`);
      }

      await page.screenshot({path:`${results}/screenshots/home-${width}x${height}-closed.png`});
      if(screenshotSizes.has(`${width}x${height}`)) await page.screenshot({path:`${results}/screenshots/home-${width}x${height}-full.png`,fullPage:true});
      const closedAxe=await new AxeBuilder({page}).analyze();
      assert.deepEqual(closedAxe.violations,[]);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('.skip-link').evaluate(element=>element===document.activeElement),true);
      await page.keyboard.press('Tab');
      const trigger=page.locator('[data-menu-toggle]');
      assert.equal(await trigger.evaluate(element=>element===document.activeElement),true);
      const triggerFocus=await trigger.evaluate(element=>({outline:getComputedStyle(element).outlineColor,inner:getComputedStyle(element).boxShadow}));
      assert.equal(triggerFocus.outline,'rgb(153, 2, 2)');
      assert.match(triggerFocus.inner,/rgb\(255, 255, 255\)/);
      await page.keyboard.press('Enter');
      await page.locator('.menu-panel.is-open').waitFor();
      const close=page.getByRole('button',{name:'Close menu',exact:true});
      assert.equal(await close.evaluate(element=>element===document.activeElement),true);
      assert.equal(await page.locator('main').getAttribute('inert'),'');
      assert.equal(await trigger.getAttribute('aria-expanded'),'true');
      assert.equal(await page.evaluate(()=>getComputedStyle(document.body).position),'fixed');
      await page.locator('.menu-panel__sheet').evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
      const sheetWidth=await page.locator('.menu-panel__sheet').evaluate(element=>element.getBoundingClientRect().width);
      const expectedSheetWidth=width<768?Math.min(384,width-44):width<1024?Math.min(384,width-48):Math.min(448,width-48);
      assert.ok(Math.abs(sheetWidth-expectedSheetWidth)<1);
      await page.screenshot({path:`${results}/screenshots/home-${width}x${height}-menu.png`});
      const openAxe=await new AxeBuilder({page}).analyze();
      assert.deepEqual(openAxe.violations,[]);
      const current=page.locator('.menu-panel__link[aria-current]');
      const primaryType=await current.evaluate(element=>({weight:getComputedStyle(element).fontWeight,synthesis:getComputedStyle(element).fontSynthesisWeight}));
      assert.equal(primaryType.weight,'200');assert.equal(primaryType.synthesis,'none');
      const {nodeId:primaryNodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'.menu-panel__link[aria-current]'});
      const {fonts:primaryFonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:primaryNodeId});
      assert.ok(primaryFonts.some(font=>font.isCustomFont&&font.familyName.startsWith('Raleway')),'Raleway 200 fallback or synthesis');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.getByText('About the practice',{exact:true}).evaluate(element=>element.closest('summary')===document.activeElement),true);
      await page.keyboard.press('Tab');
      assert.equal(await close.evaluate(element=>element===document.activeElement),true);
      await page.getByText('Explore',{exact:true}).click();
      await page.getByText('About the practice',{exact:true}).click();
      const interactive=page.locator('.menu-panel__sheet a, .menu-panel__sheet button, .menu-panel__sheet summary');
      for(const element of await interactive.all()) {
        if(!await element.isVisible()) continue;
        const rect=await element.evaluate(item=>item.getBoundingClientRect().toJSON());
        assert.ok(rect.width>=44&&rect.height>=44,`Undersized menu target: ${rect.width}x${rect.height}`);
      }
      const writingMenuLink=page.getByRole('navigation',{name:'Primary'}).getByRole('link',{name:'Writing & Publications',exact:true});
      await page.keyboard.press('Shift+Tab');
      assert.equal(await writingMenuLink.evaluate(element=>element===document.activeElement),true);
      const nestedFocus=await writingMenuLink.evaluate(element=>({outline:getComputedStyle(element).outlineColor,inner:getComputedStyle(element).boxShadow}));
      assert.equal(nestedFocus.outline,'rgb(153, 2, 2)');assert.match(nestedFocus.inner,/rgb\(255, 255, 255\)/);
      await page.screenshot({path:`${results}/screenshots/home-${width}x${height}-focus.png`});
      await page.keyboard.press('Escape');
      assert.equal(await trigger.getAttribute('aria-expanded'),'false');
      assert.equal(await trigger.evaluate(element=>element===document.activeElement),true);
      assert.equal(await page.locator('main').getAttribute('inert'),null);

      await trigger.click();await close.click();
      await page.evaluate(()=>scrollTo({top:200,behavior:'instant'}));
      const before=await page.evaluate(()=>scrollY);
      await trigger.click();await page.locator('.menu-panel__backdrop').click({position:{x:5,y:100}});
      assert.equal(await page.evaluate(()=>scrollY),before);
      await trigger.click();
      const practiceLink=page.getByRole('navigation',{name:'Primary'}).getByRole('link',{name:'Practice & Research',exact:true});
      await practiceLink.click();
      assert.equal(await trigger.getAttribute('aria-expanded'),'false');
      await page.waitForFunction(()=>document.activeElement?.id==='inquiries');

      const focusedExternal=externalLinks[0];
      await page.keyboard.press('Tab');
      assert.equal(await focusedExternal.evaluate(element=>element===document.activeElement),true);
      const externalFocus=await focusedExternal.evaluate(element=>({outline:getComputedStyle(element).outlineColor,inner:getComputedStyle(element).boxShadow}));
      assert.equal(externalFocus.outline,'rgb(153, 2, 2)');assert.match(externalFocus.inner,/rgb\(255, 255, 255\)/);
      await page.emulateMedia({reducedMotion:'reduce'});
      await trigger.click();
      const duration=await page.locator('.menu-panel__sheet').evaluate(element=>parseFloat(getComputedStyle(element).transitionDuration));
      assert.ok(duration<.001);
      assert.equal(await page.locator('.menu-panel').evaluate(element=>parseFloat(getComputedStyle(element).transitionDelay)),0);
      await page.keyboard.press('Escape');
      assert.deepEqual(errors,[]);assert.deepEqual(external,[googleTagUrl]);assert.deepEqual(badResponses,[]);
      report.viewports.push({width,height,...computed,sheetWidth,headings:{h1:1,h2:6,h3:18},records:{inquiries:5,projects:7,writing:2,start:4},pendingDestinations:6,images:0,axeViolations:0,consoleErrors:0,externalRequests:1,reducedMotionSeconds:duration});
      await context.close();
    });

    await t.test('200% equivalent reflow keeps the complete page and menu usable',async()=>{
      const context=await newContext(browser,{viewport:{width:720,height:450}});
      const page=await context.newPage();await page.goto(base);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      for(const element of await page.locator('main h1, main h2, main h3, main p, main a').all()) assert.equal(await element.evaluate(item=>item.scrollWidth>item.clientWidth),false);
      await page.getByRole('button',{name:'Open menu',exact:true}).click();
      await page.getByText('Explore',{exact:true}).click();
      await page.getByText('About the practice',{exact:true}).click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      for(const element of await page.locator('.menu-panel__sheet a, .menu-panel__sheet button, .menu-panel__sheet summary').all()) {
        if(!await element.isVisible()) continue;
        const rect=await element.evaluate(item=>item.getBoundingClientRect().toJSON());
        assert.ok(rect.width>=44&&rect.height>=44);
      }
      await context.close();
    });

    await t.test('mobile trigger is iconic, sticky and operable throughout the page',async()=>{
      for(const [width,height] of mobileSizes) {
        const context=await newContext(browser,{viewport:{width,height},isMobile:true,hasTouch:true});
        const page=await context.newPage(),errors=[],badResponses=[];
        page.on('pageerror',error=>errors.push(error.message));
        page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
        page.on('response',response=>{if(response.status()>=400) badResponses.push(response.url());});
        await page.goto(base);await page.evaluate(async()=>{await document.fonts.ready;document.documentElement.style.scrollBehavior='auto';});
        const trigger=page.locator('[data-menu-toggle]');
        const top=await trigger.evaluate(element=>{const rect=element.getBoundingClientRect(),icon=element.querySelector('.menu-trigger__icon'),iconRect=icon.getBoundingClientRect();return {rect:rect.toJSON(),headerPosition:getComputedStyle(element.closest('header')).position,headerHeight:element.closest('header').getBoundingClientRect().height,labelDisplay:getComputedStyle(element.querySelector('.menu-trigger__label')).display,visibleText:element.innerText.trim(),icon:{width:iconRect.width,height:iconRect.height,shadow:getComputedStyle(icon).boxShadow}};});
        assert.equal(top.headerPosition,'sticky');assert.equal(top.headerHeight,0);
        assert.equal(top.rect.width,44);assert.equal(top.rect.height,44);
        assert.ok(top.rect.left>=16&&top.rect.right<=width-16);assert.ok(top.rect.top>=14&&top.rect.top<24);
        assert.equal(top.labelDisplay,'none');assert.equal(top.visibleText,'');assert.equal(top.icon.width,18);assert.equal(top.icon.height,1);assert.match(top.icon.shadow,/5px/);
        const initialOverlaps=await trigger.evaluate(element=>{const triggerRect=element.getBoundingClientRect(),intersects=rect=>triggerRect.left<rect.right&&triggerRect.right>rect.left&&triggerRect.top<rect.bottom&&triggerRect.bottom>rect.top,overlaps=[];for(const root of document.querySelectorAll('main, footer')){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())){if(!node.textContent.trim())continue;const style=getComputedStyle(node.parentElement);if(style.display==='none'||style.visibility==='hidden')continue;const range=document.createRange();range.selectNodeContents(node);if([...range.getClientRects()].some(rect=>rect.width&&rect.height&&intersects(rect)))overlaps.push(node.textContent.trim().slice(0,80));}}return [...new Set(overlaps)];});
        assert.deepEqual(initialOverlaps,[],'Mobile trigger obstructs initial visible text');
        const maxScroll=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight),positions=[];
        for(const fraction of [0,.25,.5,1]) {
          await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),Math.round(maxScroll*fraction));await page.evaluate(()=>new Promise(requestAnimationFrame));
          const state=await trigger.evaluate((element,topY)=>{const rect=element.getBoundingClientRect();return {scrollY,rect:rect.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth,topDelta:Math.abs(rect.top-topY)};},top.rect.top);
          assert.ok(state.topDelta<1);assert.equal(state.overflow,false);
          const before=state.scrollY;await trigger.click();assert.equal(await trigger.getAttribute('aria-expanded'),'true');assert.equal(await trigger.evaluate(element=>getComputedStyle(element).visibility),'hidden');
          await page.getByRole('button',{name:'Close menu',exact:true}).click();await page.locator('.menu-panel__sheet').evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished)));
          assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert.equal(await trigger.evaluate(element=>element===document.activeElement),true);assert.equal(await page.evaluate(()=>scrollY),before);
          positions.push({fraction,scrollY:before,top:state.rect.top,left:state.rect.left,right:state.rect.right,width:state.rect.width,height:state.rect.height});
        }
        await trigger.click();await page.keyboard.press('Escape');assert.equal(await trigger.evaluate(element=>element===document.activeElement),true);
        assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
        report.mobileSticky.push({width,height,top,positions,consoleErrors:0,failedResponses:0});
        await context.close();
      }
    });
    await writeFile(`${results}/browser-report.json`,JSON.stringify(report,null,2)+'\n');
  } finally {await browser.close();if(server)await new Promise(done=>server.close(done));}
});
