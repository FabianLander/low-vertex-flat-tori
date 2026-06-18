/**
 * The embeddedness energies — scalar potentials `flow` descends toward Ω. They
 * belong to the embedded condition: each measures un-embeddedness (or near-miss)
 * and you only ever minimize them. Two families:
 *
 *   OVERLAP energies (Fabi's, the ones that found the tori) — zero on the whole
 *   embedded set, positive ∝ penetration, so they drive a *crossing* torus onto Ω:
 *     chordLengthSquared  Σ ℓ(A,B)²                     (squared intersection chord)
 *     cutOffArea          Σ ℓ² · (smaller-piece-area ratios)
 *
 *   NEAR-MISS energy — alive in Ω's interior, so it FATTENS a barely-embedded torus
 *   (the overlap energies can't: their gradient is zero once embedded):
 *     cellMargin          Σ hinge_ε(d̃)   over the cell gaps (zero once all ≥ ε apart)
 *
 * Gradients are finite-differenced (`fdScalar`). Overlap energies use the geometry
 * chord kernel; cellMargin reduces the shared `margin.forEachCellGap`.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import type { ScalarFn } from '../functions/types.ts';
import { fdScalar } from '../functions/compose.ts';
import { triTriChord } from '../geometry/intersectionChord.ts';
import { segmentTriangleDist2 } from '../geometry/distance.ts';
import { planeCutRatio } from '../geometry/triangle.ts';
import { forEachCellGap, linearSize } from './separation.ts';
import { cellTables } from './cells.ts';

// ─── overlap energies (Fabi's) ──────────────────────────────────────────────

/** Σ of squared intersection-chord lengths over non-adjacent triangle pairs. */
export function makeChordLengthSquared(triang: Triangulation): ScalarFn {
  const tris = triang.triangles;
  const { disjointTrianglePairs, sharedVertexTrianglePairs } = cellTables(triang);
  return fdScalar('chord length²', (positions) => {
    let E = 0;
    for (const [tA, tB] of disjointTrianglePairs) {
      const A = tris[tA], B = tris[tB];
      const c = triTriChord(positions, 3 * A[0], 3 * A[1], 3 * A[2], 3 * B[0], 3 * B[1], 3 * B[2]);
      if (c) E += c.length * c.length;
    }
    for (const pair of sharedVertexTrianglePairs) {
      const A = tris[pair.a], B = tris[pair.b];
      const c = triTriChord(positions, 3 * A[0], 3 * A[1], 3 * A[2], 3 * B[0], 3 * B[1], 3 * B[2]);
      if (c) E += c.length * c.length;
    }
    return E;
  });
}

function pairCutOffEnergy(triang: Triangulation, positions: ArrayLike<number>, tA: number, tB: number): number {
  const A = triang.triangles[tA], B = triang.triangles[tB];
  const oa0 = 3 * A[0], oa1 = 3 * A[1], oa2 = 3 * A[2];
  const ob0 = 3 * B[0], ob1 = 3 * B[1], ob2 = 3 * B[2];
  const c = triTriChord(positions, oa0, oa1, oa2, ob0, ob1, ob2);
  if (!c) return 0;

  const a0x = positions[oa0], a0y = positions[oa0 + 1], a0z = positions[oa0 + 2];
  const a1x = positions[oa1], a1y = positions[oa1 + 1], a1z = positions[oa1 + 2];
  const a2x = positions[oa2], a2y = positions[oa2 + 1], a2z = positions[oa2 + 2];
  const b0x = positions[ob0], b0y = positions[ob0 + 1], b0z = positions[ob0 + 2];
  const b1x = positions[ob1], b1y = positions[ob1 + 1], b1z = positions[ob1 + 2];
  const b2x = positions[ob2], b2y = positions[ob2 + 1], b2z = positions[ob2 + 2];

  // Raw (un-normalized) plane normal of each face — the cut ratio is scale-invariant
  // in it, so we skip the normalize that the unit-normal `triangleNormal` would add.
  const eA1x = a1x - a0x, eA1y = a1y - a0y, eA1z = a1z - a0z;
  const eA2x = a2x - a0x, eA2y = a2y - a0y, eA2z = a2z - a0z;
  const nAx = eA1y * eA2z - eA1z * eA2y, nAy = eA1z * eA2x - eA1x * eA2z, nAz = eA1x * eA2y - eA1y * eA2x;
  const eB1x = b1x - b0x, eB1y = b1y - b0y, eB1z = b1z - b0z;
  const eB2x = b2x - b0x, eB2y = b2y - b0y, eB2z = b2z - b0z;
  const nBx = eB1y * eB2z - eB1z * eB2y, nBy = eB1z * eB2x - eB1x * eB2z, nBz = eB1x * eB2y - eB1y * eB2x;

  // each triangle cut by the OTHER's plane → smaller-piece area ratio
  const ratioA = planeCutRatio(a0x, a0y, a0z, a1x, a1y, a1z, a2x, a2y, a2z, nBx, nBy, nBz, b0x, b0y, b0z);
  const ratioB = planeCutRatio(b0x, b0y, b0z, b1x, b1y, b1z, b2x, b2y, b2z, nAx, nAy, nAz, a0x, a0y, a0z);
  return c.length * c.length * (ratioA + ratioB);
}

/** Σ ℓ² · (smaller-piece-area ratios) — chord²-modulated cut-off area. */
export function makeCutOffArea(triang: Triangulation): ScalarFn {
  const { disjointTrianglePairs, sharedVertexTrianglePairs } = cellTables(triang);
  return fdScalar('cut-off area (chord²-modulated)', (positions) => {
    let E = 0;
    for (const [tA, tB] of disjointTrianglePairs) E += pairCutOffEnergy(triang, positions, tA, tB);
    for (const pair of sharedVertexTrianglePairs) E += pairCutOffEnergy(triang, positions, pair.a, pair.b);
    return E;
  });
}

// ─── near-miss energy (fattening) ───────────────────────────────────────────

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

// ─── near-miss energy (barrier) ─────────────────────────────────────────────

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
