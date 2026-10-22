#!/usr/bin/env node
/**
 * Copy a starter into a new prototype folder (or a single self-contained html file).
 *
 *   node scaffold.mjs <outDir> [--template admin-shell|catalog] [--single]
 *
 * Folder mode  -> <outDir>/index.html + css/ + fonts/   (relative paths, no reference back to the skill)
 * --single     -> <outDir>/index.html with CSS inlined and the used fonts as data: URIs (opens anywhere)
 * Never edits the skill's own templates. The fonts carry "Fonts for Daimler AG use only".
 */
import {copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assets = resolve(here, '../assets');
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i > -1 ? argv[i + 1] : d; };
const outDir = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--template'));
const template = flag('--template', 'admin-shell');
const single = argv.includes('--single');
if (!outDir || !existsSync(join(assets, `${template}.html`))) {
  console.error('usage: scaffold.mjs <outDir> [--template admin-shell|catalog] [--single]'); process.exit(2);
}
const out = resolve(outDir);
const needFonts = ['MBCorpoSText-Regular-Web.woff2', 'MBCorpoSText-Bold-Web.woff2'];
const missingFonts = needFonts.filter(f => !existsSync(join(assets, 'fonts', f)));
if (missingFonts.length) {
  console.error(`MB Corpo font files are not in ${join(assets, 'fonts')} (missing: ${missingFonts.join(', ')}).\n` +
    'They are not distributed with this repository (licence: "Fonts for Daimler AG use only").\n' +
    'Put your authorised copies of the six *.woff2 files listed in references/font-sources.json into assets/fonts/ and run again.');
  process.exit(3);
}
if (existsSync(join(out, 'index.html'))) { console.error(`refusing to overwrite ${join(out, 'index.html')}`); process.exit(1); }
mkdirSync(out, {recursive: true});
let html = readFileSync(join(assets, `${template}.html`), 'utf8');

if (!single) {
  for (const d of ['css', 'fonts']) {
    mkdirSync(join(out, d), {recursive: true});
    for (const f of readdirSync(join(assets, d))) copyFileSync(join(assets, d, f), join(out, d, f));
  }
  writeFileSync(join(out, 'index.html'), html);
  console.log(`created ${out}/index.html (+ css/, fonts/)`);
} else {
  const fontUri = name => `data:font/woff2;base64,${readFileSync(join(assets, 'fonts', name)).toString('base64')}`;
  const inline = rel => {
    let css = readFileSync(join(assets, rel), 'utf8');
    return css.replace(/url\("\.\.\/fonts\/([^"]+)"\)/g, (_, n) => `url("${fontUri(n)}")`);
  };
  html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">\s*/g, '');
  const used = ['mb-fonts.css', 'tokens.css', 'base.css', 'components.css'].map(n => inline(`css/${n}`)).join('\n');
  /* Embed only the optional faces the page opts into; the default display face is MB Text. */
  const drop = fam => css => css.replace(new RegExp(`@font-face\\{font-family:"${fam}"[\\s\\S]*?\\}\\n`, 'g'), '');
  let css = used;
  if (!/font-display-light|MB Title Sans/.test(html)) css = drop('MB Title Sans')(css);
  if (!/font-display-serif|"MB Title"/.test(html)) css = drop('MB Title')(css);
  html = html.replace('</head>', `<style>\n/* Fonts for Daimler AG use only. */\n${css}</style>\n</head>`);
  writeFileSync(join(out, 'index.html'), html);
  console.log(`created ${out}/index.html (single file, ${(html.length / 1024).toFixed(0)} KB)`);
}
