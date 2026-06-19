/**
 * minimize — Riemannian gradient descent of an energy ALONG a constraint manifold M,
 * optionally staying inside an open `Region` Ω. Run directly in the working space ℝⁿ: the
 * held constraints and the energy are `Fn`s on ℝⁿ (already pulled through the configuration
 * space), and the feasible set is a `Region` on ℝⁿ.
 *
 * Per step, at the current point x on M:
 *   g    = ∇E(x)                              energy gradient (in ℝⁿ)
 *   g_T  = P_T g                              tangent-projected via the held Jacobian (ker J)
 *   x   -= α · g_T                            step ALONG M (not the ambient gradient)
 *   project(x, held)                          retract back onto M (2nd-order drift)
 *
 * The tangent projection is what makes this the *honest* gradient flow on M; the retraction
 * cleans up the O(α²) curvature drift. Convergence is the Riemannian criterion ‖g_T‖₂ → 0 (a
 * constrained critical point) or E < tol.
 *
 * With a `region`, each step is a backtracking line search: accept the largest α whose
 * retracted point stays in Ω (`region.contains`) AND strictly lowers E; if none, halt
 * `'blocked'`.
 *
 * Mutates `x` in place. Pure: no three.js, no DOM. Built on the same QR kernel as `project`
 * (the tangent projection shares the QR of Jᵀ).
 */

import { project, type ProjectOptions } from './project.ts';
import { makeQR, tangentProject } from './qr.ts';
import type { Constraint } from '@core/constraints/types.ts';
import type { Region } from '@core/embedding/index.ts';
import type { ScalarFn } from '@core/functions/types.ts';

export type MinimizeStatus = 'converged' | 'stalled' | 'max-iters' | 'diverged' | 'blocked';

export interface MinimizeOptions {
  /** Tangent step length. Default 0.005. */
  stepSize?: number;
  /** Stop when E < energyTol. Default 1e-10. */
  energyTol?: number;
  /** Stop when the TANGENT gradient ‖g_T‖₂ < gradientTol (constrained critical point). Default 1e-8. */
  gradientTol?: number;
  /** Outer iteration cap. Default 500. */
  maxIters?: number;
  /** Backtracking attempts per step when `region` is set. Default 24. */
  maxBacktracks?: number;
  /** Open region to stay inside; when set the step is a feasibility-gated line search. */
  region?: Region;
  /** Options forwarded to each `project` (retract). */
  projectOpts?: ProjectOptions;
}

export interface MinimizeResult {
  status: MinimizeStatus;
  iters: number;
  energy: number;
}

export function minimize(
  x: Float64Array,
  held: readonly Constraint[],
  energy: ScalarFn,
  opts: MinimizeOptions = {},
): MinimizeResult {
  const d = x.length;
  const stepSize = opts.stepSize ?? 0.005;
  const energyTol = opts.energyTol ?? 1e-10;
  const gradientTol = opts.gradientTol ?? 1e-8;
  const maxIters = opts.maxIters ?? 500;
  const maxBacktracks = opts.maxBacktracks ?? 24;
  const region = opts.region;
  const projectOpts = opts.projectOpts ?? {};

  const K = held.reduce((s, g) => s + g.outDim, 0);

  const gradX = new Float64Array(d);
  const gTan = new Float64Array(d);
  const J = new Float64Array(K * d);
  const saved = new Float64Array(d);
  const qr = makeQR(K, d);

  // Land on M first.
  if (project(x, held, projectOpts).status !== 'converged') {
    return { status: 'diverged', iters: 0, energy: NaN };
  }

  // Held Jacobian at the current x (every row of each constraint, stacked).
  const heldJac = (): void => {
    let off = 0;
    for (const g of held) { g.jacobian(x, J.subarray(off * d, (off + g.outDim) * d)); off += g.outDim; }
  };

  for (let iter = 0; iter < maxIters; iter++) {
    const e = energy.compute(x);
    if (e < energyTol) return { status: 'converged', iters: iter, energy: e };

    energy.grad(x, gradX);               // ∇E in ℝⁿ
    heldJac();                           // J at current x
    tangentProject(qr, J, K, d, gradX, gTan);   // g_T = P_T ∇E

    let g2 = 0;
    for (let i = 0; i < d; i++) g2 += gTan[i] * gTan[i];
    if (Math.sqrt(g2) < gradientTol) return { status: 'stalled', iters: iter, energy: e };

    if (!region) {
      for (let i = 0; i < d; i++) x[i] -= stepSize * gTan[i];
      if (project(x, held, projectOpts).status !== 'converged') {
        return { status: 'diverged', iters: iter + 1, energy: energy.compute(x) };
      }
    } else {
      saved.set(x);
      let alpha = stepSize;
      let accepted = false;
      for (let bt = 0; bt < maxBacktracks; bt++) {
        for (let i = 0; i < d; i++) x[i] = saved[i] - alpha * gTan[i];
        if (project(x, held, projectOpts).status === 'converged') {
          if (region.contains(x) && energy.compute(x) < e) { accepted = true; break; }
        }
        alpha *= 0.5;
      }
      if (!accepted) {
        x.set(saved);
        return { status: 'blocked', iters: iter, energy: e };
      }
    }
  }

  return { status: 'max-iters', iters: maxIters, energy: energy.compute(x) };
}
