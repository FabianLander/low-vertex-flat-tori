/**
 * The 7-vertex torus triangulation — the Möbius–Császár torus (V=7, E=21, F=14), the
 * vertex-minimal triangulation of the torus. As `TriangulationData`; the registry joins
 * it with its precomputed marking.
 *
 * Source: Frank H. Lutz, The Manifold Page (0-based, coherently oriented):
 *   https://www3.math.tu-berlin.de/IfM/Nachrufe/Frank_Lutz/stellar/surfaces.html
 */

import type { TriangulationData } from '@core/topology/triangulation.ts';

export const SEVEN_VERTEX: readonly TriangulationData[] = [
  { id: 'v7-1', label: 'Mobius-Csaszar', triangles: [[0,1,2],[0,3,1],[0,2,4],[0,5,3],[0,4,6],[0,6,5],[1,5,2],[1,3,6],[1,4,5],[1,6,4],[2,3,4],[2,6,3],[2,5,6],[3,5,4]] },
];
