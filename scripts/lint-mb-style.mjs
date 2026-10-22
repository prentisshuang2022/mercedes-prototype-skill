#!/usr/bin/env node
/**
 * Static style lint for Mercedes-Benz prototypes. No dependencies.
 *
 *   node lint-mb-style.mjs <file|dir> [...]      checks .html and .css
 *
 * ERROR (exit 1): hard-coded border-radius (use the tokens: 4px controls, 8px cards, 16px groups), font-weight outside 400/700 (300 only with MB Title Sans),
 *                 feature code using --color-brand-*, external font CDNs, transform: scaleX on text.
 * WARN:           hard-coded colors outside tokens.css, font-family without MB families or --font-* tokens,
 *                 opacity outside 1 / .74 / .6 / .38, box-shadow with blur above 12px,
 *                 padding/margin/gap values off the spacing scale (one summary line per file),
 *                 text-transform: uppercase.
 */
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {basename, join, resolve} from 'node:path';

const targets = process.argv.slice(2);
if (!targets.length) { console.error('usage: lint-mb-style.mjs <file|dir> [...]'); process.exit(2); }

const walk = p => {
  const s = statSync(p);
  if (s.isFile()) return /\.(html?|css)$/i.test(p) ? [p] : [];
  return readdirSync(p).flatMap(n => (n === 'node_modules' || n.startsWith('.')) ? [] : walk(join(p, n)));
};
const files = targets.flatMap(t => walk(resolve(t)));

