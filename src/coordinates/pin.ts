/**
 * pin — coordinate systems that hold some coordinates FIXED: `pinCoords` (by flat
 * coord index) and `pinVertices` (by vertex + axis, the T-language form). The free
 * coordinates are the parameters; Dφ is the selection matrix of the free columns
 * (orthonormal). Used e.g. to pin the planar base z's of the Doyle–Schwartz family.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import type { Embedding } from '../functions/compose.ts';
import { makeConfigSpace, type ConfigSpace } from '../configuration/space.ts';

/**
 * The space with a set of COORDINATES held fixed at `pin` (default 0). φ scatters
 * the free coordinates back and writes `pin` into the frozen slots; `coords` keeps the
 * free coordinates. `frozen` are flat coord indices (vertex v, axis a → 3v + a).
 */
export function pinCoords(triang: Triangulation, frozen: readonly number[], pin = 0): ConfigSpace {
  const n = triang.vertexCount * 3;
  const frozenSet = new Set(frozen);
  const free: number[] = [];
  for (let i = 0; i < n; i++) if (!frozenSet.has(i)) free.push(i);
  const d = free.length;
  const phi: Embedding = {
    inDim: d,
    outDim: n,
    value(x, out) {
      for (const fi of frozenSet) out[fi] = pin;
      for (let k = 0; k < d; k++) out[free[k]] = x[k];
    },
    jacobian(_x, out) {
      out.fill(0);                          // n×d
      for (let k = 0; k < d; k++) out[free[k] * d + k] = 1;
    },
  };
  return makeConfigSpace(triang, phi, (p, outX) => { for (let k = 0; k < d; k++) outX[k] = p[free[k]]; });
}

/**
 * The space with given AXES of given VERTICES held fixed — the T-language form of
 * `pinCoords` (e.g. pin axis 2 = z of the base vertices to 0). `axes` defaults to
 * all three (pin the whole vertex).
 */
export function pinVertices(
  triang: Triangulation,
  vertices: readonly number[],
  axes: readonly number[] = [0, 1, 2],
  pin = 0,
): ConfigSpace {
  const frozen: number[] = [];
  for (const v of vertices) for (const a of axes) frozen.push(3 * v + a);
  return pinCoords(triang, frozen, pin);
}
