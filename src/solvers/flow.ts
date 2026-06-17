/**
 * flow — Riemannian gradient descent of an energy ALONG a constraint manifold M,
 * optionally gated to stay inside an open region Ω. The tool to descend *into* the
 * tiny open set while holding the high-codimension constraints.
 *
 * Per step, at the current config c = ι(x) on M:
 *   g    = ∇E(c)                              ambient energy gradient (in C)
 *   g_X  = Dιᵀ g                              pulled back to chart coords (chart.pullbackRows)
 *   g_T  = P_T g_X                            tangent-projected via the held Jacobian (ker J)
 *   x   -= α · g_T                            step ALONG M (not ambient)
 *   project(chart, x, held)                   retract back onto M (2nd-order drift)
 *
 * The tangent projection is what makes this the *honest* gradient flow on M: we
 * move purely along the manifold, and the retraction only cleans up the O(α²)
 * curvature drift. (Contrast the old `embeddedFlow`, which stepped the full ambient
 * gradient — normal component and all — then re-flattened; that perturbs which
 * point on M you reach.) Convergence is the Riemannian criterion ‖g_T‖₂ → 0 (a
 * constrained critical point) or E < tol.
 *
 * With a `region`, each step is a backtracking line search: accept the largest α
 * whose retracted point is in Ω AND strictly lowers E; if none, halt `'blocked'`.
 *
 * Mutates `x` (chart coords) in place. Pure: no three.js, no DOM. Built on the
 * same J-hub as `project` (`tangentProject` shares its damped JJᵀ solve).
 */

import { project, type ProjectOptions } from './project.ts';
import { tangentProject, makeTangentScratch } from './tangentProject.ts';
import { normHeld, totalDrive } from './held.ts';
import type { Chart, Constraint, Region } from './types.ts';
import type { ScalarFn } from '../functions/types.ts';

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
  /** Backtracking attempts per step when `region` is set. Default 24. */
  maxBacktracks?: number;
  /** Open region to stay inside; when set the step is a feasibility-gated line search. */
  region?: Region;
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
  chart: Chart,
  x: Float64Array,
  held: readonly Constraint[],
  energy: ScalarFn,
  opts: FlowOptions = {},
): FlowResult {
  const d = chart.dim;
  const n = chart.ambient;
  const stepSize = opts.stepSize ?? 0.005;
  const energyTol = opts.energyTol ?? 1e-10;
  const gradientTol = opts.gradientTol ?? 1e-8;
  const maxIters = opts.maxIters ?? 500;
  const maxBacktracks = opts.maxBacktracks ?? 24;
  const region = opts.region;
  const damping = opts.damping ?? 1e-12;
  const projectOpts = opts.projectOpts ?? { damping };

  const hs = held.map((h) => normHeld(h, n));
  const K = totalDrive(hs);

  const c = new Float64Array(n);
  const gradC = new Float64Array(n);
  const gradX = new Float64Array(d);
  const gTan = new Float64Array(d);
  const Jc = new Float64Array(K * n);
  const Jx = new Float64Array(K * d);
  const saved = new Float64Array(d);
  const tscratch = makeTangentScratch(K);

  // Land on M first.
  if (project(chart, x, held, projectOpts).status !== 'converged') {
    return { status: 'diverged', iters: 0, energy: NaN };
  }

  // Held Jacobian at the current c, in chart coords (Jx = J_C · Dι) — the driven
  // rows of each constraint, stacked.
  const heldJacX = (): void => {
    let off = 0;
    for (const h of hs) {
      h.fn.jacobian(c, h.jacBuf);
      Jc.set(h.jacBuf.subarray(0, h.drive * n), off * n);
      off += h.drive;
    }
    chart.pullbackRows(Jc, K, Jx);
  };

  for (let iter = 0; iter < maxIters; iter++) {
    chart.realize(x, c);
    const e = energy.compute(c);
    if (e < energyTol) return { status: 'converged', iters: iter, energy: e };

    energy.grad(c, gradC);              // ∇E in C
    chart.pullbackRows(gradC, 1, gradX); // Aᵀ∇E
    heldJacX();                          // J at current c
    if (!tangentProject(Jx, K, d, gradX, gTan, damping, tscratch)) {
      return { status: 'diverged', iters: iter, energy: e };
    }

    let g2 = 0;
    for (let i = 0; i < d; i++) g2 += gTan[i] * gTan[i];
    if (Math.sqrt(g2) < gradientTol) return { status: 'stalled', iters: iter, energy: e };

    if (!region) {
      for (let i = 0; i < d; i++) x[i] -= stepSize * gTan[i];
      if (project(chart, x, held, projectOpts).status !== 'converged') {
        chart.realize(x, c);
        return { status: 'diverged', iters: iter + 1, energy: energy.compute(c) };
      }
    } else {
      saved.set(x);
      let alpha = stepSize;
      let accepted = false;
      for (let bt = 0; bt < maxBacktracks; bt++) {
        for (let i = 0; i < d; i++) x[i] = saved[i] - alpha * gTan[i];
        if (project(chart, x, held, projectOpts).status === 'converged') {
          chart.realize(x, c);
          if (region.contains(c) && energy.compute(c) < e) { accepted = true; break; }
        }
        alpha *= 0.5;
      }
      if (!accepted) {
        x.set(saved);
        return { status: 'blocked', iters: iter, energy: e };
      }
    }
  }

  chart.realize(x, c);
  return { status: 'max-iters', iters: maxIters, energy: energy.compute(c) };
}
