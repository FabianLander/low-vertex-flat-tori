/**
 * Semi-solution search for 8-vertex flat tori.
 *
 * A semi-solution is a flat immersion (all cone angles exactly 2π) of the
 * degree-6-regular torus satisfying the structural conditions from Rich's
 * email of 2026-06: six vertices P1..P6 lie in the XY-plane, two tent-pole
 * vertices P0 and P7 lie in the upper half-space (z > 0), and the two
 * collinear triples {P1,P2,P3} and {P4,P5,P6} each lie on a single line in
 * the XY-plane.  The word "semi" signals that embeddedness is NOT enforced:
 * these are valid flat immersions but may self-intersect.
 *
 * This file provides three things:
 *
 *   1. doyleSchwartzPositions(x, y) — the explicit Doyle-Schwartz parametric
 *      family from section 2.2 of [DS25].  Every member is a SYMMETRIC semi-
 *      solution (in fact an embedded flat torus) with modulus τ = x + iy and
 *      the ρ-symmetry P7 = ρ(P0), where ρ(u,v,w) = (−u,−v,w).  The six
 *      planar vertices are exactly collinear by construction.
 *
 *   2. semiSolutionFlatten(torus, positions, opts) — a constrained Gauss-Newton
 *      projection onto the semi-solution manifold.  The system is exactly
 *      `newtonFlatten` with two extra collinearity constraints (the signed
 *      areas of the two triples) and the planar z-coordinates frozen at zero:
 *      7 cone-angle rows + 2 collinearity rows, with FROZEN_Z held fixed.  We
 *      delegate to newtonFlatten so there is a single Gauss-Newton implementation
 *      (see notes/semi-solutions.tex §4 for the math).
 *
 *   3. scanSemiSolutions(torus, opts) — sweeps a grid of starting seeds and
 *      perturbations, calls semiSolutionFlatten at each, and records the
 *      resulting modulus τ.  The caller can filter results by Re(τ) to find
 *      configurations on the lines τ = iy (Re τ = 0) or τ = ½ + iy (Re τ = ½).
 *
 * Mathematical background: notes/semi-solutions.tex.
 * Related code: src/math/newton.ts (the Gauss-Newton solver, including the
 *               extraConstraints and frozenCoords this module rides on),
 *               src/topology/develop.ts (modulus τ from a flat embedding).
 *
 * References:
 *   [DS25] Doyle-Schwartz, "Collapsibility and near-universality of paper
 *          tori" (2025).
 *   [S26]  Schwartz, "Vertex-minimal paper tori" (2026).
 */

import { maxConeDeficit } from '../functions/coneDeficit.ts';
import { modulus } from '../topology/develop';
import { isEmbedded } from './embedded';
import { newtonFlatten, type NewtonConstraint } from './newton';
import { doyleSchwartzPositions } from '../configuration/doyleSchwartz.ts';
import type { Triangulation } from '../topology/triangulation';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * z-coordinate indices of the six planar vertices P1..P6.
 * Vertex i occupies positions [3i, 3i+1, 3i+2]; its z is at 3i+2.
 */
const FROZEN_Z = [5, 8, 11, 14, 17, 20] as const;

// `doyleSchwartzPositions` (the DS seed family) now lives in
// `configuration/doyleSchwartz.ts` — a configuration is bare positions.

// ---------------------------------------------------------------------------
// Collinearity constraints
// ---------------------------------------------------------------------------

/**
 * Twice the signed area of triangle (Pi, Pj, Pk) in the XY-plane; zero iff the
 * triple is collinear.  This is the collinearity residual used both as the
 * Newton extra-constraint value and for post-hoc residual reporting.
 */
function signedArea2(p: ArrayLike<number>, i: number, j: number, k: number): number {
  const oi = 3 * i, oj = 3 * j, ok = 3 * k;
  return (p[oj] - p[oi]) * (p[ok + 1] - p[oi + 1])
       - (p[oj + 1] - p[oi + 1]) * (p[ok] - p[oi]);
}

/**
 * The two collinearity constraints fed to newtonFlatten as extra residual rows
 * (each driven to 0 alongside the cone-angle deficits).  Their Jacobian rows
 * are built by central finite differences inside newtonFlatten — for a signed-
 * area quadratic this is accurate well below the convergence tolerance.
 */
const COLLINEAR_CONSTRAINTS: readonly NewtonConstraint[] = [
  { label: 'collinear-P1P2P3', value: (p) => signedArea2(p, 1, 2, 3) },
  { label: 'collinear-P4P5P6', value: (p) => signedArea2(p, 4, 5, 6) },
];

