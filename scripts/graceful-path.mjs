/**
 * graceful-path — trace a CONSTANT-MODULUS path of embedded flat tori, from the
 * deepest embedding at a fixed modulus down to the gracefully immersed (margin → 0)
 * limit. This is the "path into the embedded neighborhood" of a graceful immersion,
 * at fixed modulus (cf. Doyle–Schwartz). The whole path holds [flat, fixedModulus]
 * exactly, so the modulus is constant to ~1e-13 throughout.
 *
 *   seed (any strict embedding) → ASCEND to max margin (fatten on the fiber)
 *                              → DESCEND the clearance gradient (tangent to the fiber) to margin ≈ 0
 *                              → sample N frames, write a 24-float CSV
 *
 * The path lives on the fiber {flat, modulus = τ̂(seed)}; each step projects the
 * clearance gradient onto that fiber's tangent space (null of the [flat; modulus]
 * Jacobian) so flatness and modulus never move, then re-projects exactly with Newton,
 * shrinking the step if it would leave Ω (the embedded set).
 *
 * Usage:  npm run graceful-path -- [options]
 *   --type N           triangulation (default 7 = Rich)
 *   --seed PATH        CSV whose first data row is a strict embedded flat torus
 *                      (default data/rect/square-polished.csv — the square torus i)
 *   --frames N         frames to sample, geometric in margin (default 30)
 *   --no-ascend        skip the fatten-to-deepest step (start at the seed's margin)
 *   --min-margin X     stop the descent below this margin (default 5e-9)
 *   --out PATH         CSV out (default samples/graceful-path-<ts>.csv)
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { makeArgs, csvRow } from './lib/cli.mjs';
import { byId } from '@core/triangulations/index.ts';
import { certify } from '@core/search/certify.ts';
import { isEmbedded, clearance, embeddedRegion, makeCellBarrier } from '@core/embedding/index.ts';
import { flat } from '@core/constraints/flat.ts';
import { fixedModulus } from '@core/constraints/modulus.ts';
import { project } from '@core/solvers/project.ts';
import { minimize } from '@core/solvers/minimize.ts';

const a = makeArgs(process.argv);
const triang = byId('v8-' + a.num('--type', 7));
const N = triang.vertexCount * 3;
const seedPath = a.flag('--seed') ?? 'data/rect/square-polished.csv';
const frames = a.num('--frames', 30);
const ascend = !a.flag('--no-ascend');
const minMargin = a.num('--min-margin', 5e-9);
const out = resolve(a.flag('--out') ?? `samples/graceful-path-${Date.now()}.csv`);

const dot = (u, v) => { let s = 0; for (let i = 0; i < N; i++) s += u[i] * v[i]; return s; };

// seed
const seedRow = readFileSync(seedPath, 'utf8').trim().split('\n').filter((l) => l && !/[a-zA-Z]/.test(l[0]))[0];
const S = Float64Array.from(seedRow.split(',').slice(0, N), Number);
const cS = certify(triang, S), tau = cS.tauHat;
console.log(`graceful-path  type ${triang.id}  seed ${seedPath}`);
console.log(`  seed: margin ${cS.margin.toExponential(2)}  τ̂=(${tau[0].toFixed(4)},${tau[1].toFixed(4)})  embedded ${cS.embedded}`);

const held = [flat(triang), fixedModulus(triang, S, tau)];
const fdim = held[0].fn.outDim, mdim = held[1].fn.outDim;
const fJ = new Float64Array(fdim * N), mJ = new Float64Array(mdim * N);

// -∇clearance projected onto the fiber tangent (null of the stacked [flat; modulus] Jacobian)
function tangentDown(x) {
  held[0].fn.jacobian(x, fJ); held[1].fn.jacobian(x, mJ);
  const Q = [], rows = [];
  for (let r = 0; r < fdim; r++) rows.push(fJ.slice(r * N, r * N + N));
  for (let r = 0; r < mdim; r++) rows.push(mJ.slice(r * N, r * N + N));
  for (const row of rows) {                                  // Gram–Schmidt → orthonormal row basis Q
    const v = Float64Array.from(row);
    for (const q of Q) { const d = dot(v, q); for (let i = 0; i < N; i++) v[i] -= d * q[i]; }
    const nr = Math.hypot(...v); if (nr > 1e-9) { for (let i = 0; i < N; i++) v[i] /= nr; Q.push(v); }
  }
  const h = 1e-6, g = new Float64Array(N), xp = new Float64Array(N), xm = new Float64Array(N);
  for (let i = 0; i < N; i++) { xp.set(x); xm.set(x); xp[i] += h; xm[i] -= h; g[i] = (clearance(triang, xp) - clearance(triang, xm)) / (2 * h); }
  for (const q of Q) { const c = dot(g, q); for (let i = 0; i < N; i++) g[i] -= c * q[i]; }   // project onto null(J)
  const nr = Math.hypot(...g); if (nr > 0) for (let i = 0; i < N; i++) g[i] = -g[i] / nr;       // unit, decreasing clearance
  return g;
}

const x = Float64Array.from(S);
let maxDrift = 0;
const tauDrift = () => { const c = certify(triang, x); maxDrift = Math.max(maxDrift, Math.hypot(c.tauHat[0] - tau[0], c.tauHat[1] - tau[1])); };

// ASCEND: fatten on the fiber to the deepest embedding (start the path as far from the fold as possible)
if (ascend) {
  minimize(x, held, makeCellBarrier(triang, { delta: 0.02 }), { region: embeddedRegion(triang), stepSize: 0.001, maxIters: 800 });
  tauDrift();
  console.log(`  ascended to deepest: margin ${certify(triang, x).margin.toExponential(2)}`);
}

// DESCEND to the graceful immersion, recording the trajectory
const traj = [];
for (let step = 0; step < 6000; step++) {
  const c = certify(triang, x); tauDrift();
  traj.push({ x: Float64Array.from(x), m: c.margin });
  if (c.margin < minMargin) break;
  const d = tangentDown(x);
  let ok = false, alpha = Math.max(5e-5, 0.25 * c.margin);
  for (let t = 0; t < 9; t++) {
    const y = Float64Array.from(x); for (let i = 0; i < N; i++) y[i] += alpha * d[i];
    if (project(y, held, { tolerance: 1e-11, maxIters: 80 }).status === 'converged' && isEmbedded(triang, y)) { x.set(y); ok = true; break; }
    alpha *= 0.5;
  }
  if (!ok) { console.log(`  descent blocked at margin ${certify(triang, x).margin.toExponential(2)}`); break; }
}

// sample `frames` points geometric in margin, nearest distinct trajectory config to each level
const m0 = traj[0].m, mEnd = traj[traj.length - 1].m;
const levels = Array.from({ length: frames }, (_, i) => m0 * Math.pow(mEnd / m0, i / (frames - 1)));
const chosen = [], used = new Set();
for (const L of levels) {
  let bi = -1, bd = Infinity;
  traj.forEach((p, i) => { const dd = Math.abs(Math.log(p.m) - Math.log(L)); if (dd < bd && !used.has(i)) { bd = dd; bi = i; } });
  if (bi >= 0) { used.add(bi); chosen.push(traj[bi]); }
}
chosen.sort((p, q) => q.m - p.m);

writeFileSync(out, chosen.map((p) => csvRow(p.x)).join('\n') + '\n');
console.log(`\ntrajectory ${traj.length} steps → ${chosen.length} frames → ${out}`);
console.log(`  margin range ${chosen[0].m.toExponential(2)} … ${chosen[chosen.length - 1].m.toExponential(2)}`);
console.log(`  modulus constant to |Δτ̂| ≤ ${maxDrift.toExponential(1)}; all flat & embedded`);
