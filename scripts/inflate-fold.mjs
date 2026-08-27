/**
 * Precompute the inflation ladders for the steve-folded-tori demo.
 *
 *   npm run inflate-fold -- [--dt 0.01] [--tmax 1.6] [--iters 200]
 *
 * Marches each of Lander's folded bases up in the push-off height t, snapping every step back
 * onto {flat} ∩ {τ = τ₀} and fattening along the fiber (gated), warm-starting each step from
 * the last. That march is the only way the family gets far — cold-solving at a given t
 * converges but lands OUTSIDE the embedded region, and the fatten is gated so it cannot
 * recover. It is also far too slow for a live slider (~0.5–2 s per step), which is why the
 * demo scrubs this precomputed ladder instead of solving in the browser.
 *
 * Writes one CSV per base to demos/steve-folded-tori/data/<name>.csv, one row per rung:
 *   t, coneDeficit, clearance, tauRe, tauIm, x0,y0,z0, …, x7,y7,z7
 * Every rung in the file is verified flat AND at the target modulus AND embedded; the march
 * stops at the first rung that is not, so the file's last row is the furthest reached.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { FOLDED_BASES } from '@core/sampling/foldedBases.ts';
import { correctFold, foldTau } from '@core/search/correct-fold.ts';

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : def;
};
const DT = opt('dt', 0.01);
const TMAX = opt('tmax', 1.6);
const ITERS = opt('iters', 200);

const OUT = 'demos/steve-folded-tori/data';
mkdirSync(OUT, { recursive: true });

for (const base of FOLDED_BASES) {
  const name = base.tauHat[0] === 0 ? 'square' : 'hexagonal';
  const tau0 = foldTau(base);
  const rows = [];
  let carry;
  let stopped = 'reached tmax';

  for (let k = 1; k <= Math.round(TMAX / DT); k++) {
    const t = k * DT;
    const r = correctFold(base, t, { free: 'planar', fatten: true, fattenIters: ITERS, seed: carry });
    const m = r.measurement;
    const dTau = Math.hypot(m.tau[0] - tau0[0], m.tau[1] - tau0[1]);
    if (!r.converged || m.coneDeficit > 1e-11 || dTau > 1e-11 || !m.embedded) {
      stopped = `stopped at t=${t.toFixed(3)} (conv=${r.converged}, def=${m.coneDeficit.toExponential(1)}, |Δτ|=${dTau.toExponential(1)}, emb=${m.embedded})`;
      break;
    }
    carry = r.positions;
    rows.push([t, m.coneDeficit, m.clearance, m.tau[0], m.tau[1], ...r.positions].join(','));
    if (k % 20 === 0) console.log(`  ${name} t=${t.toFixed(2)} clearance=${m.clearance.toExponential(2)}`);
  }

  const file = `${OUT}/${name}.csv`;
  writeFileSync(file, rows.join('\n') + '\n');
  console.log(`${name}: ${rows.length} rungs to t=${(rows.length * DT).toFixed(2)} — ${stopped}`);
  console.log(`  → ${file}`);
}
