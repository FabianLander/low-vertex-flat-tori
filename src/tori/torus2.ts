/**
 * Triangulation #2 — combinatorial type 2 of the 8-vertex flat torus (TORUS_8V[1]).
 *
 * The marking is attached by defineTriangulation from the saved cache (markings.ts),
 * or a layout-free fallback if none is saved yet. See npm run compute-markings.
 */

import { TORUS_8V } from '../../tori';
import { defineTriangulation } from './triangulation';

export const torus2 = defineTriangulation({ id: 2, name: 'type2', triangles: TORUS_8V[1] });
