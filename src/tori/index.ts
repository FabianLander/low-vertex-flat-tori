/**
 * Registry of the 7 combinatorial types of 8-vertex flat torus.
 *
 * `RICH` (#7) is the degree-6-regular type Rich Schwartz worked out; it is the
 * default used wherever the pipeline still needs a single torus during the
 * migration. `ALL_TORI` is ordered by id (1..7).
 */

export type { Torus, TorusSpec, Tri, Edge, Vec3, Attach } from './defineTorus';
export { defineTorus, edgeKey, autoDevelopOrder, homologyGenerators, VERTEX_COUNT } from './defineTorus';

import type { Torus } from './defineTorus';
import { torus1 } from './torus1';
import { torus2 } from './torus2';
import { torus3 } from './torus3';
import { torus4 } from './torus4';
import { torus5 } from './torus5';
import { torus6 } from './torus6';
import { torus7 } from './torus7';

export { torus1, torus2, torus3, torus4, torus5, torus6, torus7 };

export const ALL_TORI: readonly Torus[] = [torus1, torus2, torus3, torus4, torus5, torus6, torus7];

/** Rich's degree-6-regular torus — the historical default. */
export const RICH: Torus = torus7;

export function byId(id: number): Torus {
  const t = ALL_TORI.find((x) => x.id === id);
  if (!t) throw new Error(`no torus with id ${id}`);
  return t;
}
