/**
 * march-to-i — how far down the imaginary axis (toward the square torus i, Im = 1)
 * does the embedded rectangular set extend? A multi-anchor, fine-step continuation
 * study — the rigorous version of the single down-march in collect-imaginary.
 *
 * From each of the K lowest-Im curated embedded rectangular tori, march DOWN along
 * {flat ∧ τ̂ = (0, s)} ∩ embedded with fine adaptive steps, recording where each
 * path PINCHES (march returns 'blocked' — the embedded region closes). The LOWEST
 * pinch across all anchors is the lowest embeddable rectangular modulus found.
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

import { byId } from '../src/triangulations/index.ts';
import { march } from '../src/solvers/march.ts';
import { certify } from '../src/search/certify.ts';
import { identity } from '../src/configuration/chart.ts';
import { flat } from '../src/conditions/flat.ts';
import { fixedModulus } from '../src/conditions/modulus.ts';
import { embedded } from '../src/regions/embedded.ts';
import { modulus, reduceModulus } from '../src/topology/develop.ts';

const args = process.argv.slice(2);
function flag(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; }
function num(v, d) { return v === undefined ? d : Number(v); }

const TYPE = num(flag('--type'), 7);
const torus = byId(TYPE);
const N = torus.vertexCount * 3;
const ANCHORS = num(flag('--anchors'), 12);
const IM_MIN = num(flag('--im-min'), 1.0);        // target: the square torus i
const seedFile = resolve(flag('--seed-file') ?? `data/curated/rectangular-t${TYPE}.csv`);
const outBase = resolve((flag('--out') ?? `samples/march-to-i-t${TYPE}`).replace(/\.csv$/, ''));

const chart = identity(N);
const region = embedded(torus);
const flatC = flat(torus);
const imOf = (c) => reduceModulus(modulus(torus, c).tau)[1];
const family = {
  param: imOf,
  held: (c, s) => [flatC, fixedModulus(torus, c, [0, s])],
};

// Fine continuation: tiny terminal steps + many halvings → march very close to the
// true closing point before declaring a pinch.
const marchOpts = { region, minStep: 1e-4, maxHalvings: 44, maxSteps: 4000, stallStep: 1e-10, tol: 1e-9 };

// Load embedded rectangular seeds; take the K lowest-Im ones as anchors.
if (!existsSync(seedFile)) {
  process.stderr.write(
    `seed file not found: ${seedFile}\n` +
    `→ generate seeds first, e.g.:\n` +
    `   npm run collect-rect -- --type ${TYPE} --in data/curated/rectangular-t${TYPE}.csv --out samples/rect-t${TYPE}-low\n`,
  );
  process.exit(1);
}
const seeds = [];
for (const l of readFileSync(seedFile, 'utf8').split('\n')) {
  if (!l.trim()) continue;
  const p = Float64Array.from(l.split(',').slice(0, N).map(Number));
  if (p.length !== N || p.some(Number.isNaN)) continue;
  const c = certify(torus, p);
  if (c.embedded && Math.abs(c.tauHat[0]) < 1e-3) seeds.push({ p, im: c.tauHat[1] });
}
seeds.sort((a, b) => a.im - b.im);
const anchors = seeds.slice(0, ANCHORS);
process.stderr.write(
  `march-to-i: ${anchors.length} lowest anchors (Im ${anchors[0].im.toFixed(3)}–${anchors[anchors.length - 1].im.toFixed(3)}) ` +
  `marching DOWN toward i (Im=${IM_MIN})\n`,
);

const pinchRows = [];
const info = [];
let lowestPinch = Infinity;

for (const a of anchors) {
  const x = Float64Array.from(a.p);
  const r = march(chart, x, family, IM_MIN, marchOpts);
  const p = new Float64Array(N);
  chart.realize(x, p);
  const c = certify(torus, p);
  info.push({ startIm: a.im, pinchIm: r.param, status: r.status, embedded: c.embedded, margin: c.margin });
  if (c.embedded) {
    pinchRows.push({ im: c.tauHat[1], row: Array.from(p).join(',') + `,${c.coneDeficit},${c.tauHat[0]},${c.tauHat[1]},${c.margin}` });
    if (c.tauHat[1] < lowestPinch) lowestPinch = c.tauHat[1];
  }
  process.stderr.write(
    `  anchor Im=${a.im.toFixed(3)} → ${r.status} at Im≈${r.param.toFixed(5)} (embedded=${c.embedded}, margin=${c.margin.toExponential(2)})\n`,
  );
}

pinchRows.sort((x, y) => x.im - y.im);
mkdirSync(dirname(outBase), { recursive: true });
writeFileSync(outBase + '.csv', pinchRows.length ? pinchRows.map((r) => r.row).join('\n') + '\n' : '');
writeFileSync(
  outBase + '-info.csv',
  'startIm,pinchIm,marchStatus,embedded,margin\n' +
  info.sort((a, b) => a.startIm - b.startIm).map((r) =>
    `${r.startIm},${r.pinchIm},${r.status},${r.embedded},${r.margin}`,
  ).join('\n') + '\n',
);

process.stderr.write(`\nLOWEST embeddable Im reached across ${anchors.length} paths: ${lowestPinch.toFixed(5)}  (i is at Im=1.0)\n`);
if (lowestPinch > IM_MIN + 1e-6) {
  process.stderr.write(
    `→ every path pinched ABOVE i (lowest gap ${(lowestPinch - IM_MIN).toFixed(4)}, margin→0). Each pinch is\n` +
    `  PATH-DEPENDENT and bounded by its anchor, and the lowest is bounded by the lowest available\n` +
    `  embedded seed. So the embedded set REACHABLE BY CONTINUATION from the known tori bottoms out\n` +
    `  here; i lies below, unreached. Consistent with i not embedding, but a DISCONNECTED embedded\n` +
    `  component at lower Im cannot be excluded by continuation.\n`);
} else {
  process.stderr.write(`→ a path REACHED i: the square torus DOES embed.\n`);
}
process.stderr.write(`→ ${outBase}.csv\n`);
