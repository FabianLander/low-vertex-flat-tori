/**
 * project — minimum-norm Gauss–Newton projection onto the intersection of
 * submanifolds ⋂{gᵢ = 0}, run directly in the working space ℝⁿ.
 *
 * Problem-agnostic: it takes the working point `x ∈ ℝⁿ` and abstract `Constraint`s
 * (each an `Fn` on ℝⁿ — a condition already PULLED through the configuration space,
 * `constraints/`), NOT a `Triangulation` or a chart. The restriction to a subspace is
 * baked into the pulled `Fn`s (their Jacobians are already in ℝⁿ), so there is no
 * pullback step here. This is the generalization of `newtonFlatten`:
 *   - full space + [flat]                              ≡ newtonFlatten
 *   - pinned space + [flat, collinear, collinear]      ≡ semiSolutionFlatten
 *
 * One step, given the current point x:
 *   F  = stacked residuals gᵢ(x)                       (length K = Σ codim)
 *   J  = stacked Jacobians Dgᵢ(x)                      (K × n, in ℝⁿ)
 *   (J Jᵀ + λI) w = F                                  (K × K normal equations)
 *   x ← x − Jᵀ w                                       (min-norm step in ℝⁿ)
 *
 * The min-norm step is taken in the working space's Euclidean metric (`g = I`). The
 * canonical, reparameterization-invariant choice is the pullback metric `DφᵀDφ` —
 * deferred; it coincides with `I` for every current restriction. See
 * docs/math/configuration-space.md.
 *
 * One solver covers both rank regimes, because rank is the CONSTRAINT's business:
 * `flat` drops the Gauss–Bonnet driving row (→ full-rank G); the damping λ carries any
 * remaining rank deficiency harmlessly (a consistent residual is ⊥ the null space).
 *
 * Mutates `x` in place. Pure: no three.js, no DOM.
 */

import { solveDenseInPlace } from './linalg.ts';
import { normHeld, residualOf, totalDrive } from './held.ts';
import type { Constraint } from '../constraints/types.ts';

export type ProjectStatus = 'converged' | 'diverged' | 'max-iters';

export interface ProjectOptions {
  /** Stop when the convergence residual < tolerance. Default 1e-12. */
  tolerance?: number;
  /** Hard iteration cap. Default 50. */
  maxIters?: number;
  /** Tikhonov damping added to the K×K normal matrix. Default 1e-12. */
  damping?: number;
}

export interface ProjectResult {
  status: ProjectStatus;
  iters: number;
  residualNorm: number;
}

export function project(
  x: Float64Array,
  constraints: readonly Constraint[],
  opts: ProjectOptions = {},
): ProjectResult {
  const d = x.length;

  const tol = opts.tolerance ?? 1e-12;
  const maxIters = opts.maxIters ?? 50;
  const lambda = opts.damping ?? 1e-12;

  const hs = constraints.map((cm) => normHeld(cm, d));
  const K = totalDrive(hs);               // Σ driven rows

  const F = new Float64Array(K);          // stacked driving residuals
  const J = new Float64Array(K * d);      // stacked driving Jacobians in ℝⁿ (stride d)
  const aug = new Float64Array(K * (K + 1)); // [G + λI | F]
  const w = new Float64Array(K);

  // Residual at the current x: evaluate every constraint's FULL value (into its
  // scratch), then copy its DRIVING rows into F. Convergence is the max over each
  // constraint's honest measure — a custom `measure` if given (none needed for
  // `flat`: ‖value‖∞ over all V deficits already IS the full residual).
  const evalResidual = (): number => {
    let off = 0;
    let m = 0;
    for (const h of hs) {
      const r = residualOf(h, x);          // fills h.valueBuf (all fn.dim rows)
      if (r > m) m = r;
      for (let i = 0; i < h.drive; i++) F[off + i] = h.valueBuf[i];
      off += h.drive;
    }
    return m;
  };

  let curNorm = evalResidual();

  for (let iter = 0; iter <= maxIters; iter++) {
    if (curNorm < tol) return { status: 'converged', iters: iter, residualNorm: curNorm };
    if (!isFinite(curNorm) || curNorm > 1e8) return { status: 'diverged', iters: iter, residualNorm: curNorm };
    if (iter === maxIters) return { status: 'max-iters', iters: iter, residualNorm: curNorm };

    // Driving Jacobians in ℝⁿ (x is current from the last evalResidual).
    let off = 0;
    for (const h of hs) {
      h.fn.jacobian(x, h.jacBuf);                                   // full fn.dim × d
      J.set(h.jacBuf.subarray(0, h.drive * d), off * d);           // first `drive` rows
      off += h.drive;
    }

    // aug = [G + λI | F], G = J Jᵀ (K×K symmetric).
    const stride = K + 1;
    for (let i = 0; i < K; i++) {
      const ri = i * d;
      for (let j = i; j < K; j++) {
        const rj = j * d;
        let s = 0;
        for (let col = 0; col < d; col++) s += J[ri + col] * J[rj + col];
        aug[i * stride + j] = s;
        aug[j * stride + i] = s;
      }
      aug[i * stride + i] += lambda;
      aug[i * stride + K] = F[i];
    }

    if (!solveDenseInPlace(aug, w, K)) return { status: 'diverged', iters: iter, residualNorm: curNorm };

    // x ← x − Jᵀ w  (min-norm step).
    for (let col = 0; col < d; col++) {
      let s = 0;
      for (let i = 0; i < K; i++) s += J[i * d + col] * w[i];
      x[col] -= s;
    }

    curNorm = evalResidual();
  }

  return { status: 'max-iters', iters: maxIters, residualNorm: curNorm };
}
