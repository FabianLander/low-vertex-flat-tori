/**
 * Smoke-test energy: squared Euclidean distance from Rich's reference
 * coordinates in R²⁴.
 *
 * Not an embedded-ness energy at all — it's here so we can exercise
 * `embeddedFlow` with something whose behavior we already understand. The
 * flow with this energy should drive any starting point on the flatness
 * manifold F toward the nearest flat-and-on-F neighbor of Rich. Useful for
 * verifying the alternating loop converges before we plug in any real
 * embeddedness energy.
 */

import type { Torus } from '../../tori/defineTorus';
import type { RepulsionEnergy } from './types';

/**
 * Squared Euclidean distance from a torus's reference embedding in R^{3V}.
 * Requires `torus.referenceCoords` (only Rich's #7 has one today).
 */
export function makeDistanceFromRich(torus: Torus): RepulsionEnergy {
  if (!torus.referenceCoords) {
    throw new Error(`distance² energy needs a reference embedding; torus #${torus.id} has none`);
  }
  const ref = Float64Array.from(torus.referenceCoords.flat());
  return {
    label: `distance² from reference (#${torus.id})`,
    compute(positions) {
      let s = 0;
      for (let i = 0; i < positions.length; i++) {
        const d = positions[i] - ref[i];
        s += d * d;
      }
      return s;
    },
    gradient(positions, out) {
      for (let i = 0; i < positions.length; i++) {
        out[i] = 2 * (positions[i] - ref[i]);
      }
    },
  };
}
