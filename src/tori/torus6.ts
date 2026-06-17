/**
 * Triangulation #6 — combinatorial type 6 of the 8-vertex flat torus (TORUS_8V[5]).
 *
 * The marking is attached by defineTriangulation from the saved cache (markings.ts),
 * or a layout-free fallback if none is saved yet. See npm run compute-markings.
 */

import { TORUS_8V } from '../../tori';
import { defineTriangulation } from './triangulation';

export const torus6 = defineTriangulation({ id: 6, name: 'type6', triangles: TORUS_8V[5] });
