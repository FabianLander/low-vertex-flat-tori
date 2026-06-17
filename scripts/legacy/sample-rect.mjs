/**
 * Random walk ON the rectangular-modulus locus: flat embedded tori with
 * Re τ̂ = 0 exactly (machine precision), explored by perturb-and-project.
 *
 *   for each attempt:
 *     1. Pick a random pool torus (every pool row is flat, embedded, and
 *        exactly rectangular) and perturb it by Gaussian noise σ.
 *     2. Project back with the AUGMENTED Newton: 7 cone deficits plus
 *        Re(g·τ(p)) = 0, where g is the SL(2,ℤ) element reducing the seed's
 *        modulus, frozen during the solve (see develop.ts
 *        reduceModulusWithMatrix). The result is flat AND rectangular, not
 *        merely close.
 *     3. Verify: max cone deficit < --angle-tol, |Re τ̂| < --re-tol,
 *        isEmbedded. All three pass → save a CSV row.
 *     4. With --feedback, accepted rows join the pool (file + memory), so the
 *        walk diffuses along the locus — sweeping out the realizable Im τ̂
 *        range instead of orbiting the starting seeds.
 *
 * Build the initial pool with polish-rect.mjs. Pool rows that are not
 * actually rectangular/flat are rejected at load time.
 *
 * Why a walk and not continuation: the min-norm projection path from a far
 * seed gets stuck at embeddedness walls; a walk constrained to the locus can
 * slide along it around obstacles.
 *
 * Usage:
 *   npm run sample-rect -- [options]
 *
 * Options:
 *   --seed N            RNG seed (default: clock-derived)
 *   --rng NAME          'xoshiro' (default) or 'mulberry'
 *   --type N            Triangulation type 1-7 (default 7 = Rich)
 *   --seed-file PATH    Pool CSV (default data/rect/pool.csv)
 *   --feedback          Append each accepted torus back to the pool
 *   --sigma-min N       Min Gaussian σ (default 0.005)
 *   --sigma-max N       Max Gaussian σ (default 0.15)
 *   --sigma-dist NAME   'uniform' (default) or 'log' (log-uniform: mostly
 *                         small local moves with a fat tail of big jumps)
 *   --angle-tol N       Verification: max |cone deficit| (default 1e-10)
 *   --re-tol N          Verification: |Re τ̂| (default 1e-10)
 *   --newton-tol N      Augmented-Newton residual tolerance (default 1e-12)
 *   --out PATH          Output base path (default samples/rect-<timestamp>)
 *   --no-unit-area      Skip normalizing accepted tori to surface area 1
 *   --max-tries N       Total attempts cap (default ∞)
 *   --max-accepts N     Saved-sample cap (default 100,000)
 *   --max-per-file N    Roll output every N saves (default 100,000)
 *   --report-secs N     Progress report interval (default 30)
 *
 * Ctrl-C flushes the pending buffer and exits cleanly.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

import { makeRng } from '../../src/sampling/rng.ts';
import { byId } from '../../src/triangulations/index.ts';
import { modulus, reduceModulus, reduceModulusWithMatrix, applyMobius } from '../../src/topology/develop.ts';
import { newtonFlatten } from '../../src/math/newton.ts';
import { maxConeDeficit } from '../../src/conditions/flat.ts';
import { isEmbedded } from '../../src/conditions/embedded/index.ts';
import { linearSize } from '../../src/conditions/embedded/index.ts';

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}
function num(v, d) { return v === undefined ? d : Number(v); }
function hasFlag(name) { return args.indexOf(name) !== -1; }

const triang = byId(num(flag('--type'), 7));
const N = triang.vertexCount * 3;

const seed = num(flag('--seed'), Date.now() >>> 0);
const rngName = flag('--rng') ?? 'xoshiro';
const sigmaMin = num(flag('--sigma-min'), 0.005);
const sigmaMax = num(flag('--sigma-max'), 0.15);
const sigmaDist = flag('--sigma-dist') ?? 'uniform';
if (sigmaDist !== 'uniform' && sigmaDist !== 'log') {
  console.error(`unknown --sigma-dist: ${sigmaDist}; choices: uniform, log`);
  process.exit(1);
}
const angleTol = num(flag('--angle-tol'), 1e-10);
const reTol = num(flag('--re-tol'), 1e-10);
const newtonTol = num(flag('--newton-tol'), 1e-12);
const feedback = hasFlag('--feedback');
const unitArea = !hasFlag('--no-unit-area');
const maxTries = num(flag('--max-tries'), Infinity);
const maxAccepts = num(flag('--max-accepts'), 100_000);
const maxPerFile = num(flag('--max-per-file'), 100_000);
const reportSecs = num(flag('--report-secs'), 30);

const seedFileAbs = resolve(flag('--seed-file') ?? 'data/rect/pool.csv');

/** Frozen-chart rectangularity constraint for a seed whose reduced modulus
 *  is reached by the SL(2,ℤ) element m. */
