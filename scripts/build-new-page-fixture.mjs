import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { styleLayers } from './build.mjs';
import { renderNewPageFixture } from '../src/fixtures/new-page.mjs';

export async function buildNewPageFixture(root = resolve('test-results/new-page-fixture')) {
  await rm(root,{recursive:true,force:true});
  await mkdir(resolve(root,'assets'),{recursive:true});
  await mkdir(resolve(root,'fonts'),{recursive:true});
  const css=(await Promise.all(styleLayers.map(name=>readFile(`src/styles/${name}.css`,'utf8')))).join('\n');
  await writeFile(resolve(root,'assets/site.css'),css);
  await copyFile('src/navigation.js',resolve(root,'assets/navigation.js'));
  await copyFile('public/favicon.svg',resolve(root,'favicon.svg'));
  await copyFile('public/fonts/1Ptug8zYS_SKggPNyC0IT4ttDfA.woff2',resolve(root,'fonts/1Ptug8zYS_SKggPNyC0IT4ttDfA.woff2'));
  await writeFile(resolve(root,'index.html'),renderNewPageFixture());
  return root;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve('scripts/build-new-page-fixture.mjs')) {
  const root=await buildNewPageFixture();
  console.log(`Built development-only new-page fixture: ${root}`);
}
