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

import type { Triangulation } from '../../topology/triangulation.ts';
import type { ScalarFn } from '../../functions/types.ts';
import { fdScalar } from '../../functions/compose.ts';
import { triTriChord } from '../../geometry/intersectionChord.ts';
import { forEachCellGap } from './margin.ts';

// ─── overlap energies (Fabi's) ──────────────────────────────────────────────

/** Σ of squared intersection-chord lengths over non-adjacent triangle pairs. */
export function makeChordLengthSquared(torus: Triangulation): ScalarFn {
  const tris = torus.triangles;
  return fdScalar('chord length²', (positions) => {
    let E = 0;
    for (const [tA, tB] of torus.disjointTrianglePairs) {
      const A = tris[tA], B = tris[tB];
      const c = triTriChord(positions, 3 * A[0], 3 * A[1], 3 * A[2], 3 * B[0], 3 * B[1], 3 * B[2]);
      if (c) E += c.length * c.length;
    }
    for (const pair of torus.sharedVertexTrianglePairs) {
      const A = tris[pair.a], B = tris[pair.b];
      const c = triTriChord(positions, 3 * A[0], 3 * A[1], 3 * A[2], 3 * B[0], 3 * B[1], 3 * B[2]);
      if (c) E += c.length * c.length;
    }
    return E;
  });
}

const EPS = 1e-12;

/**
 * Ratio (smaller piece area / triangle area) ∈ [0, 0.5] of triangle `triIdx` cut by
 * a plane through `(refX,refY,refZ)` with normal `(npx,npy,npz)`. Zero if the plane
 * doesn't divide it. Both "two vertices opposite" and "one vertex on the plane"
 * reduce to min(t₁·t₂, 1 − t₁·t₂).
 */
function smallerPieceRatio(
  torus: Triangulation, positions: ArrayLike<number>, triIdx: number,
  npx: number, npy: number, npz: number, refX: number, refY: number, refZ: number,
): number {
  const T = torus.triangles[triIdx];
  const o0 = 3 * T[0], o1 = 3 * T[1], o2 = 3 * T[2];
  const v0x = positions[o0], v0y = positions[o0 + 1], v0z = positions[o0 + 2];
  const v1x = positions[o1], v1y = positions[o1 + 1], v1z = positions[o1 + 2];
  const v2x = positions[o2], v2y = positions[o2 + 1], v2z = positions[o2 + 2];

  const d0 = (v0x - refX) * npx + (v0y - refY) * npy + (v0z - refZ) * npz;
  const d1 = (v1x - refX) * npx + (v1y - refY) * npy + (v1z - refZ) * npz;
  const d2 = (v2x - refX) * npx + (v2y - refY) * npy + (v2z - refZ) * npz;
  if (d0 > EPS && d1 > EPS && d2 > EPS) return 0;
  if (d0 < -EPS && d1 < -EPS && d2 < -EPS) return 0;

  const s0 = d0 < -EPS ? -1 : 1, s1 = d1 < -EPS ? -1 : 1, s2 = d2 < -EPS ? -1 : 1;
  const numPos = (s0 > 0 ? 1 : 0) + (s1 > 0 ? 1 : 0) + (s2 > 0 ? 1 : 0);
  if (numPos === 0 || numPos === 3) return 0;

  const singleIsPos = numPos === 1;
  let dS: number, dO1: number, dO2: number;
  if ((s0 > 0) === singleIsPos)      { dS = d0; dO1 = d1; dO2 = d2; }
  else if ((s1 > 0) === singleIsPos) { dS = d1; dO1 = d2; dO2 = d0; }
  else                                { dS = d2; dO1 = d0; dO2 = d1; }

  const denom1 = dS - dO1, denom2 = dS - dO2;
  if (Math.abs(denom1) < EPS || Math.abs(denom2) < EPS) return 0;
  let prod = (dS / denom1) * (dS / denom2);
  if (prod < 0) prod = 0; else if (prod > 1) prod = 1;
  return Math.min(prod, 1 - prod);
}

function pairCutOffEnergy(torus: Triangulation, positions: ArrayLike<number>, tA: number, tB: number): number {
  const A = torus.triangles[tA], B = torus.triangles[tB];
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

  const eA1x = a1x - a0x, eA1y = a1y - a0y, eA1z = a1z - a0z;
  const eA2x = a2x - a0x, eA2y = a2y - a0y, eA2z = a2z - a0z;
  const nAx = eA1y * eA2z - eA1z * eA2y, nAy = eA1z * eA2x - eA1x * eA2z, nAz = eA1x * eA2y - eA1y * eA2x;
  const eB1x = b1x - b0x, eB1y = b1y - b0y, eB1z = b1z - b0z;
  const eB2x = b2x - b0x, eB2y = b2y - b0y, eB2z = b2z - b0z;
  const nBx = eB1y * eB2z - eB1z * eB2y, nBy = eB1z * eB2x - eB1x * eB2z, nBz = eB1x * eB2y - eB1y * eB2x;

  const ratioA = smallerPieceRatio(torus, positions, tA, nBx, nBy, nBz, b0x, b0y, b0z);
  const ratioB = smallerPieceRatio(torus, positions, tB, nAx, nAy, nAz, a0x, a0y, a0z);
  return c.length * c.length * (ratioA + ratioB);
}

/** Σ ℓ² · (smaller-piece-area ratios) — chord²-modulated cut-off area. */
export function makeCutOffArea(torus: Triangulation): ScalarFn {
  return fdScalar('cut-off area (chord²-modulated)', (positions) => {
    let E = 0;
    for (const [tA, tB] of torus.disjointTrianglePairs) E += pairCutOffEnergy(torus, positions, tA, tB);
    for (const pair of torus.sharedVertexTrianglePairs) E += pairCutOffEnergy(torus, positions, pair.a, pair.b);
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
export function makeCellMargin(torus: Triangulation, opts: CellMarginOptions = {}): ScalarFn {
  const eps = opts.epsilon ?? 0.1;
  const weight = opts.weight ?? 1;
  const invEps = 1 / eps;
  return fdScalar(`cell-margin (ε=${eps}, c=${weight})`, (p) => {
    let E = 0;
    forEachCellGap(torus, p, (g) => { if (g < eps) E += weight * (1 - g * invEps); });
    return E;
  });
}
