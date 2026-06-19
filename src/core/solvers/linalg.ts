/**
 * Small dense linear-algebra kernels the steppers need — the J-hub's normal-
 * equation solve and the ‖·‖∞ residual. Pulled out of `math/newton.ts` so the
 * solver core depends on nothing in `math/`.
 *
 * Pure: no three.js, no DOM.
 */

/** ‖v‖∞ — the largest absolute component. */
export function infNorm(v: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < v.length; i++) {
    const a = Math.abs(v[i]);
    if (a > m) m = a;
  }
  return m;
}

/**
 * Solve a k×k linear system in place by Gauss elimination with partial pivoting.
 * `aug` is row-major, k rows × (k+1) cols (last column = RHS). Writes the
 * solution into `out`. Returns false if a pivot is unrecoverably small.
 */
export function solveDenseInPlace(aug: Float64Array, out: Float64Array, k: number): boolean {
  const stride = k + 1;
  for (let col = 0; col < k; col++) {
    let best = col;
    let bestAbs = Math.abs(aug[col * stride + col]);
    for (let row = col + 1; row < k; row++) {
      const a = Math.abs(aug[row * stride + col]);
      if (a > bestAbs) { best = row; bestAbs = a; }
    }
    if (bestAbs < 1e-30) return false;
    if (best !== col) {
      for (let j = 0; j < stride; j++) {
        const tmp = aug[col * stride + j];
        aug[col * stride + j] = aug[best * stride + j];
        aug[best * stride + j] = tmp;
      }
    }
    const piv = aug[col * stride + col];
    for (let row = col + 1; row < k; row++) {
      const factor = aug[row * stride + col] / piv;
      for (let j = col; j < stride; j++) {
        aug[row * stride + j] -= factor * aug[col * stride + j];
      }
    }
  }
  for (let i = k - 1; i >= 0; i--) {
    let s = aug[i * stride + k];
    for (let j = i + 1; j < k; j++) s -= aug[i * stride + j] * out[j];
    out[i] = s / aug[i * stride + i];
  }
  return true;
}
