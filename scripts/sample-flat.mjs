/**
 * Search for flat embedded 8-vertex tori via Newton + repulsion-flow pipeline.
 *
 *   for each attempt:
 *     1. Sample a seed (see --seed-mode):
 *        - "rich" (default): perturb Rich by Gaussian noise σ ~ uniform[σ_min, σ_max]
 *        - "uniform":         each coord independently uniform in [−seed-size, seed-size]
 *        - "file":            pick a random row from --seed-file PATH and perturb
 *                             by Gaussian noise σ ~ uniform[σ_min, σ_max]
 *     2. Newton-flatten              (lands on the flatness manifold F)
 *     3. embeddedFlow                (descent on a repulsion energy + Newton re-projection)
 *     4. Explicit verification:        max |2π − cone-angle(i)|  <  --angle-tol
 *                                  AND  isEmbedded(torus, positions)        is true
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
 *   --seed-mode NAME        "rich" (default), "uniform", or "file"
 *   --seed-size N           Half-extent of the uniform cube (uniform mode; default 1.0)
 *   --seed-file PATH        CSV of seed embeddings (file mode; required)
 *   --feedback              file mode only: every accepted save is also
 *                             appended back to the seed file and added to
 *                             the in-memory pool. Lets one walk grow its
 *                             own seed pool indefinitely → progressive
 *                             coverage of a connected component.
 *   --sigma-min N           rich/file mode: min Gaussian σ (default: 0.005)
 *   --sigma-max N           rich/file mode: max Gaussian σ (default: 0.15)
 *   --step-size N           Flow descent step size (default: 0.001)
 *   --max-flow-iters N      Per-attempt cap on flow iterations (default: 500)
 *   --momentum N            Heavy-ball β ∈ [0, 1) (default: 0 = off).
 *                             Effective step ≈ stepSize / (1 − momentum).
 *                             β = 0.9 typically needs --step-size ~0.0003.
 *   --early-reject-iters N  Abandon attempt if best energy hasn't dropped
 *                             after N flow iters (default: 0 = off).
 *   --early-reject-ratio N  Required energy drop ratio (default: 0.5,
 *                             i.e. "best energy must halve in N iters").
 *   --energy NAME           "cutoff" (default) or "chord2"
 *   --angle-tol N           Verification: max |cone deficit| (default: 1e-10)
 *   --max-tries N           Total attempts cap (default: ∞)
 *   --max-accepts N         Saved-sample cap (default: 100,000)
 *   --max-per-file N        Roll output every N saves (default: 100,000)
 *   --report-secs N         Print progress every N seconds (default: 30)
 *
 * Ctrl-C flushes the pending buffer and exits cleanly.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

import { RICH_REFERENCE } from '../src/math/reference.ts';
import { makeRng } from '../src/math/perturb.ts';
import { byId } from '../src/tori/index.ts';
import { newtonFlatten } from '../src/math/newton.ts';
import { embeddedFlow } from '../src/math/embeddedFlow.ts';
import { isEmbedded, allViolations } from '../src/math/embedded.ts';
import { maxConeDeficit } from '../src/math/angles.ts';
import { makeChordLengthSquared } from '../src/math/energies/chordLengthSquared.ts';
import { makeCutOffArea } from '../src/math/energies/cutOffArea.ts';
import { linearSize, totalArea } from '../src/math/energies/cellMargin.ts';


/** Scale positions in place to total surface area 1 (uniform scaling, so it
 *  preserves flatness and embeddedness). linearSize = √area, so dividing by it
 *  makes area = 1. */
function normalizeUnitArea(arr) {
  const s = linearSize(torus, arr);
  if (s > 0) { const k = 1 / s; for (let i = 0; i < N; i++) arr[i] *= k; }
}

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}
function num(v, d) { return v === undefined ? d : Number(v); }
function hasFlag(name) { return args.indexOf(name) !== -1; }

const torus = byId(num(flag('--type'), 7)); // which of the 7 types (default 7 = Rich)
const N = torus.vertexCount * 3;             // 24

