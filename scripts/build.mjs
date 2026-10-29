import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import { createZip } from './zip.mjs';

const root = resolve(import.meta.dirname, '..');
const from = path => readFileSync(join(root, path), 'utf8');
const dest = join(root, 'dist');
const domain = 'https://prompts.mightora.io';
const dataContext = {};
vm.runInNewContext(from('src/catalogue.js'), dataContext);
const { profiles, tasks } = dataContext.MIGHTORA_CATALOGUE;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const file = (path, contents) => { const target = join(dest, path); mkdirSync(resolve(target, '..'), { recursive: true }); writeFileSync(target, contents); };
const index = from('src/index.html');
const header = index.match(/<mightora-header\b[\s\S]*?<\/mightora-header>/)[0]
  .replaceAll('src="./assets/', 'src="/assets/')
  .replaceAll('href="./guides/', 'href="/guides/')
  .replaceAll('href="./examples/', 'href="/examples/')
  .replaceAll('href="#builder"', 'href="/#builder"')
  .replaceAll('href="#templates"', 'href="/#templates"');
const author = index.match(/<mightora-author\b[\s\S]*?<\/mightora-author>/)[0].replaceAll('src="./assets/', 'src="/assets/');
const trust = index.match(/<section class="trust-band"[\s\S]*?<\/section>/)[0];
const footer = index.match(/<mightora-footer\b[\s\S]*?<\/mightora-footer>/)[0];
const noJs = '<noscript><p class="container" style="padding:16px">These guides and examples work without JavaScript. The interactive builder uses JavaScript.</p></noscript>';
const articleLinks = (entries, folder) => `<div class="doc-card-grid">${entries.map(item => `<article class="doc-card"><p class="eyebrow">${esc(item.category || 'PROFILE')}</p><h3>${esc(item.name)}</h3><p>${esc(item.description || item.expertise)}</p><a href="/${folder}/${esc(item.id)}/">Read more ↗</a></article>`).join('')}</div>`;
const writingSample = task => `# Role\nAct as a thoughtful, experienced assistant.\n\n# Objective\n${task.instruction}\n\n# Context\n[Add the relevant situation, audience and background.]\n\n# Output\n${task.output}\n\n# Quality checks\n${task.checks}\nDo not invent facts. State assumptions and ask focused questions if key details are missing.`;

function documentPage({ path, title, description, eyebrow, heading, intro, html, schema = 'Article', links = [] }) {
  const canonical = domain + path;
  const ld = { '@context': 'https://schema.org', '@type': schema, headline: title, name: title,
    description, url: canonical, author: { '@type': 'Person', name: 'Ian Tweedie' }, publisher: { '@type': 'Organization', name: 'Mightora' } };
  const body = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#0c1725"><meta name="description" content="${esc(description)}"><meta name="robots" content="index,follow"><meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><link rel="canonical" href="${canonical}"><link rel="icon" type="image/png" href="/assets/mightora-logo.png"><title>${esc(title)} | Mightora Prompt Builder</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mightora/shared-ui@main/shared.css"><link rel="stylesheet" href="/styles.css"><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script><script src="/footer-patch.js" defer></script><script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js" defer></script><script src="https://cdn.jsdelivr.net/gh/mightora/shared-ui@main/components.js" defer></script></head><body><a class="skip-link" href="#main">Skip to content</a>${header}${noJs}<main class="doc-page" id="main"><div class="doc-hero"><div class="container"><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(heading)}</h1><p>${esc(intro)}</p></div></div><div class="container doc-body"><article class="doc-content">${html}<p><a href="/#builder" class="btn btn-primary">Open the prompt builder ↗</a></p></article><aside class="doc-side"><h3>Explore Mightora Prompts</h3><a href="/#builder">Build a prompt</a><a href="/guides/">Writing guides</a><a href="/examples/">Task examples</a><a href="/profiles/">AI profiles</a><a href="/privacy/">Privacy and offline use</a>${links.map(l => `<a href="${esc(l.url)}">${esc(l.title)}</a>`).join('')}</aside></div></main>${author}${trust}${footer}</body></html>`;
  const withCsp = addCsp(body);
  const localPath = path === '/' ? 'index.html' : `${path.slice(1)}index.html`;
  file(localPath, withCsp);
  return path;
}

