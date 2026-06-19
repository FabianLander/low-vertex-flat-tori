/**
 * collinear — the condition that a vertex triple lies on a line in the XY-plane:
 * the signed-area *measurement* and the *constraint* that drives it to zero.
 *
 * The signed area 2·area(Pi,Pj,Pk) = (Pj−Pi) × (Pk−Pi) (the z-component of the
 * planar cross product) vanishes iff the three are collinear. It's bilinear in the
 * coordinates, so its gradient is closed-form — no finite differences. Used by the
 * Doyle–Schwartz semi-solution search (the two planar triples {1,2,3}, {4,5,6}).
 *
 * Pure: no three.js, no DOM.
 */

import type { Fn } from '@core/functions/types.ts';
import { signedArea2 as triSignedArea2 } from '@core/geometry/triangle.ts';

/** Twice the signed area of (Pi, Pj, Pk) in the XY-plane; zero iff collinear. */
export function signedArea2(p: ArrayLike<number>, i: number, j: number, k: number): number {
  const oi = 3 * i, oj = 3 * j, ok = 3 * k;
  return triSignedArea2(p[oi], p[oi + 1], p[oj], p[oj + 1], p[ok], p[ok + 1]);
}

/**
 * Collinearity of the vertex triple (i, j, k): planar signed area = 0. codim 1, analytic.
 * `n` is the configuration length (= 3·V) the map reads — its `inDim`; the map is sparse,
 * touching only the three vertices' x,y slots.
 */
export function collinear(i: number, j: number, k: number, n: number): Fn {
  const oi = 3 * i, oj = 3 * j, ok = 3 * k;
  return {
    label: `collinear-${i}${j}${k}`,
    inDim: n,
    outDim: 1,
    value: (c, out) => { out[0] = signedArea2(c, i, j, k); },
    jacobian: (c, out) => {
      out.fill(0);
      const xi = c[oi], yi = c[oi + 1];
      const xj = c[oj], yj = c[oj + 1];
      const xk = c[ok], yk = c[ok + 1];
      // ∂A/∂Pi, ∂A/∂Pj, ∂A/∂Pk for A = (Pj−Pi)×(Pk−Pi); z-partials are 0.
      out[oi] = yj - yk; out[oi + 1] = xk - xj;
      out[oj] = yk - yi; out[oj + 1] = xi - xk;
      out[ok] = yi - yj; out[ok + 1] = xj - xi;
    },
  };
}
