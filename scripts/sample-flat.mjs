/**
 * Search for flat embedded 8-vertex tori via Newton + repulsion-flow pipeline.
 *
 *   for each attempt:
 *     1. Sample a seed (see --seed-mode):
 *        - "rich" (default): perturb Rich by Gaussian noise σ ~ uniform[σ_min, σ_max]
 *        - "uniform":         each coord independently uniform in [−seed-size, seed-size]
 *     2. Newton-flatten              (lands on the flatness manifold F)
 *     3. embeddedFlow                (descent on a repulsion energy + Newton re-projection)
 *     4. Explicit verification:        max |2π − cone-angle(i)|  <  --angle-tol
 *                                  AND  isEmbedded(positions)        is true
 *     5. If all pass: write one CSV row of 24 full-precision floats
 *
 * The verification in step 4 is gating *only* — it runs after the flow already
 * thinks it converged. If either check fails the sample is discarded with no
 * file write, so the output file is guaranteed flat-to-tolerance and embedded.
 *
 * Default energy is CUTOFF_AREA (chord²-modulated cut-off-area). It empirically
 * outperforms plain chord-length² at every σ tested.
 *
 * Output format: comma-separated values, one torus per line, 24 floats
 * `x0,y0,z0,...,x7,y7,z7`. Values use Number.prototype.toString() so each
 * value round-trips exactly to its double-precision representation under
 * Number(field). Files roll to new parts every --max-per-file accepts.
 *
 * Usage:
 *   npm run sample-flat -- [options]
 *
 * Options:
 *   --seed N                RNG seed (default: clock-derived)
 *   --out PATH              Output base path (default: samples/flat-<timestamp>)
 *   --seed-mode NAME        "rich" (default) — perturb Rich; or "uniform" — random cube
 *   --seed-size N           Half-extent of the uniform cube (default: 1.0)
 *   --sigma-min N           Rich-mode: min perturbation σ (default: 0.005)
 *   --sigma-max N           Rich-mode: max perturbation σ (default: 0.15)
 *   --step-size N           Flow descent step size (default: 0.001)
 *   --max-flow-iters N      Per-attempt cap on flow iterations (default: 500)
 *   --energy NAME           "cutoff" (default) or "chord2"
 *   --angle-tol N           Verification: max |cone deficit| (default: 1e-10)
 *   --max-tries N           Total attempts cap (default: ∞)
 *   --max-accepts N         Saved-sample cap (default: 100,000)
 *   --max-per-file N        Roll output every N saves (default: 100,000)
 *   --report-secs N         Print progress every N seconds (default: 30)
 *
 * Ctrl-C flushes the pending buffer and exits cleanly.
 */

import { appendFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { resolve, dirname } from 'path';

import { RICH_REFERENCE } from '../src/math/reference.ts';
import { mulberry32 } from '../src/math/perturb.ts';
import { VERTEX_COUNT } from '../src/math/topology.ts';
import { newtonFlatten } from '../src/math/newton.ts';
import { embeddedFlow } from '../src/math/embeddedFlow.ts';
import { isEmbedded } from '../src/math/embedded.ts';
import { maxConeDeficit } from '../src/math/angles.ts';
import { CHORD_LENGTH_SQUARED } from '../src/math/energies/chordLengthSquared.ts';
import { CUTOFF_AREA } from '../src/math/energies/cutOffArea.ts';

const N = VERTEX_COUNT * 3;  // 24

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}
function num(v, d) { return v === undefined ? d : Number(v); }

const seed = num(flag('--seed'), Date.now() >>> 0);
const seedMode = flag('--seed-mode') ?? 'rich';
const seedSize = num(flag('--seed-size'), 1.0);
const sigmaMin = num(flag('--sigma-min'), 0.005);
const sigmaMax = num(flag('--sigma-max'), 0.15);

