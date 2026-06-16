/**
 * Simple local search near almost-rectangular tori.
 *
 *   for each attempt:
 *     1. Pick a random seed torus and kick every coordinate by Gaussian σ.
 *     2. newtonFlatten — the plain, unchanged projection back to flat.
 *     3. Measure how rectangular it is: re = |Re τ̂| (reduceModulus(modulus)).
 *     4. Keep it if re < --re-keep AND it is embedded → save a CSV row.
 *
 * No constraints, no charts — just perturb, flatten, filter. Every save is a
 * flat embedded torus within --re-keep of rectangular; the per-save log and
 * the report track the best |Re τ̂| seen so you can watch for better examples.
 *
 * Seeds default to data/rect/pool.csv (the polished nearly/exactly-rectangular
 * pool), but any standard 24-float CSV works.
 *
 * Usage:
 *   npm run near-rect -- [options]
 *
 * Options:
 *   --seed N          RNG seed (default: clock-derived)
 *   --rng NAME        'xoshiro' (default) or 'mulberry'
 *   --type N          Triangulation type 1-7 (default 7 = Rich)
 *   --seed-file PATH  Seed CSV (default data/rect/pool.csv)
 *   --sigma N         Gaussian kick size (default 0.01)
 *   --re-keep N       Save when the target distance is below this (default 1e-3)
 *   --target-re N     Target |Re τ̂| (default 0 = rectangular; 0.5 = the
 *                       rhombic wall). Distance is ||Re τ̂| − N|, so both
 *                       signs of the identified Re = ±1/2 wall count.
 *   --newton-tol N    Flatten tolerance (default 1e-12)
 *   --angle-tol N     Max |cone deficit| gate (default 1e-10)
 *   --feedback        Accepted tori join the in-memory seed pool
 *   --out PATH        Output base path (default samples/near-rect-<timestamp>)
 *   --max-tries N     Total attempts cap (default ∞)
 *   --max-accepts N   Saved-sample cap (default 100,000)
 *   --report-secs N   Progress report interval (default 30)
 *
 * Output format: one torus per line, 27 comma-separated values — the 24
 * full-precision floats x0,y0,z0,…,x7,y7,z7, then its certificate:
 *   col 25  max |cone deficit|   (flatness — expect ~1e-13 or below)
 *   col 26  Re τ̂                 (signed)
 *   col 27  Im τ̂                 (aspect ratio)
 *   col 28  embedding margin     (bigger = fatter = better)
 * all measured on exactly the coordinates written to disk. Standard embedding
 * CSVs are the first 24 columns; slice off the rest to feed tools that expect
 * exactly 24, e.g. `cut -d, -f1-24`.
 *
 * Saved rows are normalized to surface area 1 (preserves flatness,
 * embeddedness, and τ), then re-flattened one last time so the recorded τ̂ is
 * measured on exactly the coordinates written to disk.
 * Ctrl-C flushes and exits cleanly.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';

import { makeRng } from '../src/math/perturb.ts';
import { byId } from '../src/tori/index.ts';
import { modulus, reduceModulus } from '../src/math/develop.ts';
import { newtonFlatten } from '../src/math/newton.ts';
import { maxConeDeficit } from '../src/math/angles.ts';
import { isEmbedded } from '../src/math/embedded.ts';
import { linearSize, minMargin } from '../src/math/energies/cellMargin.ts';

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}
function num(v, d) { return v === undefined ? d : Number(v); }
function hasFlag(name) { return args.indexOf(name) !== -1; }

const torus = byId(num(flag('--type'), 7));
const N = torus.vertexCount * 3;

const seed = num(flag('--seed'), Date.now() >>> 0);
const rngName = flag('--rng') ?? 'xoshiro';
const sigma = num(flag('--sigma'), 0.01);
const reKeep = num(flag('--re-keep'), 1e-3);
const targetRe = num(flag('--target-re'), 0);
const newtonTol = num(flag('--newton-tol'), 1e-12);
const angleTol = num(flag('--angle-tol'), 1e-10);
const feedback = hasFlag('--feedback');
const maxTries = num(flag('--max-tries'), Infinity);
const maxAccepts = num(flag('--max-accepts'), 100_000);
const reportSecs = num(flag('--report-secs'), 30);
const seedFileAbs = resolve(flag('--seed-file') ?? 'data/rect/pool.csv');

if (!existsSync(seedFileAbs)) {
  console.error(`seed file not found: ${seedFileAbs}`);
  process.exit(1);
}
const pool = [];
for (const line of readFileSync(seedFileAbs, 'utf8').trim().split('\n')) {
  const parts = line.split(',');
  if (parts.length < N) continue;   // ≥ 24 cols: a previous run's output (with certificate) seeds the next
  const p = new Float64Array(N);
  for (let i = 0; i < N; i++) p[i] = Number(parts[i]);
  pool.push(p);
}
if (pool.length === 0) {
  console.error(`no ${N}-column rows in ${seedFileAbs}`);
  process.exit(1);
}

const baseOut = resolve((flag('--out') ?? `samples/near-rect-${Date.now()}`).replace(/\.csv$/, ''));
const outPath = `${baseOut}.csv`;
const outDir = dirname(baseOut);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

console.log('search-near-rect — perturb · flatten · keep if embedded and almost rectangular');
console.log(`  type:        #${torus.id}`);
console.log(`  rng:         ${rngName}  seed=${seed}`);
console.log(`  seeds:       ${seedFileAbs}  (${pool.length} tori)${feedback ? '  [feedback ON]' : ''}`);
console.log(`  σ:           ${sigma}`);
console.log(`  newton tol:  ${newtonTol}`);
console.log(`  keep:        ||Re τ̂| − ${targetRe}| < ${reKeep}  AND  embedded  (deficit < ${angleTol})`);
console.log(`  out:         ${outPath}`);
console.log(`  max-tries:   ${maxTries === Infinity ? '∞' : maxTries.toLocaleString()}`);
console.log('  ctrl-C to stop early.');
console.log();

const rng = makeRng(rngName, seed);
function gaussian() {
  let u = rng();
  if (u < 1e-12) u = 1e-12;
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const p = new Float64Array(N);
let tries = 0, flatOk = 0, reOk = 0, saved = 0;
let bestRe = Infinity, bestIm = 0;          // best save so far
let intBestRe = Infinity;                   // best save this report interval
let imLo = Infinity, imHi = -Infinity;      // Im τ̂ range of saves
const saves = [];                           // { re, im } of every save, for the final ranking

const start = Date.now();
let lastReport = start, lastTries = 0;

function report() {
  const now = Date.now();
  const dT = (now - lastReport) / 1000;
  const fRe = (x) => (x === Infinity ? '-' : x.toExponential(2));
  const fIm = (x) => (Math.abs(x) === Infinity ? '-' : x.toFixed(4));
  console.log(
    `[${((now - start) / 1000).toFixed(0).padStart(5)}s] `
    + `tries=${tries.toLocaleString().padStart(8)} `
    + `flat=${flatOk.toLocaleString().padStart(7)} `
    + `|Re|<${reKeep}=${reOk.toLocaleString().padStart(6)} `
    + `saved=${saved.toLocaleString().padStart(6)} `
    + `(${dT > 0 ? ((tries - lastTries) / dT).toFixed(1) : 0} tries/s)  `
    + `best|Re|: interval ${fRe(intBestRe)}  global ${fRe(bestRe)}  `
    + `Im∈[${fIm(imLo)}, ${fIm(imHi)}]`,
  );
  intBestRe = Infinity;
  lastReport = now; lastTries = tries;
}

process.on('SIGINT', () => { console.log('\n— interrupted —'); report(); process.exit(0); });

const reportMs = reportSecs * 1000;

while (tries < maxTries && saved < maxAccepts) {
  const seedRow = pool[Math.floor(rng() * pool.length)];
  for (let i = 0; i < N; i++) p[i] = seedRow[i] + sigma * gaussian();
  tries++;

  const nr = newtonFlatten(torus, p, { tolerance: newtonTol });
  if (nr.status === 'converged' && maxConeDeficit(torus, p) < angleTol) {
    flatOk++;
    let tauHat = reduceModulus(modulus(torus, p).tau);
    let re = Math.abs(Math.abs(tauHat[0]) - targetRe);   // distance to the target locus
    if (re < reKeep) {
      reOk++;
      if (isEmbedded(torus, p)) {
        // normalize to unit area (preserves flat / embedded / τ), re-flatten,
        // and measure the recorded certificate (deficit, τ̂) on exactly what
        // is written to disk.
        const k = 1 / linearSize(torus, p);
        for (let i = 0; i < N; i++) p[i] *= k;
        const polish = newtonFlatten(torus, p, { tolerance: newtonTol });
        const deficit = maxConeDeficit(torus, p);
        if (polish.status !== 'converged' || !(deficit < angleTol)) continue;
        tauHat = reduceModulus(modulus(torus, p).tau);
        re = Math.abs(Math.abs(tauHat[0]) - targetRe);
        if (!(re < reKeep) || !isEmbedded(torus, p)) continue;
        const margin = minMargin(torus, p).margin;
        let row = p[0].toString();
        for (let i = 1; i < N; i++) row += ',' + p[i].toString();
        row += ',' + deficit.toString() + ',' + tauHat[0].toString() + ',' + tauHat[1].toString() + ',' + margin.toString();
        appendFileSync(outPath, row + '\n');
        saved++;
        saves.push({ re, im: tauHat[1] });
        if (re < intBestRe) intBestRe = re;
        if (re < bestRe) { bestRe = re; bestIm = tauHat[1]; }
        if (tauHat[1] < imLo) imLo = tauHat[1];
        if (tauHat[1] > imHi) imHi = tauHat[1];
        if (feedback) pool.push(new Float64Array(p));
        console.log(
          `  + save #${saved.toString().padStart(5)}  τ̂=${tauHat[0].toFixed(7)} + ${tauHat[1].toFixed(5)}i  `
          + `${targetRe === 0 ? '|Re|' : 'from-target'}=${re.toExponential(2)}  flat=${deficit.toExponential(1)}  `
          + `margin=${margin.toExponential(1)}  t=${((Date.now() - start) / 1000).toFixed(0).padStart(4)}s`,
        );
      }
    }
  }

  if (Date.now() - lastReport > reportMs) report();
}

console.log('\n— done —');
report();
if (saved > 0) {
  const top = [...saves].sort((a, b) => a.re - b.re).slice(0, 10);
  console.log('most rectangular finds:');
  for (const t of top) console.log(`  |Re τ̂| = ${t.re.toExponential(3)}   Im τ̂ = ${t.im.toFixed(6)}`);
  console.log(`best save: |Re τ̂| = ${bestRe.toExponential(3)} at Im τ̂ = ${bestIm.toFixed(6)}`);
  console.log(`${saved} tori → ${outPath}`);
}
