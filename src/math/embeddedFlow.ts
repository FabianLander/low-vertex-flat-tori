/**
 * Alternating "Newton — gradient step — Newton" flow on the flatness
 * manifold F.
 *
 * At each iteration:
 *   1. Evaluate energy at current x ∈ F. If small, we're done.
 *   2. Evaluate gradient. Take a small descent step x ← x − α · ∇E.
 *      We don't project the gradient onto the tangent space of F; the
 *      step is naive Euclidean descent in R²⁴.
 *   3. Re-Newton-flatten. For small α, off-manifold drift is O(α²) and
 *      Newton restores R(x) ≈ 0 in one or two iterations.
 *
 * The energy is plug-and-play via the RepulsionEnergy interface. The flow
 * knows nothing about embeddedness directly — it only sees E(x) and ∇E(x).
 */

import { newtonFlatten, type NewtonOptions, type NewtonStatus } from './newton';
import type { RepulsionEnergy } from './energies/types';

export type FlowStatus = 'converged' | 'stalled' | 'max-iters' | 'diverged' | 'blocked';

export type FlowOptions = {
  /** Step size on the gradient descent move. Default 0.005. */
  stepSize?: number;
  /** Stop when energy < energyTol. Default 1e-10. */
  energyTol?: number;
  /** Stop when ||gradient||₂ < gradientTol. Default 1e-8. */
  gradientTol?: number;
  /** Hard cap on outer iterations. Default 500. */
  maxIters?: number;
  /** Options forwarded to each newtonFlatten call. */
  newtonOpts?: NewtonOptions;
  /** Per-iteration callback for live visualization / logging. */
  onIter?: (info: IterationInfo) => void;
  /**
   * Optional hard feasibility constraint (e.g. isEmbedded). When supplied, the
   * step becomes a backtracking line search: the move is accepted only if the
   * post-Newton position is feasible AND the energy strictly decreases, else
   * the step is halved and retried. If no feasible improving step is found the
   * flow halts with status 'blocked' at the last good point. This turns a soft
   * penalty into a hard constraint — the surface can never leave the feasible
   * region.
   */
  feasible?: (positions: Float64Array) => boolean;
  /** Backtracking attempts per iteration when `feasible` is set. Default 24. */
  maxBacktracks?: number;
};

export type IterationInfo = {
  iter: number;
  energy: number;
  gradNorm: number;
  newtonIters: number;
  newtonStatus: NewtonStatus;
};

export type FlowResult = {
  status: FlowStatus;
  iters: number;
  energy: number;
  totalNewtonIters: number;
};

export function embeddedFlow(
  positions: Float64Array,
  energy: RepulsionEnergy,
  opts: FlowOptions = {},
): FlowResult {
  const stepSize = opts.stepSize ?? 0.005;
  const energyTol = opts.energyTol ?? 1e-10;
  const gradientTol = opts.gradientTol ?? 1e-8;
  const maxIters = opts.maxIters ?? 500;
  const feasible = opts.feasible;
  const maxBacktracks = opts.maxBacktracks ?? 24;

  const grad = new Float64Array(positions.length);
  const saved = new Float64Array(positions.length); // last good point, for backtracking

  // Land on F before starting (in case caller's seed isn't flat).
  let nr = newtonFlatten(positions, opts.newtonOpts);
  let totalNewton = nr.iters;
  if (nr.status !== 'converged') {
    return {
      status: 'diverged',
      iters: 0,
      energy: NaN,
      totalNewtonIters: totalNewton,
    };
  }

  for (let iter = 0; iter < maxIters; iter++) {
    const e = energy.compute(positions);

    if (e < energyTol) {
      opts.onIter?.({ iter, energy: e, gradNorm: 0, newtonIters: 0, newtonStatus: 'converged' });
      return { status: 'converged', iters: iter, energy: e, totalNewtonIters: totalNewton };
    }

    energy.gradient(positions, grad);
    let gNormSq = 0;
    for (let i = 0; i < grad.length; i++) gNormSq += grad[i] * grad[i];
    const gNorm = Math.sqrt(gNormSq);

    if (gNorm < gradientTol) {
      opts.onIter?.({ iter, energy: e, gradNorm: gNorm, newtonIters: 0, newtonStatus: 'converged' });
      return { status: 'stalled', iters: iter, energy: e, totalNewtonIters: totalNewton };
    }

    if (!feasible) {
      // Naive Euclidean descent step. Off-manifold drift is O(stepSize²);
      // the next Newton call mops it up.
      for (let i = 0; i < positions.length; i++) {
        positions[i] -= stepSize * grad[i];
      }

      nr = newtonFlatten(positions, opts.newtonOpts);
      totalNewton += nr.iters;
      if (nr.status !== 'converged') {
        return {
          status: 'diverged',
          iters: iter + 1,
          energy: energy.compute(positions),
          totalNewtonIters: totalNewton,
        };
      }
    } else {
      // Guarded backtracking: accept the largest step that lands on F, stays
      // feasible, and strictly lowers the energy. Else halt at the last good x.
      saved.set(positions);
      let alpha = stepSize;
      let accepted = false;
      for (let bt = 0; bt < maxBacktracks; bt++) {
        for (let i = 0; i < positions.length; i++) positions[i] = saved[i] - alpha * grad[i];
        nr = newtonFlatten(positions, opts.newtonOpts);
        totalNewton += nr.iters;
        if (nr.status === 'converged' && feasible(positions) && energy.compute(positions) < e) {
          accepted = true;
          break;
        }
        alpha *= 0.5;
      }
      if (!accepted) {
        positions.set(saved);
        return { status: 'blocked', iters: iter, energy: e, totalNewtonIters: totalNewton };
      }
    }

    opts.onIter?.({
      iter,
      energy: e,
      gradNorm: gNorm,
      newtonIters: nr.iters,
      newtonStatus: nr.status,
    });
  }

  return {
    status: 'max-iters',
    iters: maxIters,
    energy: energy.compute(positions),
    totalNewtonIters: totalNewton,
  };
}
