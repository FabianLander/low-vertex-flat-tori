/**
 * paper-push — precompute Lander's OWN argument as a curve in the push-off height t.
 *
 *   npm run paper-push -- [--dt N] [--tmax N]
 *
 * The paper's construction is: take the fold Q⁰ (collapsed, exactly flat, exactly at modulus,
 * not embedded), push it off the plane along the fixed rational direction ζ — vertex v to
 * (Q_v, t·ζ_v) — and correct it back onto {flat} ∩ {τ = τ₀} by the implicit function theorem,
 * moving the nine planar coordinates of §6 and freezing everything else. That correction is a
 * SQUARE 9×9 system, invertible at the fold (Prop. 3), so for small t it has one solution and
 * the curve t ↦ (the corrected torus) is what the theorem produces.
 *
 * The theorem is local: it says such a t exists, not how big it gets. This script measures
 * that. It marches t up in small steps, warm-starting each solve from the last, and records
 * every rung WITHOUT STOPPING at the first failure — which is the whole point, since the
 * question is where embeddedness is lost and whether it ever returns.
 *
 * `free: 'paper'` is the paper's step exactly. Nothing is fattened: at 'paper' the solution is
 * locally isolated (no tangent freedom), so there is nothing to fatten along. That is what
 * makes this a clean measurement of the argument rather than of our search — the repo's other
 * ladder (`inflate-fold`, `free: 'planar'` + fatten) uses a 7-dimensional fiber and a barrier
 * to get further, and reaches a different, larger t. Both are honest; they answer different
 * questions.
 *
 * Writes demos/steve-paper-push/data/<name>.csv, one row per rung, ALL rungs:
 *   t, converged, coneDeficit, dTau, embedded, clearance, x0,y0,z0, …, x7,y7,z7
 * with `converged`/`embedded` as 1/0. The march stops only when the correction itself stops
 * solving — past that there is no curve left to follow.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { FOLDED_BASES } from '@core/sampling/foldedBases.ts';
import { correctFold, foldTau } from '@core/search/correct-fold.ts';
import { makeArgs } from './lib/cli.mjs';

const a = makeArgs(process.argv);

// Per-base resolution: the interesting stretch is where embeddedness is lost, and the two
// tori lose it at wildly different scales (square ~0.13, hexagonal ~0.02), so a step that
// resolves the square transition would give the hexagonal one a handful of rungs.
const PLAN = {
  square:    { dt: 0.002,  tmax: 1.2 },
  hexagonal: { dt: 0.0002, tmax: 0.06 },
};

const OUT = 'demos/steve-paper-push/data';
mkdirSync(OUT, { recursive: true });

for (const base of FOLDED_BASES) {
  const name = base.tauHat[0] === 0 ? 'square' : 'hexagonal';
  const dt = a.num('--dt', PLAN[name].dt);
  const tmax = a.num('--tmax', PLAN[name].tmax);
  const tau0 = foldTau(base);
  const rows = [];
  let carry;
  let stopped = `reached t=${tmax}`;
  let lastEmbedded = 0;
  let firstOpen = null;

  for (let k = 1; k <= Math.round(tmax / dt); k++) {
    const t = k * dt;
    const r = correctFold(base, t, { free: 'paper', fatten: false, seed: carry });
    const m = r.measurement;
    const dTau = Math.hypot(m.tau[0] - tau0[0], m.tau[1] - tau0[1]);
    const solved = r.converged && m.coneDeficit <= 1e-11 && dTau <= 1e-11;
    if (!solved) { stopped = `the 9x9 correction stopped solving at t=${t.toFixed(4)}`; break; }
    // Warm-start from the last solved rung even when it is NOT embedded — losing
    // embeddedness does not end the curve, it just ends the part of it we can use.
    carry = r.positions;
    if (m.embedded) lastEmbedded = t;
    else if (firstOpen === null) firstOpen = t;
    rows.push([t, 1, m.coneDeficit, dTau, m.embedded ? 1 : 0, m.clearance, ...r.positions].join(','));
  }

  const file = `${OUT}/${name}.csv`;
  writeFileSync(file, rows.join('\n') + '\n');
  const emb = rows.filter((l) => l.split(',')[4] === '1').length;
  console.log(`${name}: ${rows.length} rungs (dt=${dt}) — ${stopped}`);
  console.log(`  embedded on ${emb}/${rows.length} rungs; last embedded t=${lastEmbedded.toFixed(4)}`
    + `, first NOT embedded t=${firstOpen === null ? '(never)' : firstOpen.toFixed(4)}`);
  console.log(`  → ${file}`);
}
