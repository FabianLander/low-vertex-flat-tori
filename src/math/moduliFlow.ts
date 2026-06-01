/**
 * Steer a flat torus toward a target modulus τ ∈ ℍ while staying flat and
 * embedded — the primitive for directed exploration of moduli space.
 *
 * Energy E(x) = |τ(x) − τ_target|², with τ from the developing map
 * (develop.ts `modulus`) and gradient by finite differences. We hand it to the
 * existing projected flow (`embeddedFlow`): Newton onto the flat manifold →
 * descent step → re-Newton, with `isEmbedded` as a backtracking feasibility
 * guard. So the torus slides across moduli space toward τ_target, never leaving
 * the embedded region.
 *
 *   status 'converged' → reached τ_target (within tolerance)
 *   status 'blocked'   → no embedded step lowers E: τ_target is past the
 *                        boundary of the achievable region in this direction,
 *                        and `positions` is left at the boundary torus.
 *
 * Mutates `positions` in place. Pure module (no DOM/three).
 */

import { modulus } from './develop';
import { embeddedFlow, type FlowResult } from './embeddedFlow';
import { isEmbedded } from './embedded';
import { energyFromCompute } from './energies/finiteDiffGradient';
import type { NewtonOptions } from './newton';

export type V2 = readonly [number, number];

export type ModuliFlowOptions = {
  /** Descent step (upper bound; backtracking shrinks it). Default 0.02. */
  stepSize?: number;
  /** Stop when |τ − τ_target|² < this. Default 1e-6 (≈ |τ−target| < 1e-3). */
  energyTol?: number;
  /** Outer iteration cap. Default 600. */
  maxIters?: number;
  /** Backtracking attempts per step. Default 30. */
  maxBacktracks?: number;
  /** Forwarded to each newtonFlatten (re-projection onto the flat manifold). */
  newtonOpts?: NewtonOptions;
};

export type ModuliFlowResult = {
  status: FlowResult['status'];
  /** Modulus actually reached. */
  tau: V2;
  /** |τ_reached − τ_target|. */
  dist: number;
  iters: number;
};

/** Flow `positions` toward `target` ∈ ℍ, staying flat + embedded. */
export function moduliFlow(
  positions: Float64Array,
  target: V2,
  opts: ModuliFlowOptions = {},
): ModuliFlowResult {
  const energy = energyFromCompute(
    `|τ − (${target[0].toFixed(3)}+${target[1].toFixed(3)}i)|²`,
    (p) => {
      const t = modulus(p).tau;
      const dx = t[0] - target[0], dy = t[1] - target[1];
      return dx * dx + dy * dy;
    },
  );

  const fr = embeddedFlow(positions, energy, {
    stepSize: opts.stepSize ?? 0.02,
    energyTol: opts.energyTol ?? 1e-6,
    gradientTol: 1e-12,
    maxIters: opts.maxIters ?? 600,
    feasible: isEmbedded,
    maxBacktracks: opts.maxBacktracks ?? 30,
    newtonOpts: opts.newtonOpts ?? { tolerance: 1e-12 },
  });

  const t = modulus(positions).tau;
  return {
    status: fr.status,
    tau: t,
    dist: Math.hypot(t[0] - target[0], t[1] - target[1]),
    iters: fr.iters,
  };
}