const seed = num(flag('--seed'), Date.now() >>> 0);
const rngName = flag('--rng') ?? 'xoshiro';   // 'xoshiro' (default, 2^128) | 'mulberry' (legacy, 2^32)
const seedMode = flag('--seed-mode') ?? 'rich';
if (seedMode === 'rich' && torus.id !== 7) { console.error(`--seed-mode rich perturbs Rich's #7 reference embedding; type ${torus.id} has none — use --seed-mode uniform`); process.exit(1); }
const seedSize = num(flag('--seed-size'), 1.0);
const sigmaMin = num(flag('--sigma-min'), 0.005);
const sigmaMax = num(flag('--sigma-max'), 0.15);
const sigmaDist = flag('--sigma-dist') ?? 'uniform';   // 'uniform' | 'log'
if (sigmaDist !== 'uniform' && sigmaDist !== 'log') {
  console.error(`unknown --sigma-dist: ${sigmaDist}; choices: uniform, log`);
  process.exit(1);
}
const logMin = Math.log(sigmaMin), logMax = Math.log(sigmaMax);
// Draw the per-attempt perturbation σ. 'log' is log-uniform: most draws stay
// small (good yield, fill locally) with a fat tail of large jumps (reach new
// regions). Lets you push --sigma-max high without flooding with unrecoverable
// big jumps the way plain 'uniform' would.
function drawSigma() {
  return sigmaDist === 'log'
    ? Math.exp(logMin + rng() * (logMax - logMin))
    : sigmaMin + rng() * (sigmaMax - sigmaMin);
}

if (seedMode !== 'rich' && seedMode !== 'uniform' && seedMode !== 'file') {
  console.error(`unknown --seed-mode: ${seedMode}; choices: rich, uniform, file`);
  process.exit(1);
}

const feedback = hasFlag('--feedback');
const unitArea = hasFlag('--unit-area');   // normalize every saved torus (and loaded seeds) to area 1
if (feedback && seedMode !== 'file') {
  console.error(`--feedback only valid with --seed-mode file`);
  process.exit(1);
}
// Sweep: walk the seed pool deterministically (each seed --sweep-reps times)
// and EXIT when the pool is exhausted, instead of sampling with replacement
// forever. Lets you do one finite pass over the seeds and know when it's done.
const sweep = hasFlag('--sweep');
const sweepReps = num(flag('--sweep-reps'), 1);
if (sweep && seedMode !== 'file') {
  console.error(`--sweep requires --seed-mode file`);
  process.exit(1);
}

// Load a CSV of seed embeddings for file mode. Each row must have 24 floats.
let seedPool = null;
let seedFileAbs = null;
if (seedMode === 'file') {
  const seedFile = flag('--seed-file');
  if (!seedFile) {
    console.error(`--seed-mode file requires --seed-file PATH`);
    process.exit(1);
  }
  seedFileAbs = resolve(seedFile);
  const text = readFileSync(seedFileAbs, 'utf8').trim();
  const lines = text.length === 0 ? [] : text.split('\n');
  if (lines.length === 0) {
    console.error(`--seed-file ${seedFileAbs} is empty`);
    process.exit(1);
  }
  seedPool = lines.map((line, idx) => {
    const parts = line.split(',');
    if (parts.length !== N) {
      throw new Error(`row ${idx + 1} of ${seedFileAbs} has ${parts.length} cols, expected ${N}`);
    }
    const arr = new Float64Array(N);
    for (let i = 0; i < N; i++) arr[i] = Number(parts[i]);
    if (unitArea) normalizeUnitArea(arr);   // seeds start at unit area
    return arr;
  });
}
const stepSize = num(flag('--step-size'), 0.001);
const maxFlowIters = num(flag('--max-flow-iters'), 500);
const momentum = num(flag('--momentum'), 0);
const earlyRejectIters = num(flag('--early-reject-iters'), 60);
const earlyRejectRatio = num(flag('--early-reject-ratio'), 0.5);
const angleTol = num(flag('--angle-tol'), 1e-10);
const maxTries = num(flag('--max-tries'), Infinity);
const maxAccepts = num(flag('--max-accepts'), 100_000);
const maxPerFile = num(flag('--max-per-file'), 100_000);
const reportSecs = num(flag('--report-secs'), 30);
const energyName = flag('--energy') ?? 'cutoff';

