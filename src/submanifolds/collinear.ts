/**
 * collinear — the submanifold where a vertex triple is collinear in the XY-plane
 * (planar signed area = 0), as a `ConstraintMap`. Used by the Doyle–Schwartz
 * semi-solution search (the two planar triples {1,2,3} and {4,5,6}).
 *
 * The signed-area map is a smooth function on configuration space; it will move
 * into `functions/` during the refactor. Kept local for now.
 *
 * Pure: no three.js, no DOM.
 */

import type { ConstraintMap } from '../solvers/types.ts';

/** Twice the signed area of (Pi, Pj, Pk) in the XY-plane; zero iff collinear. */
function signedArea2(p: ArrayLike<number>, i: number, j: number, k: number): number {
  const oi = 3 * i, oj = 3 * j, ok = 3 * k;
  return (p[oj] - p[oi]) * (p[ok + 1] - p[oi + 1])
       - (p[oj + 1] - p[oi + 1]) * (p[ok] - p[oi]);
}

/**
 * Collinearity of the vertex triple (i, j, k): the planar signed area = 0.
 * codim = 1; the Jacobian is built by central finite differences (step `h`) over
 * the full ambient config — matching how `newtonFlatten` differentiates its extra
 * constraints, so a re-expressed semi-solution search reproduces it exactly.
 */
export function collinear(i: number, j: number, k: number, h = 1e-7): ConstraintMap {
  let scratch: Float64Array | null = null;
  return {
    label: `collinear-${i}${j}${k}`,
    codim: 1,
    value(c, out) {
      out[0] = signedArea2(c, i, j, k);
    },
    jacobian(c, out) {
      const n = c.length;
      if (!scratch || scratch.length !== n) scratch = new Float64Array(n);
      const s = scratch;
      s.set(c);
      const inv2h = 1 / (2 * h);
      for (let col = 0; col < n; col++) {
        const saved = s[col];
        s[col] = saved + h;
        const vp = signedArea2(s, i, j, k);
        s[col] = saved - h;
        const vm = signedArea2(s, i, j, k);
        s[col] = saved;
        out[col] = (vp - vm) * inv2h;
      }
    },
  };
}
