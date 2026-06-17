/**
 * Curate the rect-gallery: collect the GOOD rectangular examples from one or
 * more CSVs into a single gallery file.
 *
 * Every input row (24+ cols; extra columns ignored) is verified — flat to
 * --angle-tol, rectangular to --re-tol, embedded — then the survivors are
 * bucketed by Im τ̂ and the FATTEST example (largest scale-free embedding
 * margin, minMargin) wins each bucket. The result is a spread of distinct
 * rectangles, one well-embedded torus per aspect ratio, sorted by Im τ̂ and
 * normalized to unit area. Hand-add rows to the output afterwards if you have
 * favorites — the gallery demo recomputes every certificate from coordinates.
 *
 * Usage:
 *   npm run curate-gallery -- [options]
 *
 * Options:
 *   --in PATH        Input CSV file or directory of *.csv (repeatable).
 *                      Default: data/rect/pool.csv + data/rect/pool-tall.csv
 *   --type N         Triangulation type 1-7 (default 7 = Rich)
 *   --bucket N       Im τ̂ bucket width (default 0.05) — one example kept per bucket
 *   --re-tol N       Verification: |Re τ̂| (default 1e-6)
 *   --angle-tol N    Verification: max |cone deficit| (default 1e-10)
 *   --out PATH       Output CSV (default demos/rect-gallery/gallery.csv)
 */

import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';

import { byId } from '../../src/triangulations/index.ts';
import { modulus, reduceModulus } from '../../src/topology/develop.ts';
import { maxConeDeficit } from '../../src/conditions/flat.ts';
import { isEmbedded } from '../../src/conditions/embedded/index.ts';
import { minMargin, linearSize } from '../../src/conditions/embedded/index.ts';

const args = process.argv.slice(2);
function flags(name) {
  const out = [];
  for (let i = 0; i < args.length; i++) if (args[i] === name) out.push(args[i + 1]);
  return out;
}
function flag(name) { return flags(name)[0]; }
function num(v, d) { return v === undefined ? d : Number(v); }

const triang = byId(num(flag('--type'), 7));
const N = triang.vertexCount * 3;
const bucket = num(flag('--bucket'), 0.05);
const reTol = num(flag('--re-tol'), 1e-6);
const angleTol = num(flag('--angle-tol'), 1e-10);
const outPath = resolve(flag('--out') ?? 'demos/rect-gallery/gallery.csv');
const inputs = flags('--in').length ? flags('--in') : ['data/rect/pool.csv', 'data/rect/pool-tall.csv'];

const files = [];
for (const inp of inputs) {
  const p = resolve(inp);
  if (statSync(p).isDirectory()) {
    for (const f of readdirSync(p)) if (f.endsWith('.csv')) files.push(join(p, f));
  } else {
    files.push(p);
  }
}

console.log('curate-rect-gallery');
console.log(`  inputs:   ${files.map((f) => f.replace(process.cwd() + '/', '')).join(', ')}`);
console.log(`  keep:     deficit < ${angleTol}, |Re τ̂| < ${reTol}, embedded`);
console.log(`  buckets:  Im τ̂ width ${bucket} — fattest (largest minMargin) wins`);
console.log(`  out:      ${outPath}`);
console.log();

let scanned = 0, verified = 0;
const best = new Map(); // bucket index → { row, im, re, margin, deficit }
for (const file of files) {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const parts = s.split(',');
    if (parts.length < N) continue;
    scanned++;
    const p = new Float64Array(N);
    for (let i = 0; i < N; i++) p[i] = Number(parts[i]);

    const deficit = maxConeDeficit(triang, p);
    if (!(deficit < angleTol)) continue;
    const tauHat = reduceModulus(modulus(triang, p).tau);
    if (!(Math.abs(tauHat[0]) < reTol)) continue;
    if (!isEmbedded(triang, p)) continue;
    verified++;

    const margin = minMargin(triang, p).margin;   // scale-free fatness
    const b = Math.floor(tauHat[1] / bucket);
    const cur = best.get(b);
    if (!cur || margin > cur.margin) {
      const k = 1 / linearSize(triang, p);
      for (let i = 0; i < N; i++) p[i] *= k;     // unit area
      let row = p[0].toString();
      for (let i = 1; i < N; i++) row += ',' + p[i].toString();
      best.set(b, { row, im: tauHat[1], re: tauHat[0], margin, deficit });
    }
  }
}

const kept = [...best.values()].sort((a, b) => a.im - b.im);
const outDir = dirname(outPath);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, kept.map((x) => x.row).join('\n') + (kept.length ? '\n' : ''));

console.log(`rows scanned:  ${scanned.toLocaleString()}   verified: ${verified}`);
console.log(`gallery:       ${kept.length} tori (one per occupied Im bucket)`);
for (const x of kept) {
  console.log(`  Im=${x.im.toFixed(5)}  |Re|=${Math.abs(x.re).toExponential(1)}  margin=${x.margin.toFixed(4)}  flat=${x.deficit.toExponential(1)}`);
}
console.log(`\nwrote → ${outPath}`);