let energy;
if (energyName === 'cutoff' || energyName === 'cut-off-area') energy = makeCutOffArea(torus);
else if (energyName === 'chord2' || energyName === 'chord-length-squared') energy = makeChordLengthSquared(torus);
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
console.log(`  type:           #${torus.id}`);
console.log(`  rng:            ${rngName}`);
console.log(`  seed:           ${seed}`);
console.log(`  seed mode:      ${seedMode}`);
if (seedMode === 'rich') {
  console.log(`  σ:              ${sigmaDist}[${sigmaMin}, ${sigmaMax}]  (Gaussian noise around Rich)`);
} else if (seedMode === 'uniform') {
  console.log(`  seed range:     [-${seedSize}, ${seedSize}]^${N}  (uniform i.i.d.)`);
} else {
  console.log(`  seed file:      ${seedFileAbs}  (${seedPool.length} seeds at start)`);
  console.log(`  σ:              ${sigmaDist}[${sigmaMin}, ${sigmaMax}]  (Gaussian noise around a random seed)`);
  if (feedback) {
    console.log(`  feedback:       ON  (each save also appended to seed file; pool grows unboundedly)`);
  }
}
if (unitArea) console.log(`  unit-area:      ON  (every saved torus + loaded seeds normalized to area 1)`);
console.log(`  energy:         ${energy.label}`);
console.log(`  flow step:      ${stepSize}  (max ${maxFlowIters} iters/attempt)`);
if (momentum > 0) {
  console.log(`  momentum:       ${momentum}  (effective step ≈ ${(stepSize / (1 - momentum)).toExponential(2)})`);
}
if (earlyRejectIters > 0) {
  console.log(`  early-reject:   if best energy hasn't dropped to ${earlyRejectRatio}× start by iter ${earlyRejectIters}`);
}
console.log(`  angle tol:      ${angleTol}  (verification: max |2π − coneAngle| < this)`);
console.log(`  out:            ${baseOut}-<NNN>.csv  (full-precision Float64 CSV)`);
console.log(`  max-tries:      ${maxTries === Infinity ? '∞' : maxTries.toLocaleString()}`);
console.log(`  max-accepts:    ${maxAccepts === Infinity ? '∞' : maxAccepts.toLocaleString()}`);
console.log(`  max-per-file:   ${maxPerFile.toLocaleString()}`);
console.log(`  report:         every ${reportSecs}s`);
console.log('  ctrl-C to stop early; pending buffer is flushed.');
console.log();

// Run manifest: a sidecar .params.txt next to the output documenting the exact
// resolved configuration (no dates/timestamps). Written once at startup.
{
  const pairs = [
    ['script', 'sample-flat'],
    ['type', `#${torus.id} (${torus.name})`],
    ['rng', rngName],
    ['seed', seed],
    ['seed-mode', seedMode],
  ];
  if (seedMode === 'uniform') pairs.push(['seed-size', seedSize]);
  if (seedMode === 'rich' || seedMode === 'file') {
    pairs.push(['sigma-dist', sigmaDist], ['sigma-min', sigmaMin], ['sigma-max', sigmaMax]);
  }
  if (seedMode === 'file') pairs.push(['seed-file', seedFileAbs], ['feedback', feedback]);
  pairs.push(
    ['unit-area', unitArea],
    ['energy', energyName],
    ['step-size', stepSize],
    ['max-flow-iters', maxFlowIters],
    ['momentum', momentum],
    ['early-reject-iters', earlyRejectIters],
    ['early-reject-ratio', earlyRejectRatio],
    ['angle-tol', angleTol],
    ['max-tries', maxTries === Infinity ? 'inf' : maxTries],
    ['max-accepts', maxAccepts === Infinity ? 'inf' : maxAccepts],
    ['max-per-file', maxPerFile],
  );
  const w = Math.max(...pairs.map(([k]) => k.length));
  const text = pairs.map(([k, v]) => `${k.padEnd(w)}  ${v}`).join('\n') + '\n';
  writeFileSync(`${baseOut}.params.txt`, text);
  console.log(`  params:         ${baseOut}.params.txt`);
}

const rng = makeRng(rngName, seed);
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
let flowRejected = 0;
let verificationFailed = 0;
let saved = 0;