const onlineCsp = "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; img-src 'self' data: https://raw.githubusercontent.com https://cdn.jsdelivr.net https://github.com https://img.shields.io; connect-src 'self' https://cdn.jsdelivr.net https://raw.githubusercontent.com; font-src 'self' data:";
function addCsp(html) { return html.replace('<meta charset="utf-8">', `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${onlineCsp}">`); }

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const path of ['catalogue.js', 'engine.js', 'app.js', 'styles.css', 'footer-patch.js', 'footer.yaml', 'config.json']) file(path, from('src/' + path));
cpSync(join(root, 'src/assets'), join(dest, 'assets'), { recursive: true });
file('index.html', addCsp(index));
file('CNAME', 'prompts.mightora.io\n');
file('.nojekyll', '');

const routes = ['/'];
routes.push(documentPage({ path: '/guides/', title: 'How to write effective AI prompts', description: 'A practical, platform-neutral guide to writing AI prompts with roles, goals, context, constraints and clear output formats.', eyebrow: 'PROMPTING GUIDE', heading: 'A practical guide to better AI prompts', intro: 'Good prompting is about giving useful instructions, enough context and a clear definition of success.', html: `
  <h2>Start with the outcome</h2><p>Begin by explaining what you need the AI to help with, who the result is for and what a good answer would look like. Avoid relying on a vague command such as “make this better”.</p>
  <h2>Five ingredients of a useful prompt</h2><ol><li><strong>Role:</strong> the perspective or expertise to apply.</li><li><strong>Objective:</strong> the action and result you want.</li><li><strong>Context:</strong> facts, background, audience and source material.</li><li><strong>Output:</strong> format, length, tone and structure.</li><li><strong>Checks:</strong> constraints, assumptions, verification and clarifying questions.</li></ol>
  <h2>Compare a vague and a useful prompt</h2><p>Vague: “Write a project plan.”</p><pre>Act as an experienced delivery manager. Create a four-week plan for introducing a new internal helpdesk process to a team of 25 people. Include milestones, owners by role, dependencies, risks, communications and acceptance criteria. Use UK English and a concise table. Flag any assumptions.</pre>
  <h2>Use examples and source material wisely</h2><p>Include only information you are permitted to share with your chosen AI service. Treat pasted documents as reference material; review the generated response for accidental assumptions and omissions.</p>
  <h2>Test, challenge and iterate</h2><p>Try the prompt, inspect the result, identify what did not meet the brief, and improve the wording. Ask for sources only when the model can actually access them, and independently verify important claims.</p>
  <h2>Common prompting mistakes</h2><ul><li>Leaving out the audience or success criteria.</li><li>Asking for incompatible output requirements.</li><li>Overloading the prompt with irrelevant material.</li><li>Assuming a role instruction guarantees expertise or accuracy.</li><li>Sharing sensitive or confidential information without approval.</li></ul>
  <h2>Frequently asked questions</h2><h3>Do I need a different prompt for each AI assistant?</h3><p>Usually not. Plain-text prompts are portable, although different models may behave differently. Review the result and adapt as necessary.</p><h3>Does a longer prompt always work better?</h3><p>No. Relevant information and precise instructions matter more than length.</p>` }));