const blank = (text, re) => text.replace(re, m => m.replace(/[^\n]/g, ' '));
const findings = [];
const add = (file, text, index, level, rule, msg) =>
  findings.push({file, line: text.slice(0, index).split('\n').length, level, rule, msg});

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const isTokens = /^(tokens|mb-fonts)\.css$/.test(basename(file));
  let t = blank(raw, /\/\*[\s\S]*?\*\//g);
  t = blank(t, /<!--[\s\S]*?-->/g);
  t = blank(t, /data:[a-z/+-]+;base64,[A-Za-z0-9+/=]+/g);

  for (const m of t.matchAll(/border(?:-(?:top|bottom)-(?:left|right))?-radius\s*:\s*([^;}"]+)/gi)) {
    for (const v of m[1].replace(/!important/, '').split(/[\s/]+/).filter(Boolean)) {
      if (/^var\(/.test(v) || v === '0' || /^50%$/.test(v) || /^inherit$|^0px$/.test(v)) continue;
      const n = parseFloat(v);
      if (/^[\d.]+(px|rem|em)?$/.test(v) && /px$/.test(v) && n <= 2) continue;
      add(file, t, m.index, 'ERROR', 'radius', `border-radius "${v}" — controls use var(--radius) 4px; cards/tiles/panels use var(--radius-card) 8px; .group uses var(--radius-group) 16px; .search-pill uses var(--radius-pill); 50% for dots and avatars. Write the token, not the number`);
    }
  }
  for (const m of t.matchAll(/font-weight\s*:\s*([^;}"]+)/gi)) {
    const v = m[1].replace(/!important/, '').trim();
    if (/^(400|700|normal|bold|inherit|unset|initial)$/.test(v) || /^var\(/.test(v)) continue;
    const block = t.slice(Math.max(0, m.index - 300), m.index + 200);
    if (v === '300' && /MB Title Sans|font-display-light/.test(block)) continue;
    add(file, t, m.index, 'ERROR', 'weight', `font-weight "${v}" — only 400/700 (300 only with MB Title Sans)`);
  }
  if (!isTokens) {
    /* A token definition (--x: ...) is the one place raw values and the brand scale may appear. */
    const inCustomProp = idx => /--[\w-]+\s*:[^;{}]*$/.test(t.slice(Math.max(0, idx - 200), idx));
    for (const m of t.matchAll(/var\(\s*--color-brand-[\w-]+/g)) {
      const before = t.slice(Math.max(0, m.index - 200), m.index);
      if (/--color-application-[\w-]+\s*:[^;{}]*$/.test(before)) continue;   // L2 -> L1 mapping inside the token layer
      add(file, t, m.index, 'ERROR', 'token-layer', `${m[0].replace(/var\(\s*/, '')} is a read-only brand scale; use --color-application-* or the L3 aliases`);
    }
    for (const m of t.matchAll(/(?<![\w&"'-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|\b(?:rgba?|hsla?|oklch)\([^)]*\)/g)) {
      const c = m[0].toLowerCase();
      if (/^#(000|fff)(000|fff)?$/.test(c) || /^rgba?\(\s*0[\s,]+0[\s,]+0/.test(c)) continue;
      if (inCustomProp(m.index)) continue;                                    // defining a token is allowed
      add(file, t, m.index, 'WARN', 'hard-coded-color', `${m[0]} — reference a token instead`);
    }
  }
  for (const m of t.matchAll(/(?:href|src)\s*=\s*["']https?:\/\/[^"']*(?:fonts\.googleapis|fonts\.gstatic|typekit|use\.fontawesome)[^"']*|@import[^;]*https?:\/\/[^;]*font[^;]*/gi))
    add(file, t, m.index, 'ERROR', 'cdn-font', 'external font CDN — ship MB Corpo from ./fonts and rely on local() Han faces');
  for (const m of t.matchAll(/text-transform\s*:\s*uppercase/gi))
    add(file, t, m.index, 'WARN', 'uppercase', 'real Mercedes systems show no forced capitals — write labels in sentence or title case; keep only real acronyms (SRE, API, JIRA) in capitals');
  for (const m of t.matchAll(/scaleX\s*\(/g))
    add(file, t, m.index, 'ERROR', 'scaleX', 'never squeeze text with scaleX; use the condensed face and size-adjust');
  for (const m of t.matchAll(/font-family\s*:\s*([^;}"]+)/gi)) {
    const v = m[1];
    if (/MB Text|MB Title|var\(\s*--font-|inherit/.test(v)) continue;
    if (/monospace|ui-monospace/.test(v)) continue;
    add(file, t, m.index, 'WARN', 'font-family', `"${v.trim().slice(0, 60)}" — use var(--font-text) / var(--font-display) / var(--font-data)`);
  }
  /* Spacing scale. Off-scale values (3, 5, 7, 9, 10, 11, 13, 14, 15, 17, 18, 22, 23 ...) are how a prototype drifts; snap them. */
  const SPACE = new Set([0, 1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64]);
  const offScale = new Map();
  for (const m of t.matchAll(/(?<![-\w])(?:padding|margin|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?\s*:\s*([^;}"]+)/gi)) {
    if (/\bcalc\(|\bclamp\(|\bmin\(|\bmax\(/.test(m[1])) continue;
    for (const px of m[1].matchAll(/(?<![\w.#-])(\d+(?:\.\d+)?)px\b/g)) {
      const n = parseFloat(px[1]);
      if (!SPACE.has(n)) offScale.set(n, (offScale.get(n) || 0) + 1);
    }
  }
  if (offScale.size) {
    const total = [...offScale.values()].reduce((a, b) => a + b, 0);
    add(file, t, 0, 'WARN', 'spacing', `${total} off-scale padding/margin/gap value(s): ${[...offScale].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}px×${v}`).join(', ')} — use 4/6/8/12/16/20/24/32/40/48/64 (cards: 16px padding, 16px column gap, 24px row gap)`);
  }
  for (const m of t.matchAll(/(?<![-\w])opacity\s*:\s*([\d.]+)/g)) {
    const v = parseFloat(m[1]);
    if ([0, 1, 0.74, 0.6, 0.38].includes(v)) continue;
    add(file, t, m.index, 'WARN', 'opacity', `opacity ${m[1]} — hierarchy uses 1 / .74 / .6 / .38`);
  }
  for (const m of t.matchAll(/box-shadow\s*:\s*([^;}"]+)/gi)) {
    if (/^(none|var\()/.test(m[1].trim())) continue;
    const nums = (m[1].match(/-?[\d.]+px/g) || []).map(parseFloat);
    if (nums[2] > 12) add(file, t, m.index, 'WARN', 'shadow', `box-shadow blur ${nums[2]}px — structure comes from hairlines, not shadows`);
  }
}

const order = {ERROR: 0, WARN: 1};
findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || order[a.level] - order[b.level]);
for (const f of findings) console.log(`${f.level.padEnd(5)} ${f.file}:${f.line} [${f.rule}] ${f.msg}`);
const errors = findings.filter(f => f.level === 'ERROR').length, warns = findings.length - errors;
console.log(`\n${files.length} file(s) · ${errors} error(s) · ${warns} warning(s)`);
process.exit(errors ? 1 : 0);
