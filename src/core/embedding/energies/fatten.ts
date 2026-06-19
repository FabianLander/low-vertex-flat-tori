/**
 * FATTEN (near-miss) energies: alive in Ω's *interior*, so descending one pushes a
 * barely-embedded torus DEEPER inside Ω — opening up its clearance (the overlap
 * energies can't: their gradient is zero once embedded). Both reduce the cell-gap
 * substrate `separation.forEachCellGap`; gradients finite-differenced.
 *
 *   cellMargin   Σ hinge_ε(d̃)    — finite hinge; zero once every gap ≥ ε
 *   cellBarrier  Σ −μ·log(d̃/δ)   — log barrier; → +∞ at contact, so it can't cross ∂Ω
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import type { ScalarFn } from '@core/functions/types.ts';
import { fdScalar } from '@core/functions/compose.ts';
import { segmentTriangleDist2 } from '@core/geometry/distance.ts';
import { forEachCellGap, linearSize } from '../separation.ts';
import { cellTables } from '../cells.ts';

export interface CellMarginOptions {
  /** Margin target ε, in units of √area. Default 0.1. */
  epsilon?: number;
  /** Per-pair penalty height c at contact. Default 1. */
  weight?: number;
}

/**
 * Σ hinge_ε(d̃) over the cell gaps: each pair below ε costs c·(ε−d̃)/ε, so E = 0 once
 * every pair is ≥ ε apart. Alive in Ω's interior (penalizes near-misses), so
 * descending it fattens a barely-embedded torus to margin ε.
 */
export function makeCellMargin(triang: Triangulation, opts: CellMarginOptions = {}): ScalarFn {
  const eps = opts.epsilon ?? 0.1;
  const weight = opts.weight ?? 1;
  const invEps = 1 / eps;
  return fdScalar(`cell-margin (ε=${eps}, c=${weight})`, (p) => {
    let E = 0;
    forEachCellGap(triang, p, (g) => { if (g < eps) E += weight * (1 - g * invEps); });
    return E;
  });
}

export interface CellBarrierOptions {
  /** Cutoff radius δ, in units of √area: the barrier is active only within δ. Default 0.1. */
  delta?: number;
  /** Barrier strength μ. Default 1. */
  strength?: number;
}

/**
 * Σ −μ·log(d̃/δ) over the gaps within δ. Unlike `cellMargin`'s finite hinge, this is a
 * BARRIER: → +∞ as any gap → 0, so descending it settles at an equilibrium strictly
 * INSIDE the embedded set (it fattens AND can't be pushed across the boundary, because
 * the separating force grows without bound near contact). It watches exactly what
 * `isEmbedded` tests — the six non-adjacent cell-gap types (via `forEachCellGap`) PLUS
 * the shared-vertex pairs' opposite-edge ↔ opposite-triangle gaps (the adjacent
 * configurations that are the other half of the embedding test). Gaps are normalized by
 * √area (scale-free). Its gradient is stiff near contact — `flow`'s backtracking step
 * handles that by shrinking the step.
 */
export function makeCellBarrier(triang: Triangulation, opts: CellBarrierOptions = {}): ScalarFn {
  const delta = opts.delta ?? 0.1;
  const strength = opts.strength ?? 1;
  const FLOOR = 1e-9;   // clamp d̃ so −log stays finite if a pair is essentially touching
  const barrier = (d: number): number =>
    d >= delta ? 0 : -strength * Math.log((d < FLOOR ? FLOOR : d) / delta);
  const { sharedVertexTrianglePairs } = cellTables(triang);

  return fdScalar(`cell-barrier (δ=${delta}, μ=${strength})`, (p) => {
    let E = 0;
    forEachCellGap(triang, p, (g) => { E += barrier(g); });   // six non-adjacent cell-gap types
    // Shared-vertex pairs: each triangle's opposite edge vs the other's triangle —
    // the embedding-critical adjacent gaps, normalized by √area like the cell gaps.
    const invL = 1 / linearSize(triang, p);
    for (const pair of sharedVertexTrianglePairs) {
      const ta = triang.triangles[pair.a], tb = triang.triangles[pair.b];
      E += barrier(edgeTriGap(p, pair.aOpp[0], pair.aOpp[1], tb[0], tb[1], tb[2]) * invL);
      E += barrier(edgeTriGap(p, pair.bOpp[0], pair.bOpp[1], ta[0], ta[1], ta[2]) * invL);
    }
    return E;
  });
}

/** Euclidean distance from edge (u,w) to the filled triangle (a,b,c). */
function edgeTriGap(
  p: ArrayLike<number>, u: number, w: number, a: number, b: number, c: number,
): number {
  const ou = 3 * u, ow = 3 * w, oa = 3 * a, ob = 3 * b, oc = 3 * c;
  return Math.sqrt(segmentTriangleDist2(
    p[ou], p[ou + 1], p[ou + 2], p[ow], p[ow + 1], p[ow + 2],
    p[oa], p[oa + 1], p[oa + 2], p[ob], p[ob + 1], p[ob + 2], p[oc], p[oc + 1], p[oc + 2],
  ));
}
