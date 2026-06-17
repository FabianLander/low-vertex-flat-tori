/**
 * collinear — the submanifold where a vertex triple is collinear in the XY-plane
 * (planar signed area = 0), as an `Fn` (dim 1). Used by the Doyle–Schwartz
 * semi-solution search (the two planar triples {1,2,3} and {4,5,6}).
 *
 * The signed-area map has a closed-form gradient, but it is cheap and we keep it
 * finite-differenced via `fdFn` for now — the value is the whole content; the
 * `functions/` layer owns the differentiation.
 *
 * Pure: no three.js, no DOM.
 */

import { fdFn } from '../functions/compose.ts';
import type { Fn } from '../functions/types.ts';

/** Twice the signed area of (Pi, Pj, Pk) in the XY-plane; zero iff collinear. */
function signedArea2(p: ArrayLike<number>, i: number, j: number, k: number): number {
  const oi = 3 * i, oj = 3 * j, ok = 3 * k;
  return (p[oj] - p[oi]) * (p[ok + 1] - p[oi + 1])
       - (p[oj + 1] - p[oi + 1]) * (p[ok] - p[oi]);
}

/** Collinearity of the vertex triple (i, j, k): the planar signed area = 0. codim 1. */
export function collinear(i: number, j: number, k: number): Fn {
  return fdFn(`collinear-${i}${j}${k}`, 1, (c, out) => {
    out[0] = signedArea2(c, i, j, k);
  });
}
