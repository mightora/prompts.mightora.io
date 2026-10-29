import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { readZip } from './zip.mjs';
const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const read = p => readFileSync(join(dist, p), 'utf8');
const main = read('index.html');
const offline = read('downloads/mightora-prompt-builder-offline.html');
assert.match(main, /<mightora-header/);
assert.match(main, /<mightora-author/);
assert.match(main, /<mightora-footer/);
assert.ok(main.indexOf('trust-band') < main.indexOf('<mightora-footer'));
assert.match(main, /Mightora Prompt Builder/);
assert.match(main, /canonical/);
assert.match(main, /#builder/);
assert.match(read('CNAME'), /prompts\.mightora\.io/);
assert.match(read('sitemap.xml'), /\/guides\//);
assert.match(read('sitemap.xml'), /\/examples\//);
assert.match(read('sitemap.xml'), /\/profiles\//);
assert.match(read('robots.txt'), /Sitemap:/);
assert.match(offline, /data-offline="true"/);
assert.match(offline, /Offline Edition – No Internet Connection Required/);
assert.match(offline, /data:image\/png;base64,/);
assert.match(offline, /connect-src 'none'/);
assert.match(offline, /function compose\(/);
assert.match(offline, /MIGHTORA_CATALOGUE/);
assert.ok(offline.indexOf('MIGHTORA_CATALOGUE') > offline.indexOf('</main>'), 'Offline scripts must run after the page controls');
assert.doesNotMatch(offline, /<script src=/);
assert.doesNotMatch(offline, /<link rel="stylesheet"/);
assert.doesNotMatch(offline, /url\(['"]https?:\/\//);
assert.doesNotMatch(offline, /<img[^>]+src="https?:\/\//);
const zip = join(dist, 'downloads/mightora-prompt-builder-offline.zip');
assert.ok(statSync(zip).size > 20_000);
const extracted = readZip(readFileSync(zip));
const listed = Object.keys(extracted).sort();
assert.deepEqual(listed, ['LICENSE', 'README.txt', 'index.html']);
assert.equal(extracted['index.html'], offline);
let pages = 0;
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(join(dir, entry.name));
    else if (entry.name === 'index.html') pages++;
  }
}
walk(dist);
assert.ok(pages >= 20, `Expected indexable content pages, found ${pages}`);
console.log(`Verified ${pages} HTML pages, sitemap, shared components, badges and matching offline downloads.`);
