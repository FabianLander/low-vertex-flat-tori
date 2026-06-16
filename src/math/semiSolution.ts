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
 *      projection onto the semi-solution manifold.  It enforces all 9
 *      constraints simultaneously (7 independent cone-angle equations + 2
 *      collinearity equations) while freezing the z-coordinates of P1..P6 at
 *      zero.  Starting from a Doyle-Schwartz point with a small perturbation
 *      of P0 and/or P7 (breaking ρ-symmetry), this finds the nearest semi-
 *      solution that is NOT necessarily symmetric.
 *
 *   3. scanSemiSolutions(torus, opts) — sweeps a grid of starting seeds and
 *      perturbations, calls semiSolutionFlatten at each, and records the
 *      resulting modulus τ.  The caller can filter results by Re(τ) to find
 *      configurations on the lines τ = iy (Re τ = 0) or τ = ½ + iy (Re τ = ½).
 *
 * Mathematical background: notes/semi-solutions.tex.
 * Related code: src/math/newton.ts (unconstrained cone-angle Newton),
 *               src/math/develop.ts (modulus τ from a flat embedding).
 *
 * References:
 *   [DS25] Doyle-Schwartz, "Collapsibility and near-universality of paper
 *          tori" (2025).
 *   [S26]  Schwartz, "Vertex-minimal paper tori" (2026).
 */

import { coneAngleDeficits, coneAngleJacobian } from './angles';
import { modulus } from './develop';
import { isEmbedded } from './embedded';
import type { Torus } from '../tori/defineTorus';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Flat positions array length: 8 vertices × 3 coordinates. */
const N = 24;

/** Independent cone-angle constraints (8th is redundant by Gauss-Bonnet). */
const K_CONE = 7;

/** Total constraints: 7 cone-angle + 2 collinearity = 9. */
const K = 9;

/**
 * z-coordinate indices of the six planar vertices P1..P6.
 * Vertex i occupies positions [3i, 3i+1, 3i+2]; its z is at 3i+2.
 */
const FROZEN_Z = [5, 8, 11, 14, 17, 20] as const;

// ---------------------------------------------------------------------------
// Doyle-Schwartz golden pup tent
// ---------------------------------------------------------------------------

/**
 * Vertex positions of the Doyle-Schwartz parametric family for modulus z = x+iy.
 *
 * Formulas from Doyle-Schwartz [DS25] section 2.2 (and verified against the
 * Mathematica file in off_limits_code/chapter3_calcs).  The returned array has
 * 24 entries in [x0,y0,z0, x1,y1,z1, …, x7,y7,z7] order.
 *
 * Properties of the result:
 *   - P1..P6 lie in z = 0 (conditions 1).
 *   - P0 and P7 are at height y√(8x) ≥ 0 (condition 2; degenerate at x = 0).
 *   - {P1,P2,P3} and {P4,P5,P6} are each collinear (in the XY-plane).
 *   - The ρ-symmetry holds: P7 = ρ(P0) where ρ(u,v,w) = (−u,−v,w).
 *   - All cone angles equal 2π (condition 3): this is an isometric immersion
 *     of the flat torus of modulus x+iy (condition 4 for any x,y in the DS
 *     fundamental domain).
 *
 * The fundamental domain is: x ≥ 0, x ≤ ½, (x−1)² + y² ≥ 1.
 */
export function doyleSchwartzPositions(x: number, y: number): Float64Array {
  const p = new Float64Array(N);
  const x2 = x * x, y2 = y * y;
  const ztop = Math.sqrt(8 * x) * y;
  // P0
  p[0]  = x - 2 * x2;       p[1]  = y - 2 * x * y;  p[2]  = ztop;
  // P1
  p[3]  = x - x2 - y2;      p[4]  = -y;              p[5]  = 0;
  // P2
  p[6]  = 2 * x - x2 - y2;  p[7]  = 0;               p[8]  = 0;
  // P3
  p[9]  = 3 * x - x2 - y2;  p[10] = y;               p[11] = 0;
  // P4
  p[12] = -3 * x + x2 + y2; p[13] = -y;              p[14] = 0;
  // P5
  p[15] = -2 * x + x2 + y2; p[16] = 0;               p[17] = 0;
  // P6
  p[18] = -x + x2 + y2;     p[19] = y;               p[20] = 0;
  // P7
  p[21] = 2 * x2 - x;       p[22] = 2 * x * y - y;  p[23] = ztop;
  return p;
}

// ---------------------------------------------------------------------------
// Collinearity residuals and Jacobian (internal)
// ---------------------------------------------------------------------------

