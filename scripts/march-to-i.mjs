/**
 * march-to-i — how far down the imaginary axis (toward the square torus i, Im = 1)
 * does the embedded rectangular set extend? A multi-anchor, fine-step continuation
 * study — the rigorous version of the single down-march in collect-imaginary.
 *
 * From each of the K lowest-Im curated embedded rectangular tori, march DOWN along
 * {flat ∧ τ̂ = (0, s)} ∩ embedded with fine adaptive steps (`imaginaryFamily`),
 * recording where each path PINCHES (march returns 'blocked' — the embedded region
 * closes). The LOWEST pinch across all anchors is the lowest embeddable rectangular
 * modulus found.
 *   - all paths pinch ABOVE Im = 1  ⟹  path-diverse evidence the square torus i
 *     does NOT admit an embedded 8-vertex realization.
 *   - any path REACHES Im = 1  ⟹  i DOES embed (a positive result).
 *
 * march stays INSIDE the embedded sliver the whole way (unlike random restarts,
 * which can't hit a measure-near-zero target) — that is why this is the right
 * instrument here.
 *
 * Output:
 *   <out>.csv       the embedded torus at each anchor's pinch (28-col), lowest Im first
 *   <out>-info.csv  per anchor: startIm, pinchIm, marchStatus, margin
 *
 * Usage:
 *   npm run march-to-i -- [--anchors N] [--im-min N] [--seed-file PATH] [--out PATH]
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
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
const triang = byId(TYPE);
const N = triang.vertexCount * 3;
const ANCHORS = a.num('--anchors', 12);
const IM_MIN = a.num('--im-min', 1.0);        // target: the square torus i
const seedFile = resolve(a.flag('--seed-file') ?? `data/curated/rectangular-t${TYPE}.csv`);
const outBase = resolve((a.flag('--out') ?? `samples/march-to-i-t${TYPE}`).replace(/\.csv$/, ''));

// fullSpace: the working point IS the 24-vector of positions (φ = identity).
const space = fullSpace(triang);
const family = imaginaryFamily(space);                              // {flat ∧ τ̂ = (0, s)}, re-frozen
const region = ambientRegion(space, (c) => isEmbedded(triang, c));      // stay embedded

// Fine continuation: tiny terminal steps + many halvings → march very close to the
// true closing point before declaring a pinch.
const continuationOpts = { region, minStep: 1e-4, maxHalvings: 44, maxSteps: 4000, stallStep: 1e-10, tol: 1e-9 };

// Load embedded rectangular seeds; take the K lowest-Im ones as anchors.
if (!existsSync(seedFile)) {
  process.stderr.write(`seed file not found: ${seedFile}\n→ provide curated embedded rectangular tori for type ${TYPE}.\n`);
  process.exit(1);
}
const seeds = [];
for (const l of readFileSync(seedFile, 'utf8').split('\n')) {
  if (!l.trim()) continue;
  const p = Float64Array.from(l.split(',').slice(0, N).map(Number));
  if (p.length !== N || p.some(Number.isNaN)) continue;
  const c = certify(triang, p);
  if (c.embedded && Math.abs(c.tauHat[0]) < 1e-3) seeds.push({ p, im: c.tauHat[1] });
}
seeds.sort((x, y) => x.im - y.im);
const anchors = seeds.slice(0, ANCHORS);
if (!anchors.length) { process.stderr.write(`no embedded rectangular seeds in ${seedFile}\n`); process.exit(1); }
process.stderr.write(
  `march-to-i: ${anchors.length} lowest anchors (Im ${anchors[0].im.toFixed(3)}–${anchors[anchors.length - 1].im.toFixed(3)}) ` +
  `marching DOWN toward i (Im=${IM_MIN})\n`,
);

const pinchRows = [];
const info = [];
let lowestPinch = Infinity;

for (const anc of anchors) {
  const x = Float64Array.from(anc.p);            // working point = positions (fullSpace)
  const r = continuation(x, family, IM_MIN, continuationOpts); // mutates x in place
  const c = certify(triang, x);
  info.push({ startIm: anc.im, pinchIm: r.param, status: r.status, embedded: c.embedded, margin: c.margin });
  if (c.embedded) {
    pinchRows.push({ im: c.tauHat[1], row: Array.from(x).join(',') + `,${c.coneDeficit},${c.tauHat[0]},${c.tauHat[1]},${c.margin}` });
    if (c.tauHat[1] < lowestPinch) lowestPinch = c.tauHat[1];
  }
  process.stderr.write(
    `  anchor Im=${anc.im.toFixed(3)} → ${r.status} at Im≈${r.param.toFixed(5)} (embedded=${c.embedded}, margin=${c.margin.toExponential(2)})\n`,
  );
}

pinchRows.sort((x, y) => x.im - y.im);
mkdirSync(dirname(outBase), { recursive: true });
writeFileSync(outBase + '.csv', pinchRows.length ? pinchRows.map((r) => r.row).join('\n') + '\n' : '');
writeFileSync(
  outBase + '-info.csv',
  'startIm,pinchIm,marchStatus,embedded,margin\n' +
  info.sort((x, y) => x.startIm - y.startIm).map((r) =>
    `${r.startIm},${r.pinchIm},${r.status},${r.embedded},${r.margin}`,
  ).join('\n') + '\n',
);

process.stderr.write(`\nLOWEST embeddable Im reached across ${anchors.length} paths: ${lowestPinch.toFixed(5)}  (i is at Im=1.0)\n`);
if (lowestPinch > IM_MIN + 1e-6) {
  process.stderr.write(
    `→ every path pinched ABOVE i (lowest gap ${(lowestPinch - IM_MIN).toFixed(4)}, margin→0). Each pinch is\n` +
    `  PATH-DEPENDENT and bounded by its anchor. So the embedded set REACHABLE BY CONTINUATION from the\n` +
    `  known tori bottoms out here; i lies below, unreached. Consistent with i not embedding, but a\n` +
    `  DISCONNECTED embedded component at lower Im cannot be excluded by continuation.\n`);
} else {
  process.stderr.write(`→ a path REACHED i: the square torus DOES embed.\n`);
}
process.stderr.write(`→ ${outBase}.csv\n`);
