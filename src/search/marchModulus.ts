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
 * closes) when it can't reach the wall. See docs/math/searches.md.
 *
 * Every attempt yields an OUTCOME (not accept/reject): `reached` (landed on the
 * wall) or `blocked` (pinched short of it, at `reached` = the boundary value). The
 * search over many seeds maps the realizable range of the wall.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import type { ScalarFn } from '../functions/types.ts';
import type { Family } from '../solvers/march.ts';
import { identity } from '../configuration/chart.ts';
import { flat } from '../conditions/flat.ts';
import { modulusWall } from '../conditions/modulus.ts';
import { embedded } from '../regions/embedded.ts';
import { project } from '../solvers/project.ts';
import { flow } from '../solvers/flow.ts';
import { march } from '../solvers/march.ts';
import { modulus, reduceModulus } from '../topology/develop.ts';
import { certify, type Certificate } from './certify.ts';

/**
 * The 1-parameter family marching |Re τ̂| to a wall value: `param` reads the
 * current |Re τ̂| off the config; `held` rebuilds `[flat, modulusWall(s)]` AT the
 * current point (the per-step re-freeze of the SL(2,ℤ) chart).
 */
export function wallFamily(torus: Triangulation): Family {
  return {
    param: (c) => Math.abs(reduceModulus(modulus(torus, c).tau)[0]),
    held: (c, s) => [flat(torus), modulusWall(torus, c, s)],
  };
}

export interface MarchModulusOptions {
  /** Target wall: |Re τ̂| = c (0 = rectangular, ½ = rhombic). */
  c: number;
  /** Repulsion energy used to reach an embedded starting torus (Fabi's chord²/cutOffArea). */
  energy: ScalarFn;
  /** Optional FATTENING energy (`functions/energies/cellMargin`) descended after
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
  torus: Triangulation,
  opts: MarchModulusOptions,
): (seed: Float64Array) => MarchOutcome | null {
  const chart = identity(torus.vertexCount * 3);
  const held0 = [flat(torus)];
  const region = embedded(torus);
  const family = wallFamily(torus);
  const angleTol = opts.angleTol ?? 1e-10;
  const flowOpts = {
    region,
    stepSize: opts.stepSize ?? 0.001,
    maxIters: opts.maxFlowIters ?? 500,
    energyTol: 1e-12,
    gradientTol: 1e-12,
  };
  return (seed) => {
    // 1. Reach a flat embedded starting torus (the march needs a point in F ∩ Ω).
    if (project(chart, seed, held0).status !== 'converged') return null;
    flow(chart, seed, held0, opts.energy, flowOpts);
    // 1b. Optionally fatten the margin so the march has room to move (Fabi's energy
    //     is zero on the embedded set; the cell-margin energy is alive there).
    if (opts.fattenEnergy) flow(chart, seed, held0, opts.fattenEnergy, flowOpts);
    const start = certify(torus, seed);
    if (!(start.coneDeficit < angleTol && start.embedded)) return null;

    // 2. March |Re τ̂| onto the wall, re-freezing + gating embedded each step.
    const r = march(chart, seed, family, opts.c, { region });
    return { cert: certify(torus, seed), status: r.status, reached: r.param };
  };
}
