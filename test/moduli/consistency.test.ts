/**
 * τ two ways must agree: `modulus().tau` (computed DIRECTLY from the developing frames —
 * holonomy = Σ R_t·c^t, no positions) vs `tauFromNet(developNet(...))` (read off the
 * developed IMAGE — Σ P_b−P_a over the placed corners). They are the same holonomy by
 * different routes, so they agree to machine precision — across flat AND non-flat configs.
 * This documents that "τ can also be read off the developed image" and guards the direct
 * path against drift from the developing map.
 */

import { describe, it, expect } from 'vitest';
import { developNet, tauFromNet } from '@core/moduli/develop';
import { modulus } from '@core/moduli/modulus';
import { project } from '@core/solvers/project.ts';
import { flat, maxConeDeficit } from '@core/constraints/flat.ts';
import { ALL_TORI, RICH } from '@core/triangulations';
import { RICH_REFERENCE } from '@core/sampling/reference';
import { mulberry32 } from '@core/sampling/rng';
import type { Triangulation } from '@core/topology/triangulation.ts';

/** Max |Δ| between the direct (frames) τ and the image (developed positions) τ. */
function diff(triang: Triangulation, p: ArrayLike<number>): number {
  const direct = modulus(triang, p).tau;
  const image = tauFromNet(triang, developNet(triang, p));
  return Math.max(Math.abs(direct[0] - image[0]), Math.abs(direct[1] - image[1]));
}

describe('modulus: direct (frames) == read off the developed image', () => {
  it('RICH reference (flat embedded)', () => {
    expect(diff(RICH, RICH_REFERENCE.positions)).toBeLessThan(1e-12);
  });

  it('all 7 types, projected onto the flat manifold', () => {
    for (const torus of ALL_TORI) {
      const N = torus.vertexCount * 3;
      const rng = mulberry32(8000 + ALL_TORI.indexOf(torus));
      let p: Float64Array | null = null;
      for (let a = 0; a < 16 && !p; a++) {
        const x = new Float64Array(N);
        for (let i = 0; i < N; i++) x[i] = rng() * 2 - 1;
        const r = project(x, [flat(torus)], { tolerance: 1e-12, maxIters: 100 });
        if (r.status === 'converged' && maxConeDeficit(torus, x) < 1e-7 && modulus(torus, x).area > 1e-2) p = x;
      }
      expect(p, `#${torus.id}`).not.toBeNull();
      expect(diff(torus, p!), `#${torus.id}`).toBeLessThan(1e-12);
    }
  });

  it('random NON-flat configs (the two routes agree off the flat locus too)', () => {
    const rng = mulberry32(123);
    let checked = 0;
    for (let trial = 0; trial < 40; trial++) {
      const torus = ALL_TORI[trial % ALL_TORI.length];
      const N = torus.vertexCount * 3;
      const x = new Float64Array(N);
      for (let i = 0; i < N; i++) x[i] = rng() * 2 - 1;
      if (modulus(torus, x).area < 1e-2) continue;
      expect(diff(torus, x)).toBeLessThan(1e-10);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });
});