routes.push(documentPage({ path: '/examples/', title: 'AI prompt examples for everyday work', description: 'Browse useful AI prompt examples for planning, writing, analysis, software engineering, learning and meetings.', eyebrow: 'TASK LIBRARY', heading: 'Practical AI prompt examples', intro: 'Choose a real task, read the structure, then open the builder to adapt it to your situation.', html: `<p>These examples are starting points, not finished answers. Each one shows what an instruction could look like without requiring a particular model.</p>${articleLinks(tasks, 'examples')}` }));
routes.push(documentPage({ path: '/profiles/', title: 'Reusable AI role profiles', description: 'Explore reusable AI role profiles for solution architecture, business analysis, writing, teaching, coaching and software engineering.', eyebrow: 'WORKING PROFILES', heading: 'Give your AI a useful working role', intro: 'A role can help set perspective, expertise and style. It cannot substitute for judgement or verified knowledge.', html: `<p>Use a built-in role, edit it in the builder, or save a custom role in your browser. Roles travel with the prompt text when you copy it.</p>${articleLinks(profiles, 'profiles')}` }));
routes.push(documentPage({ path: '/privacy/', title: 'Privacy, offline use and network transparency', description: 'Understand how Mightora Prompt Builder handles prompts, browser storage, external branding assets and offline downloads.', eyebrow: 'PRIVACY BY DESIGN', heading: 'Your prompt is built in your browser', intro: 'No account, no AI API connection and no prompt submission endpoint.', html: `
  <h2>What the tool does with your information</h2><p>The Prompt Builder composes text on your device using local JavaScript. Prompt fields and pasted material are not sent to Mightora or to any AI provider by this application. You choose what to copy and where to paste it.</p>
  <h2>What is saved</h2><p>Prompt fields are not automatically saved. When you explicitly save a custom role, it is stored in your browser’s localStorage, under the key <code>mightora-prompts-custom-profiles-v1</code>. You can delete saved profiles in the builder or clear site data in your browser. There is no cloud sync or recovery.</p>
  <h2>Online network resources</h2><p>The public site requests shared Mightora styles, components and a YAML footer feed using jsDelivr, and may request the official logo or badge imagery from GitHub and Shields.io. These third-party hosts receive ordinary HTTP requests; their own policies apply. The app itself makes no requests to a language-model API and does not add analytics or tracking pixels.</p>
  <h2>How to inspect network activity</h2><ol><li>Press F12 to open your browser’s Developer Tools.</li><li>Select the Network panel and enable Preserve log.</li><li>Reload the page and examine all requests and destinations.</li></ol><p>The on-page Performance Resource Timing summary can omit requests, so it is not a substitute for the browser Network panel or independent testing.</p>
  <h2>The offline edition</h2><p>Download the <a href="/downloads/mightora-prompt-builder-offline.html">single offline HTML file</a> or <a href="/downloads/mightora-prompt-builder-offline.zip">offline ZIP</a>. Open the HTML file directly in your browser; it embeds the application code, styles and logo and makes no automatic internet requests. Offline pages do not include the live shared footer feed or remote badges.</p>
  <h2>Important caution</h2><p>Do not paste confidential, personal or sensitive material into an external AI assistant unless its use is authorised. This site cannot control what happens after you copy a prompt to another service.</p>` }));

for (const task of tasks) {
  routes.push(documentPage({ path: `/examples/${task.id}/`, title: `${task.name}: AI prompt example and template`, description: `${task.description} Free reusable prompt example for ChatGPT, Copilot, Claude and other assistants.`, eyebrow: `PROMPT EXAMPLE / ${task.category.toUpperCase()}`, heading: task.name, intro: task.description,
    html: `<h2>When to use this prompt</h2><p>${esc(task.description)} Start by explaining your situation, audience and relevant constraints. This gives the AI a useful brief rather than just a one-line request.</p><h2>Reusable example prompt</h2><p>Replace the bracketed text with details from your own task:</p><pre>${esc(writingSample(task))}</pre><h2>Why this structure helps</h2><p>It defines the job, sets the expected output and explicitly asks the model to handle missing information carefully. You can add a professional profile, a preferred tone or supporting material in the builder.</p><h2>Before you use the response</h2><ul><li>Check accuracy and important factual claims.</li><li>Ensure the output reflects your context and audience.</li><li>Remove sensitive information before sharing it with an AI service.</li></ul><p><a href="/?task=${encodeURIComponent(task.id)}#builder" class="btn btn-primary">Use this template in the builder ↗</a></p>` }));
}
for (const profile of profiles) {
  routes.push(documentPage({ path: `/profiles/${profile.id}/`, title: `${profile.name}: reusable AI persona`, description: `Use a ${profile.name.toLowerCase()} role profile to guide AI tasks. Includes expertise, approach and reusable role instructions.`, eyebrow: 'REUSABLE AI PROFILE', heading: profile.name, intro: profile.expertise,
    html: `<h2>The role</h2><p>${esc(profile.role)}.</p><h2>Expertise and perspective</h2><p>${esc(profile.expertise)}.</p><h2>How this profile should work</h2><p>${esc(profile.approach)}</p><h2>Reusable role instruction</h2><pre>${esc(`Act as ${profile.role}.\nBring expertise in: ${profile.expertise}.\n${profile.approach}\nBe transparent about assumptions and limitations.`)}</pre><h2>Put the profile to work</h2><p>Try it with planning, analysis, writing or another task in the builder. Change the profile to suit your needs; no role instruction guarantees expertise or accuracy.</p><p><a href="/?profile=${encodeURIComponent(profile.id)}#builder" class="btn btn-primary">Use this profile in the builder ↗</a></p>` }));
}

