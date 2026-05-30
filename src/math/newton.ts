/**
 * Newton solver: project positions onto the flat-torus angle-constraint
 * manifold via minimum-norm Gauss-Newton iteration.
 *
 *   F = R(x)                  k-vector of cone-angle deficits
 *   J = ∂R/∂x                 k × n   (central finite differences)
 *   (J Jᵀ + λI) w = F         k × k   (Tikhonov-damped normal equations)
 *   x ← x − Jᵀ w              minimum-norm step
 *
 * Under-determined: k = 8 constraints in n = 24 positions, so the solution
 * set is (generically) a 16-dim manifold of flat tori. Newton lands on the
 * nearest point on that manifold to the starting x.
 *
 * Adapted from point-clouds/src/math/sampleIntersection.ts (newtonCorrectSystem),
 * which uses the same min-norm Gauss-Newton structure over CPⁿ. Dropped to reals.
 *
 * Mutates `positions` in place.
 */

import { coneAngleDeficits } from './angles';
import { VERTEX_COUNT } from './topology';

const N = VERTEX_COUNT * 3;   // 24
const K = VERTEX_COUNT;        // 8

export type NewtonStatus = 'converged' | 'diverged' | 'max-iters';

export type NewtonOptions = {
  /** Stop when ||R||∞ < tolerance. Default 1e-12. */
  tolerance?: number;
  /** Hard iteration cap. Default 50. */
  maxIters?: number;
  /** Tikhonov damping added to G = JJᵀ to handle near-singular Jacobians.
   *  Default 1e-10 (numerical safety net; small enough not to bias good cases). */
  damping?: number;
  /** Finite-difference perturbation for ∂R/∂x. Default 1e-7. */
  fdStep?: number;
};

export type NewtonResult = {
  status: NewtonStatus;
  iters: number;
  residualNorm: number;
};

export function newtonFlatten(
  positions: Float64Array,
  opts: NewtonOptions = {},
): NewtonResult {
  if (positions.length !== N) {
    throw new Error(`newtonFlatten: expected ${N} positions, got ${positions.length}`);
  }

  const tol = opts.tolerance ?? 1e-12;
  const maxIters = opts.maxIters ?? 50;
  const lambda = opts.damping ?? 1e-10;
  const h = opts.fdStep ?? 1e-7;
  const invTwoH = 1 / (2 * h);

  const F = new Float64Array(K);
  const Fp = new Float64Array(K);
  const Fm = new Float64Array(K);
  const J = new Float64Array(K * N);              // row-major, row = constraint
  const aug = new Float64Array(K * (K + 1));      // augmented [G | F]
  const w = new Float64Array(K);

  coneAngleDeficits(positions, F);
  let curNorm = infNorm(F);

  for (let iter = 0; iter <= maxIters; iter++) {
    if (curNorm < tol) {
      return { status: 'converged', iters: iter, residualNorm: curNorm };
    }
    if (!isFinite(curNorm) || curNorm > 1e8) {
      return { status: 'diverged', iters: iter, residualNorm: curNorm };
    }
    if (iter === maxIters) {
      return { status: 'max-iters', iters: iter, residualNorm: curNorm };
    }

    // ---- Central-difference Jacobian: J[r * N + c] = ∂R_r/∂x_c ----
    for (let c = 0; c < N; c++) {
      const saved = positions[c];
      positions[c] = saved + h;
      coneAngleDeficits(positions, Fp);
      positions[c] = saved - h;
      coneAngleDeficits(positions, Fm);
      positions[c] = saved;
      for (let r = 0; r < K; r++) {
        J[r * N + c] = (Fp[r] - Fm[r]) * invTwoH;
      }
    }

    // ---- aug = [G + λI | F], with G = J Jᵀ (K×K symmetric) ----
    const stride = K + 1;
    for (let i = 0; i < K; i++) {
      for (let j = i; j < K; j++) {
        let s = 0;
        for (let c = 0; c < N; c++) s += J[i * N + c] * J[j * N + c];
        aug[i * stride + j] = s;
        aug[j * stride + i] = s;
      }
      aug[i * stride + i] += lambda;
      aug[i * stride + K] = F[i];
    }

    // ---- Solve aug → w via Gauss elim with partial pivoting ----
    if (!solveDenseInPlace(aug, w, K)) {
      return { status: 'diverged', iters: iter, residualNorm: curNorm };
    }

    // ---- x ← x − Jᵀ w ----
    for (let c = 0; c < N; c++) {
      let s = 0;
      for (let r = 0; r < K; r++) s += J[r * N + c] * w[r];
      positions[c] -= s;
    }

    coneAngleDeficits(positions, F);
    curNorm = infNorm(F);
  }

  return { status: 'max-iters', iters: maxIters, residualNorm: curNorm };
}

function infNorm(v: ArrayLike<number>): number {
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
function solveDenseInPlace(aug: Float64Array, out: Float64Array, k: number): boolean {
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