/**
 * Two collinearity residuals, written into out[0..1]:
 *   out[0] = signed area × 2 of triangle (P1, P2, P3)   (= 0 iff collinear)
 *   out[1] = signed area × 2 of triangle (P4, P5, P6)   (= 0 iff collinear)
 */
function collinearityResiduals(p: Float64Array, out: Float64Array): void {
  // P1=(p[3],p[4])  P2=(p[6],p[7])  P3=(p[9],p[10])
  out[0] = (p[6] - p[3]) * (p[10] - p[4]) - (p[7] - p[4]) * (p[9] - p[3]);
  // P4=(p[12],p[13])  P5=(p[15],p[16])  P6=(p[18],p[19])
  out[1] = (p[15] - p[12]) * (p[19] - p[13]) - (p[16] - p[13]) * (p[18] - p[12]);
}

/**
 * Writes the analytic Jacobian of [r0, r1] into rows K_CONE and K_CONE+1 of J
 * (a K×N = 9×24 matrix stored row-major).  Only those two rows are touched;
 * all other entries are left as-is.
 *
 * Derivation: r0 = (P2x−P1x)(P3y−P1y) − (P2y−P1y)(P3x−P1x).  Differentiating
 * by the standard cofactor formula (see notes/semi-solutions.tex §4):
 *
 *   ∂r0/∂P1x = P2y − P3y    ∂r0/∂P2x = P3y − P1y    ∂r0/∂P3x = −(P2y − P1y)
 *   ∂r0/∂P1y = P3x − P2x    ∂r0/∂P2y = −(P3x − P1x) ∂r0/∂P3y = P2x − P1x
 *
 * All z-partials and partials w.r.t. P0, P4..P7 are zero.  Likewise for r1
 * with (P4,P5,P6) in place of (P1,P2,P3).
 */
function collinearityJacobianRows(p: Float64Array, J: Float64Array): void {
  const row0 = K_CONE * N;  // = 7 * 24 = 168
  const row1 = row0 + N;    // = 8 * 24 = 192

  // Row for r0: zero it first (coneAngleJacobian wrote cone-vertex-7 here)
  J.fill(0, row0, row0 + N);
  J[row0 + 3]  =  p[7]  - p[10]; // ∂r0/∂P1x
  J[row0 + 4]  =  p[9]  - p[6];  // ∂r0/∂P1y
  J[row0 + 6]  =  p[10] - p[4];  // ∂r0/∂P2x
  J[row0 + 7]  = -(p[9] - p[3]); // ∂r0/∂P2y
  J[row0 + 9]  = -(p[7] - p[4]); // ∂r0/∂P3x
  J[row0 + 10] =  p[6]  - p[3];  // ∂r0/∂P3y

  // Row for r1
  J.fill(0, row1, row1 + N);
  J[row1 + 12] =  p[16] - p[19];  // ∂r1/∂P4x
  J[row1 + 13] =  p[18] - p[15];  // ∂r1/∂P4y
  J[row1 + 15] =  p[19] - p[13];  // ∂r1/∂P5x
  J[row1 + 16] = -(p[18] - p[12]);// ∂r1/∂P5y
  J[row1 + 18] = -(p[16] - p[13]);// ∂r1/∂P6x
  J[row1 + 19] =  p[15] - p[12];  // ∂r1/∂P6y
}

// ---------------------------------------------------------------------------
// Dense linear solver (Gauss elimination with partial pivoting)
// ---------------------------------------------------------------------------

/**
 * Solves the k×k system encoded in aug (k rows × (k+1) cols, last col = RHS)
 * by Gauss elimination with partial pivoting.  Writes the solution into out.
 * Returns false if a pivot is unrecoverably small (singular or near-singular).
 * Mutates aug in place.
 */
function solveDense(aug: Float64Array, out: Float64Array, k: number): boolean {
  const stride = k + 1;
  for (let col = 0; col < k; col++) {
    let best = col, bestAbs = Math.abs(aug[col * stride + col]);
    for (let row = col + 1; row < k; row++) {
      const a = Math.abs(aug[row * stride + col]);
      if (a > bestAbs) { best = row; bestAbs = a; }
    }
    if (bestAbs < 1e-30) return false;
    if (best !== col) {
      for (let j = 0; j < stride; j++) {
        const tmp = aug[col * stride + j];
        aug[col * stride + j] = aug[best * stride + j];
        aug[best * stride + j] = tmp;
      }
    }
    const piv = aug[col * stride + col];
    for (let row = col + 1; row < k; row++) {
      const factor = aug[row * stride + col] / piv;
      for (let j = col; j < stride; j++) {
        aug[row * stride + j] -= factor * aug[col * stride + j];
      }
    }
  }
  for (let i = k - 1; i >= 0; i--) {
    let s = aug[i * stride + k];
    for (let j = i + 1; j < k; j++) s -= aug[i * stride + j] * out[j];
    out[i] = s / aug[i * stride + i];
  }
  return true;
}