// Closeness-to-embedding scores over the flat configs the flow settles at:
//   #1 normalized intersection energy E = repulsionEnergy/area  (→ 0 as embedded)
//   #2 number of intersecting triangle pairs (allViolations count)
// They can disagree (lowest-E config ≠ fewest-crossings config), so each is a
// separate best, per report interval and globally. allViolations is cheap next
// to the per-attempt flow, so we evaluate it every flowed attempt.
let intMinE = Infinity, intMinEViol = -1;     // lowest E this interval (+ its crossings)
let intMinV = Infinity, intMinVE = Infinity;  // fewest crossings this interval (+ its E)
let gMinE = Infinity, gMinEViol = -1;         // lowest E since start (+ its crossings)
let gMinV = Infinity, gMinVE = Infinity;      // fewest crossings since start (+ its E)
const gBestP = new Float64Array(N);           // the lowest-E config (available to save)

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
  const deficit = maxConeDeficit(torus, positions);
  if (!(deficit < angleTol)) return false;
  if (!isEmbedded(torus, positions)) return false;
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
  // Closest-to-embedding, interval vs global. E = normalized intersection
  // energy (0 ⟺ embedded); crossings = # intersecting triangle pairs. The (…)
  // shows the companion metric for that same best config.
  const fE = (x) => (x === Infinity ? 'n/a' : x.toExponential(2));
  const fV = (x) => (x === Infinity || x < 0 ? '-' : x);
  console.log(
    `          closest  E[0=embed]:  interval ${fE(intMinE)} (${fV(intMinEViol)}x)   global ${fE(gMinE)} (${fV(gMinEViol)}x)`,
  );
  console.log(
    `                   crossings:   interval ${fV(intMinV)} (E=${fE(intMinVE)})   global ${fV(gMinV)} (E=${fE(gMinVE)})`,
  );
  if (sweep) {
    const si = Math.floor(sweepIdx / sweepReps);
    console.log(`          sweep:    seed ${si}/${seedPool.length} (${(100 * si / seedPool.length).toFixed(1)}%), ${sweepReps} rep(s) each`);
  }
  intMinE = Infinity; intMinEViol = -1; intMinV = Infinity; intMinVE = Infinity; // reset interval bests
  lastReport = now;
  lastReportTries = tries;
  lastReportSaved = saved;
}

process.on('SIGINT', () => {
  flushBuf();
  console.log('\n— interrupted —');
  report();
  console.log(`flow status:    converged=${flowConverged}  diverged=${flowDiverged}  `
    + `max-iters=${flowMaxIter}  stalled=${flowStalled}  rejected=${flowRejected}`);
  console.log(`verify fails:   ${verificationFailed} (flow said converged but check rejected)`);
  process.exit(0);
});

const reportMs = reportSecs * 1000;

// Captured per-attempt for the per-save log line.
let lastSigma = 0;
let lastSeedIdx = -1;
let sweepIdx = 0;          // sweep mode: total seed-attempts dispatched so far
let sweepDone = false;     // set true once every seed has had its reps

