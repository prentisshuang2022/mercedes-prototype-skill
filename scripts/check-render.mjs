#!/usr/bin/env node
/**
 * Render a prototype in headless Chrome and verify it against the Mercedes style rules.
 *
 *   node check-render.mjs <index.html> [--views dashboard,changes] [--out ./shots]
 *   --views  hash routes (a,b) or, for apps without hash routing, "@<selector>" clicks, e.g. "@.navitem[data-go=changes]"
 *
 * Needs Node >= 22 (global WebSocket/fetch) and Chrome/Chromium. Set CHROME_PATH to override discovery.
 * Checks per view x theme x viewport: font faces loaded or errored, console/runtime errors, failed requests,
 * horizontal overflow at 390px, computed border-radius (4px controls; 8px only on card surfaces, extend with --surfaces ".a,.b"; 16px only on .group; .search-pill pill; 50% for dots/avatars),
 * forced uppercase (text-transform) fails; all-caps words warn (acronym allowlist, extend with --acronyms),
 * select padding (appearance:none, left >= 12, right >= 28 so the text never touches the arrow),
 * control height (buttons, selects, bordered inputs, .omni, .seg, tabs must be 24 / 32 / 40px; extend with --controls ".a,.b"),
 * computed font-weight (400/700, 300 only for MB Title Sans).
 * Exit code 1 when any check fails. Screenshots are written to --out for visual review.
 */
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i > -1 ? argv[i + 1] : d; };
const file = argv.find(a => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true);
if (!file) { console.error('usage: check-render.mjs <index.html> [--views a,b] [--out dir]'); process.exit(2); }
const views = (flag('--views', '') || '').split(',').filter(Boolean);
/* Container surfaces allowed an 8px radius. Default is the skill's own; pass --surfaces ".dhead,.fsec" to add a prototype's own panels. */
const surfaces = ['.card', '.panel', '.table-wrap', '.modal', '.tile', '.ico', ...(flag('--surfaces', '') || '').split(',').map(s => s.trim()).filter(Boolean)];
/* Controls whose height must be 24 / 32 / 40. Bordered inputs and selects are always checked; add your own control classes with --controls ".view,.seg button". */
/* Words that may stay in capitals. Anything else in capitals triggers a warning; extend with --acronyms "ABC,XYZ". */
const acronyms = ['SRE', 'API', 'JIRA', 'UTC', 'CMP', 'AKS', 'URL', 'PDF', 'GMT', 'TAG', 'IAM', 'DB', 'CPU', 'SSO', 'TLS', 'DNS', 'HTTP', 'JSON', 'SQL', 'SLA', 'SLO', 'MTTR', 'VM', 'CI', 'CD', 'UI', 'ID', 'MB', 'KPI', 'TTL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', ...(flag('--acronyms', '') || '').split(',').map(s => s.trim()).filter(Boolean)];
const controls = ['.btn', 'select', 'input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=file])', '.omni', '.seg', '.tabs button', ...(flag('--controls', '') || '').split(',').map(s => s.trim()).filter(Boolean)];
const outDir = resolve(flag('--out', './mb-check'));
mkdirSync(outDir, {recursive: true});
const url = pathToFileURL(resolve(file)).href;

const chromePath = [process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => p && existsSync(p));
if (!chromePath) { console.error('Chrome not found. Set CHROME_PATH.'); process.exit(2); }

const profile = mkdtempSync(join(tmpdir(), 'mb-check-'));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'], {stdio: ['ignore', 'ignore', 'pipe']});
const cleanup = () => { try { chrome.kill(); } catch {} setTimeout(() => rmSync(profile, {recursive: true, force: true}), 300); };
process.on('exit', cleanup);

