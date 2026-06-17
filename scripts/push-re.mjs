/**
 * push-re — overnight engine for driving flat embedded tori toward a target
 * |Re τ̂| (default 1/2, the rhombic wall; works for 0 too).
 *
 * Why this shape: near the wall the embedded set is a thin sliver, so the
 * three naive strategies all die — isotropic random kicks almost always exit
 * the sliver, the raw modulus gradient is normal to the flatness manifold,
 * and min-norm projection jumps off the embedded set. The engine combines the
 * fixes, per population member, each generation:
 *
 *   1. FATTEN  if the embedding margin is below --margin-floor, flow on the
 *      cell log-barrier alone (margin grows ⟹ room to move).
 *   2. PUSH    flow on  E = −sgn·Re(g·τ) + μ·barrier  with μ ∝ current margin:
 *      a constant pull toward the wall that SLIDES ALONG the embeddedness
 *      boundary instead of stopping at it (the barrier turns the wall into a
 *      smooth slope). g is the frozen SL(2,ℤ) chart, refreshed each phase;
 *      every flow step is re-Newton-flattened (embeddedFlow).
 *   3. KICK    margin-scaled Gaussian kicks (σ = margin/3, 10% at 10σ),
 *      keep only flat+embedded IMPROVEMENTS in dist — a ratchet that escapes
 *      the flow's local traps.
 *
 * Each phase is accepted only if it ends flat (deficit < 1e-10) and embedded;
 * members that stagnate are restarted from a perturbed copy of the global
 * best (the first --protect members are never restarted, for diversity).
 *
 * Checkpoints (safe to Ctrl-C / kill any time):
 *   <out>-best.csv   append-only: every new global best
 *                    (24 floats, deficit, Re τ̂, Im τ̂, margin — 28 cols)
 *   <out>-pop.csv    population snapshot, rewritten each generation; pass it
 *                    back as --in to resume a run
 *   <out>.log.csv    one line per generation: time, best dist, margins
 *
 * Usage:
 *   npm run push-re -- [options]
 *
 * Options:
 *   --in PATH            Seed CSV (repeatable; ≥24 cols, extra ignored).
 *                          Default: data/rect/seeds-half.csv
 *   --target-re N        Target |Re τ̂| (default 0.5)
 *   --type N             Triangulation type 1-7 (default 7)
 *   --seed N             RNG seed (default clock)
 *   --pop N              Population size (default 12)
 *   --protect N          Members never restarted (default 3)
 *   --flow-iters N       Push-flow iterations per generation (default 400)
 *   --fatten-iters N     Fatten-flow iterations when thin (default 200)
 *   --kick-tries N       Kicks per generation (default 1500)
 *   --step N             Flow step size, unit-gradient (default 1e-3)
 *   --barrier-delta N    Barrier cutoff in units of √area (default 0.02)
 *   --margin-floor N     Fatten below this margin (default 3e-5)
 *   --stagnate N         Generations without improvement → restart (default 8)
 *   --max-hours N        Stop after N hours (default ∞)
 *   --out PATH           Output base (default samples/push-re-<timestamp>)
 *   --report-secs N      Progress print interval (default 60)
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, readdirSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';

import { makeRng } from '../src/math/perturb.ts';
import { byId } from '../src/triangulations/index.ts';
import { modulus, reduceModulus, reduceModulusWithMatrix, applyMobius } from '../src/topology/develop.ts';
import { newtonFlatten } from '../src/math/newton.ts';
import { maxConeDeficit } from '../src/functions/coneDeficit.ts';
import { isEmbedded } from '../src/math/embedded.ts';
import { embeddedFlow } from '../src/math/embeddedFlow.ts';
import { makeCellBarrier } from '../src/math/energies/cellBarrier.ts';
import { minMargin, linearSize } from '../src/functions/minMargin.ts';
import { fdScalar as energyFromCompute } from '../src/functions/compose.ts';

const args = process.argv.slice(2);
function flags(name) {
  const out = [];
  for (let i = 0; i < args.length; i++) if (args[i] === name) out.push(args[i + 1]);
  return out;
}
function flag(name) { return flags(name)[0]; }
function num(v, d) { return v === undefined ? d : Number(v); }

const torus = byId(num(flag('--type'), 7));
const N = torus.vertexCount * 3;

const targetRe = num(flag('--target-re'), 0.5);
const seed = num(flag('--seed'), Date.now() >>> 0);
const POP = num(flag('--pop'), 12);
const PROTECT = Math.min(num(flag('--protect'), 3), POP);
const FLOW_ITERS = num(flag('--flow-iters'), 400);
const FATTEN_ITERS = num(flag('--fatten-iters'), 200);
const KICK_TRIES = num(flag('--kick-tries'), 1500);
const STEP = num(flag('--step'), 1e-3);
const DELTA = num(flag('--barrier-delta'), 0.02);
const MARGIN_FLOOR = num(flag('--margin-floor'), 3e-5);
const STAGNATE = num(flag('--stagnate'), 8);
const maxHours = num(flag('--max-hours'), Infinity);
const reportSecs = num(flag('--report-secs'), 60);
const baseOut = resolve((flag('--out') ?? `samples/push-re-${Date.now()}`).replace(/\.csv$/, ''));
const inputs = flags('--in').length ? flags('--in') : ['data/rect/seeds-half.csv'];

const ANGLE_TOL = 1e-12;

const rng = makeRng('xoshiro', seed);
function gaussian() {
  let u = rng();
  if (u < 1e-12) u = 1e-12;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

// ---- helpers -------------------------------------------------------------
const distOf = (p) => Math.abs(Math.abs(reduceModulus(modulus(torus, p).tau)[0]) - targetRe);
const imOf = (p) => reduceModulus(modulus(torus, p).tau)[1];
function unitArea(p) {
  const k = 1 / linearSize(torus, p);
  for (let i = 0; i < N; i++) p[i] *= k;
}
function healthy(p) {
  return maxConeDeficit(torus, p) < ANGLE_TOL && isEmbedded(torus, p);
}

// ---- load seeds ----------------------------------------------------------
const files = [];
for (const inp of inputs) {
  const p = resolve(inp);
  if (statSync(p).isDirectory()) {
    for (const f of readdirSync(p)) if (f.endsWith('.csv')) files.push(join(p, f));
  } else files.push(p);
}
const seeds = [];
for (const f of files) {
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const parts = s.split(',');
    if (parts.length < N) continue;
    const p = new Float64Array(N);
    for (let i = 0; i < N; i++) p[i] = Number(parts[i]);
    if (!healthy(p)) continue;
    unitArea(p);
    seeds.push({ p, dist: distOf(p) });
  }
}
if (seeds.length === 0) { console.error('push-re: no healthy seeds'); process.exit(1); }
seeds.sort((a, b) => a.dist - b.dist);

// population: the POP best distinct seeds (cycled if too few)
const members = [];
for (let i = 0; i < POP; i++) {
  const src = seeds[i % seeds.length];
  members.push({ p: Float64Array.from(src.p), dist: src.dist, sinceImprove: 0 });
}

let best = { p: Float64Array.from(members[0].p), dist: members[0].dist };

// ---- output --------------------------------------------------------------
const outDir = dirname(baseOut);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const bestPath = `${baseOut}-best.csv`;
const popPath = `${baseOut}-pop.csv`;
const logPath = `${baseOut}.log.csv`;
appendFileSync(logPath, 'elapsedSec,generation,bestDist,bestIm,medianDist,minMargin\n');

function certRow(p) {
  const t = reduceModulus(modulus(torus, p).tau);
  const def = maxConeDeficit(torus, p);
  const mar = minMargin(torus, p).margin;
  let row = p[0].toString();
  for (let i = 1; i < N; i++) row += ',' + p[i].toString();
  return row + `,${def},${t[0]},${t[1]},${mar}`;
}
function saveBest() { appendFileSync(bestPath, certRow(best.p) + '\n'); }
function savePop() { writeFileSync(popPath, members.map((m) => certRow(m.p)).join('\n') + '\n'); }

console.log('push-re — fatten · barrier-push · kick, toward |Re τ̂| = ' + targetRe);
console.log(`  seeds:     ${seeds.length} healthy (best dist ${seeds[0].dist.toExponential(3)})`);
console.log(`  pop:       ${POP} (protect ${PROTECT})  rng seed ${seed}`);
console.log(`  flow:      push ${FLOW_ITERS} iters @ step ${STEP}, barrier δ=${DELTA}, fatten<${MARGIN_FLOOR}`);
console.log(`  kicks:     ${KICK_TRIES}/generation, σ = margin/3 (10% at 10σ)`);
console.log(`  out:       ${bestPath}\n             ${popPath}\n             ${logPath}`);
console.log(`  stop:      ${maxHours === Infinity ? 'ctrl-C' : maxHours + 'h'} (checkpointed — safe to kill)`);
console.log();

saveBest();

// ---- phases ----------------------------------------------------------------
const scratch = new Float64Array(N);

/** Run one guarded flow phase; keep the result only if healthy AND not worse.
 *  Returns the (possibly unchanged) dist. */
