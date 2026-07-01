/**
 * marchModulus — transport a flat embedded torus onto a modulus wall |Re τ̂| = c
 * by continuation, and report where the embedded path pinches.
 *
 *   (flat embedded start) → march |Re τ̂| from its current value to c, staying embedded → certify
 *
 * Unlike the `wall` search (one direct `project` onto the wall, frozen chart, near
 * targets only), this *creeps* the target value leaf-by-leaf: each step re-freezes
 * the SL(2,ℤ) chart at the current point and `project`s onto `[flat, modulusWall(s)]`
 * with the embedded gate active — so it crosses chambers, navigates around
 * embeddedness obstacles, and finds the **pinch** (the extremal |Re τ̂| where Ω
 * closes) when it can't reach the wall. See search/README.md.
 *
 * Every attempt yields an OUTCOME (not accept/reject): `reached` (landed on the
 * wall) or `blocked` (pinched short of it, at `reached` = the boundary value). The
 * search over many seeds maps the realizable range of the wall.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import type { ScalarFn } from '@core/functions/types.ts';
import type { Family } from '@core/solvers/types.ts';
import type { ConfigSpace } from '@core/configuration/space.ts';
import { fullSpace } from '@core/coordinates/full.ts';
import { flat } from '@core/constraints/flat.ts';
import { modulusWall, fixedModulus } from '@core/constraints/modulus.ts';
import { isEmbedded } from '@core/embedding/index.ts';
import { project } from '@core/solvers/project.ts';
import { minimize } from '@core/solvers/minimize.ts';
import { continuation } from '@core/solvers/continuation.ts';
import { modulus } from '@core/moduli/modulus.ts';
import { reduceModulus } from '@core/moduli/reduce.ts';
import { pullHeld, ambientRegion } from '../pull.ts';
import { certify, type Certificate } from './certify.ts';

/**
 * The 1-parameter family marching |Re τ̂| to a wall value, on the working space of
 * `space`: `param` reads the current |Re τ̂| off the pushed config; `held` rebuilds
 * `[flat, modulusWall(s)]` AT the current point — frozen at `push(x)` and pulled back
 * into ℝⁿ (the per-step re-freeze of the SL(2,ℤ) chart).
 */
export function wallFamily(space: ConfigSpace): Family {
  const triang = space.triang;
  const pbuf = new Float64Array(space.ambient);
  return {
    param: (x) => { space.push(x, pbuf); return Math.abs(reduceModulus(modulus(triang, pbuf).tau)[0]); },
    held: (x, s) => {
      space.push(x, pbuf);
      return pullHeld(space, [flat(triang), modulusWall(triang, pbuf, s)]);
    },
  };
}

/**
 * The 1-parameter family marching ALONG the imaginary axis (Re τ̂ = 0) to the modulus
 * POINT τ̂ = (0, s) — i.e. continuation toward the square torus i (s = 1). `param`
 * reads the current Im τ̂; `held` pins `[flat, fixedModulus(0, s)]` AT the current
 * point (frozen chart, re-frozen each step, pulled into the working space). Mirror of
 * `wallFamily`, with the codim-2 `fixedModulus` in place of the codim-1 wall.
 */
export function imaginaryFamily(space: ConfigSpace): Family {
  const triang = space.triang;
  const pbuf = new Float64Array(space.ambient);
  return {
    param: (x) => { space.push(x, pbuf); return reduceModulus(modulus(triang, pbuf).tau)[1]; },
    held: (x, s) => {
      space.push(x, pbuf);
      return pullHeld(space, [flat(triang), fixedModulus(triang, pbuf, [0, s])]);
    },
  };
}

export interface MarchModulusOptions {
  /** Target wall: |Re τ̂| = c (0 = rectangular, ½ = rhombic). */
  c: number;
  /** Repulsion energy used to reach an embedded starting torus (Fabi's chord²/cutOffArea). */
  energy: ScalarFn;
  /** Optional FATTENING energy (`embedding/index`) descended after
   *  reaching embedded, before marching — pushes the start to a robust margin so
   *  the march has room to move the modulus instead of pinching at step one. */
  fattenEnergy?: ScalarFn;
  /** Accept threshold on the flatness residual max|2π−θ|. Default 1e-10. */
  angleTol?: number;
  /** Flow step toward the embedded start. Default 0.001. */
  stepSize?: number;
  /** Flow iteration cap for the start. Default 500. */
  maxFlowIters?: number;
}

export interface MarchOutcome {
  /** The certificate of where the march ended. */
  readonly cert: Certificate;
  /** Whether the march reached the wall, pinched short, or ran out of substeps. */
  readonly status: 'reached' | 'blocked' | 'max-iters';
  /** The |Re τ̂| actually reached — the wall value on `reached`, the pinch value on `blocked`. */
  readonly reached: number;
}

/**
 * Build the march-to-wall attempt: from a seed, first get a flat embedded torus
 * (project + flow), then march its |Re τ̂| onto the wall, gated embedded. Returns
 * the outcome, or `null` if no embedded starting torus could be found.
 */
export function marchToWallAttempt(
  triang: Triangulation,
  opts: MarchModulusOptions,
): (seed: Float64Array) => MarchOutcome | null {
  const space = fullSpace(triang);        // seed ∈ ℝⁿ is the ambient config (φ = id)
  const held0 = pullHeld(space, [flat(triang)]);
  const region = ambientRegion(space, (c) => isEmbedded(triang, c));
  const family = wallFamily(space);
  const energy = space.pullScalar(opts.energy);
  const fattenEnergy = opts.fattenEnergy ? space.pullScalar(opts.fattenEnergy) : undefined;
  const angleTol = opts.angleTol ?? 1e-10;
  const minimizeOpts = {
    region,
    stepSize: opts.stepSize ?? 0.001,
    maxIters: opts.maxFlowIters ?? 500,
    energyTol: 1e-12,
    gradientTol: 1e-12,
  };
  return (seed) => {
    // 1. Reach a flat embedded starting torus (the continuation needs a point in F ∩ Ω).
    if (project(seed, held0).status !== 'converged') return null;
    minimize(seed, held0, energy, minimizeOpts);
    // 1b. Optionally fatten the margin so the continuation has room to move (Fabi's energy
    //     is zero on the embedded set; the cell-margin energy is alive there).
    if (fattenEnergy) minimize(seed, held0, fattenEnergy, minimizeOpts);
    const start = certify(triang, seed);
    if (!(start.coneDeficit < angleTol && start.embedded)) return null;

    // 2. Continue |Re τ̂| onto the wall, re-freezing + checking embedded each step.
    const r = continuation(seed, family, opts.c, { region });
    return { cert: certify(triang, seed), status: r.status, reached: r.param };
  };
}
