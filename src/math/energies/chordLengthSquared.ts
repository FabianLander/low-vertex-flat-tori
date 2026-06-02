/**
 * Energy (α): sum of squared chord lengths over non-adjacent triangle pairs.
 *
 *     E(x) = Σ_{(A,B) non-adj}  ℓ(A,B)²
 *
 * where ℓ(A,B) is the length of the intersection segment A ∩ B (zero if they
 * don't intersect).
 *
 * Properties:
 * - Defined and continuous on all positions in R²⁴.
 * - = 0 exactly on the embedded subset of position space (clean stop).
 * - C¹ at the boundary: ℓ grows linearly in penetration depth, so ℓ² is O(ε²)
 *   — gradient vanishes smoothly at first contact, no kink.
 * - Gradient on the non-embedded side points toward shortening every chord
 *   (i.e., separating the offending pairs).
 *
 * Cost: ≈ 96 triTriChord calls per compute(). FD gradient is 48× that.
 */

import type { Torus } from '../../tori/defineTorus';
import { triTriChord } from '../intersectionChord';
import { fdGradient } from './finiteDiffGradient';
import type { RepulsionEnergy } from './types';

export function makeChordLengthSquared(torus: Torus): RepulsionEnergy {
  function compute(positions: ArrayLike<number>): number {
    let E = 0;
    for (const [tA, tB] of torus.disjointTrianglePairs) {
      const c = triTriChord(torus, positions, tA, tB);
      if (c) E += c.length * c.length;
    }
    for (const pair of torus.sharedVertexTrianglePairs) {
      const c = triTriChord(torus, positions, pair.a, pair.b);
      if (c) E += c.length * c.length;
    }
    return E;
  }
  return {
    label: 'chord length²',
    compute,
    gradient(positions, out) {
      fdGradient(compute, positions, out);
    },
  };
}
