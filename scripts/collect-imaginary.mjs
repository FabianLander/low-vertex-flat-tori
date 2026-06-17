/**
 * collect-imaginary — march flat EMBEDDED 8-vertex tori along the imaginary-axis
 * edge of moduli space (Re τ̂ = 0, the rectangular tori), bucketed in Im τ̂.
 *
 * Why march, not flow-from-DS: descending a repulsion energy from an immersed
 * Doyle–Schwartz seed opens geometric gaps but does NOT cross the topological
 * embeddedness boundary (an earlier sweep found 0/105, all stuck at positive
 * margin but isEmbedded=false). Instead we START from a KNOWN embedded rectangular
 * torus and CONTINUE along the submanifold {flat ∧ τ̂ = (0, s)} ∩ embedded, stepping
 * s in small increments, re-projecting and re-gating each step (`march`). Where the
 * path PINCHES (march returns 'blocked', the embedded region closes) is the lowest
 * (or highest) embeddable rectangular modulus — a RESULT. Whether the down-march
 * reaches the square torus i (Im = 1.0) is the open question (DS Remark 6).
 *
 * From a curated embedded anchor we march DOWN bucket-by-bucket toward Im = IM_MIN
 * and UP toward IM_MAX, certifying and recording the embedded torus at each bucket
 * reached, and reporting the pinch where a chain stops.
 *
 * Output (28-col curated-moduli format, NO header — drop straight into the demo):
 *   <out>.csv       one row per bucket reached: 24 positions, coneDeficit, Re τ̂, Im τ̂, margin
 *   <out>-info.csv  per bucket (with header): imTarget, marchStatus, reachedIm, embedded,
 *                   coneDeficit, margin
 *
 * Usage:
 *   npm run collect-imaginary -- [options]
 *   --seed-file PATH  embedded rectangular seeds (default data/curated/rectangular-t7.csv)
 *   --im-min N        lowest target Im   (default 1.0 — the square torus i)
 *   --im-max N        highest target Im  (default 3.0)
 *   --step N          grid step in Im    (default 0.1)
 *   --out PATH        output base        (default samples/imaginary-t7)
 */

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';

import { byId } from '../src/triangulations/index.ts';
import { march } from '../src/solvers/march.ts';
import { certify } from '../src/search/certify.ts';
import { identity } from '../src/configuration/chart.ts';
import { flat } from '../src/conditions/flat.ts';
import { fixedModulus } from '../src/conditions/modulus.ts';
import { embedded } from '../src/conditions/embedded/index.ts';
import { modulus, reduceModulus } from '../src/topology/develop.ts';

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
function flag(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; }
function num(v, d) { return v === undefined ? d : Number(v); }

const torus = byId(7);                 // RICH — the degree-6-regular triangulation
const N = torus.vertexCount * 3;       // 24
const seedFile = resolve(flag('--seed-file') ?? 'data/curated/rectangular-t7.csv');
const IM_MIN = num(flag('--im-min'), 1.0);
const IM_MAX = num(flag('--im-max'), 3.0);
const STEP = num(flag('--step'), 0.1);
const outBase = resolve((flag('--out') ?? 'samples/imaginary-t7').replace(/\.csv$/, ''));

// ---------------------------------------------------------------------------
// The Re τ̂ = 0, Im τ̂ = s family, the chart, and the embedded region
// ---------------------------------------------------------------------------
const chart = identity(N);
const region = embedded(torus);
const flatC = flat(torus);
const imOf = (c) => reduceModulus(modulus(torus, c).tau)[1];
const family = {
  param: imOf,                                          // current Im τ̂
  held: (c, s) => [flatC, fixedModulus(torus, c, [0, s])], // {flat ∧ τ̂ = (0, s)}, re-frozen at c
};

// ---------------------------------------------------------------------------
// Load curated embedded rectangular seeds (certify each: embedded AND Re τ̂ ≈ 0)
// ---------------------------------------------------------------------------
const seeds = [];
for (const l of readFileSync(seedFile, 'utf8').split('\n')) {
  if (!l.trim()) continue;
  const p = Float64Array.from(l.split(',').slice(0, N).map(Number));
  if (p.length !== N || p.some(Number.isNaN)) continue;
  const c = certify(torus, p);
  if (c.embedded && Math.abs(c.tauHat[0]) < 1e-3) seeds.push({ p, im: c.tauHat[1] });
}
if (!seeds.length) { process.stderr.write(`no embedded rectangular seeds in ${seedFile}\n`); process.exit(1); }
seeds.sort((a, b) => a.im - b.im);
const anchor = seeds.find((s) => s.im >= IM_MIN) ?? seeds[seeds.length - 1];
process.stderr.write(
  `collect-imaginary: ${seeds.length} embedded seeds (Im ∈ [${seeds[0].im.toFixed(3)}, ${seeds[seeds.length - 1].im.toFixed(3)}]), ` +
  `anchor at Im=${anchor.im.toFixed(4)}\n`,
);