const wsUrl = await new Promise((ok, no) => {
  const t = setTimeout(() => no(new Error('Chrome did not start')), 15000);
  chrome.stderr.on('data', d => { const m = String(d).match(/ws:\/\/\S+/); if (m) { clearTimeout(t); ok(m[0]); } });
});
const ws = new WebSocket(wsUrl);
await new Promise(r => ws.addEventListener('open', r, {once: true}));
let seq = 0; const pending = new Map(); const listeners = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const {ok, no} = pending.get(m.id); pending.delete(m.id); m.error ? no(new Error(m.error.message)) : ok(m.result); }
  else listeners.forEach(l => l(m));
});
const send = (method, params = {}, sessionId) => new Promise((ok, no) => { const id = ++seq; pending.set(id, {ok, no}); ws.send(JSON.stringify({id, method, params, sessionId})); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true});
const cdp = (m, p) => send(m, p, sessionId);
const problems = []; const warnings = new Set(); let phase = '';
listeners.push(m => {
  if (m.sessionId !== sessionId) return;
  if (m.method === 'Runtime.exceptionThrown') problems.push(`${phase} exception: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push(`${phase} console.error: ${m.params.args.map(a => a.value ?? a.description).join(' ')}`);
  if (m.method === 'Network.loadingFailed' && !m.params.canceled) problems.push(`${phase} request failed: ${m.params.errorText} ${m.params.blockedReason || ''}`);
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') problems.push(`${phase} log: ${m.params.entry.text} ${m.params.entry.url || ''}`);
});
for (const d of ['Page', 'Runtime', 'Network', 'Log']) await cdp(`${d}.enable`);
const evalJS = async expr => { const r = await cdp('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true}); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text); return r.result.value; };

const AUDIT = `(async()=>{
  await document.fonts.ready; await new Promise(r=>setTimeout(r,150));
  const faces=[...document.fonts].map(f=>({family:f.family.replace(/"/g,''),weight:String(f.weight),status:f.status,han:/4E00/i.test(f.unicodeRange)}));
  const radius=new Map(), weight=new Map(), ctlH=new Map(), selGap=new Map(), upper=new Map(), caps=new Map();
  const ACR=new Set(${JSON.stringify(acronyms)});
  const sel=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.classList[0]?'.'+e.classList[0]:'');
  for(const e of document.body.querySelectorAll('*')){
    const cs=getComputedStyle(e); if(cs.display==='none'||!e.getClientRects().length) continue;
    const r=[cs.borderTopLeftRadius,cs.borderTopRightRadius,cs.borderBottomLeftRadius,cs.borderBottomRightRadius];
    const okR=v=>['0px','2px','4px','50%'].includes(v)||(v==='8px'&&e.matches(${JSON.stringify(surfaces.join(','))}))||(v==='16px'&&e.matches('.group'))||(e.classList.contains('search-pill')&&parseFloat(v)>=20);
    if(!r.every(okR)) radius.set(sel(e)+' '+r[0],1);
    if(e.tagName==='SELECT'&&!e.multiple&&e.size<=1&&(cs.appearance!=='none'||parseFloat(cs.paddingRight)<28||parseFloat(cs.paddingLeft)<12)) selGap.set(sel(e)+' appearance:'+cs.appearance+' padding:'+cs.paddingLeft+'/'+cs.paddingRight,1);
    if(e.matches(${JSON.stringify(controls.join(','))})&&!(e.matches('input,select')&&parseFloat(cs.borderTopWidth)===0)){const h=Math.round(e.getBoundingClientRect().height); if(![24,32,40].some(x=>Math.abs(x-h)<=1)) ctlH.set(sel(e)+' '+h+'px',1);}
    if(e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())){
      const w=cs.fontWeight, fam=cs.fontFamily;
      if(cs.textTransform==='uppercase') upper.set(sel(e),1);
      for(const n of e.childNodes){ if(n.nodeType!==3) continue; for(const wd of (n.textContent.match(/(?<!\\/)\\b[A-Z]{3,}\\b(?!\\/|[-\\u2010-\\u2015]\\d)/g)||[])) if(!ACR.has(wd)&&!e.closest('.mono,code,kbd,pre')) caps.set(wd,(caps.get(wd)||0)+1); }
      if(!(w==='400'||w==='700'||(w==='300'&&fam.includes('MB Title Sans')))) weight.set(sel(e)+' '+w,1);
    }
  }
  const h1=document.querySelector('h1:not([hidden])');
  return JSON.stringify({faces,theme:document.documentElement.dataset.theme,
    overflow:document.documentElement.scrollWidth>innerWidth+1,
    h1Family:h1?getComputedStyle(h1).fontFamily:null,
    radius:[...radius.keys()].slice(0,6),weight:[...weight.keys()].slice(0,6),ctlH:[...ctlH.keys()].slice(0,8),selGap:[...selGap.keys()].slice(0,6),upper:[...upper.keys()].slice(0,6),caps:[...caps.keys()].slice(0,10)});
})()`;

const runs = [['light', 1440, 900], ['dark', 1440, 900], ['light', 390, 844]];
const targets = views.length ? views : [''];
const rows = [];
for (const view of targets) for (const [theme, w, h] of runs) {
  phase = `[${view || 'default'} ${theme} ${w}]`;
  await cdp('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile: w < 600});
  const loaded = new Promise((r, no) => {
    const t = setTimeout(() => no(new Error(`${phase} page load timed out`)), 20000);
    const l = m => { if (m.method === 'Page.loadEventFired' && m.sessionId === sessionId) { clearTimeout(t); listeners.splice(listeners.indexOf(l), 1); r(); } };
    listeners.push(l);
  });
  /* A unique query forces a real navigation; same-URL hash changes never fire a load event. */
  await cdp('Page.navigate', {url: `${url}?run=${++seq}${view ? '#' + view : ''}`});
  await loaded;
  await evalJS(`document.documentElement.dataset.theme='${theme}';0`);
  if (view.startsWith('@')) {            /* click a selector: for single-page apps without hash routing */
    await evalJS(`document.querySelector(${JSON.stringify(view.slice(1))})?.click();0`); await sleep(400);
  } else if (view) await evalJS(`location.hash='${view}';0`);
  const a = JSON.parse(await evalJS(AUDIT));
  const name = `${(view || 'index').replace(/[^\w-]+/g, '_')}-${theme}-${w}.png`;
  const {cssContentSize} = await cdp('Page.getLayoutMetrics');
  const full = Math.min(Math.ceil(cssContentSize.height), 4000);
  const shot = await cdp('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true, clip: {x: 0, y: 0, width: w, height: Math.max(h, full), scale: 1}});
  await (await import('node:fs/promises')).writeFile(join(outDir, name), Buffer.from(shot.data, 'base64'));
  const bad = a.faces.filter(f => f.status === 'error' && !f.han).map(f => `${f.family} ${f.weight}`);
  const noHan = a.faces.filter(f => f.status === 'error' && f.han).map(f => `${f.family} ${f.weight}`);
  const used = a.faces.filter(f => f.status === 'loaded' && !f.han).map(f => `${f.family} ${f.weight}`);
  const mbLoaded = used.some(f => f.startsWith('MB Title ') || f.startsWith('MB Text '));
  const fails = [];
  if (bad.length) fails.push(`font error: ${bad.join(', ')}`);
  if (noHan.length) warnings.add(`Han face has no local font match (${[...new Set(noHan)].join(', ')}); Chinese falls back without size-adjust. Install Noto Sans SC / Source Han Sans SC, or expect PingFang SC / Microsoft YaHei.`);
  if (!mbLoaded) fails.push('no MB Title/MB Text face loaded');
  if (w < 600 && a.overflow) fails.push('horizontal overflow at 390px');
  if (a.radius.length) fails.push(`radius not allowed (controls 4px; 8px only on surfaces ${surfaces.join(' ')}; 16px only on .group; .search-pill pill; 50%): ${a.radius.join('; ')}`);
  if (a.upper.length) fails.push(`forced uppercase (text-transform) — use sentence or title case: ${a.upper.join('; ')}`);
  if (a.caps.length) warnings.add(`all-caps words in the text (${a.caps.join(', ')}). Write Low / High / Success, not LOW / HIGH / SUCCESS. Real acronyms are fine; add them with --acronyms "SRE,JIRA".`);
  if (a.selGap.length) fails.push(`select text touches the arrow (need appearance:none, padding-left >= 12, padding-right >= 28): ${a.selGap.join('; ')}`);
  if (a.ctlH.length) fails.push(`control height not 24/32/40: ${a.ctlH.join('; ')}`);
  if (a.weight.length) fails.push(`font-weight not 400/700: ${a.weight.join('; ')}`);
  rows.push({phase, name, fails, used: [...new Set(used)].join(', ')});
}

let failed = problems.length > 0;
for (const r of rows) { failed ||= r.fails.length > 0; console.log(`${r.fails.length ? 'FAIL' : 'ok  '} ${r.phase} -> ${r.name}`); r.fails.forEach(f => console.log(`       - ${f}`)); }
if (rows[0]) console.log(`\nfaces loaded: ${rows[0].used || '(none)'}`);
[...new Set(problems)].forEach(p => console.log(`FAIL ${p}`));
warnings.forEach(w => console.log(`WARN ${w}`));
console.log(`\nscreenshots: ${outDir}\n${failed ? 'RESULT: FAIL' : 'RESULT: PASS'}`);
cleanup();
process.exit(failed ? 1 : 0);
