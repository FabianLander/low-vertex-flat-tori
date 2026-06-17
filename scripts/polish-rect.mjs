/**
 * Build a seed pool of EXACTLY-rectangular flat embedded tori from existing
 * sample CSVs.
 *
 * A torus is rectangular when its reduced modulus has Re τ̂ = 0. For each
 * input row with |Re τ̂| below --re-max, we freeze the SL(2,ℤ) element g that
 * reduces its τ (so Re(g·τ(p)) is a smooth function of positions) and run the
 * augmented Gauss–Newton projection onto { flat } ∩ { Re(g·τ) = 0 }. Rows that
 * converge, verify flat + rectangular to tolerance, AND remain embedded are
 * written to the pool — one torus per line, 24 full-precision floats (the
 * standard CSV format). The pool is the seed file for sample-rect.mjs.
 *
 * Usage:
 *   npm run polish-rect -- [options]
 *
 * Options:
 *   --in PATH        Input CSV file or directory of *.csv (repeatable).
 *                      Default: data/explore-from-seeds
 *   --type N         Triangulation type 1-7 (default 7 = Rich)
 *   --re-max N       Selection threshold on |Re τ̂| (default 1e-3)
 *   --im-min N       Only take seeds with Im τ̂ ≥ this (default 0 — e.g. 1.2
 *                      builds a pool of TALLER rectangles, away from the
 *                      square-torus cluster at Im ≈ 1)
 *   --im-max N       Only take seeds with Im τ̂ ≤ this (default ∞)
 *   --angle-tol N    Verification: max |cone deficit| (default 1e-10)
 *   --re-tol N       Verification: |Re τ̂| after polish (default 1e-10)
 *   --out PATH       Output pool CSV (default data/rect/pool.csv)
 *   --no-unit-area   Skip normalizing each kept torus to surface area 1
 */

import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';

import { byId } from '../src/triangulations/index.ts';
import { modulus, reduceModulus, reduceModulusWithMatrix, applyMobius } from '../src/topology/develop.ts';
import { newtonFlatten } from '../src/math/newton.ts';
import { maxConeDeficit } from '../src/functions/coneDeficit.ts';
import { isEmbedded } from '../src/math/embedded.ts';
import { linearSize } from '../src/math/energies/cellMargin.ts';

const args = process.argv.slice(2);
function flags(name) {
  const out = [];
  for (let i = 0; i < args.length; i++) if (args[i] === name) out.push(args[i + 1]);
  return out;
}
function flag(name) { return flags(name)[0]; }
function num(v, d) { return v === undefined ? d : Number(v); }
function hasFlag(name) { return args.indexOf(name) !== -1; }

const torus = byId(num(flag('--type'), 7));
const N = torus.vertexCount * 3;
const reMax = num(flag('--re-max'), 1e-3);
const imMin = num(flag('--im-min'), 0);
const imMax = num(flag('--im-max'), Infinity);
const angleTol = num(flag('--angle-tol'), 1e-10);
const reTol = num(flag('--re-tol'), 1e-10);
const unitArea = !hasFlag('--no-unit-area');
const outPath = resolve(flag('--out') ?? 'data/rect/pool.csv');
const inputs = flags('--in').length ? flags('--in') : ['data/explore-from-seeds'];

// ---- collect input CSV files ----
const files = [];
for (const inp of inputs) {
  const p = resolve(inp);
  if (statSync(p).isDirectory()) {
    for (const f of readdirSync(p)) if (f.endsWith('.csv')) files.push(join(p, f));
  } else {
    files.push(p);
  }
}

console.log('polish-rect');
console.log(`  type:       #${torus.id}`);
console.log(`  inputs:     ${files.length} file(s) from ${inputs.join(', ')}`);
console.log(`  select:     |Re τ̂| < ${reMax}${imMin > 0 || imMax < Infinity ? `,  Im τ̂ in [${imMin}, ${imMax === Infinity ? '∞' : imMax}]` : ''}`);
console.log(`  verify:     deficit < ${angleTol}, |Re τ̂| < ${reTol}, embedded`);
console.log(`  unit-area:  ${unitArea ? 'ON' : 'off'}`);
console.log(`  out:        ${outPath}`);
console.log();

// ---- scan, select, polish ----
let total = 0, selected = 0, converged = 0, kept = 0;
const pool = []; // { row: string, im: number }
for (const file of files) {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const parts = s.split(',');
    if (parts.length !== N) continue;
    total++;
    const p = new Float64Array(N);
    for (let i = 0; i < N; i++) p[i] = Number(parts[i]);

    const tauHat = reduceModulus(modulus(torus, p).tau);
    if (Math.abs(tauHat[0]) >= reMax) continue;
    if (tauHat[1] < imMin || tauHat[1] > imMax) continue;
    selected++;

    // Freeze the reducing matrix at the seed, then project onto
    // { flat } ∩ { Re(g·τ) = 0 }.
    const { m } = reduceModulusWithMatrix(modulus(torus, p).tau);
    const rect = { label: 'Re(g·τ)', value: (q) => applyMobius(m, modulus(torus, q).tau)[0] };
    const nr = newtonFlatten(torus, p, { tolerance: 1e-12, extraConstraints: [rect] });
    if (nr.status !== 'converged') continue;
    converged++;

    const reFinal = Math.abs(reduceModulus(modulus(torus, p).tau)[0]);
    if (!(maxConeDeficit(torus, p) < angleTol) || !(reFinal < reTol)) continue;
    if (!isEmbedded(torus, p)) continue;

    if (unitArea) {
      const k = 1 / linearSize(torus, p);
      for (let i = 0; i < N; i++) p[i] *= k;
    }
    kept++;
    let row = p[0].toString();
    for (let i = 1; i < N; i++) row += ',' + p[i].toString();
    pool.push({ row, im: reduceModulus(modulus(torus, p).tau)[1] });
  }
}

pool.sort((a, b) => a.im - b.im);
const outDir = dirname(outPath);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, pool.map((x) => x.row).join('\n') + (pool.length ? '\n' : ''));

console.log(`rows scanned:      ${total.toLocaleString()}`);
console.log(`selected:          ${selected}  (|Re τ̂| < ${reMax})`);
console.log(`newton converged:  ${converged}`);
console.log(`kept (embedded):   ${kept}`);
if (pool.length) {
  console.log(`Im τ̂ range:        [${pool[0].im.toFixed(6)}, ${pool[pool.length - 1].im.toFixed(6)}]`);
  console.log(`Im τ̂ values:       ${pool.map((x) => x.im.toFixed(4)).join(' ')}`);
}
console.log(`\nwrote ${pool.length} exactly-rectangular embedded tori → ${outPath}`);
