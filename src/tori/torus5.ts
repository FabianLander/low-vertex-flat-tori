/**
 * Triangulation #5 — combinatorial type 5 of the 8-vertex flat torus (TORUS_8V[4]).
 *
 * The marking is attached by defineTriangulation from the saved cache (markings.ts),
 * or a layout-free fallback if none is saved yet. See npm run compute-markings.
 */

import { TORUS_8V } from '../../tori';
import { defineTriangulation } from './triangulation';

export const torus5 = defineTriangulation({ id: 5, name: 'type5', triangles: TORUS_8V[4] });