// ---------------------------------------------------------------------------
// Grid + march chains
// ---------------------------------------------------------------------------
const targets = [];
for (let t = IM_MIN; t <= IM_MAX + 1e-9; t += STEP) targets.push(Math.round(t * 1e6) / 1e6);

const im0 = seeds[0].im;                 // curated floor: lowest embedded seed
const hitRows = [];
const info = [];

function nearestSeed(t) {
  let best = seeds[0], bd = Infinity;
  for (const s of seeds) { const d = Math.abs(s.im - t); if (d < bd) { bd = d; best = s; } }
  return best;
}
function recordHit(t, p, c) {
  info.push({ t, status: 'reached', reached: c.tauHat[1], embedded: true, cone: c.coneDeficit, margin: c.margin });
  hitRows.push(Array.from(p).join(',') + `,${c.coneDeficit},${c.tauHat[0]},${c.tauHat[1]},${c.margin}`);
}

// 1. FILL buckets at/above the curated floor: each from its NEAREST curated seed
//    (a short local march — avoids the spurious pinch of one long continuation path).
process.stderr.write(`filling ${targets.filter((t) => t >= im0).length} buckets ≥ Im=${im0.toFixed(3)} from nearest seeds\n`);
for (const t of targets.filter((t) => t >= im0)) {
  const seed = nearestSeed(t);
  const x = Float64Array.from(seed.p);
  const r = march(chart, x, family, t, { region, maxSteps: 300 });
  const p = new Float64Array(N); chart.realize(x, p);
  const c = certify(torus, p);
  if (r.status === 'reached' && c.embedded) {
    recordHit(t, p, c);
    process.stderr.write(`  Im=${t.toFixed(2)}: embedded (seed Im=${seed.im.toFixed(3)}) margin=${c.margin.toExponential(2)}\n`);
  } else {
    info.push({ t, status: r.status, reached: r.param, embedded: c.embedded, cone: c.coneDeficit, margin: c.margin });
    process.stderr.write(`  Im=${t.toFixed(2)}: ${r.status} (reached Im≈${r.param.toFixed(4)}, emb=${c.embedded})\n`);
  }
}

// 2. PROBE DOWN toward i: a genuine continuation from the curated floor — how far
//    below the lowest known embedded torus does the embedded set extend?
const downTargets = targets.filter((t) => t < im0).sort((a, b) => b - a);
if (downTargets.length) {
  process.stderr.write(`probing DOWN from the curated floor Im=${im0.toFixed(3)} toward Im=${IM_MIN}\n`);
  const x = Float64Array.from(seeds[0].p);
  for (const t of downTargets) {
    const r = march(chart, x, family, t, { region, maxSteps: 800 });
    const p = new Float64Array(N); chart.realize(x, p);
    const c = certify(torus, p);
    if (r.status === 'reached' && c.embedded) {
      recordHit(t, p, c);
      process.stderr.write(`  Im=${t.toFixed(2)}: reached, embedded, margin=${c.margin.toExponential(2)}\n`);
    } else {
      info.push({ t, status: r.status, reached: r.param, embedded: c.embedded, cone: c.coneDeficit, margin: c.margin });
      // The pinch leaves x at the last good point — the lowest embeddable torus on
      // this path. Record it (at its actual modulus) as the headline data point.
      if (c.embedded) {
        hitRows.push(Array.from(p).join(',') + `,${c.coneDeficit},${c.tauHat[0]},${c.tauHat[1]},${c.margin}`);
      }
      process.stderr.write(`  Im=${t.toFixed(2)}: march ${r.status} — PINCH at Im≈${r.param.toFixed(4)} (lowest embeddable from this path)\n`);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------
mkdirSync(dirname(outBase), { recursive: true });
writeFileSync(outBase + '.csv', hitRows.length ? hitRows.join('\n') + '\n' : '');
writeFileSync(
  outBase + '-info.csv',
  'imTarget,marchStatus,reachedIm,embedded,coneDeficit,margin\n' +
  info.sort((a, b) => a.t - b.t).map((r) =>
    `${r.t},${r.status},${r.reached},${r.embedded},${r.cone},${r.margin}`,
  ).join('\n') + '\n',
);

const bucketsHit = new Set(info.filter((r) => r.embedded).map((r) => r.t)).size;
const pinches = info.filter((r) => r.status !== 'reached');
process.stderr.write(
  `\nDone: ${bucketsHit}/${targets.length} buckets embedded` +
  (pinches.length ? `, pinched at Im≈${pinches.map((p) => p.reached.toFixed(3)).join(', ')}` : '') +
  ` → ${outBase}.csv\n`,
);
