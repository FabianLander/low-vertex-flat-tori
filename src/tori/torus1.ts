/**
 * Triangulation #1 — combinatorial type 1 of the 8-vertex flat torus (TORUS_8V[0]).
 *
 * The marking is attached by defineTriangulation from the saved cache (markings.ts),
 * or a layout-free fallback if none is saved yet. See npm run compute-markings.
 */

import { TORUS_8V } from '../../tori';
import { defineTriangulation } from './triangulation';

export const torus1 = defineTriangulation({ id: 1, name: 'type1', triangles: TORUS_8V[0] });