function rectConstraint(m) {
  return { label: 'Re(g·τ)', value: (q) => applyMobius(m, modulus(triang, q).tau)[0] };
}

function normalizeUnitArea(arr) {
  const s = linearSize(triang, arr);
  if (s > 0) { const k = 1 / s; for (let i = 0; i < N; i++) arr[i] *= k; }
}

// ---- load the pool: every entry carries its frozen reducing matrix ----
if (!existsSync(seedFileAbs)) {
  console.error(`pool not found: ${seedFileAbs} — build it first with: npm run polish-rect`);
  process.exit(1);
}
const pool = []; // { p: Float64Array, m: Sl2z }
{
  let rejected = 0;
  const text = readFileSync(seedFileAbs, 'utf8').trim();
  for (const [idx, line] of (text ? text.split('\n') : []).entries()) {
    const parts = line.split(',');
    if (parts.length !== N) {
      throw new Error(`row ${idx + 1} of ${seedFileAbs} has ${parts.length} cols, expected ${N}`);
    }
    const p = new Float64Array(N);
    for (let i = 0; i < N; i++) p[i] = Number(parts[i]);
    if (unitArea) normalizeUnitArea(p);
    const red = reduceModulusWithMatrix(modulus(triang, p).tau);
    // Pool hygiene: only walk from genuinely flat, rectangular, embedded tori.
    if (maxConeDeficit(triang, p) > angleTol || Math.abs(red.tau[0]) > reTol
        || !isEmbedded(triang, p)) { rejected++; continue; }
    pool.push({ p, m: red.m });
  }
  if (rejected > 0) console.log(`(pool: rejected ${rejected} row(s) failing flat/rect/embedded checks)`);
  if (pool.length === 0) {
    console.error(`pool ${seedFileAbs} has no valid rectangular embedded tori`);
    process.exit(1);
  }
}

const defaultBase = `samples/rect-${Date.now()}`;
const baseOut = resolve((flag('--out') ?? defaultBase).replace(/\.csv$/, ''));
const outDir = dirname(baseOut);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const pathForPart = (n) => `${baseOut}-${n.toString().padStart(3, '0')}.csv`;

console.log('sample-rect — random walk on the rectangular locus (Re τ̂ = 0)');
console.log(`  type:        #${triang.id}`);
console.log(`  rng:         ${rngName}  seed=${seed}`);
console.log(`  pool:        ${seedFileAbs}  (${pool.length} tori)${feedback ? '  [feedback ON]' : ''}`);
console.log(`  σ:           ${sigmaDist}[${sigmaMin}, ${sigmaMax}]`);
console.log(`  verify:      deficit < ${angleTol}, |Re τ̂| < ${reTol}, embedded`);
console.log(`  unit-area:   ${unitArea ? 'ON' : 'off'}`);
console.log(`  out:         ${baseOut}-<NNN>.csv`);
console.log(`  max-tries:   ${maxTries === Infinity ? '∞' : maxTries.toLocaleString()}`);
console.log(`  max-accepts: ${maxAccepts === Infinity ? '∞' : maxAccepts.toLocaleString()}`);
console.log('  ctrl-C to stop early; pending buffer is flushed.');
console.log();

// Run manifest sidecar (mirrors sample-flat).
{
  const pairs = [
    ['script', 'sample-rect'],
    ['type', `#${triang.id} (${triang.name})`],
    ['rng', rngName], ['seed', seed],
    ['seed-file', seedFileAbs], ['feedback', feedback],
    ['sigma-dist', sigmaDist], ['sigma-min', sigmaMin], ['sigma-max', sigmaMax],
    ['angle-tol', angleTol], ['re-tol', reTol], ['newton-tol', newtonTol],
    ['unit-area', unitArea],
    ['max-tries', maxTries === Infinity ? 'inf' : maxTries],
    ['max-accepts', maxAccepts === Infinity ? 'inf' : maxAccepts],
    ['max-per-file', maxPerFile],
  ];
  const w = Math.max(...pairs.map(([k]) => k.length));
  writeFileSync(`${baseOut}.params.txt`, pairs.map(([k, v]) => `${k.padEnd(w)}  ${v}`).join('\n') + '\n');
}

