/**
 * collect-imaginary — march flat EMBEDDED 8-vertex tori along the imaginary-axis
 * edge of moduli space (Re τ̂ = 0, the rectangular tori), bucketed in Im τ̂.
 *
 * Why march, not flow-from-DS: descending a repulsion energy from an immersed
 * Doyle–Schwartz seed opens geometric gaps but does NOT cross the topological
 * embeddedness boundary. Instead we START from a KNOWN embedded rectangular torus
 * and CONTINUE along {flat ∧ τ̂ = (0, s)} ∩ embedded (`imaginaryFamily`), stepping s
 * in small increments, re-projecting and re-gating each step (`march`). Where the
 * path PINCHES (march 'blocked', the embedded region closes) is the lowest (or
 * highest) embeddable rectangular modulus — a RESULT. Whether the down-march reaches
 * the square torus i (Im = 1.0) is the open question (DS Remark 6).
 *
 * From a curated embedded anchor we march DOWN bucket-by-bucket toward Im = IM_MIN
 * and fill buckets UP toward IM_MAX, certifying the embedded torus at each.
 *
 * Output (28-col curated-moduli format, NO header — drop into the demo):
 *   <out>.csv       one row per bucket reached: 24 positions, coneDeficit, Re τ̂, Im τ̂, margin
 *   <out>-info.csv  per bucket (with header): imTarget, marchStatus, reachedIm, embedded, coneDeficit, margin
 *
 * Usage:
 *   npm run collect-imaginary -- [--seed-file PATH] [--im-min N] [--im-max N] [--step N] [--out PATH]
 */

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';

import { makeArgs } from './lib/cli.mjs';
import { byId } from '@core/triangulations/index.ts';
import { fullSpace } from '@core/coordinates/full.ts';
import { continuation } from '@core/solvers/continuation.ts';
import { imaginaryFamily } from '@core/search/marchModulus.ts';
import { ambientRegion } from '@core/search/pull.ts';
import { certify } from '@core/search/certify.ts';
import { isEmbedded } from '@core/embedding/index.ts';

const a = makeArgs(process.argv);
const TYPE = a.num('--type', 7);
const triang = byId('v8-' + TYPE);                 // 7 = RICH, the degree-6-regular triangulation
const N = triang.vertexCount * 3;
const seedFile = resolve(a.flag('--seed-file') ?? `data/curated/rectangular-t${TYPE}.csv`);
const IM_MIN = a.num('--im-min', 1.0);
const IM_MAX = a.num('--im-max', 3.0);
const STEP = a.num('--step', 0.1);
const outBase = resolve((a.flag('--out') ?? `samples/imaginary-t${TYPE}`).replace(/\.csv$/, ''));

// fullSpace: working point = positions. {flat ∧ τ̂ = (0, s)} family + embedded gate.
const space = fullSpace(triang);
const family = imaginaryFamily(space);
const region = ambientRegion(space, (c) => isEmbedded(triang, c));

// Load curated embedded rectangular seeds (certify each: embedded AND Re τ̂ ≈ 0).
const seeds = [];
for (const l of readFileSync(seedFile, 'utf8').split('\n')) {
  if (!l.trim()) continue;
  const p = Float64Array.from(l.split(',').slice(0, N).map(Number));
  if (p.length !== N || p.some(Number.isNaN)) continue;
  const c = certify(triang, p);
  if (c.embedded && Math.abs(c.tauHat[0]) < 1e-3) seeds.push({ p, im: c.tauHat[1] });
}
if (!seeds.length) { process.stderr.write(`no embedded rectangular seeds in ${seedFile}\n`); process.exit(1); }
seeds.sort((x, y) => x.im - y.im);
process.stderr.write(
  `collect-imaginary: ${seeds.length} embedded seeds (Im ∈ [${seeds[0].im.toFixed(3)}, ${seeds[seeds.length - 1].im.toFixed(3)}])\n`,
);

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
function recordHit(t, x, c) {
  info.push({ t, status: 'reached', reached: c.tauHat[1], embedded: true, cone: c.coneDeficit, margin: c.margin });
  hitRows.push(Array.from(x).join(',') + `,${c.coneDeficit},${c.tauHat[0]},${c.tauHat[1]},${c.margin}`);
}

// 1. FILL buckets at/above the curated floor: each from its NEAREST curated seed
//    (a short local march — avoids the spurious pinch of one long continuation path).
process.stderr.write(`filling ${targets.filter((t) => t >= im0).length} buckets ≥ Im=${im0.toFixed(3)} from nearest seeds\n`);
for (const t of targets.filter((t) => t >= im0)) {
  const x = Float64Array.from(nearestSeed(t).p);
  const r = continuation(x, family, t, { region, maxSteps: 300 });
  const c = certify(triang, x);
  if (r.status === 'reached' && c.embedded) {
    recordHit(t, x, c);
    process.stderr.write(`  Im=${t.toFixed(2)}: embedded margin=${c.margin.toExponential(2)}\n`);
  } else {
    info.push({ t, status: r.status, reached: r.param, embedded: c.embedded, cone: c.coneDeficit, margin: c.margin });
    process.stderr.write(`  Im=${t.toFixed(2)}: ${r.status} (reached Im≈${r.param.toFixed(4)}, emb=${c.embedded})\n`);
  }
}

// 2. PROBE DOWN toward i: a genuine continuation from the curated floor — how far
//    below the lowest known embedded torus does the embedded set extend?
const downTargets = targets.filter((t) => t < im0).sort((x, y) => y - x);
if (downTargets.length) {
  process.stderr.write(`probing DOWN from the curated floor Im=${im0.toFixed(3)} toward Im=${IM_MIN}\n`);
  const x = Float64Array.from(seeds[0].p);
  for (const t of downTargets) {
    const r = continuation(x, family, t, { region, maxSteps: 800 });
    const c = certify(triang, x);
    if (r.status === 'reached' && c.embedded) {
      recordHit(t, x, c);
      process.stderr.write(`  Im=${t.toFixed(2)}: reached, embedded, margin=${c.margin.toExponential(2)}\n`);
    } else {
      info.push({ t, status: r.status, reached: r.param, embedded: c.embedded, cone: c.coneDeficit, margin: c.margin });
      // The pinch leaves x at the last good point — the lowest embeddable torus on
      // this path. Record it (at its actual modulus) as the headline data point.
      if (c.embedded) hitRows.push(Array.from(x).join(',') + `,${c.coneDeficit},${c.tauHat[0]},${c.tauHat[1]},${c.margin}`);
      process.stderr.write(`  Im=${t.toFixed(2)}: march ${r.status} — PINCH at Im≈${r.param.toFixed(4)} (lowest embeddable from this path)\n`);
      break;
    }
  }
}

mkdirSync(dirname(outBase), { recursive: true });
writeFileSync(outBase + '.csv', hitRows.length ? hitRows.join('\n') + '\n' : '');
writeFileSync(
  outBase + '-info.csv',
  'imTarget,marchStatus,reachedIm,embedded,coneDeficit,margin\n' +
  info.sort((x, y) => x.t - y.t).map((r) =>
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
