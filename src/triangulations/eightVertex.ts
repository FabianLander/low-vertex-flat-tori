/**
 * The seven combinatorial types of 8-vertex torus triangulation, as raw data.
 * Sources: types 1–6 from F. Lutz, The Manifold Page (0-indexed, coherently
 * oriented); type 7 (Rich) in Rich Schwartz's historical labeling.
 *
 * This is the census the registry maps through `defineTriangulation`. To add a
 * new vertex count, add a sibling census file (e.g. nineVertex.ts).
 */

import type { Tri } from '../topology/triangulation.ts';

export type CensusEntry = { readonly name: string; readonly triangles: readonly Tri[] };

export const EIGHT_VERTEX: readonly CensusEntry[] = [
  { name: 'type1', triangles: [[0,1,2],[0,3,1],[0,2,3],[1,4,2],[1,3,5],[1,6,4],[1,5,7],[1,7,6],[2,6,3],[2,4,7],[2,5,6],[2,7,5],[3,4,5],[3,7,4],[3,6,7],[4,6,5]] },
  { name: 'type2', triangles: [[0,1,2],[0,3,1],[0,2,4],[0,4,3],[1,5,2],[1,3,6],[1,4,5],[1,7,4],[1,6,7],[2,5,3],[2,3,7],[2,6,4],[2,7,6],[3,4,7],[3,5,6],[4,6,5]] },
  { name: 'type3', triangles: [[0,1,2],[0,3,1],[0,2,4],[0,4,3],[1,5,2],[1,3,6],[1,4,5],[1,7,4],[1,6,7],[2,6,4],[2,5,7],[2,7,6],[3,4,7],[3,5,6],[3,7,5],[4,6,5]] },
  { name: 'type4', triangles: [[0,1,2],[0,3,1],[0,2,4],[0,5,3],[0,4,5],[1,5,2],[1,3,4],[1,4,6],[1,6,5],[2,6,4],[2,5,7],[2,7,6],[3,7,4],[3,5,6],[3,6,7],[4,7,5]] },
  { name: 'type5', triangles: [[0,1,2],[0,3,1],[0,2,4],[0,5,3],[0,4,5],[1,5,2],[1,3,6],[1,6,4],[1,4,7],[1,7,5],[2,6,3],[2,3,7],[2,7,4],[2,5,6],[3,5,7],[4,6,5]] },
  { name: 'type6', triangles: [[0,1,2],[0,3,1],[0,2,4],[0,5,3],[0,4,5],[1,5,2],[1,3,6],[1,6,4],[1,4,7],[1,7,5],[2,7,4],[2,5,6],[2,6,7],[3,5,7],[3,7,6],[4,6,5]] },
  { name: 'type7 (Rich)', triangles: [[3,5,6],[3,2,5],[3,6,4],[3,0,2],[3,4,1],[3,1,0],[5,0,6],[5,2,4],[5,4,7],[5,7,0],[6,7,4],[6,0,1],[6,1,7],[2,1,4],[2,0,7],[2,7,1]] },
];