/** Max |signed area| over the two collinear triples — the collinearity residual. */
function collinearResidualNorm(p: ArrayLike<number>): number {
  return Math.max(Math.abs(signedArea2(p, 1, 2, 3)), Math.abs(signedArea2(p, 4, 5, 6)));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SemiNewtonOpts = {
  /** Stop when both residual norms fall below this. Default 1e-12. */
  tolerance?: number;
  /** Hard iteration cap. Default 80. */
  maxIters?: number;
  /** Tikhonov damping on G = JJᵀ. Default 1e-12. */
  damping?: number;
};

export type SemiNewtonResult = {
  status: 'converged' | 'diverged' | 'max-iters';
  iters: number;
  /** Max |cone deficit| over all 8 vertices at termination. */
  coneResidual: number;
  /** Max |collinearity residual| over the two triples at termination. */
  collinearResidual: number;
};

export type SemiSolution = {
  /** DS starting point used to seed Newton. */
  readonly x_start: number;
  readonly y_start: number;
  /** Index into the perturbations array that was applied. */
  readonly perturbIndex: number;
  /** Teichmüller parameter [Re τ, Im τ], or null if Newton did not converge. */
  readonly tau: readonly [number, number] | null;
  /** Converged vertex positions (24 floats). */
  readonly positions: Float64Array;
  readonly converged: boolean;
  /** True only if converged AND the result is an embedded torus. */
  readonly embedded: boolean;
  readonly coneResidual: number;
  readonly collinearResidual: number;
};

export type ScanOpts = {
  /** (x, y) seeds in the DS fundamental domain to start Newton from. */
  readonly seeds: readonly { x: number; y: number }[];
  /**
   * Independent perturbations applied to P0 (indices 0,1,2) and P7 (indices
   * 21,22,23) before Newton.  The zero perturbation recovers the symmetric DS
   * solution.  Non-zero perturbations break the ρ-symmetry and explore the
   * larger semi-solution family.
   */
  readonly perturbations: readonly {
    readonly dP0: readonly [number, number, number];
    readonly dP7: readonly [number, number, number];
  }[];
  readonly newtonOpts?: SemiNewtonOpts;
};

// ---------------------------------------------------------------------------
// Constrained Gauss-Newton projection
// ---------------------------------------------------------------------------

/**
 * Projects `positions` onto the semi-solution manifold by minimum-norm
 * Gauss-Newton iteration.
 *
 * The manifold is defined by 9 simultaneous equality constraints on the 24
 * vertex coordinates:
 *
 *   F₀..F₆   cone-angle deficits at vertices 0..6     (2π − θᵢ = 0)
 *   F₇       collinearity of {P1, P2, P3}              (signed area = 0)
 *   F₈       collinearity of {P4, P5, P6}              (signed area = 0)
 *
 * Vertex 7's cone deficit is dropped from the driving system (Gauss-Bonnet
 * forces it to zero once 0..6 are flat); newtonFlatten already does this.  The
 * two collinearity constraints are supplied as extra residual rows, and the
 * z-coordinates of P1..P6 are frozen at zero.  We force those z-coords to 0 on
 * entry so the freeze pins them to the XY-plane.
 *
 * Mutates `positions` in place.
 */
export function semiSolutionFlatten(
  torus: Triangulation,
  positions: Float64Array,
  opts: SemiNewtonOpts = {},
): SemiNewtonResult {
  // Pin the six planar vertices to the XY-plane; frozenCoords keeps them there.
  for (const c of FROZEN_Z) positions[c] = 0;

  const result = newtonFlatten(torus, positions, {
    tolerance: opts.tolerance ?? 1e-12,
    maxIters: opts.maxIters ?? 80,
    damping: opts.damping ?? 1e-12,
    extraConstraints: COLLINEAR_CONSTRAINTS,
    frozenCoords: FROZEN_Z,
  });

  // newtonFlatten reports a single combined residual; recompute the cone and
  // collinearity norms separately for diagnostics (cheap: one pass each).
  return {
    status: result.status,
    iters: result.iters,
    coneResidual: maxConeDeficit(torus, positions),
    collinearResidual: collinearResidualNorm(positions),
  };
}

// ---------------------------------------------------------------------------
// Semi-solution scan
// ---------------------------------------------------------------------------

/**
 * Sweeps a grid of Doyle-Schwartz seeds and perturbations, projects each onto
 * the semi-solution manifold, and records the result.
 *
 * For each (seed, perturbation) pair:
 *   1. Start from doyleSchwartzPositions(seed.x, seed.y).
 *   2. Add the perturbation to P0 and P7 (breaking ρ-symmetry if non-zero).
 *   3. Run semiSolutionFlatten.
 *   4. If converged: compute τ via modulus() and check embeddedness.
 *
 * To find semi-solutions with Re(τ) = 0 or Re(τ) = ½, filter the returned
 * array by r.tau?.[0].
 */
export function scanSemiSolutions(torus: Triangulation, opts: ScanOpts): SemiSolution[] {
  const results: SemiSolution[] = [];

  for (const { x, y } of opts.seeds) {
    for (let pi = 0; pi < opts.perturbations.length; pi++) {
      const { dP0, dP7 } = opts.perturbations[pi];
      const positions = doyleSchwartzPositions(x, y);

      // Apply perturbation to tent-pole vertices (P0 and P7 only).
      positions[0]  += dP0[0]; positions[1]  += dP0[1]; positions[2]  += dP0[2];
      positions[21] += dP7[0]; positions[22] += dP7[1]; positions[23] += dP7[2];

      // Keep tent poles in the upper half-space.
      if (positions[2]  <= 0) positions[2]  = 1e-3;
      if (positions[23] <= 0) positions[23] = 1e-3;

      const result = semiSolutionFlatten(torus, positions, opts.newtonOpts);
      const converged = result.status === 'converged';

      let tau: readonly [number, number] | null = null;
      let embedded = false;

      if (converged) {
        const m = modulus(torus, positions);
        tau = [m.tau[0], m.tau[1]];
        embedded = isEmbedded(torus, positions);
      }

      results.push({
        x_start: x,
        y_start: y,
        perturbIndex: pi,
        tau,
        positions,
        converged,
        embedded,
        coneResidual: result.coneResidual,
        collinearResidual: result.collinearResidual,
      });
    }
  }

  return results;
}