if (seedMode !== 'rich' && seedMode !== 'uniform') {
  console.error(`unknown --seed-mode: ${seedMode}; choices: rich, uniform`);
  process.exit(1);
}
const stepSize = num(flag('--step-size'), 0.001);
const maxFlowIters = num(flag('--max-flow-iters'), 500);
const angleTol = num(flag('--angle-tol'), 1e-10);
const maxTries = num(flag('--max-tries'), Infinity);
const maxAccepts = num(flag('--max-accepts'), 100_000);
const maxPerFile = num(flag('--max-per-file'), 100_000);
const reportSecs = num(flag('--report-secs'), 30);
const energyName = flag('--energy') ?? 'cutoff';

let energy;
if (energyName === 'cutoff' || energyName === 'cut-off-area') energy = CUTOFF_AREA;
else if (energyName === 'chord2' || energyName === 'chord-length-squared') energy = CHORD_LENGTH_SQUARED;
else {
  console.error(`unknown --energy: ${energyName}; choices: cutoff, chord2`);
  process.exit(1);
}

const defaultBase = `samples/flat-${Date.now()}`;
const baseOut = resolve((flag('--out') ?? defaultBase).replace(/\.(bin|csv)$/, ''));
const outDir = dirname(baseOut);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const pathForPart = (n) => `${baseOut}-${n.toString().padStart(3, '0')}.csv`;

console.log('sample-flat');
console.log(`  seed:           ${seed}`);
console.log(`  seed mode:      ${seedMode}`);
if (seedMode === 'rich') {
  console.log(`  σ:              uniform[${sigmaMin}, ${sigmaMax}]  (Gaussian noise around Rich)`);
} else {
  console.log(`  seed range:     [-${seedSize}, ${seedSize}]^${N}  (uniform i.i.d.)`);
}
console.log(`  energy:         ${energy.label}`);
console.log(`  flow step:      ${stepSize}  (max ${maxFlowIters} iters/attempt)`);
console.log(`  angle tol:      ${angleTol}  (verification: max |2π − coneAngle| < this)`);
console.log(`  out:            ${baseOut}-<NNN>.csv  (full-precision Float64 CSV)`);
console.log(`  max-tries:      ${maxTries === Infinity ? '∞' : maxTries.toLocaleString()}`);
console.log(`  max-accepts:    ${maxAccepts === Infinity ? '∞' : maxAccepts.toLocaleString()}`);
console.log(`  max-per-file:   ${maxPerFile.toLocaleString()}`);
console.log(`  report:         every ${reportSecs}s`);
console.log('  ctrl-C to stop early; pending buffer is flushed.');
console.log();

const rng = mulberry32(seed);
const base = RICH_REFERENCE.positions;       // Float64
const p = new Float64Array(N);

// Output staging: one CSV row per accepted sample.
// Flush every save — uniform-mode yields are so low that batched writes
// risk losing real saves to an unclean exit. fsync per save is cheap.
const flushEvery = 1;
const buf = [];
let partNum = 0;
let currentPart = pathForPart(partNum);
let savedInPart = 0;

// Counters
let tries = 0;
let newtonOk = 0;
let flowConverged = 0;
let flowDiverged = 0;
let flowMaxIter = 0;
let flowStalled = 0;
let verificationFailed = 0;
let saved = 0;

const start = Date.now();
let lastReport = start;
let lastReportTries = 0;
let lastReportSaved = 0;

function flushBuf() {
  if (buf.length === 0) return;
  appendFileSync(currentPart, buf.join('\n') + '\n');
  buf.length = 0;
}
function rollPart() {
  flushBuf();
  partNum++;
  currentPart = pathForPart(partNum);
  savedInPart = 0;
  console.log(`  → new part: ${currentPart}`);
}