function flowPhase(member, energy, iters) {
  scratch.set(member.p);
  const before = member.dist;
  embeddedFlow(torus, member.p, energy, {
    stepSize: STEP,
    energyTol: -Infinity,            // objectives go negative — never "converge" on energy
    gradientTol: 1e-12,
    maxIters: iters,
    normalizeGradient: true,         // barrier is stiff near contact
    feasible: (q) => isEmbedded(torus, q),
    newtonOpts: { tolerance: 1e-12 },
  });
  unitArea(member.p);
  newtonFlatten(torus, member.p, { tolerance: 1e-12 });
  if (!healthy(member.p)) { member.p.set(scratch); return before; }
  const after = distOf(member.p);
  // fattening may trade a little dist for margin — allow a bounded loss
  if (after > before + 0.02) { member.p.set(scratch); return before; }
  member.dist = after;
  return after;
}

function generation(member) {
  unitArea(member.p);
  const startDist = member.dist;

  // 1. fatten when thin (barrier alone) — gives the kicks room to act
  let margin = minMargin(torus, member.p).margin;
  if (margin < MARGIN_FLOOR) {
    flowPhase(member, makeCellBarrier(torus, { delta: DELTA, strength: 1 }), FATTEN_ITERS);
    margin = minMargin(torus, member.p).margin;
  }

  // 2. push: constant pull toward the wall + margin-scaled barrier.
  //    μ ∝ margin ⟹ the barrier engages at the CURRENT margin scale, so the
  //    flow slides along the embedded boundary instead of stalling on it.
  {
    const { tau, m } = reduceModulusWithMatrix(modulus(torus, member.p).tau);
    const sgn = tau[0] >= 0 ? 1 : -1;
    const mu = Math.max(margin, 1e-7) * 0.25;
    const barrier = makeCellBarrier(torus, { delta: DELTA, strength: 1 });
    const pull = targetRe === 0 ? (r) => Math.abs(r) : (r) => -sgn * r;
    const energy = energyFromCompute('push-re', (q) =>
      pull(applyMobius(m, modulus(torus, q).tau)[0]) + mu * barrier.compute(q));
    flowPhase(member, energy, FLOW_ITERS);
    margin = minMargin(torus, member.p).margin;
  }

  // 3. kick ratchet: margin-scaled kicks, accept only strict dist improvements
  const sigmaBase = Math.max(margin / 3, 1e-7);
  for (let k = 0; k < KICK_TRIES; k++) {
    const sigma = rng() < 0.1 ? sigmaBase * 10 : sigmaBase;
    for (let i = 0; i < N; i++) scratch[i] = member.p[i] + sigma * gaussian();
    const nr = newtonFlatten(torus, scratch, { tolerance: 1e-12 });
    if (nr.status !== 'converged') continue;
    const d = distOf(scratch);
    if (d >= member.dist) continue;
    if (maxConeDeficit(torus, scratch) > ANGLE_TOL || !isEmbedded(torus, scratch)) continue;
    member.p.set(scratch);
    member.dist = d;
  }

  member.sinceImprove = member.dist < startDist - 1e-12 ? 0 : member.sinceImprove + 1;
}

