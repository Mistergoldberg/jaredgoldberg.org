// Read-only source inspection. Reference captures never enter the public build.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startServer } from './serve.mjs';
const run=promisify(execFile);
const out=resolve('artifacts',`source-${new Date().toISOString().replaceAll(':','-')}`);
await mkdir(out,{recursive:true});
const server=await startServer({port:0,root:resolve(process.env.SOURCE_ROOT||'../jaredgoldberg.ca')});
const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{});
const observations=[];
try {
  for(const [kind,url] of [['live','https://jaredgoldberg.ca/'],['local',`http://127.0.0.1:${server.address().port}/`]]) {
    for(const [width,height] of [[1440,900],[1024,768],[390,844],[375,667]]) {
      const context=await browser.newContext({viewport:{width,height},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
      if(kind==='live' && process.env.SOURCE_CURL_TRANSPORT==='1') {
        await context.route('**/*',async route=>{
          const target=new URL(route.request().url());
          if(target.hostname!=='jaredgoldberg.ca') return route.abort();
          const {stdout}=await run('curl',['-fsSL','--max-time','20',target.href],{encoding:'buffer',maxBuffer:10000000});
          await route.fulfill({body:stdout,contentType:({css:'text/css',js:'text/javascript',jpg:'image/jpeg',png:'image/png'})[target.pathname.split('.').pop()]||'text/html'});
        });
      }
      const page=await context.newPage();
      const requests=[];page.on('request',request=>requests.push(request.url()));
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Menu',exact:true}).click();
      await page.screenshot({path:`${out}/${kind}-${width}x${height}-menu.png`});
      const geometry=await page.evaluate(()=>({fonts:document.fonts.size,fontFamily:getComputedStyle(document.body).fontFamily,sheetWidth:document.querySelector('.menu-panel__sheet').getBoundingClientRect().width,trigger:document.querySelector('[data-menu-toggle]').getBoundingClientRect().toJSON()}));
      await page.keyboard.press('Escape');
      await page.screenshot({path:`${out}/${kind}-${width}x${height}-closed.png`});
      observations.push({kind,url,width,height,...geometry,fontRequests:requests.filter(url=>/woff|ttf|otf|fonts\./i.test(url))});
      await context.close();
    }
  }
  await writeFile(`${out}/observations.json`,JSON.stringify(observations,null,2)+'\n');
  console.log(out);
} finally {await browser.close();await new Promise(done=>server.close(done));}
