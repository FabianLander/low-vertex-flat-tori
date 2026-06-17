/**
 * flat — the flatness submanifold {all cone-angle deficits = 0}, as a
 * `ConstraintMap` (the closed-condition contract from `solvers/types.ts`).
 *
 * It closes over the torus and reads the cone-angle machinery from `math/angles`
 * (which will move into `functions/` during the refactor). The solver that drives
 * it never sees the torus.
 *
 * Pure: no three.js, no DOM.
 */

import { coneAngleDeficits, coneAngleJacobian, maxConeDeficit } from '../math/angles.ts';
import type { Triangulation } from '../topology/triangulation.ts';
import type { ConstraintMap } from '../solvers/types.ts';

/**
 * Flatness: every cone-angle deficit = 0. **codim = V−1, the true codimension.**
 *
 * Gauss–Bonnet forces Σ deficits ≡ 0, so the flat locus is codim V−1, not V: the
 * V-th deficit is `−(sum of the others)` and carries no independent information.
 * We drop it — driving the first V−1 deficits (and their analytic Jacobian rows).
 * This makes `project`'s normal matrix full-rank and well-conditioned (vs the
 * rank-deficient, cond≈1e13 system that keeping all V rows would force), and it
 * reproduces `newtonFlatten` exactly (which drops the same row). Crucially the
 * drop is only of a DRIVING row — convergence still measures all V deficits (see
 * `residual`), else the dropped one can lag above tol while the V−1 driven ones
 * are below it (an under-convergence the slice's hard seed actually exposed).
 */
export function flat(torus: Triangulation): ConstraintMap {
  const V = torus.vertexCount;
  const k = V - 1;
  let deficits: Float64Array | null = null;
  let jac: Float64Array | null = null;
  return {
    label: 'flat',
    codim: k,
    value(c, out) {
      if (!deficits) deficits = new Float64Array(V);
      coneAngleDeficits(torus, c, deficits);
      for (let i = 0; i < k; i++) out[i] = deficits[i];   // drive the first V−1 rows
    },
    jacobian(c, out) {
      const n = c.length;
      if (!jac || jac.length !== V * n) jac = new Float64Array(V * n);
      coneAngleJacobian(torus, c, jac);
      out.set(jac.subarray(0, k * n));                     // first V−1 rows
    },
    residual(c) {
      return maxConeDeficit(torus, c);                     // measure ALL V deficits
    },
  };
}
