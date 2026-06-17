/**
 * Registry of the 7 combinatorial types of 8-vertex flat torus.
 *
 * `RICH` (#7) is the degree-6-regular type Rich Schwartz worked out; it is the
 * default used wherever the pipeline still needs a single torus during the
 * migration. `ALL_TORI` is ordered by id (1..7).
 */

export type { Triangulation, TriangulationSpec, Tri, Edge, Vec3, Attach } from './triangulation';
export { defineTriangulation, edgeKey, edgeEnds, autoDevelopOrder, homologyGenerators } from './triangulation';

import type { Triangulation } from './triangulation';
import { torus1 } from './torus1';
import { torus2 } from './torus2';
import { torus3 } from './torus3';
import { torus4 } from './torus4';
import { torus5 } from './torus5';
import { torus6 } from './torus6';
import { torus7 } from './torus7';

export { torus1, torus2, torus3, torus4, torus5, torus6, torus7 };

export const ALL_TORI: readonly Triangulation[] = [torus1, torus2, torus3, torus4, torus5, torus6, torus7];

/** Rich's degree-6-regular torus — the historical default. */
export const RICH: Triangulation = torus7;

export function byId(id: number): Triangulation {
  const t = ALL_TORI.find((x) => x.id === id);
  if (!t) throw new Error(`no torus with id ${id}`);
  return t;
}
