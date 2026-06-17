/**
 * Triangulation #3 — combinatorial type 3 of the 8-vertex flat torus (TORUS_8V[2]).
 *
 * The marking is attached by defineTriangulation from the saved cache (markings.ts),
 * or a layout-free fallback if none is saved yet. See npm run compute-markings.
 */

import { TORUS_8V } from '../../tori';
import { defineTriangulation } from './triangulation';

export const torus3 = defineTriangulation({ id: 3, name: 'type3', triangles: TORUS_8V[2] });