function totalSize() {
  let s = 0;
  for (let i = 0; i <= partNum; i++) {
    try { s += statSync(pathForPart(i)).size; } catch { /* */ }
  }
  return s;
}
function formatSize(b) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Box-Muller standard normal.
function gaussian() {
  let u = rng();
  if (u < 1e-12) u = 1e-12;
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Final gating check. Run after the flow has reported converged. Returns
 * true iff the positions are flat to `angleTol` AND embedded.
 */
function verify(positions) {
  const deficit = maxConeDeficit(positions);
  if (!(deficit < angleTol)) return false;
  if (!isEmbedded(positions)) return false;
  return true;
}

function report() {
  const now = Date.now();
  const elapsed = (now - start) / 1000;
  const dT = (now - lastReport) / 1000;
  const dTries = tries - lastReportTries;
  const dSaved = saved - lastReportSaved;
  const triesPerSec = dT > 0 ? dTries / dT : 0;
  const savedPerSec = dT > 0 ? dSaved / dT : 0;
  const savedPerHr = savedPerSec * 3600;
  const newtonRate = tries > 0 ? newtonOk / tries : 0;
  const flowRate = newtonOk > 0 ? flowConverged / newtonOk : 0;
  const verifyRate = flowConverged > 0 ? saved / flowConverged : 0;
  const overallRate = tries > 0 ? saved / tries : 0;
  const sz = formatSize(totalSize());

  console.log(
    `[${elapsed.toFixed(0).padStart(5)}s] `
    + `tries=${tries.toLocaleString().padStart(8)} `
    + `newton=${newtonOk.toLocaleString().padStart(7)}(${(newtonRate * 100).toFixed(0)}%) `
    + `flow=${flowConverged.toLocaleString().padStart(6)}(${(flowRate * 100).toFixed(0)}%) `
    + `verified=${saved.toLocaleString().padStart(6)}(${(verifyRate * 100).toFixed(0)}%) `
    + `→ ${(overallRate * 100).toFixed(2)}% overall, `
    + `${triesPerSec.toFixed(1)} tries/s, ${savedPerHr.toFixed(0)} saves/hr, `
    + `size=${sz}`,
  );
  lastReport = now;
  lastReportTries = tries;
  lastReportSaved = saved;
}

process.on('SIGINT', () => {
  flushBuf();
  console.log('\n— interrupted —');
  report();
  console.log(`flow status:    converged=${flowConverged}  diverged=${flowDiverged}  `
    + `max-iters=${flowMaxIter}  stalled=${flowStalled}`);
  console.log(`verify fails:   ${verificationFailed} (flow said converged but check rejected)`);
  process.exit(0);
});

const reportMs = reportSecs * 1000;

while (tries < maxTries && saved < maxAccepts) {
  // 1. Sample seed according to mode.
  if (seedMode === 'rich') {
    const sigma = sigmaMin + rng() * (sigmaMax - sigmaMin);
    for (let i = 0; i < N; i++) p[i] = base[i] + sigma * gaussian();
  } else {
    // uniform: each coord independently uniform in [-seedSize, seedSize]
    for (let i = 0; i < N; i++) p[i] = (rng() * 2 - 1) * seedSize;
  }
  tries++;

  // 2. Newton-flatten.
  const nr = newtonFlatten(p, { tolerance: 1e-10 });
  if (nr.status !== 'converged') {
    if (Date.now() - lastReport > reportMs) report();
    continue;
  }
  newtonOk++;

  // 3. Repulsion flow.
  const fr = embeddedFlow(p, energy, {
    stepSize,
    energyTol: 1e-12,
    gradientTol: 1e-12,
    maxIters: maxFlowIters,
  });
  if (fr.status === 'converged') flowConverged++;
  else if (fr.status === 'diverged') flowDiverged++;
  else if (fr.status === 'max-iters') flowMaxIter++;
  else if (fr.status === 'stalled') flowStalled++;

  // 4. Explicit verification: only write if flat to high precision AND embedded.
  if (fr.status === 'converged') {
    if (verify(p)) {
      // 5. Serialize as CSV row. .toString() is shortest exact round-trip.
      let row = p[0].toString();
      for (let i = 1; i < N; i++) row += ',' + p[i].toString();
      buf.push(row);
      saved++;
      savedInPart++;
      if (buf.length >= flushEvery) flushBuf();
      if (savedInPart >= maxPerFile) rollPart();
    } else {
      verificationFailed++;
    }
  }

  if (Date.now() - lastReport > reportMs) report();
}

flushBuf();
console.log('\n— done —');
report();
console.log(`flow status:    converged=${flowConverged}  diverged=${flowDiverged}  `
  + `max-iters=${flowMaxIter}  stalled=${flowStalled}`);
console.log(`verify fails:   ${verificationFailed} (flow said converged but check rejected)`);