// ---- main loop -------------------------------------------------------------
const start = Date.now();
let lastReport = start;
let gen = 0;
let running = true;
process.on('SIGINT', () => { running = false; });

while (running && (Date.now() - start) / 3600000 < maxHours) {
  gen++;
  for (let i = 0; i < members.length && running; i++) {
    const m = members[i];
    generation(m);

    if (m.dist < best.dist - 1e-12) {
      best = { p: Float64Array.from(m.p), dist: m.dist };
      saveBest();
      const t = reduceModulus(modulus(torus, m.p).tau);
      console.log(`  ★ new best  dist=${m.dist.toExponential(4)}  Re=${t[0].toFixed(7)}  Im=${t[1].toFixed(5)}  `
        + `margin=${minMargin(torus, m.p).margin.toExponential(1)}  gen=${gen}  t=${((Date.now() - start) / 60000).toFixed(1)}m`);
    }
    // restart stagnant unprotected members near the global best
    if (i >= PROTECT && m.sinceImprove >= STAGNATE) {
      const sigma = Math.max(minMargin(torus, best.p).margin, 1e-6) * 2;
      for (let tries = 0; tries < 50; tries++) {
        for (let j = 0; j < N; j++) scratch[j] = best.p[j] + sigma * gaussian();
        if (newtonFlatten(torus, scratch, { tolerance: 1e-12 }).status === 'converged' && healthy(scratch)) {
          m.p.set(scratch);
          m.dist = distOf(scratch);
          break;
        }
      }
      m.sinceImprove = 0;
    }
  }

  savePop();
  const dists = members.map((m) => m.dist).sort((a, b) => a - b);
  const margins = members.map((m) => minMargin(torus, m.p).margin);
  appendFileSync(logPath, `${((Date.now() - start) / 1000).toFixed(0)},${gen},${best.dist},${imOf(best.p)},${dists[Math.floor(dists.length / 2)]},${Math.min(...margins)}\n`);

  if (Date.now() - lastReport > reportSecs * 1000) {
    lastReport = Date.now();
    console.log(`[${((Date.now() - start) / 60000).toFixed(1).padStart(7)}m] gen=${gen}  `
      + `best=${best.dist.toExponential(4)}  pop dist ∈ [${dists[0].toExponential(2)}, ${dists[dists.length - 1].toExponential(2)}]  `
      + `margins ∈ [${Math.min(...margins).toExponential(1)}, ${Math.max(...margins).toExponential(1)}]`);
  }
}

savePop();
const t = reduceModulus(modulus(torus, best.p).tau);
console.log(`\n— done — gen=${gen}  best dist=${best.dist.toExponential(4)}  (Re=${t[0].toFixed(8)}, Im=${t[1].toFixed(6)})`);
console.log(`bests:     ${bestPath}`);
console.log(`resume:    npm run push-re -- --in ${popPath} --target-re ${targetRe}`);
