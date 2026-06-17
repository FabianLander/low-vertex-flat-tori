/**
 * wall-ladder — EXPERIMENT: how fat can an embedded flat torus be as its
 * modulus approaches the rhombic wall |Re τ̂| = 1/2?
 *
 * We do NOT assume the wall is (or isn't) at the boundary of embeddability —
 * measuring that is the point. For each slice c in --slices:
 *
 *   the set { flat ∧ |Re τ̂| = c } is a 16-dim manifold the augmented Newton
 *   projects onto EXACTLY (same machinery as the rectangular collector,
 *   target c instead of 0). On each slice we run two unbiased searches:
 *
 *   WALK    Gaussian-perturb a known on-slice torus → project back onto the
 *           slice → keep iff embedded. (Rejection sampling on the slice.)
 *   FATTEN  gradient descent on the cell log-barrier, with the slice
 *           constraint inside every Newton re-projection — i.e. actively
 *           MAXIMIZE the embedding margin while staying exactly on the
 *           slice. This search is biased TOWARD fat tori, so if fat
 *           near-rhombic tori exist, it is built to find them.
 *
 *   Accepted tori from slice c seed slice c+1 (projected across).
 *
 * The result is the measured curve  margin_max(c)  as c → 1/2 — bounded away
 * from 0 means fat rhombic-limit tori are out there; decaying to 0 is real
 * evidence the wall sits at the edge of embeddability.
 *
 * Output (in --out's directory; everything is append-only or rewritten
 * per-slice; safe to kill any time):
 *   <out>-summary.csv    one line per finished slice:
 *                        c,secs,tries,accepts,maxMargin,medMargin,imAtMax,bestPool
 *   <out>-all.csv        every accepted on-slice embedded torus (24 floats)
 *   <out>-all-info.csv   SAME ORDER: c,reTau,imTau,coneDeficit,margin
 *   <out>.log            progress lines
 *
 * Usage:
 *   npm run wall-ladder -- [options]
 *
 * Options:
 *   --in PATH           Seed CSV file or dir (repeatable; ≥24 cols).
 *                         Default: data/rect/seeds-half.csv
 *   --slices LIST       Comma-separated c values (default
 *                         0.44,0.45,0.46,0.47,0.475,0.48,0.485,0.49,
 *                         0.4925,0.495,0.4975,0.499,0.4995)
 *   --secs-per-slice N  Time budget per slice (default 1800)
 *   --type N            Triangulation type 1-7 (default 7)
 *   --seed N            RNG seed (default clock)
 *   --sigma-min/max N   Walk kick range, log-uniform (default 1e-3 / 0.03);
 *                         half the kicks instead use σ = parent margin
 *   --fatten-iters N    Barrier-flow iterations per fatten move (default 300)
 *   --fatten-every N    Walk accepts between fatten moves (default 25)
 *   --re-tol N          On-slice verification ||Re τ̂|−c| (default 1e-10)
 *   --angle-tol N       Flatness verification (default 1e-10)
 *   --margin-min N      Reject margins below this — numerical dust (default 1e-12)
 *   --pool-max N        Per-slice seed pool cap (default 400)
 *   --out PATH          Output base (default samples/wall-ladder-<timestamp>)
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';

import { makeRng } from '../../src/configuration/rng.ts';
import { byId } from '../../src/triangulations/index.ts';
import { modulus, reduceModulus, reduceModulusWithMatrix, applyMobius } from '../../src/topology/develop.ts';
import { newtonFlatten } from '../../src/math/newton.ts';
import { maxConeDeficit } from '../../src/conditions/flat.ts';
import { isEmbedded } from '../../src/conditions/embedded/index.ts';
import { embeddedFlow } from '../../src/math/embeddedFlow.ts';
import { makeCellBarrier } from '../../src/math/energies/cellBarrier.ts';
import { minMargin, linearSize } from '../../src/conditions/embedded/index.ts';
import { fdScalar as energyFromCompute } from '../../src/functions/compose.ts';

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

const seed = num(flag('--seed'), Date.now() >>> 0);
const SLICES = (flag('--slices') ?? '0.44,0.45,0.46,0.47,0.475,0.48,0.485,0.49,0.4925,0.495,0.4975,0.499,0.4995')
  .split(',').map(Number);
const SECS = num(flag('--secs-per-slice'), 1800);
const sigmaMin = num(flag('--sigma-min'), 1e-3);
const sigmaMax = num(flag('--sigma-max'), 0.03);
const FATTEN_ITERS = num(flag('--fatten-iters'), 300);
const FATTEN_EVERY = num(flag('--fatten-every'), 25);
const reTol = num(flag('--re-tol'), 1e-10);
const angleTol = num(flag('--angle-tol'), 1e-10);
const MARGIN_MIN = num(flag('--margin-min'), 1e-12);
const POOL_MAX = num(flag('--pool-max'), 400);
const baseOut = resolve((flag('--out') ?? `samples/wall-ladder-${Date.now()}`).replace(/\.csv$/, ''));
const inputs = flags('--in').length ? flags('--in') : ['data/rect/seeds-half.csv'];

const rng = makeRng('xoshiro', seed);
function gaussian() {
  let u = rng();
  if (u < 1e-12) u = 1e-12;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}
const logMin = Math.log(sigmaMin), logMax = Math.log(sigmaMax);

function unitArea(p) {
  const k = 1 / linearSize(torus, p);
  for (let i = 0; i < N; i++) p[i] *= k;
}

/** Frozen-chart slice constraint at |Re| = c for the chart/sign of p itself. */
function sliceConstraint(p, c) {
  const { tau, m } = reduceModulusWithMatrix(modulus(torus, p).tau);
  const sgn = tau[0] >= 0 ? 1 : -1;
  return { value: (q) => applyMobius(m, modulus(torus, q).tau)[0] - sgn * c };
}

