/**
 * Newton solver: project positions onto the flat-torus angle-constraint
 * manifold via minimum-norm Gauss-Newton iteration.
 *
 *   F = R(x)                  k-vector of cone-angle deficits
 *   J = ∂R/∂x                 k × n   (analytic cone-angle gradients by default;
 *                                       central FD available via opts.jacobian)
 *   (J Jᵀ + λI) w = F         k × k   (normal equations; λ tiny, see below)
 *   x ← x − Jᵀ w              minimum-norm step
 *
 * Constraint count: by discrete Gauss–Bonnet every Euclidean face has angle
 * sum π, so Σ_v θ_v ≡ 16π = 2π·8 identically ⟹ Σ_v deficit_v ≡ 0. The 8
 * cone-angle deficits thus satisfy one linear identity and only 7 are
 * independent; the flat locus is a (generically) 17-dim manifold, codimension 7.
 *
 * We solve with exactly k = 7 constraints (drop the last vertex's deficit). The
 * dropped 8th is satisfied for free: once the other 7 deficits vanish, the
 * identity forces the 8th to vanish too. With 7 constraints G = J Jᵀ is a
 * genuinely full-rank 7×7 matrix — well-conditioned (cond ≈ 4 near good points)
 * — so the linear solve is honest, with no structural singularity to mask.
 *
 * Why not all 8? With k = 8, G is exactly rank-7: its null space is the
 * all-ones vector (the Gauss–Bonnet direction), so J Jᵀ is singular and the
 * solve would need damping merely to avoid a zero pivot. That damping is benign
 * — the null component of w is annihilated by Jᵀ, and F ⟂ 1 keeps the system
 * consistent — but it papers over a known-zero eigenvalue instead of removing
 * it. Dropping one constraint removes the singularity outright and yields the
 * identical Newton step. (Verified numerically: the 8×8 G has eigenvalues
 * {≈0, 12.9, …, 49.2}; deleting one row leaves exactly the healthy 7.)
 *
 * Convergence is still measured on the FULL 8-vector deficit (honest flatness),
 * even though only 7 constraints drive the step. λ below is small insurance
 * against genuine ill-conditioning (near-degenerate thin triangles), not a
 * structural necessity. Newton lands on the nearest point of the flat manifold
 * to the starting x.
 *
 * Adapted from point-clouds/src/math/sampleIntersection.ts (newtonCorrectSystem),
 * which uses the same min-norm Gauss-Newton structure over CPⁿ. Dropped to reals.
 *
 * Optionally, `opts.extraConstraints` appends further scalar residuals (each
 * with an FD Jacobian row) so the projection lands on the intersection of the
 * flat manifold with their zero sets — e.g. flat AND Re τ̂ = 0 (rectangular
 * modulus). Convergence is then measured over deficits and extras together.
 *
 * Orthogonally, `opts.frozenCoords` zeroes the named coordinate columns of J
 * before the solve, so the min-norm step never touches them (a hard linear
 * constraint by projection — e.g. z = 0 for planar vertices). Frozen columns
 * are zeroed across the cone rows AND the extra-constraint rows, so the two
 * features compose.
 *
 * Mutates `positions` in place.
 */

import { coneAngleDeficits, coneAngleJacobian } from './angles';
import type { Torus } from '../tori/defineTorus';

export type NewtonStatus = 'converged' | 'diverged' | 'max-iters';

/**
 * The practical machine-precision floor of the flatness residual, measured
 * empirically (500 perturbed seeds, σ = 0.003): tol 1e-14 converges 100% of
 * the time with worst final deficit ≈ 1e-14 and avg ≈ 4e-15, at no extra cost
 * (3.5 vs 3.1 iterations); stricter values hit the floating-point floor of
 * the cone-angle sums and start failing to terminate (1e-15 → 64%). The
 * pipeline runs at the 1e-12 default, which already yields ~1e-13 deficits —
 * this constant records the measured floor for when maximum precision is
 * explicitly wanted (e.g. pass it as `tolerance` for a final polish).
 */
