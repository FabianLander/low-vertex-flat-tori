/**
 * Triangulation #4 — combinatorial type 4 of the 8-vertex flat torus (TORUS_8V[3]).
 *
 * The marking is attached by defineTriangulation from the saved cache (markings.ts),
 * or a layout-free fallback if none is saved yet. See npm run compute-markings.
 */

import { TORUS_8V } from '../../tori';
import { defineTriangulation } from './triangulation';

export const torus4 = defineTriangulation({ id: 4, name: 'type4', triangles: TORUS_8V[3] });
