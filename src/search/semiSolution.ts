/**
 * semiSolution — the Doyle–Schwartz semi-solution scan (a flat *immersion* search;
 * "semi" = embeddedness is recorded, not required).
 *
 * Seeds are the explicit DS "golden pup tent" family (`doyleSchwartzPositions`):
 * six base vertices P1..P6 flat in z = 0 as two collinear triples {1,2,3}, {4,5,6};
 * two tent-pole apexes P0, P7 above; ρ-symmetric. The search perturbs only the
 * tent poles (breaking ρ-symmetry) and re-projects onto the semi-solution manifold:
 *
 *   seed → project( pinCoords(baseZ), [flat, collinear(1,2,3), collinear(4,5,6)] ) → certify
 *
 * Holding the six base z's at 0 (the pinned chart) and the two triples collinear,
 * while re-flattening. Accept any flat result and record τ; filter by Re τ̂ after
 * to fish out rectangular (0) / rhombic (½) tori. This is `semiSolutionFlatten`
 * rebuilt on the new stack — no `newtonFlatten`, no duplicated collinear helpers.
 *
 * DS-specific: the base z's, the triples, and the tent poles are the #7 structure.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import { pinCoords } from '../coordinates/pin.ts';
import { flat } from '../constraints/flat.ts';
import { collinear } from '../constraints/collinear.ts';
import { doyleSchwartzPositions } from './doyleSchwartz.ts';
import { gaussian } from '../sampling/rng.ts';
import { project } from '../solvers/project.ts';
import { pullHeld } from './pull.ts';
import { certify, type Certificate } from './certify.ts';

/** z-coordinate indices of the six base vertices P1..P6 (vertex i → 3i+2). */
export const DS_BASE_Z = [5, 8, 11, 14, 17, 20] as const;
/** The two collinear base triples. */
export const DS_TRIPLES = [[1, 2, 3], [4, 5, 6]] as const;
/** Coordinate indices of the two tent-pole apexes P0, P7. */
export const DS_TENT_POLES = [0, 1, 2, 21, 22, 23] as const;

export interface SemiSolutionOptions {
  /** Accept threshold on the flatness residual max|2π−θ|. Default 1e-10. */
  angleTol?: number;
}

/**
 * The semi-solution recipe: lift into the pinned chart, project onto flat ∧ the
 * two collinearities, realize back into the seed buffer, certify. Accepts any flat
 * immersion (records τ and the embedded flag).
 */
export function semiSolutionAttempt(
  triang: Triangulation,
  opts: SemiSolutionOptions = {},
): (seed: Float64Array) => Certificate | null {
  const space = pinCoords(triang, DS_BASE_Z);
  const held = pullHeld(space, [flat(triang), collinear(1, 2, 3), collinear(4, 5, 6)]);
  const angleTol = opts.angleTol ?? 1e-10;
  const x = new Float64Array(space.dim);
  return (seed) => {
    space.coords(seed, x);                                 // 24 → 18 free coords
    if (project(x, held).status !== 'converged') return null;
    space.push(x, seed);                                   // 18 → 24, into the seed buffer
    const cert = certify(triang, seed);
    return cert.coneDeficit < angleTol ? cert : null;
  };
}

export interface DsSeedOptions {
  /** Tent-pole perturbation σ ~ uniform[sigmaMin, sigmaMax]. Default 0 .. 0.1. */
  sigmaMin?: number;
  sigmaMax?: number;
  /** Modulus seed box: x ∈ [xMin, 0.5], y ∈ [yMin, yMax]. Defaults sample the DS domain. */
  xMin?: number;
  yMin?: number;
  yMax?: number;
}

/**
 * Seeds = a random DS torus of modulus (x, y) with its tent poles P0, P7
 * Gaussian-perturbed (σ = 0 recovers the symmetric closed-form member). The base
 * stays untouched; the chart pins its z's, so the perturbation is the whole search
 * input.
 */
export function doyleSchwartzTentSeeds(rng: () => number, opts: DsSeedOptions = {}): () => Float64Array {
  const sMin = opts.sigmaMin ?? 0;
  const sMax = opts.sigmaMax ?? 0.1;
  const xMin = opts.xMin ?? 0.05;
  const yMin = opts.yMin ?? 0.7;
  const yMax = opts.yMax ?? 1.5;
  return () => {
    const x = xMin + rng() * (0.5 - xMin);
    const y = yMin + rng() * (yMax - yMin);
    const p = doyleSchwartzPositions(x, y);
    const sigma = sMin + rng() * (sMax - sMin);
    for (const i of DS_TENT_POLES) p[i] += sigma * gaussian(rng);
    return p;
  };
}
