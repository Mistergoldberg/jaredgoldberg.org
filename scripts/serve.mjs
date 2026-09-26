import { createServer } from 'node:http';
import { readFile, stat, watch } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.txt':'text/plain','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.otf':'font/otf'};
export async function startServer({port=4173,root=resolve('dist')}={}) {
  root=resolve(root);
  let qa=true;
  try { qa=JSON.parse(await readFile(resolve(root,'release.json'),'utf8')).environment==='qa'; }
  catch (error) { if(error.code!=='ENOENT') throw error; }
  const server=createServer(async(req,res)=>{
    if(qa) res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    try {
      if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if (pathname.split('/').some(part=>part.startsWith('.'))) throw new Error('Private path');
      let file=resolve(root, '.'+pathname);
      if (!file.startsWith(root+sep) && file!==root) throw new Error('Outside root');
      if ((await stat(file)).isDirectory()) file=resolve(file,'index.html');
      const body=await readFile(file);
      res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
      if (/\.[a-f0-9]{16}\.(css|js)$/.test(file)) res.setHeader('Cache-Control','public, max-age=31536000, immutable');
      res.writeHead(200); res.end(req.method==='HEAD'?undefined:body);
    } catch { res.writeHead(404,{'Content-Type':'text/plain'}); res.end('Not found'); }
  });
  await new Promise((done,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',done);});
  return server;
}
if (process.argv[1] && resolve(process.argv[1])===resolve('scripts/serve.mjs')) {
  const rebuild=()=>{const result=spawnSync(process.execPath,['scripts/build.mjs'],{stdio:'inherit'});if(result.status) throw new Error('Build failed');};
  if(process.argv.includes('--watch')) rebuild();
  const server=await startServer({port:Number(process.env.PORT||4173)});
  console.log(`QA preview: http://127.0.0.1:${server.address().port}`);
  if(process.argv.includes('--watch')) {
    let timer;
    for (const dir of ['src','public']) (async()=>{
      for await (const _ of watch(dir,{recursive:true})) {clearTimeout(timer);timer=setTimeout(()=>{try{rebuild();}catch(error){console.error(error.message);}},100);}
    })().catch(console.error);
    console.log('Watching src/ and public/; reload the browser after changes.');
  }
}
