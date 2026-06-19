/**
 * OVERLAP energies (Fabi's — the ones that found the tori): zero on the whole
 * embedded set, positive ∝ penetration, so descending one drives a *crossing* torus
 * ONTO Ω. (Once embedded their gradient is zero — fattening is the fatten energies'
 * job, `./fatten`.) Gradients are finite-differenced (`fdScalar`).
 *
 *   chordLengthSquared  Σ ℓ(A,B)²                  (squared intersection chord)
 *   cutOffArea          Σ ℓ² · (smaller-piece-area ratios)
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import type { ScalarFn } from '@core/functions/types.ts';
import { fdScalar } from '@core/functions/compose.ts';
import { triTriChord, planeCutRatio, type ChordResult } from '@core/geometry/intersection.ts';
import { cellTables } from '../cells.ts';

/** Buffer adapter: the intersection chord of faces `tA`,`tB`, reading their corners
 *  out of `p` for the coordinates-only `triTriChord`. */
function pairChord(
  triangles: readonly (readonly number[])[],
  p: ArrayLike<number>,
  tA: number,
  tB: number,
): ChordResult | null {
  const A = triangles[tA], B = triangles[tB];
  const a0 = 3 * A[0], a1 = 3 * A[1], a2 = 3 * A[2], b0 = 3 * B[0], b1 = 3 * B[1], b2 = 3 * B[2];
  return triTriChord(
    p[a0], p[a0 + 1], p[a0 + 2], p[a1], p[a1 + 1], p[a1 + 2], p[a2], p[a2 + 1], p[a2 + 2],
    p[b0], p[b0 + 1], p[b0 + 2], p[b1], p[b1 + 1], p[b1 + 2], p[b2], p[b2 + 1], p[b2 + 2],
  );
}

/** Σ of squared intersection-chord lengths over non-adjacent triangle pairs. */
export function makeChordLengthSquared(triang: Triangulation): ScalarFn {
  const tris = triang.triangles;
  const { disjointTrianglePairs, sharedVertexTrianglePairs } = cellTables(triang);
  return fdScalar('chord length²', triang.vertexCount * 3, (positions) => {
    let E = 0;
    for (const [tA, tB] of disjointTrianglePairs) {
      const c = pairChord(tris, positions, tA, tB);
      if (c) E += c.length * c.length;
    }
    for (const pair of sharedVertexTrianglePairs) {
      const c = pairChord(tris, positions, pair.a, pair.b);
      if (c) E += c.length * c.length;
    }
    return E;
  });
}

function pairCutOffEnergy(triang: Triangulation, positions: ArrayLike<number>, tA: number, tB: number): number {
  const A = triang.triangles[tA], B = triang.triangles[tB];
  const oa0 = 3 * A[0], oa1 = 3 * A[1], oa2 = 3 * A[2];
  const ob0 = 3 * B[0], ob1 = 3 * B[1], ob2 = 3 * B[2];

  const a0x = positions[oa0], a0y = positions[oa0 + 1], a0z = positions[oa0 + 2];
  const a1x = positions[oa1], a1y = positions[oa1 + 1], a1z = positions[oa1 + 2];
  const a2x = positions[oa2], a2y = positions[oa2 + 1], a2z = positions[oa2 + 2];
  const b0x = positions[ob0], b0y = positions[ob0 + 1], b0z = positions[ob0 + 2];
  const b1x = positions[ob1], b1y = positions[ob1 + 1], b1z = positions[ob1 + 2];
  const b2x = positions[ob2], b2y = positions[ob2 + 1], b2z = positions[ob2 + 2];

  const c = triTriChord(
    a0x, a0y, a0z, a1x, a1y, a1z, a2x, a2y, a2z,
    b0x, b0y, b0z, b1x, b1y, b1z, b2x, b2y, b2z,
  );
  if (!c) return 0;

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
  return fdScalar('cut-off area (chord²-modulated)', triang.vertexCount * 3, (positions) => {
    let E = 0;
    for (const [tA, tB] of disjointTrianglePairs) E += pairCutOffEnergy(triang, positions, tA, tB);
    for (const pair of sharedVertexTrianglePairs) E += pairCutOffEnergy(triang, positions, pair.a, pair.b);
    return E;
  });
}
