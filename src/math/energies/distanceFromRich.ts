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

import { RICH_REFERENCE } from '../reference';
import type { RepulsionEnergy } from './types';

export const DISTANCE_FROM_RICH: RepulsionEnergy = {
  label: 'distance² from Rich',
  compute(positions) {
    const ref = RICH_REFERENCE.positions;
    let s = 0;
    for (let i = 0; i < positions.length; i++) {
      const d = positions[i] - ref[i];
      s += d * d;
    }
    return s;
  },
  gradient(positions, out) {
    const ref = RICH_REFERENCE.positions;
    for (let i = 0; i < positions.length; i++) {
      out[i] = 2 * (positions[i] - ref[i]);
    }
  },
};