export const MACHINE_FLAT_TOL = 1e-14;

/**
 * An extra scalar constraint appended to the cone-angle residual: the solver
 * drives value(positions) → 0 alongside flatness. Must be smooth in the
 * positions (e.g. Re of a Möbius-FROZEN modulus — see develop.ts
 * reduceModulusWithMatrix). Its Jacobian row is built by central finite
 * differences with opts.fdStep.
 */
export type NewtonConstraint = {
  /** Label for debugging / logging. */
  readonly label?: string;
  value(positions: ArrayLike<number>): number;
};

export type NewtonOptions = {
  /** Stop when ||R||∞ < tolerance. Default 1e-12. */
  tolerance?: number;
  /** Hard iteration cap. Default 50. */
  maxIters?: number;
  /** Tikhonov damping added to G = JJᵀ. With k = 7 constraints G is full-rank
   *  and well-conditioned, so this is small insurance against genuine
   *  ill-conditioning (near-degenerate thin triangles), NOT a structural
   *  necessity. Default 1e-12 — negligible at good points, helps only when G
   *  itself nears singular. */
  damping?: number;
  /** Finite-difference perturbation for ∂R/∂x. Default 1e-7. */
  fdStep?: number;
  /** How to build the Jacobian ∂R/∂x. 'analytic' (default) = exact closed-form
   *  cone-angle gradients in one pass (~20× faster than FD). 'fd' = central
   *  finite differences (the original; kept as a reference / escape hatch).
   *  Both produce the same min-norm step — validated row-by-row in the tests. */
  jacobian?: 'fd' | 'analytic';
  /** Extra scalar constraints appended to the residual (each driven to 0
   *  alongside the cone deficits). The projection then lands on the
   *  intersection of the flat manifold with their zero sets — e.g. the
   *  rectangular-modulus locus. Jacobian rows for these are always built by
   *  central FD. Default none. Forwarded automatically by embeddedFlow via
   *  newtonOpts, so the repulsion flow can run inside the constrained locus. */
  extraConstraints?: readonly NewtonConstraint[];
  /** Coordinate indices to hold fixed throughout the iteration. Those columns
   *  of J are zeroed before forming the normal equations, so the min-norm step
   *  never moves them — each keeps its entry value. Indices are into the flat
   *  positions array (vertex i, coordinate k → index 3i+k). Composes with
   *  extraConstraints (columns zeroed across cone AND extra rows). Useful for
   *  hard linear constraints, e.g. z=0 for planar vertices. Default none. */
  frozenCoords?: readonly number[];
};

export type NewtonResult = {
  status: NewtonStatus;
  iters: number;
  residualNorm: number;
};

