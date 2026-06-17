/**
 * Energy (Fabi's, α): sum of squared chord lengths over non-adjacent triangle
 * pairs — the proven repulsion that drives a self-intersecting torus onto the
 * embedded set.
 *
 *     E(x) = Σ_{(A,B) non-adj}  ℓ(A,B)²
 *
 * where ℓ(A,B) is the length of the intersection segment A ∩ B (zero if they
 * don't intersect). Properties:
 * - Defined and continuous on all of ℝ³ⱽ; = 0 exactly on the embedded set.
 * - C¹ at the boundary: ℓ grows linearly in penetration depth, so ℓ² is O(ε²) —
 *   the gradient vanishes smoothly at first contact, no kink.
 * - Gradient on the non-embedded side shortens every chord (separates the pairs).
 *
 * A scalar `Fn`; the gradient is finite-differenced (`fdScalar`).
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../../topology/triangulation.ts';
import { triTriChord } from '../../geometry/intersectionChord.ts';
import { fdScalar } from '../compose.ts';
import type { ScalarFn } from '../types.ts';

export function makeChordLengthSquared(torus: Triangulation): ScalarFn {
  const tris = torus.triangles;
  function compute(positions: ArrayLike<number>): number {
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
  }
  return fdScalar('chord length²', compute);
}