function infNorm(v: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < v.length; i++) { const a = Math.abs(v[i]); if (a > m) m = a; }
  return m;
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
 * Additionally, z-coordinates of P1..P6 (FROZEN_Z = [5,8,11,14,17,20]) are
 * kept exactly at zero by zeroing those columns of J before forming the
 * normal equations.  This implements the XY-plane constraint via the
 * projection approach (see notes/semi-solutions.tex §4).
 *
 * By discrete Gauss-Bonnet, vertex 7's cone deficit is zero whenever vertices
 * 0..6 are flat, so F₇ (= vertex 7's deficit) is dropped from the constraint
 * system; convergence is measured on the full 8-vector including it.
 *
 * Mutates `positions` in place.
 */
export function semiSolutionFlatten(
  torus: Torus,
  positions: Float64Array,
  opts: SemiNewtonOpts = {},
): SemiNewtonResult {
  const tol = opts.tolerance ?? 1e-12;
  const maxIters = opts.maxIters ?? 80;
  const lambda = opts.damping ?? 1e-12;

  // Pre-allocated working buffers.
  // J is K×N = 9×24.  coneAngleJacobian fills rows 0..7 (as an 8×24 view);
  // collinearityJacobianRows then overwrites rows 7..8 with collinearity.
  const J    = new Float64Array(K * N);
  const Fcone = new Float64Array(torus.vertexCount);  // all 8 cone deficits
  const Fcoll = new Float64Array(2);
  const aug  = new Float64Array(K * (K + 1));
  const w    = new Float64Array(K);

  coneAngleDeficits(torus, positions, Fcone);
  collinearityResiduals(positions, Fcoll);
  let coneNorm   = infNorm(Fcone);
  let collinNorm = infNorm(Fcoll);

  for (let iter = 0; iter <= maxIters; iter++) {
    if (coneNorm < tol && collinNorm < tol) {
      return { status: 'converged', iters: iter, coneResidual: coneNorm, collinearResidual: collinNorm };
    }
    if (!isFinite(coneNorm + collinNorm) || coneNorm > 1e8) {
      return { status: 'diverged', iters: iter, coneResidual: coneNorm, collinearResidual: collinNorm };
    }
    if (iter === maxIters) break;

    // Build Jacobian.
    // coneAngleJacobian fills all K*N entries of J with zeros first (out.fill(0)),
    // then writes cone gradient rows 0..7.  collinearityJacobianRows overwrites
    // rows 7..8 (replacing cone-vertex-7 with collinearity r0, and filling row 8
    // with collinearity r1).
    coneAngleJacobian(torus, positions, J);
    collinearityJacobianRows(positions, J);

    // Zero frozen z-coordinate columns: those positions receive no Newton step.
    for (const c of FROZEN_Z) {
      for (let r = 0; r < K; r++) J[r * N + c] = 0;
    }

    // Normal equations: aug = [G + λI | F],  G = JJᵀ  (K×K symmetric)
    const stride = K + 1;
    for (let i = 0; i < K; i++) {
      for (let j = i; j < K; j++) {
        let s = 0;
        for (let c = 0; c < N; c++) s += J[i * N + c] * J[j * N + c];
        aug[i * stride + j] = s;
        aug[j * stride + i] = s;
      }
      aug[i * stride + i] += lambda;
      aug[i * stride + K] = i < K_CONE ? Fcone[i] : Fcoll[i - K_CONE];
    }

    if (!solveDense(aug, w, K)) {
      return { status: 'diverged', iters: iter, coneResidual: coneNorm, collinearResidual: collinNorm };
    }

    // x ← x − Jᵀ w
    for (let c = 0; c < N; c++) {
      let s = 0;
      for (let r = 0; r < K; r++) s += J[r * N + c] * w[r];
      positions[c] -= s;
    }

    // Re-clamp frozen z-coordinates to exactly 0 to prevent float drift.
    for (const c of FROZEN_Z) positions[c] = 0;

    coneAngleDeficits(torus, positions, Fcone);
    collinearityResiduals(positions, Fcoll);
    coneNorm   = infNorm(Fcone);
    collinNorm = infNorm(Fcoll);
  }

  return { status: 'max-iters', iters: maxIters, coneResidual: coneNorm, collinearResidual: collinNorm };
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
export function scanSemiSolutions(torus: Torus, opts: ScanOpts): SemiSolution[] {
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