/** Project p exactly onto { flat ∧ |Re τ̂| = c }; verify; return cert or null. */
function projectAndVerify(p, c) {
  const nr = newtonFlatten(torus, p, { tolerance: 1e-12, extraConstraints: [sliceConstraint(p, c)] });
  if (nr.status !== 'converged') return null;
  unitArea(p);
  const deficit = maxConeDeficit(torus, p);
  const t = reduceModulus(modulus(torus, p).tau);
  if (!(deficit < angleTol) || !(Math.abs(Math.abs(t[0]) - c) < reTol)) return null;
  if (!isEmbedded(torus, p)) return null;
  const margin = minMargin(torus, p).margin;
  if (margin < MARGIN_MIN) return null;
  return { re: t[0], im: t[1], deficit, margin };
}

/** March p from its current |Re τ̂| to the slice c in adaptive substeps —
 *  one big min-norm jump usually breaks embeddedness; many small ones often
 *  survive. Returns the on-slice certificate or null. */
function marchToSlice(p, c) {
  let cur = Math.abs(reduceModulus(modulus(torus, p).tau)[0]);
  let step = Math.max(Math.abs(c - cur) / 8, 1e-4);
  let halvings = 0;
  const saved = new Float64Array(N);
  for (let guard = 0; guard < 400; guard++) {
    const remaining = c - cur;
    const next = Math.abs(remaining) <= step * 1.5 ? c : cur + Math.sign(remaining) * step;
    saved.set(p);
    const cert = projectAndVerify(p, next);
    if (cert) {
      if (next === c) return cert;
      cur = next; step *= 1.5;
    } else {
      p.set(saved);
      step /= 2; halvings++;
      if (halvings > 20) return null;
    }
  }
  return null;
}

/** Climb p's |Re τ̂| up to slice c with the barrier-pull flow (the only move
 *  that crosses embeddedness walls — it slides along them), then project
 *  exactly onto the slice. Returns the certificate or null. */
function climbToSlice(p, c, deadline) {
  for (let round = 0; round < 500 && Date.now() < deadline; round++) {
    const before = Math.abs(reduceModulus(modulus(torus, p).tau)[0]);
    if (before >= c - 1e-4) break;
    const { tau, m } = reduceModulusWithMatrix(modulus(torus, p).tau);
    const sgn = tau[0] >= 0 ? 1 : -1;
    const mu = Math.max(minMargin(torus, p).margin, 1e-9) * 0.25;
    const barrier = makeCellBarrier(torus, { delta: 0.02, strength: 1 });
    const energy = energyFromCompute('pull', (q) =>
      -sgn * applyMobius(m, modulus(torus, q).tau)[0] + mu * barrier.compute(q));
    embeddedFlow(torus, p, energy, {
      stepSize: 1e-3,
      energyTol: -Infinity,
      gradientTol: 1e-12,
      maxIters: 200,
      normalizeGradient: true,
      feasible: (x) => isEmbedded(torus, x),
      newtonOpts: { tolerance: 1e-12 },
    });
    unitArea(p);
    newtonFlatten(torus, p, { tolerance: 1e-12 });
    if (maxConeDeficit(torus, p) > angleTol || !isEmbedded(torus, p)) return null;
    const after = Math.abs(reduceModulus(modulus(torus, p).tau)[0]);
    if (after < before + 1e-5) break;   // stalled
  }
  // a failed projection mangles p — snapshot so the march starts clean
  const snap = Float64Array.from(p);
  const cert = projectAndVerify(p, c);
  if (cert) return cert;
  p.set(snap);
  return marchToSlice(p, c);
}

