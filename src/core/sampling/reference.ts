/**
 * Rich Schwartz's 8-vertex flat-torus embedding in ℝ³ — a known flat, embedded
 * realization of triangulation #7, kept as a fixture and search seed. This is
 * pure embedding data: the triangulation itself carries nothing about it.
 */

import { RICH } from '@core/triangulations';
import { paperTorusFromVec3s, type PaperTorus } from '@core/configuration/paperTorus.ts';
import type { Vec3 } from '@core/geometry/vec3.ts';

// Rich's canonical ℝ³ coordinates (decimal).
const RICH_COORDS: readonly Vec3[] = [
  [0.64, -0.20, 1.0],
  [-1.09, 0.38, 0.0206663266698444],
  [-0.25, 0.51, 0.0048531277065193],
  [0.78, 0.62, 0.0082275214556137],
  [-0.78, -0.62, 0.0082275214556137],
  [0.25, -0.51, 0.0048531277065193],
  [1.09, -0.38, 0.0206663266698444],
  [-0.64, 0.20, 1.0],
];

export const RICH_REFERENCE: PaperTorus = paperTorusFromVec3s(RICH, RICH_COORDS);
