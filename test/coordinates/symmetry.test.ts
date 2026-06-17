/**
 * Symmetry configuration space: realizes EXACTLY symmetric configs (P_partner =
 * ρ·P_rep) in half the dimension, and `project` IN it (over pulled constraints)
 * lands a flat torus that is symmetric by construction. Rich's reference embedding
 * is ρ-symmetric, so it round-trips. (push/coords/metric basics are covered in
 * space.test.ts; this file is the restricted-space *solve*.)
 */

import { describe, it, expect } from 'vitest';
import { symmetry, RICH_SYMMETRY } from '../../src/coordinates/symmetry.ts';
import { pullHeld } from '../../src/search/pull.ts';
import { project } from '../../src/solvers/project.ts';
import { flat, maxConeDeficit } from '../../src/conditions/flat.ts';
import { byId } from '../../src/triangulations/index.ts';
import { RICH_REFERENCE } from '../../src/sampling/reference.ts';
import { mulberry32 } from '../../src/sampling/rng.ts';

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

describe('symmetry configuration space', () => {
  it('lift then push is the symmetric projection; Rich (already symmetric) round-trips', () => {
    const space = symmetry(torus, pairing, refl);
    const rich = RICH_REFERENCE.positions;
    expect(asymmetry(rich)).toBeLessThan(1e-12); // Rich is ρ-symmetric

    const x = new Float64Array(space.dim);
    space.coords(rich, x);
    const back = new Float64Array(24);
    space.push(x, back);
    let d = 0;
    for (let i = 0; i < 24; i++) d = Math.max(d, Math.abs(back[i] - rich[i]));
    expect(d).toBeLessThan(1e-12); // round-trips an already-symmetric config
  });

  it('project([flat]) in the symmetry space lands a flat torus, symmetric by construction', () => {
    const space = symmetry(torus, pairing, refl);
    const held = pullHeld(space, [flat(torus)]);

    // Seed: a symmetric perturbation of Rich (lift a noisy Rich into the 12-dim space).
    const rng = mulberry32(11);
    const noisy = RICH_REFERENCE.positions.slice();
    for (let i = 0; i < 24; i++) noisy[i] += 0.03 * (rng() - 0.5);
    const x = new Float64Array(space.dim);
    space.coords(noisy, x);

    const r = project(x, held);
    expect(r.status).toBe('converged');

    const c = new Float64Array(24);
    space.push(x, c);
    expect(maxConeDeficit(torus, c)).toBeLessThan(1e-9); // flat
    expect(asymmetry(c)).toBe(0);                        // exactly symmetric, by construction
  });
});
