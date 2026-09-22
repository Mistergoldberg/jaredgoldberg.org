import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { startServer } from '../scripts/serve.mjs';

const publicQA=process.env.QA_PUBLIC==='1';
const results=publicQA?'test-results/public-qa':'test-results';
const sizes=[[1440,900],[1024,768],[768,1024],[720,450],[667,375],[430,932],[393,852],[390,844],[375,667],[320,568]];
const mobileSizes=[[430,932],[393,852],[390,844],[375,667],[320,568],[667,375],[720,450]];
test('responsive browser, navigation, focus, assets, motion and accessibility gates', {timeout:120000},async(t)=>{
  const server=publicQA?null:await startServer({port:0});
  const base=publicQA?'https://qa.jaredgoldberg.org':`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{});
  await mkdir(`${results}/screenshots`,{recursive:true});
  const report={url:base,browser:browser.version(),fontNote:'Source-served Raleway 4.026 variable WOFF2 loaded locally; authentic named 200 plus 400/700/900 are available without synthesis.',viewports:[],mobileSticky:[]};
  try {
    for(const [width,height] of sizes) await t.test(`${width}x${height}`,async()=>{
      const context=await browser.newContext({viewport:{width,height},isMobile:width<768,hasTouch:width<768});
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
      const computed=await page.evaluate(()=>({fontFamily:getComputedStyle(document.body).fontFamily,fonts:document.fonts.size,overflow:document.documentElement.scrollWidth>innerWidth,menuTrigger:document.querySelector('[data-menu-toggle]').getBoundingClientRect().toJSON()}));
      assert.equal(computed.overflow,false);
      assert.ok(computed.menuTrigger.width>=44 && computed.menuTrigger.height>=44);
      assert.match(computed.fontFamily,/Raleway.*Avenir Next.*Segoe UI/);
      assert.equal(await page.getByRole('heading',{level:1,name:'Jared Goldberg',exact:true}).count(),1);
      const displayType=await page.locator('h1').evaluate(e=>{
        const style=getComputedStyle(e);
        return {
          fontWeight:style.fontWeight,
          lineHeightRatio:parseFloat(style.lineHeight)/parseFloat(style.fontSize),
          trackingRatio:parseFloat(style.letterSpacing)/parseFloat(style.fontSize),
        };
      });
      assert.equal(displayType.fontWeight,'900');
      assert.ok(Math.abs(displayType.lineHeightRatio-.9)<.001);
      assert.ok(Math.abs(displayType.trackingRatio+.03)<.001);
      const unaffectedType=await page.evaluate(()=>{
        const body=getComputedStyle(document.querySelector('.fixture-intro p:not([class])'));
        const nav=getComputedStyle(document.querySelector('[data-menu-toggle]'));
        const utility=getComputedStyle(document.querySelector('.type-meta'));
        const ratios=style=>({
          lineHeight:parseFloat(style.lineHeight)/parseFloat(style.fontSize),
          tracking:parseFloat(style.letterSpacing)/parseFloat(style.fontSize),
        });
        return {
          body:ratios(body),
          nav:ratios(nav),
          utility:ratios(utility),
        };
      });
      assert.ok(Math.abs(unaffectedType.body.lineHeight-1.55)<.001);
      assert.ok(Math.abs(unaffectedType.body.tracking-.002)<.001);
      assert.ok(Math.abs(unaffectedType.nav.tracking-.11)<.001);
      assert.ok(Math.abs(unaffectedType.utility.tracking-.11)<.001);
      const wordmark=await page.locator('.site-wordmark').evaluate(e=>({
        lines:[...e.children].map(line=>{const r=line.getBoundingClientRect(),style=getComputedStyle(line);return {text:line.textContent,rect:r.toJSON(),background:style.backgroundColor,color:style.color};}),
        overflow:e.scrollWidth>e.clientWidth,
      }));
      assert.deepEqual(wordmark.lines.map(line=>line.text),['Jared','Goldberg']);
      assert.equal(wordmark.overflow,false);
      assert.ok(wordmark.lines[1].rect.width>wordmark.lines[0].rect.width);
      assert.ok(Math.abs(wordmark.lines[1].rect.top-wordmark.lines[0].rect.bottom)<1);
      for(const line of wordmark.lines) { assert.equal(line.background,'rgb(0, 0, 0)'); assert.equal(line.color,'rgb(255, 255, 255)'); }
      const fontPolicy=JSON.parse(await readFile('tests/font-policy.json','utf8'));
      for(const font of fontPolicy.requiredFiles) assert.ok(requests.includes(base+'/'+font),`Font not loaded: ${font}`);
      const cdp=await context.newCDPSession(page);
      await cdp.send('DOM.enable');await cdp.send('CSS.enable');
      const {root}=await cdp.send('DOM.getDocument');
      for(const selector of ['h1',...(width>=768?['[data-menu-toggle]']:[]),'.fixture-intro p:not([class])']) {
        const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
        const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
        assert.ok(fonts.some(font=>font.isCustomFont && font.familyName.startsWith('Raleway')),`Font fallback on ${selector}`);
      }
      await page.screenshot({path:`${results}/screenshots/qa-${width}x${height}-closed.png`,fullPage:false});
      const closedAxe=await new AxeBuilder({page}).analyze();
      assert.deepEqual(closedAxe.violations,[]);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('.skip-link').evaluate(e=>e===document.activeElement),true);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('[data-menu-toggle]').evaluate(e=>e===document.activeElement),true);
      await page.keyboard.press('Enter');
      await page.locator('.menu-panel.is-open').waitFor();
      const close=page.getByRole('button',{name:'Close menu',exact:true});
      assert.equal(await close.evaluate(e=>e===document.activeElement),true);
      assert.equal(await page.locator('main').getAttribute('inert'),'');
      assert.equal(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded'),'true');
      assert.equal(await page.evaluate(()=>getComputedStyle(document.body).position),'fixed');
      await page.locator('.menu-panel__sheet').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
      const sheetWidth=await page.locator('.menu-panel__sheet').evaluate(e=>e.getBoundingClientRect().width);
      const expectedSheetWidth=width<768?Math.min(384,width-44):width<1024?Math.min(384,width-48):Math.min(448,width-48);
      assert.ok(Math.abs(sheetWidth-expectedSheetWidth)<1);
      await page.screenshot({path:`${results}/screenshots/qa-${width}x${height}-menu.png`});
      await page.screenshot({path:`${results}/screenshots/qa-${width}x${height}-active.png`});
      const openAxe=await new AxeBuilder({page}).analyze();
      assert.deepEqual(openAxe.violations,[]);
      const primary=page.locator('.menu-panel__link[aria-current]');
      const primaryType=await primary.evaluate(e=>({weight:getComputedStyle(e).fontWeight,synthesis:getComputedStyle(e).fontSynthesisWeight}));
      assert.equal(primaryType.weight,'200');
      assert.equal(primaryType.synthesis,'none');
      const {nodeId:primaryNodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'.menu-panel__link[aria-current]'});
      const {fonts:primaryFonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:primaryNodeId});
      assert.ok(primaryFonts.some(font=>font.isCustomFont && font.familyName.startsWith('Raleway')),'Raleway 200 fallback or synthesis');
      // With details closed, Tab cycles only visible controls (no hidden leaf links).
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.getByText('Specimens',{exact:true}).evaluate(e=>e.closest('summary')===document.activeElement),true);
      await page.keyboard.press('Tab');
      assert.equal(await close.evaluate(e=>e===document.activeElement),true);
      await page.getByText('Specimens',{exact:true}).click();
      await page.getByText('Components',{exact:true}).click();
      await page.screenshot({path:`${results}/screenshots/qa-${width}x${height}-nested.png`});
      const interactive=page.locator('.menu-panel__sheet a, .menu-panel__sheet button, .menu-panel__sheet summary');
      for(const element of await interactive.all()) {
        if(!await element.isVisible()) continue;
        const rect=await element.evaluate(e=>e.getBoundingClientRect().toJSON());
        assert.ok(rect.width>=44 && rect.height>=44,`Undersized menu target: ${rect.width}x${rect.height}`);
      }
      const nestedRects=await page.locator('.menu-panel__nested-link, .menu-panel__nested-summary').evaluateAll(elements=>elements.filter(e=>e.checkVisibility()).map(e=>e.getBoundingClientRect().toJSON()));
      for(let index=1;index<nestedRects.length;index++) assert.ok(nestedRects[index].top>=nestedRects[index-1].bottom,'Overlapping nested targets');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      assert.equal(await page.getByRole('navigation',{name:'QA fixture'}).getByRole('link',{name:'Surfaces',exact:true}).evaluate(e=>e===document.activeElement),true);
      await page.screenshot({path:`${results}/screenshots/qa-${width}x${height}-focus.png`});
      await page.keyboard.press('Tab');
      assert.equal(await close.evaluate(e=>e===document.activeElement),true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('[data-menu-toggle]').evaluate(e=>e===document.activeElement),true);
      assert.equal(await page.locator('main').getAttribute('inert'),null);
      // Click trigger, close button and backdrop, including restoration after page scrolling.
      await page.locator('[data-menu-toggle]').click(); await close.click();
      await page.evaluate(()=>scrollTo({top:200,behavior:'instant'}));
      const before=await page.evaluate(()=>scrollY);
      await page.locator('[data-menu-toggle]').click();
      await page.locator('.menu-panel__backdrop').click({position:{x:5,y:100}});
      assert.equal(await page.evaluate(()=>scrollY),before);
      await page.locator('[data-menu-toggle]').click();
      await page.getByRole('navigation',{name:'QA fixture'}).getByRole('link',{name:'Typography',exact:true}).click();
      assert.equal(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded'),'false');
      await page.waitForFunction(()=>document.activeElement?.id==='typography');
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.locator('[data-menu-toggle]').click();
      const duration=await page.locator('.menu-panel__sheet').evaluate(e=>parseFloat(getComputedStyle(e).transitionDuration));
      assert.ok(duration<.001);
      assert.equal(await page.locator('.menu-panel').evaluate(e=>parseFloat(getComputedStyle(e).transitionDelay)),0);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded'),'false');
      assert.deepEqual(errors,[]); assert.deepEqual(external,[]); assert.deepEqual(badResponses,[]);
      report.viewports.push({width,height,...computed,sheetWidth,axeViolations:0,consoleErrors:0,externalRequests:0,reducedMotionSeconds:duration});
      await context.close();
    });
    await t.test('tablet, narrow mobile and coarse landscape remain usable',async()=>{
      for(const [width,height] of [[320,568],[768,1024],[900,768],[667,375]]) {
        const context=await browser.newContext({viewport:{width,height},isMobile:width<768,hasTouch:true});
        const page=await context.newPage(); await page.goto(base);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        if(width===667) {
          const trigger=page.locator('[data-menu-toggle]');
          const initial=await trigger.evaluate(e=>({rect:e.getBoundingClientRect().toJSON(),position:getComputedStyle(e.closest('header')).position,label:getComputedStyle(e.querySelector('.menu-trigger__label')).display,icon:getComputedStyle(e.querySelector('.menu-trigger__icon')).display}));
          assert.equal(initial.position,'sticky'); assert.equal(initial.label,'none'); assert.equal(initial.icon,'block');
          assert.equal(initial.rect.width,44); assert.equal(initial.rect.height,44); assert.ok(initial.rect.left>=16 && initial.rect.right<=width-16);
          await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,(document.documentElement.scrollHeight-innerHeight)/2);});
          assert.ok(Math.abs((await trigger.evaluate(e=>e.getBoundingClientRect().top))-initial.rect.top)<1);
        }
        await page.getByRole('button',{name:'Open menu',exact:true}).click();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        await page.getByText('Specimens',{exact:true}).click();
        await page.getByText('Components',{exact:true}).click();
        await page.getByRole('navigation',{name:'QA fixture'}).getByRole('link',{name:'Surfaces',exact:true}).click();
        assert.equal(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded'),'false');
        await context.close();
      }
    });
    await t.test('200% equivalent reflow keeps the menu usable',async()=>{
      const context=await browser.newContext({viewport:{width:720,height:450}});
      const page=await context.newPage();await page.goto(base);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.getByRole('button',{name:'Open menu',exact:true}).click();
      await page.getByText('Specimens',{exact:true}).click();
      await page.getByText('Components',{exact:true}).click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      const targets=page.locator('.menu-panel__sheet a, .menu-panel__sheet button, .menu-panel__sheet summary');
      for(const element of await targets.all()) {
        if(!await element.isVisible()) continue;
        const rect=await element.evaluate(e=>e.getBoundingClientRect().toJSON());
        assert.ok(rect.width>=44 && rect.height>=44);
      }
      await context.close();
    });
    await t.test('mobile trigger is iconic, sticky and operable throughout the page',async()=>{
      for(const [width,height] of mobileSizes) {
        const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
        const page=await context.newPage();
        const errors=[],badResponses=[];
        page.on('pageerror',error=>errors.push(error.message));
        page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
        page.on('response',response=>{if(response.status()>=400) badResponses.push(response.url());});
        await page.goto(base); await page.evaluate(async()=>{await document.fonts.ready;document.documentElement.style.scrollBehavior='auto';});
        assert.equal(await page.getByRole('button',{name:'Open menu',exact:true}).count(),1);
        const trigger=page.locator('[data-menu-toggle]');
        const top=await trigger.evaluate(e=>{
          const r=e.getBoundingClientRect(),icon=e.querySelector('.menu-trigger__icon'),ir=icon.getBoundingClientRect();
          return {rect:r.toJSON(),headerPosition:getComputedStyle(e.closest('header')).position,headerHeight:e.closest('header').getBoundingClientRect().height,labelDisplay:getComputedStyle(e.querySelector('.menu-trigger__label')).display,visibleText:e.innerText.trim(),icon:{width:ir.width,height:ir.height,shadow:getComputedStyle(icon).boxShadow}};
        });
        assert.equal(top.headerPosition,'sticky'); assert.equal(top.headerHeight,0);
        assert.equal(top.rect.width,44); assert.equal(top.rect.height,44);
        assert.ok(top.rect.left>=16 && top.rect.right<=width-16);
        assert.ok(top.rect.top>=14 && top.rect.top<24);
        assert.equal(top.labelDisplay,'none'); assert.equal(top.visibleText,'');
        assert.equal(top.icon.width,18); assert.equal(top.icon.height,1); assert.match(top.icon.shadow,/5px/);
        const contentOverlaps=await trigger.evaluate(e=>{
          const triggerRect=e.getBoundingClientRect();
          const intersects=rect=>triggerRect.left<rect.right&&triggerRect.right>rect.left&&triggerRect.top<rect.bottom&&triggerRect.bottom>rect.top;
          const overlaps=[];
          for(const root of document.querySelectorAll('main, footer')) {
            const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
            let node;
            while((node=walker.nextNode())) {
              if(!node.textContent.trim()) continue;
              const style=getComputedStyle(node.parentElement);
              if(style.display==='none'||style.visibility==='hidden') continue;
              const range=document.createRange();
              range.selectNodeContents(node);
              if([...range.getClientRects()].some(rect=>rect.width&&rect.height&&intersects(rect))) {
                overlaps.push(node.textContent.trim().slice(0,80));
              }
            }
          }
          return [...new Set(overlaps)];
        });
        assert.deepEqual(contentOverlaps,[],'Mobile trigger obstructs initial visible text');
        const maxScroll=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
        const positions=[];
        for(const fraction of [0,.25,.5,1]) {
          await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),Math.round(maxScroll*fraction));
          await page.evaluate(()=>new Promise(requestAnimationFrame));
          const state=await trigger.evaluate((e,topY)=>{
            const r=e.getBoundingClientRect();
            const intersects=rect=>r.left<rect.right&&r.right>rect.left&&r.top<rect.bottom&&r.bottom>rect.top;
            const overlaps=[];
            for(const root of document.querySelectorAll('main, footer')) {
              const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
              let node;
              while((node=walker.nextNode())) {
                if(!node.textContent.trim()) continue;
                const style=getComputedStyle(node.parentElement);
                if(style.display==='none'||style.visibility==='hidden') continue;
                const range=document.createRange();
                range.selectNodeContents(node);
                if([...range.getClientRects()].some(rect=>rect.width&&rect.height&&intersects(rect))) {
                  overlaps.push(node.textContent.trim().slice(0,80));
                }
              }
            }
            return {scrollY,rect:r.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth,overlaps:[...new Set(overlaps)],topDelta:Math.abs(r.top-topY)};
          },top.rect.top);
          assert.ok(state.topDelta<1,'Sticky trigger moved vertically');
          assert.equal(state.overflow,false,'Mobile page has horizontal overflow');
          assert.deepEqual(state.overlaps,[],'Mobile trigger overlaps visible page text');
          const before=state.scrollY;
          await trigger.click();
          assert.equal(await trigger.getAttribute('aria-expanded'),'true');
          assert.equal(await trigger.evaluate(e=>getComputedStyle(e).visibility),'hidden');
          assert.equal(await page.evaluate(()=>getComputedStyle(document.body).position),'fixed');
          await page.getByRole('button',{name:'Close menu',exact:true}).click();
          await page.locator('.menu-panel__sheet').evaluate(e=>Promise.all(e.getAnimations().map(animation=>animation.finished)));
          assert.equal(await trigger.getAttribute('aria-expanded'),'false');
          assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
          assert.equal(await page.evaluate(()=>scrollY),before);
          positions.push({fraction,scrollY:before,top:state.rect.top,left:state.rect.left,right:state.rect.right,width:state.rect.width,height:state.rect.height});
          if(fraction===.5) await page.screenshot({path:`${results}/screenshots/qa-${width}x${height}-mid-scroll-closed.png`});
        }
        await trigger.click(); await page.keyboard.press('Escape');
        assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
        assert.deepEqual(errors,[]); assert.deepEqual(badResponses,[]);
        report.mobileSticky.push({width,height,top,positions,consoleErrors:0,failedResponses:0});
        await context.close();
      }
    });
    await writeFile(`${results}/browser-report.json`,JSON.stringify(report,null,2)+'\n');
  } finally { await browser.close(); if(server) await new Promise(done=>server.close(done)); }
});