while (tries < maxTries && saved < maxAccepts && !sweepDone) {
  // 1. Sample seed according to mode.
  if (seedMode === 'rich') {
    lastSigma = drawSigma();
    lastSeedIdx = -1;
    for (let i = 0; i < N; i++) p[i] = base[i] + lastSigma * gaussian();
  } else if (seedMode === 'uniform') {
    // each coord independently uniform in [-seedSize, seedSize]
    lastSigma = 0;
    lastSeedIdx = -1;
    for (let i = 0; i < N; i++) p[i] = (rng() * 2 - 1) * seedSize;
  } else if (sweep) {
    // file + sweep: walk the pool in order, --sweep-reps attempts per seed,
    // then stop. Deterministic coverage with a definite end.
    const si = Math.floor(sweepIdx / sweepReps);
    if (si >= seedPool.length) { sweepDone = true; break; }
    lastSeedIdx = si;
    sweepIdx++;
    const seedRow = seedPool[si];
    lastSigma = drawSigma();
    for (let i = 0; i < N; i++) p[i] = seedRow[i] + lastSigma * gaussian();
  } else {
    // file: pick a random row from the loaded seed pool and add Gaussian noise.
    lastSeedIdx = Math.floor(rng() * seedPool.length);
    const seedRow = seedPool[lastSeedIdx];
    lastSigma = drawSigma();
    for (let i = 0; i < N; i++) p[i] = seedRow[i] + lastSigma * gaussian();
  }
  tries++;

  // 2. Newton-flatten.
  const nr = newtonFlatten(torus, p, { tolerance: 1e-10 });
  if (nr.status !== 'converged') {
    if (Date.now() - lastReport > reportMs) report();
    continue;
  }
  newtonOk++;

  // 3. Repulsion flow.
  const fr = embeddedFlow(torus, p, energy, {
    stepSize,
    energyTol: 1e-12,
    gradientTol: 1e-12,
    maxIters: maxFlowIters,
    momentum,
    earlyRejectIters,
    earlyRejectRatio,
  });
  if (fr.status === 'converged') flowConverged++;
  else if (fr.status === 'diverged') flowDiverged++;
  else if (fr.status === 'max-iters') flowMaxIter++;
  else if (fr.status === 'stalled') flowStalled++;
  else if (fr.status === 'rejected') flowRejected++;

  // Closeness scores for the flat config the flow settled at (eNorm = 0 ⟺ embedded).
  const eNorm = fr.energy / totalArea(torus, p);
  const viol = allViolations(torus, p).length;
  if (eNorm < intMinE) { intMinE = eNorm; intMinEViol = viol; }
  if (viol < intMinV) { intMinV = viol; intMinVE = eNorm; }
  if (eNorm < gMinE) { gMinE = eNorm; gMinEViol = viol; gBestP.set(p); }
  if (viol < gMinV) { gMinV = viol; gMinVE = eNorm; }

  // 4. Explicit verification: only write if flat to high precision AND embedded.
  if (fr.status === 'converged') {
    if (verify(p)) {
      // Normalize to unit area before saving (keeps tori from blowing up; the
      // row written here is also what feedback adds to the pool).
      if (unitArea) normalizeUnitArea(p);
      // 5. Serialize as CSV row. .toString() is shortest exact round-trip.
      let row = p[0].toString();
      for (let i = 1; i < N; i++) row += ',' + p[i].toString();
      buf.push(row);
      saved++;
      savedInPart++;
      if (buf.length >= flushEvery) flushBuf();
      if (savedInPart >= maxPerFile) rollPart();

      // Feedback: append the row to the seed file AND extend the in-memory
      // pool with a fresh copy of the current positions. Now the next
      // perturbation can be drawn from any flat embedded torus discovered
      // so far for this walk.
      if (feedback) {
        appendFileSync(seedFileAbs, row + '\n');
        const newSeed = new Float64Array(p);
        seedPool.push(newSeed);
      }

      // Per-save log line.
      const elapsed = ((Date.now() - start) / 1000).toFixed(0);
      const sigmaStr = seedMode === 'uniform' ? '   —   ' : `σ=${lastSigma.toFixed(3)}`;
      const seedStr = seedMode === 'file' ? ` seed#${lastSeedIdx}` : '';
      console.log(
        `  + save #${saved.toString().padStart(5)}  `
        + `${sigmaStr}${seedStr}  `
        + `flow=${fr.iters.toString().padStart(5)}  `
        + `newton-total=${fr.totalNewtonIters.toString().padStart(5)}  `
        + `t=${elapsed.padStart(4)}s`,
      );
    } else {
      verificationFailed++;
    }
  }

  if (Date.now() - lastReport > reportMs) report();
}

flushBuf();
console.log('\n— done —');
report();
if (sweep) {
  console.log(`sweep:          ${sweepDone ? 'COMPLETE' : 'stopped early'} — `
    + `${Math.floor(sweepIdx / sweepReps)}/${seedPool.length} seeds covered (${sweepReps} rep(s) each)`);
}
console.log(`flow status:    converged=${flowConverged}  diverged=${flowDiverged}  `
  + `max-iters=${flowMaxIter}  stalled=${flowStalled}  rejected=${flowRejected}`);
console.log(`verify fails:   ${verificationFailed} (flow said converged but check rejected)`);
