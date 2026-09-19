import { readFile, writeFile, mkdir, rm, readdir, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { renderPage } from '../src/components/page.mjs';
import { site, navigation, fixture } from '../src/content/qa-fixture.mjs';
export const digest = data => createHash('sha256').update(data).digest('hex');
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
  const root = resolve('dist');
  await rm(root, {recursive: true, force: true});
  await mkdir(join(root, 'assets'), {recursive: true});
  const layers = ['tokens','fonts','base','typography','layout','navigation','components','responsive','fixture','motion'];
  const css = (await Promise.all(layers.map(name => readFile(`src/styles/${name}.css`, 'utf8')))).join('\n');
  const js = await readFile('src/navigation.js');
  const stylesheet = `/assets/site.${digest(css).slice(0,16)}.css`;
  const script = `/assets/navigation.${digest(js).slice(0,16)}.js`;
  await writeFile(join(root, stylesheet), css);
  await writeFile(join(root, script), js);
  await writeFile(join(root, 'index.html'), renderPage({site,navigation,fixture,stylesheet,script}));
  for (const file of await files('public')) {
    await mkdir(resolve(root, file, '..'), {recursive: true});
    await writeFile(join(root, file), await readFile(join('public', file)));
  }
  let gitSha = process.env.QA_BUILD_SHA;
  if (!gitSha) {
    const status = execFileSync('git', ['status','--porcelain'], {encoding:'utf8'}).trim();
    gitSha = status ? 'worktree' : execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  }
  if (gitSha !== 'worktree' && !/^[a-f0-9]{40}$/.test(gitSha)) throw new Error('Invalid QA_BUILD_SHA');
  await writeFile(join(root, 'release.json'), JSON.stringify({site:site.identity,environment:'qa',gitSha},null,2)+'\n');
  const checksums = {};
  for (const file of await files(root)) checksums[file] = digest(await readFile(join(root,file)));
  await writeFile(join(root,'artifact-manifest.json'),JSON.stringify({schema:1,gitSha,files:checksums},null,2)+'\n');
  console.log(`Built QA artifact: ${Object.keys(checksums).length} files + manifest (${gitSha})`);
}
if (process.argv[1] && resolve(process.argv[1]) === resolve('scripts/build.mjs')) await build();
