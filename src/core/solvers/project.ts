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
 * One step, given the current point x: stack the residuals `F = gᵢ(x) − targetᵢ` and
 * Jacobians `J = Dgᵢ(x)` (K×n in ℝⁿ; the constant target drops out of the derivative),
 * solve `J·step = F` (min-norm) via the QR of `Jᵀ` (`qr.ts`), and set `x ← x − step`. The QR
 * conditions at κ(J), not the κ(J)² of the old normal equations — see docs/solvers-overhaul.md.
 *
 * The min-norm step is taken in the working space's Euclidean metric (`g = I`). The
 * canonical, reparameterization-invariant choice is the pullback metric `DφᵀDφ` — deferred;
 * it coincides with `I` for every current restriction. See configuration/README.md.
 *
 * Constraints carry no rank annotation: one that is rank-deficient by construction states it
 * at the source (`flat` emits its V−1 independent rows), and any residual rank deficiency is
 * carried harmlessly by the QR (a collapsed column drops out of the min-norm step).
 *
 * Mutates `x` in place. Pure: no three.js, no DOM.
 */

import { makeQR, qrFactor, minNormSolve, infNorm } from './qr.ts';
import type { Constraint } from '@core/constraints/types.ts';

export type ProjectStatus = 'converged' | 'diverged' | 'max-iters';

export interface ProjectOptions {
  /** Stop when the convergence residual < tolerance. Default 1e-12. */
  tolerance?: number;
  /** Hard iteration cap. Default 50. */
  maxIters?: number;
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

  const K = constraints.reduce((s, c) => s + c.fn.outDim, 0);   // Σ rows (every row driven)

  const F = new Float64Array(K);          // stacked residuals
  const J = new Float64Array(K * d);      // stacked Jacobians in ℝⁿ (stride d)
  const qr = makeQR(K, d);                // QR of Jᵀ, refactored each iteration
  const step = new Float64Array(d);       // the min-norm Gauss–Newton step

  // Residual at the current x: each constraint writes `fn(x) − target` into F (target
  // absent ⟺ 0); convergence is ‖F‖∞ over every row of every constraint.
  const evalResidual = (): number => {
    let off = 0;
    for (const c of constraints) {
      const k = c.fn.outDim;
      c.fn.value(x, F.subarray(off, off + k));
      if (c.target) for (let i = 0; i < k; i++) F[off + i] -= c.target[i];
      off += k;
    }
    return infNorm(F);
  };

  let curNorm = evalResidual();

  for (let iter = 0; iter <= maxIters; iter++) {
    if (curNorm < tol) return { status: 'converged', iters: iter, residualNorm: curNorm };
    if (!isFinite(curNorm) || curNorm > 1e8) return { status: 'diverged', iters: iter, residualNorm: curNorm };
    if (iter === maxIters) return { status: 'max-iters', iters: iter, residualNorm: curNorm };

    // Stack each constraint's Jacobian (all rows) into J at the current x.
    let off = 0;
    for (const c of constraints) { c.fn.jacobian(x, J.subarray(off * d, (off + c.fn.outDim) * d)); off += c.fn.outDim; }

    // Min-norm Gauss–Newton step via QR of Jᵀ: solve J·step = F (min-norm), x ← x − step.
    // A rank-deficient J (a collapsed column) is carried harmlessly — `minNormSolve` drops that
    // direction (its y-component → 0), giving the min-norm step in the available rank, exactly as
    // the old damped solve did. Genuine blow-up is caught by the residual check above.
    qrFactor(qr, J, K, d);
    minNormSolve(qr, F, step);
    for (let col = 0; col < d; col++) x[col] -= step[col];

    curNorm = evalResidual();
  }

  return { status: 'max-iters', iters: maxIters, residualNorm: curNorm };
}
