/**
 * Symmetry chart: realizes EXACTLY symmetric configs (P_partner = ρ·P_rep) in
 * half the dimension, and `project` in it lands a flat torus that is symmetric by
 * construction. Rich's reference embedding is ρ-symmetric, so it round-trips.
 */

import { describe, it, expect } from 'vitest';
import { symmetry, RICH_SYMMETRY } from './symmetry.ts';
import { project } from '../solvers/project.ts';
import { flat } from '../submanifolds/flat.ts';
import { maxConeDeficit } from '../functions/coneDeficit.ts';
import { byId } from '../triangulations/index.ts';
import { RICH_REFERENCE } from '../math/reference.ts';
import { mulberry32 } from '../math/perturb.ts';

const torus = byId(7);
const { reflection: refl, pairing } = RICH_SYMMETRY;

/** Max |P_b − ρ·P_a| over the pairing — 0 ⟺ exactly ρ-symmetric. */
function asymmetry(c: ArrayLike<number>): number {
  let m = 0;
  for (const [a, b] of pairing) {
    for (let k = 0; k < 3; k++) {
      m = Math.max(m, Math.abs(c[3 * b + k] - refl[k] * c[3 * a + k]));
    }
  }
  return m;
}

describe('symmetry chart', () => {
  it('halves the dimension (8-vertex, 4 pairs → ℝ¹²)', () => {
    expect(symmetry(24, pairing, refl).dim).toBe(12);
  });

  it('realize produces an EXACTLY symmetric config for any x', () => {
    const chart = symmetry(24, pairing, refl);
    const rng = mulberry32(3);
    const x = new Float64Array(chart.dim);
    for (let i = 0; i < x.length; i++) x[i] = rng() - 0.5;
    const c = new Float64Array(24);
    chart.realize(x, c);
    expect(asymmetry(c)).toBe(0); // by construction, to the bit
  });

  it('lift then realize is the symmetric projection; Rich (already symmetric) round-trips', () => {
    const chart = symmetry(24, pairing, refl);
    const rich = RICH_REFERENCE.positions;
    expect(asymmetry(rich)).toBeLessThan(1e-12); // Rich is ρ-symmetric

    const x = new Float64Array(chart.dim);
    chart.lift(rich, x);
    const back = new Float64Array(24);
    chart.realize(x, back);
    let d = 0;
    for (let i = 0; i < 24; i++) d = Math.max(d, Math.abs(back[i] - rich[i]));
    expect(d).toBeLessThan(1e-12); // round-trips an already-symmetric config
  });

  it('project([flat]) in the symmetry chart lands a flat torus, symmetric by construction', () => {
    const chart = symmetry(24, pairing, refl);
    // Seed: a symmetric perturbation of Rich (lift a noisy Rich into the 12-dim chart).
    const rng = mulberry32(11);
    const noisy = RICH_REFERENCE.positions.slice();
    for (let i = 0; i < 24; i++) noisy[i] += 0.03 * (rng() - 0.5);
    const x = new Float64Array(chart.dim);
    chart.lift(noisy, x);

    const r = project(chart, x, [flat(torus)]);
    expect(r.status).toBe('converged');

    const c = new Float64Array(24);
    chart.realize(x, c);
    expect(maxConeDeficit(torus, c)).toBeLessThan(1e-9); // flat
    expect(asymmetry(c)).toBe(0);                        // exactly symmetric, by construction
  });
});
