/**
 * tangentProject — orthogonal projection of a vector onto the tangent space of a
 * constraint manifold, the shared primitive that lets `flow` and `march` move
 * ALONG a submanifold (not just onto it).
 *
 * Given the stacked Jacobian J (rows×cols, row-major) of the held constraints at
 * a point, the tangent space is T = ker J. The orthogonal projector onto T is
 *
 *     P_T v = v − Jᵀ (J Jᵀ + λI)⁻¹ J v
 *
 * i.e. subtract the component of v lying in the row space of J (the normal
 * directions). λ is tiny Tikhonov damping so a rank-deficient J (redundant
 * constraints, e.g. flatness's Gauss–Bonnet row) is handled gracefully — exactly
 * the same JJᵀ solve `project` uses for the corrector. Same hub, different use.
 *
 * Works in whatever coordinates J is given in: `flow` passes the chart-pulled-back
 * Jacobian Jx (rows×dimX) and a vector in X. Allocation-light: scratch buffers are
 * sized to the (small) constraint count and reused via the optional `scratch`.
 *
 * Pure: no three.js, no DOM.
 */

import { solveDenseInPlace } from '../math/newton.ts';

export interface TangentScratch {
  jv: Float64Array;   // length rows
  aug: Float64Array;  // rows × (rows+1)
  w: Float64Array;    // length rows
}

export function makeTangentScratch(rows: number): TangentScratch {
  return {
    jv: new Float64Array(rows),
    aug: new Float64Array(rows * (rows + 1)),
    w: new Float64Array(rows),
  };
}

/**
 * Writes `P_T v` into `out` (length cols). `jac` is rows×cols row-major (stride
 * cols). `out` may alias `v`. Returns true on success, false if the normal-
 * equations solve fails (degenerate even after damping).
 */
export function tangentProject(
  jac: ArrayLike<number>,
  rows: number,
  cols: number,
  v: ArrayLike<number>,
  out: Float64Array,
  damping = 1e-12,
  scratch?: TangentScratch,
): boolean {
  const s = scratch ?? makeTangentScratch(rows);
  const { jv, aug, w } = s;
  const stride = rows + 1;

  // Jv (rows) and G = JJᵀ + λI (rows×rows), augmented with Jv as the RHS.
  for (let i = 0; i < rows; i++) {
    const ri = i * cols;
    let dv = 0;
    for (let c = 0; c < cols; c++) dv += jac[ri + c] * v[c];
    jv[i] = dv;
    for (let j = i; j < rows; j++) {
      const rj = j * cols;
      let g = 0;
      for (let c = 0; c < cols; c++) g += jac[ri + c] * jac[rj + c];
      aug[i * stride + j] = g;
      aug[j * stride + i] = g;
    }
    aug[i * stride + i] += damping;
    aug[i * stride + rows] = dv;
  }

  if (!solveDenseInPlace(aug, w, rows)) return false;

  // out = v − Jᵀ w
  for (let c = 0; c < cols; c++) {
    let s2 = 0;
    for (let i = 0; i < rows; i++) s2 += jac[i * cols + c] * w[i];
    out[c] = v[c] - s2;
  }
  return true;
}