const rng = makeRng(rngName, seed);
const logMin = Math.log(sigmaMin), logMax = Math.log(sigmaMax);
function drawSigma() {
  return sigmaDist === 'log'
    ? Math.exp(logMin + rng() * (logMax - logMin))
    : sigmaMin + rng() * (sigmaMax - sigmaMin);
}
function gaussian() {
  let u = rng();
  if (u < 1e-12) u = 1e-12;
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const p = new Float64Array(N);
const buf = [];
let partNum = 0, savedInPart = 0;
let currentPart = pathForPart(partNum);

let tries = 0, newtonOk = 0, verifiedFlatRect = 0, saved = 0;
// Im τ̂ coverage of accepted tori — the walk's whole point is to sweep this.
let imLo = Infinity, imHi = -Infinity, intImLo = Infinity, intImHi = -Infinity;
const acceptedIms = [];

const start = Date.now();
let lastReport = start, lastReportTries = 0, lastReportSaved = 0;

function flushBuf() {
  if (buf.length === 0) return;
  appendFileSync(currentPart, buf.join('\n') + '\n');
  buf.length = 0;
}
function report() {
  const now = Date.now();
  const elapsed = (now - start) / 1000;
  const dT = (now - lastReport) / 1000;
  const triesPerSec = dT > 0 ? (tries - lastReportTries) / dT : 0;
  const savedPerHr = dT > 0 ? ((saved - lastReportSaved) / dT) * 3600 : 0;
  const fIm = (x) => (Math.abs(x) === Infinity ? '-' : x.toFixed(4));
  console.log(
    `[${elapsed.toFixed(0).padStart(5)}s] `
    + `tries=${tries.toLocaleString().padStart(8)} `
    + `newton=${newtonOk.toLocaleString().padStart(7)}(${tries ? ((newtonOk / tries) * 100).toFixed(0) : 0}%) `
    + `saved=${saved.toLocaleString().padStart(6)}(${newtonOk ? ((saved / newtonOk) * 100).toFixed(0) : 0}% of newton) `
    + `${triesPerSec.toFixed(1)} tries/s, ${savedPerHr.toFixed(0)} saves/hr  `
    + `pool=${pool.length}`,
  );
  console.log(
    `          Im τ̂:  interval [${fIm(intImLo)}, ${fIm(intImHi)}]   global [${fIm(imLo)}, ${fIm(imHi)}]`,
  );
  intImLo = Infinity; intImHi = -Infinity;
  lastReport = now; lastReportTries = tries; lastReportSaved = saved;
}
function finalImSummary() {
  if (acceptedIms.length === 0) return;
  const s = [...acceptedIms].sort((a, b) => a - b);
  const q = (f) => s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(4);
  console.log(`Im τ̂ coverage (${s.length} accepts): `
    + `min=${s[0].toFixed(4)}  10%=${q(0.1)}  25%=${q(0.25)}  50%=${q(0.5)}  `
    + `75%=${q(0.75)}  90%=${q(0.9)}  max=${s[s.length - 1].toFixed(4)}`);
}

process.on('SIGINT', () => {
  flushBuf();
  console.log('\n— interrupted —');
  report();
  finalImSummary();
  process.exit(0);
});

const reportMs = reportSecs * 1000;

while (tries < maxTries && saved < maxAccepts) {
  // 1. Perturb a random pool torus.
  const pick = pool[Math.floor(rng() * pool.length)];
  const sigma = drawSigma();
  for (let i = 0; i < N; i++) p[i] = pick.p[i] + sigma * gaussian();
  tries++;

  // 2. Project onto { flat } ∩ { Re(g·τ) = 0 } in the seed's frozen chart.
  const nr = newtonFlatten(triang, p, {
    tolerance: newtonTol,
    extraConstraints: [rectConstraint(pick.m)],
  });
  if (nr.status === 'converged') {
    newtonOk++;

    // 3. Verify (independent of the frozen chart), then gate on embedded.
    const red = reduceModulusWithMatrix(modulus(triang, p).tau);
    if (maxConeDeficit(triang, p) < angleTol && Math.abs(red.tau[0]) < reTol) {
      verifiedFlatRect++;
      if (isEmbedded(triang, p)) {
        if (unitArea) normalizeUnitArea(p);
        let row = p[0].toString();
        for (let i = 1; i < N; i++) row += ',' + p[i].toString();
        buf.push(row);
        saved++; savedInPart++;
        flushBuf();
        if (savedInPart >= maxPerFile) {
          partNum++; currentPart = pathForPart(partNum); savedInPart = 0;
          console.log(`  → new part: ${currentPart}`);
        }

        const im = red.tau[1];
        acceptedIms.push(im);
        if (im < imLo) imLo = im; if (im > imHi) imHi = im;
        if (im < intImLo) intImLo = im; if (im > intImHi) intImHi = im;

        // 4. Feedback: the walk continues from anywhere it has reached.
        if (feedback) {
          appendFileSync(seedFileAbs, row + '\n');
          pool.push({ p: new Float64Array(p), m: red.m });
        }

        const elapsed = ((Date.now() - start) / 1000).toFixed(0);
        console.log(
          `  + save #${saved.toString().padStart(5)}  σ=${sigma.toFixed(3)}  `
          + `Im=${im.toFixed(5)}  newton=${nr.iters}  t=${elapsed.padStart(4)}s`,
        );
      }
    }
  }

  if (Date.now() - lastReport > reportMs) report();
}

flushBuf();
console.log('\n— done —');
report();
finalImSummary();
console.log(`verified flat+rect: ${verifiedFlatRect} (of ${newtonOk} newton-converged; embedded gate passed: ${saved})`);