/** Maximize the embedding margin WITHOUT leaving the slice: barrier descent
 *  with the slice constraint inside every Newton re-projection. */
function fattenOnSlice(p, c) {
  const q = Float64Array.from(p);
  embeddedFlow(torus, q, makeCellBarrier(torus, { delta: 0.02, strength: 1 }), {
    stepSize: 1e-3,
    energyTol: -Infinity,
    gradientTol: 1e-12,
    maxIters: FATTEN_ITERS,
    normalizeGradient: true,
    feasible: (x) => isEmbedded(torus, x),
    newtonOpts: { tolerance: 1e-12, extraConstraints: [sliceConstraint(q, c)] },
  });
  const cert = projectAndVerify(q, c);
  return cert ? { q, cert } : null;
}

// ---- load initial seeds (any flat embedded tori) ----
const files = [];
for (const inp of inputs) {
  const p = resolve(inp);
  if (statSync(p).isDirectory()) {
    for (const f of readdirSync(p)) if (f.endsWith('.csv')) files.push(join(p, f));
  } else files.push(p);
}
let initial = [];
for (const f of files) {
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const parts = s.split(',');
    if (parts.length < N) continue;
    const p = new Float64Array(N);
    for (let i = 0; i < N; i++) p[i] = Number(parts[i]);
    initial.push(p);
  }
}
if (initial.length === 0) { console.error('wall-ladder: no seeds'); process.exit(1); }
// fattest first — entry attempts start from the most robust tori
initial.sort((a, b) => minMargin(torus, b).margin - minMargin(torus, a).margin);

// ---- output ----
const outDir = dirname(baseOut);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const summaryPath = `${baseOut}-summary.csv`;
const allPath = `${baseOut}-all.csv`;
const allInfoPath = `${baseOut}-all-info.csv`;
if (!existsSync(summaryPath)) appendFileSync(summaryPath, 'c,secs,tries,accepts,maxMargin,medianMargin,imAtMax,poolOut\n');
if (!existsSync(allInfoPath)) appendFileSync(allInfoPath, 'c,reTau,imTau,coneDeficit,margin\n');
function saveAll(p, c, cert) {
  appendFileSync(allPath, Array.from(p, (v) => v.toString()).join(',') + '\n');
  appendFileSync(allInfoPath, `${c},${cert.re},${cert.im},${cert.deficit},${cert.margin}\n`);
  console.log(`  + τ̂ = ${cert.re.toFixed(8)} + ${cert.im.toFixed(6)}i   from½=${(0.5 - Math.abs(cert.re)).toExponential(2)}   flat=${cert.deficit.toExponential(1)}   margin=${cert.margin.toExponential(1)}`);
}

console.log('wall-ladder — measured margin_max(c) as |Re τ̂| = c → 1/2 (no boundary assumption)');
console.log(`  slices:   ${SLICES.join(', ')}`);
console.log(`  budget:   ${SECS}s per slice (${(SLICES.length * SECS / 3600).toFixed(1)}h total)`);
console.log(`  seeds:    ${initial.length} rows  rng ${seed}`);
console.log(`  per slice: WALK (perturb→project→reject) + FATTEN every ${FATTEN_EVERY} accepts (${FATTEN_ITERS} iters)`);
console.log(`  out:      ${summaryPath}\n            ${allPath} (+ -all-info.csv)`);
console.log();

let running = true;
process.on('SIGINT', () => { running = false; });

// ---- the ladder ----
let pool = initial;            // flat embedded tori, used to enter the first slice
let emptyStreak = 0;
const scratch = new Float64Array(N);

