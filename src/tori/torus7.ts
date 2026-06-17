/**
 * Triangulation #7 — Rich Schwartz's 8-vertex flat torus. The ONLY degree-6-regular
 * type (every vertex link is a hexagon), so it is the only one carrying the
 * equilateral triangular-lattice structure.
 *
 * This spec is authored from the historical `topology.TRIANGLES` labeling (NOT
 * the relabeled `TORUS_8V[6]`) so the built `RICH` torus is byte-identical to
 * the pre-refactor singleton — keeping #7's tests and figures unchanged.
 *
 * Sources:
 *   triangulation  rich/VertexMinimalPaper/8Vertex/Visual/TriangulationCombinatorics.java
 *   developOrder + generatorLoops  COMPUTED (canonicalDecoration, saved in markings.ts) — like every other type
 *   referenceCoords  rich/VertexMinimalPaper/8Vertex/mathematica_plotter
 */

import { defineTriangulation, type Tri, type Vec3 } from './triangulation';

const TRIANGLES: readonly Tri[] = [
  [3, 5, 6], [3, 2, 5], [3, 6, 4], [3, 0, 2], [3, 4, 1], [3, 1, 0],
  [5, 0, 6], [5, 2, 4], [5, 4, 7], [5, 7, 0],
  [6, 7, 4], [6, 0, 1], [6, 1, 7],
  [2, 1, 4], [2, 0, 7], [2, 7, 1],
];

// Rich's canonical R³ embedding (decimal). Manifest Z/2: R_z(π) pairs (0,7),(1,6),(2,5),(3,4).
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

export const torus7 = defineTriangulation({
  id: 7,
  name: 'type7 (Rich)',
  triangles: TRIANGLES,
  referenceCoords: RICH_COORDS,
  symmetryPairing: [[0, 7], [1, 6], [2, 5], [3, 4]],
});
