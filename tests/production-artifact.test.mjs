import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { files, digest, publicFiles } from '../scripts/build.mjs';
import { startServer } from '../scripts/serve.mjs';

const routes=['index.html','media-archives-and-memory/index.html','community-service/index.html','systems-and-institutions/index.html','art/index.html'];

test('production artifact is indexable, identified and strictly allowlisted',async()=>{
  const names=await files('dist');
  const manifest=JSON.parse(await readFile('dist/artifact-manifest.json','utf8'));
  const release=JSON.parse(await readFile('dist/release.json','utf8'));
  assert.deepEqual(release,{
    site:'jaredgoldberg.org',environment:'production',gitSha:manifest.gitSha,
    buildId:manifest.buildId,artifactManifest:'artifact-manifest.json',
  });
  assert.equal(manifest.schema,2);
  assert.equal(manifest.site,'jaredgoldberg.org');
  assert.equal(manifest.environment,'production');
  assert.match(manifest.gitSha,/^(?:worktree|[a-f0-9]{40})$/);
  assert.match(manifest.buildId,/^(?:production-[A-Za-z0-9._-]+|\d{8}T\d{6}Z-[a-f0-9]{12})$/);
  assert.deepEqual(names.filter(name=>name!=='artifact-manifest.json').sort(),Object.keys(manifest.files).sort());
  for(const [name,expected] of Object.entries(manifest.files)) assert.equal(digest(await readFile(`dist/${name}`)),expected,name);
  const generated=['artifact-manifest.json','release.json','robots.txt',...routes];
  const hashed=names.filter(name=>/^assets\/[a-z-]+\.[a-f0-9]{16}\.(?:css|js)$/.test(name));
  assert.equal(hashed.length,2);
  assert.deepEqual(names.sort(),[...generated,...publicFiles,...hashed].sort());
  assert.equal(await readFile('dist/robots.txt','utf8'),'User-agent: *\nAllow: /\n');
  for(const route of routes) assert.doesNotMatch(await readFile(`dist/${route}`,'utf8'),/noindex|nofollow/);
  assert.doesNotMatch(names.join('\n'),/above-the-fold-prototype|fixture|test-results/);
});

test('production preview does not add the QA robots header',async()=>{
  const server=await startServer({port:0});
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    for(const route of ['/','/media-archives-and-memory/','/community-service/','/systems-and-institutions/','/art/','/robots.txt','/release.json','/artifact-manifest.json']) {
      const response=await fetch(base+route);
      assert.equal(response.status,200,route);
      assert.equal(response.headers.get('x-robots-tag'),null,route);
    }
    for(const route of ['/src/navigation.js','/package.json','/images/above-the-fold-prototype.png']) assert.equal((await fetch(base+route)).status,404,route);
  } finally { await new Promise(done=>server.close(done)); }
});
