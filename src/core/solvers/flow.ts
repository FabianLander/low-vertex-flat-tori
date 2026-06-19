/**
 * flow — Riemannian gradient descent of an energy ALONG a constraint manifold M,
 * optionally gated to stay inside an open region. Run directly in the working space
 * ℝⁿ: the held constraints and the energy are `Fn`s on ℝⁿ (already pulled through the
 * configuration space), and the region is a `Gate` predicate on ℝⁿ.
 *
 * Per step, at the current point x on M:
 *   g    = ∇E(x)                              energy gradient (in ℝⁿ)
 *   g_T  = P_T g                              tangent-projected via the held Jacobian (ker J)
 *   x   -= α · g_T                            step ALONG M (not the ambient gradient)
 *   project(x, held)                          retract back onto M (2nd-order drift)
 *
 * The tangent projection is what makes this the *honest* gradient flow on M; the
 * retraction cleans up the O(α²) curvature drift. Convergence is the Riemannian
 * criterion ‖g_T‖₂ → 0 (a constrained critical point) or E < tol.
 *
 * With a `gate`, each step is a backtracking line search: accept the largest α whose
 * retracted point passes the gate AND strictly lowers E; if none, halt `'blocked'`.
 *
 * Mutates `x` in place. Pure: no three.js, no DOM. Built on the same J-hub as
 * `project` (`tangentProject` shares its damped JJᵀ solve).
 */

import { project, type ProjectOptions } from './project.ts';
import { tangentProject, makeTangentScratch } from './tangentProject.ts';
import { normHeld, totalDrive } from './held.ts';
import type { Constraint } from '@core/constraints/types.ts';
import type { Gate } from './types.ts';
import type { ScalarFn } from '@core/functions/types.ts';

export type FlowStatus = 'converged' | 'stalled' | 'max-iters' | 'diverged' | 'blocked';

export interface FlowOptions {
  /** Tangent step length. Default 0.005. */
  stepSize?: number;
  /** Stop when E < energyTol. Default 1e-10. */
  energyTol?: number;
  /** Stop when the TANGENT gradient ‖g_T‖₂ < gradientTol (constrained critical point). Default 1e-8. */
  gradientTol?: number;
  /** Outer iteration cap. Default 500. */
  maxIters?: number;
  /** Backtracking attempts per step when `gate` is set. Default 24. */
  maxBacktracks?: number;
  /** Open-region gate to stay inside; when set the step is a feasibility-gated line search. */
  gate?: Gate;
  /** Damping for the JJᵀ solves (project + tangent). Default 1e-12. */
  damping?: number;
  /** Options forwarded to each `project` (retract). Defaults to { damping }. */
  projectOpts?: ProjectOptions;
}

export interface FlowResult {
  status: FlowStatus;
  iters: number;
  energy: number;
}

export function flow(
  x: Float64Array,
  held: readonly Constraint[],
  energy: ScalarFn,
  opts: FlowOptions = {},
): FlowResult {
  const d = x.length;
  const stepSize = opts.stepSize ?? 0.005;
  const energyTol = opts.energyTol ?? 1e-10;
  const gradientTol = opts.gradientTol ?? 1e-8;
  const maxIters = opts.maxIters ?? 500;
  const maxBacktracks = opts.maxBacktracks ?? 24;
  const gate = opts.gate;
  const damping = opts.damping ?? 1e-12;
  const projectOpts = opts.projectOpts ?? { damping };

  const hs = held.map((h) => normHeld(h, d));
  const K = totalDrive(hs);

  const gradX = new Float64Array(d);
  const gTan = new Float64Array(d);
  const J = new Float64Array(K * d);
  const saved = new Float64Array(d);
  const tscratch = makeTangentScratch(K);

  // Land on M first.
  if (project(x, held, projectOpts).status !== 'converged') {
    return { status: 'diverged', iters: 0, energy: NaN };
  }

  // Held Jacobian at the current x (the driven rows of each constraint, stacked).
  const heldJac = (): void => {
    let off = 0;
    for (const h of hs) {
      h.fn.jacobian(x, h.jacBuf);
      J.set(h.jacBuf.subarray(0, h.drive * d), off * d);
      off += h.drive;
    }
  };

  for (let iter = 0; iter < maxIters; iter++) {
    const e = energy.compute(x);
    if (e < energyTol) return { status: 'converged', iters: iter, energy: e };

    energy.grad(x, gradX);               // ∇E in ℝⁿ
    heldJac();                           // J at current x
    if (!tangentProject(J, K, d, gradX, gTan, damping, tscratch)) {
      return { status: 'diverged', iters: iter, energy: e };
    }

    let g2 = 0;
    for (let i = 0; i < d; i++) g2 += gTan[i] * gTan[i];
    if (Math.sqrt(g2) < gradientTol) return { status: 'stalled', iters: iter, energy: e };

    if (!gate) {
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
          if (gate(x) && energy.compute(x) < e) { accepted = true; break; }
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
