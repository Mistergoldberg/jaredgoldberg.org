import { readFile, writeFile, mkdir, rm, readdir, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { renderHomePage, renderSectionPage } from '../src/components/page.mjs';
import { site, navigation, homepage, sectionRoutes } from '../src/content/homepage.mjs';
import { sectionPages } from '../src/content/section-pages.mjs';
export const digest = data => createHash('sha256').update(data).digest('hex');
export const styleLayers = ['tokens','fonts','base','typography','layout','navigation','components','responsive','homepage','section-pages','motion'];
export const publicFiles = [
  'favicon.svg',
  'fonts/1Ptug8zYS_SKggPNyC0IT4ttDfA.woff2',
  'fonts/OFL.txt',
];
export async function files(root) {
  const result = [];
  async function walk(dir, prefix = '') {
    for (const item of (await readdir(dir)).sort()) {
      const name = prefix + item;
      const stat = await lstat(join(dir, item));
      if (stat.isSymbolicLink()) throw new Error(`Symlinks are not build inputs: ${name}`);
      if (stat.isDirectory()) await walk(join(dir, item), `${name}/`);
      else result.push(name);
    }
  }
  await walk(root); return result;
}
export async function build() {
  const environment = process.env.BUILD_ENV || 'qa';
  if (!['qa','production'].includes(environment)) throw new Error('BUILD_ENV must be qa or production');
  const root = resolve('dist');
  await rm(root, {recursive: true, force: true});
  await mkdir(join(root, 'assets'), {recursive: true});
  const css = (await Promise.all(styleLayers.map(name => readFile(`src/styles/${name}.css`, 'utf8')))).join('\n');
  const js = await readFile('src/navigation.js');
  const stylesheet = `/assets/site.${digest(css).slice(0,16)}.css`;
  const script = `/assets/navigation.${digest(js).slice(0,16)}.js`;
  await writeFile(join(root, stylesheet), css);
  await writeFile(join(root, script), js);
  await writeFile(join(root, 'index.html'), renderHomePage({site,navigation,homepage,stylesheet,script,environment}));
  for (const page of sectionPages) {
    const directory = join(root, page.slug);
    await mkdir(directory,{recursive:true});
    await writeFile(join(directory,'index.html'),renderSectionPage({site,navigation,sectionRoutes,page,stylesheet,script,environment}));
  }
  for (const file of publicFiles) {
    await mkdir(resolve(root, file, '..'), {recursive: true});
    await writeFile(join(root, file), await readFile(join('public', file)));
  }
  await writeFile(join(root, 'robots.txt'), environment === 'qa'
    ? 'User-agent: *\nDisallow: /\n'
    : 'User-agent: *\nAllow: /\n');
  let gitSha = process.env.BUILD_SHA || process.env.QA_BUILD_SHA;
  if (!gitSha) {
    const status = execFileSync('git', ['status','--porcelain'], {encoding:'utf8'}).trim();
    gitSha = status ? 'worktree' : execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  }
  if (gitSha !== 'worktree' && !/^[a-f0-9]{40}$/.test(gitSha)) throw new Error('Invalid BUILD_SHA');
  const buildId = process.env.BUILD_ID || `${environment}-${gitSha === 'worktree' ? 'worktree' : gitSha.slice(0,12)}`;
  if (!/^[a-z0-9][A-Za-z0-9._-]{2,79}$/.test(buildId)) throw new Error('Invalid BUILD_ID');
  await writeFile(join(root, 'release.json'), JSON.stringify({
    site:site.identity,environment,gitSha,buildId,artifactManifest:'artifact-manifest.json',
  },null,2)+'\n');
  const checksums = {};
  for (const file of await files(root)) checksums[file] = digest(await readFile(join(root,file)));
  await writeFile(join(root,'artifact-manifest.json'),JSON.stringify({
    schema:2,site:site.identity,environment,gitSha,buildId,files:checksums,
  },null,2)+'\n');
  console.log(`Built ${environment} artifact: ${Object.keys(checksums).length} files + manifest (${gitSha}, ${buildId})`);
}
if (process.argv[1] && resolve(process.argv[1]) === resolve('scripts/build.mjs')) await build();