file('robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://prompts.mightora.io/sitemap.xml\n');
const stamp = new Date().toISOString().slice(0, 10);
file('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route => `<url><loc>${domain}${route}</loc><lastmod>${stamp}</lastmod></url>`).join('')}</urlset>\n`);

// Offline is created from precisely the same HTML, logic and catalogue as the website.
const logo = 'data:image/png;base64,' + readFileSync(join(root, 'src/assets/mightora-logo.png')).toString('base64');
const portrait = 'data:image/png;base64,' + readFileSync(join(root, 'src/assets/ian-tweedie.png')).toString('base64');
const embeddedCss = from('src/assets/shared.css').replace(/background-image:\s*url\(['"]https:\/\/cdn\.jsdelivr\.net[^;]+;/g, 'background-image: none;');
let offline = index
  .replace('<html lang="en-GB">', '<html lang="en-GB" data-offline="true">')
  .replace(/<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net[^>]+>\s*/g, '')
  .replace(/<link rel="stylesheet" href="\.\/styles\.css">/, `<style>${embeddedCss}\n${from('src/styles.css')}</style>`)
  .replace(/<script src="\.\/footer-patch\.js" defer><\/script>/, '')
  .replace(/<script src="https:\/\/cdn\.jsdelivr\.net[^>]+><\/script>\s*/g, '')
  .replace(/<script src="\.\/(catalogue|engine|app)\.js" defer><\/script>/g, (_, name) => `<script>${from(`src/${name}.js`).replace(/<\/script/gi, '<\\/script')}</script>`)
  .replace(/<section class="trust-band"[\s\S]*?<\/section>/, '')
  .replaceAll('./assets/mightora-logo.png', logo)
  .replaceAll('./assets/ian-tweedie.png', portrait)
  .replaceAll('href="./guides/"', 'href="#how-it-works"')
  .replaceAll('href="./examples/"', 'href="#templates"')
  .replaceAll('href="./privacy/"', 'href="#privacy"')
  .replaceAll('href="./downloads/mightora-prompt-builder-offline.html"', 'href="#privacy"')
  .replaceAll('href="./downloads/mightora-prompt-builder-offline.zip"', 'href="#privacy"')
  .replace(/<div class="inline-actions"><a href="#privacy" class="btn btn-primary" download>[\s\S]*?<\/div>/, '<p class="help-text">You are using the self-contained offline edition. Copy or download generated prompts using the buttons above.</p>')
  .replace('href="/" class="fallback-brand"', 'href="#main" class="fallback-brand"')
  .replace('<main id="main">', '<div class="offline-ribbon">Offline Edition – No Internet Connection Required</div><main id="main">');
offline = offline.replace('<meta charset="utf-8">', `<meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'">`);
file('downloads/mightora-prompt-builder-offline.html', offline);
const offlineFolder = join(root, '.offline-package');
rmSync(offlineFolder, { recursive: true, force: true });
mkdirSync(offlineFolder, { recursive: true });
writeFileSync(join(offlineFolder, 'index.html'), offline);
writeFileSync(join(offlineFolder, 'LICENSE'), from('LICENSE'));
writeFileSync(join(offlineFolder, 'README.txt'), `Mightora Prompt Builder — Offline Edition\n\n1. Extract this ZIP archive.\n2. Double-click index.html in any modern browser on Windows, macOS or Linux.\n3. Build a prompt, copy or download it. No installation or internet connection is required.\n\nCustom profiles can be saved in browser storage when permitted. Local file storage support differs by browser, so do not treat it as a durable backup.\n\nThe offline HTML embeds all application code, styling and images. It initiates no network requests. External links are optional and are followed only if you choose to click them.\n\nSource: https://github.com/mightora/prompts.mightora.io\nLicence: MIT.\n`);
writeFileSync(join(dest, 'downloads/mightora-prompt-builder-offline.zip'), createZip({
  'index.html': offline,
  'README.txt': readFileSync(join(offlineFolder, 'README.txt')),
  'LICENSE': from('LICENSE')
}));
console.log(`Built ${routes.length} indexable pages, standalone HTML and offline ZIP.`);