export function newtonFlatten(
  torus: Torus,
  positions: Float64Array,
  opts: NewtonOptions = {},
): NewtonResult {
  const N = torus.vertexCount * 3;     // coordinate count
  const KFULL = torus.vertexCount;     // full deficit vector (honest convergence check)
  const KD = torus.vertexCount - 1;    // independent cone constraints (Gauss–Bonnet)
  const extras = opts.extraConstraints ?? [];
  const KE = extras.length;
  const K = KD + KE;                   // total constraints driving the step
  if (positions.length !== N) {
    throw new Error(`newtonFlatten: expected ${N} positions, got ${positions.length}`);
  }

  const tol = opts.tolerance ?? 1e-12;
  const maxIters = opts.maxIters ?? 50;
  const lambda = opts.damping ?? 1e-12;
  const h = opts.fdStep ?? 1e-7;
  const invTwoH = 1 / (2 * h);
  const analytic = opts.jacobian !== 'fd';   // analytic is the default
  const frozen = opts.frozenCoords ?? [];

  // F/Fp/Fm hold the full 8-vector deficit; only the first KD=7 entries feed
  // the solve. coneAngleDeficits writes all 8, so these must be length KFULL.
  const F = new Float64Array(KFULL);
  const Fp = new Float64Array(KFULL);
  const Fm = new Float64Array(KFULL);
  // Extra-constraint residuals (evaluated with the deficits) + FD staging.
  const FX = new Float64Array(KE);
  const FXp = new Float64Array(KE);
  const FXm = new Float64Array(KE);
  // J is sized (KFULL+KE)×N: the analytic builder fills all KFULL cone rows
  // (row KD is computed-but-unused), extra-constraint rows live at KFULL+e.
  // row(i) maps solve-row i to its storage row.
  const J = new Float64Array((KFULL + KE) * N);   // row-major, stride N
  const row = (i: number) => (i < KD ? i : KFULL + (i - KD));
  const aug = new Float64Array(K * (K + 1));      // augmented [G | F], K × (K+1)
  const w = new Float64Array(K);

  // Full residual: all deficits + extras. ‖·‖∞ over everything, so
  // convergence is honest on flatness AND the extra constraints.
  const evalResidual = (): number => {
    coneAngleDeficits(torus, positions, F);
    let m = infNorm(F);
    for (let e = 0; e < KE; e++) {
      FX[e] = extras[e].value(positions);
      const a = Math.abs(FX[e]);
      if (a > m) m = a;
    }
    return m;
  };
  let curNorm = evalResidual();

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

    // ---- Jacobian J[r * N + c] = ∂R_r/∂x_c ----
    if (analytic) {
      coneAngleJacobian(torus, positions, J);    // exact, one pass, fills all rows
    } else {
      // Central finite differences (default).
      for (let c = 0; c < N; c++) {
        const saved = positions[c];
        positions[c] = saved + h;
        coneAngleDeficits(torus, positions, Fp);
        positions[c] = saved - h;
        coneAngleDeficits(torus, positions, Fm);
        positions[c] = saved;
        for (let r = 0; r < KD; r++) {
          J[r * N + c] = (Fp[r] - Fm[r]) * invTwoH;
        }
      }
    }

    // ---- extra-constraint rows: always central FD ----
    if (KE > 0) {
      for (let c = 0; c < N; c++) {
        const saved = positions[c];
        positions[c] = saved + h;
        for (let e = 0; e < KE; e++) FXp[e] = extras[e].value(positions);
        positions[c] = saved - h;
        for (let e = 0; e < KE; e++) FXm[e] = extras[e].value(positions);
        positions[c] = saved;
        for (let e = 0; e < KE; e++) J[(KFULL + e) * N + c] = (FXp[e] - FXm[e]) * invTwoH;
      }
    }

    // ---- Zero frozen columns across every solve row (cone + extra) so those
    //      coordinates receive no step. row(i) maps solve-row → storage row. ----
    for (const c of frozen) {
      for (let i = 0; i < K; i++) J[row(i) * N + c] = 0;
    }

    // ---- aug = [G + λI | F], with G = J Jᵀ (K×K symmetric) ----
    const stride = K + 1;
    for (let i = 0; i < K; i++) {
      const ri = row(i);
      for (let j = i; j < K; j++) {
        const rj = row(j);
        let s = 0;
        for (let c = 0; c < N; c++) s += J[ri * N + c] * J[rj * N + c];
        aug[i * stride + j] = s;
        aug[j * stride + i] = s;
      }
      aug[i * stride + i] += lambda;
      aug[i * stride + K] = i < KD ? F[i] : FX[i - KD];
    }

    // ---- Solve aug → w via Gauss elim with partial pivoting ----
    if (!solveDenseInPlace(aug, w, K)) {
      return { status: 'diverged', iters: iter, residualNorm: curNorm };
    }

    // ---- x ← x − Jᵀ w ----
    for (let c = 0; c < N; c++) {
      let s = 0;
      for (let r = 0; r < K; r++) s += J[row(r) * N + c] * w[r];
      positions[c] -= s;
    }

    curNorm = evalResidual();
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
