import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { startServer } from '../scripts/serve.mjs';

const publicQA=process.env.QA_PUBLIC==='1';
const results=publicQA?'test-results/public-qa':'test-results';
const sizes=[[1440,900],[1024,768],[390,844],[375,667]];
test('responsive browser, navigation, focus, assets, motion and accessibility gates', {timeout:120000},async(t)=>{
  const server=publicQA?null:await startServer({port:0});
  const base=publicQA?'https://qa.jaredgoldberg.org':`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{});
  await mkdir(`${results}/screenshots`,{recursive:true});
  const report={url:base,browser:browser.version(),fontNote:'Source-served Raleway 4.026 WOFF2 loaded locally; 400/700/900 verified as custom webfonts.',viewports:[]};
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
      assert.match(computed.fontFamily,/Raleway.*Avenir Next.*Segoe UI/);
      const fontPolicy=JSON.parse(await readFile('tests/font-policy.json','utf8'));
      for(const font of fontPolicy.requiredFiles) assert.ok(requests.includes(base+'/'+font),`Font not loaded: ${font}`);
      const cdp=await context.newCDPSession(page);
      await cdp.send('DOM.enable');await cdp.send('CSS.enable');
      const {root}=await cdp.send('DOM.getDocument');
      for(const selector of ['h1','[data-menu-toggle]','.fixture-intro p:not([class])']) {
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
      assert.ok(Math.abs(sheetWidth-Math.min(352,.84*width))<1);
      await page.screenshot({path:`${results}/screenshots/qa-${width}x${height}-menu.png`});
      const openAxe=await new AxeBuilder({page}).analyze();
      assert.deepEqual(openAxe.violations,[]);
      // With details closed, Tab cycles only visible controls (no hidden leaf links).
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.getByText('Specimens',{exact:true}).evaluate(e=>e.closest('summary')===document.activeElement),true);
      await page.keyboard.press('Tab');
      assert.equal(await close.evaluate(e=>e===document.activeElement),true);
      await page.getByText('Specimens',{exact:true}).click();
      await page.getByText('Components',{exact:true}).click();
      await page.getByRole('navigation',{name:'QA fixture'}).getByRole('link',{name:'Surfaces',exact:true}).focus();
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
      assert.equal(await page.locator('#typography').evaluate(e=>e===document.activeElement),true);
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
        await page.getByRole('button',{name:'Menu',exact:true}).click();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        await page.getByText('Specimens',{exact:true}).click();
        await page.getByText('Components',{exact:true}).click();
        await page.getByRole('navigation',{name:'QA fixture'}).getByRole('link',{name:'Surfaces',exact:true}).click();
        assert.equal(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded'),'false');
        await context.close();
      }
    });
    await writeFile(`${results}/browser-report.json`,JSON.stringify(report,null,2)+'\n');
  } finally { await browser.close(); if(server) await new Promise(done=>server.close(done)); }
});