for (const c of SLICES) {
  if (!running || emptyStreak >= 2) break;
  const sliceStart = Date.now();
  let tries = 0, accepts = 0, sinceFatten = 0;
  const accepted = [];   // { p, cert } on this slice

  // enter the slice: pull-climb a few fat pool members up to it, each with a
  // real time budget (cheap exact projection first; climbing takes minutes)
  let attempted = 0;
  // try entrants whose CURRENT |Re| is nearest the slice first — points above
  // the slice project DOWN into the embedded side easily, no climbing needed
  const ranked = pool
    .map((p) => ({ p, d: Math.abs(Math.abs(reduceModulus(modulus(torus, p).tau)[0]) - c) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.p);
  for (const p of ranked) {
    if (!running || accepted.length >= 4) break;            // a few entrants suffice — the walk multiplies them
    if ((Date.now() - sliceStart) / 1000 > SECS / 2) break; // don't spend the whole budget entering
    attempted++;
    const q = Float64Array.from(p);
    let cert = projectAndVerify(q, c);
    if (!cert) {
      q.set(p);   // the failed projection mangled q — restore before climbing
      cert = climbToSlice(q, c, Math.min(Date.now() + (SECS / 8) * 1000, sliceStart + (SECS / 2) * 1000));
    }
    if (cert) { accepted.push({ p: q, cert }); saveAll(q, c, cert); }
  }
  console.log(`slice c=${c}: ${accepted.length}/${attempted} entrants climbed across (${((Date.now() - sliceStart) / 1000).toFixed(0)}s)`);

  // walk + fatten until the budget runs out
  while (running && (Date.now() - sliceStart) / 1000 < SECS) {
    if (accepted.length === 0) break;   // nothing to perturb — slice looks unreachable
    const parent = accepted[Math.floor(rng() * accepted.length)];
    const sigma = rng() < 0.5
      ? Math.max(parent.cert.margin, 1e-9)
      : Math.exp(logMin + rng() * (logMax - logMin));
    for (let i = 0; i < N; i++) scratch[i] = parent.p[i] + sigma * gaussian();
    tries++;
    const q = Float64Array.from(scratch);
    const cert = projectAndVerify(q, c);
    if (!cert) continue;
    accepts++;
    sinceFatten++;
    saveAll(q, c, cert);
    accepted.push({ p: q, cert });
    if (accepted.length > POOL_MAX) accepted.splice(Math.floor(rng() * accepted.length), 1);

    if (sinceFatten >= FATTEN_EVERY) {
      sinceFatten = 0;
      // fatten the current fattest — actively hunt the fat end of the slice
      const best = accepted.reduce((a, b) => (b.cert.margin > a.cert.margin ? b : a));
      const r = fattenOnSlice(best.p, c);
      if (r) {
        accepts++;
        saveAll(r.q, c, r.cert);
        accepted.push({ p: r.q, cert: r.cert });
        if (r.cert.margin > best.cert.margin) {
          console.log(`  fatten: margin ${best.cert.margin.toExponential(2)} → ${r.cert.margin.toExponential(2)} (Im=${r.cert.im.toFixed(3)})`);
        }
      }
    }
  }

  // slice summary
  const secs = ((Date.now() - sliceStart) / 1000).toFixed(0);
  if (accepted.length === 0) {
    emptyStreak++;
    appendFileSync(summaryPath, `${c},${secs},${tries},0,,,,0\n`);
    console.log(`slice c=${c}: NOTHING FOUND (${tries} tries) — streak ${emptyStreak}`);
    continue;
  }
  emptyStreak = 0;
  const margins = accepted.map((a) => a.cert.margin).sort((a, b) => a - b);
  const best = accepted.reduce((a, b) => (b.cert.margin > a.cert.margin ? b : a));
  appendFileSync(summaryPath,
    `${c},${secs},${tries},${accepts},${best.cert.margin},${margins[Math.floor(margins.length / 2)]},${best.cert.im},${accepted.length}\n`);
  console.log(`slice c=${c}: ${accepts} accepts / ${tries} tries — maxMargin=${best.cert.margin.toExponential(3)} (Im=${best.cert.im.toFixed(3)}), median=${margins[Math.floor(margins.length / 2)].toExponential(2)}`);

  // the fattest survivors seed the next slice
  accepted.sort((a, b) => b.cert.margin - a.cert.margin);
  pool = accepted.slice(0, POOL_MAX).map((a) => a.p);
}

console.log(`\n— ladder done — summary: ${summaryPath}`);
