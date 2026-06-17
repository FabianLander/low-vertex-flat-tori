/**
 * minMargin — the embedding diagnostic: how close the surface comes to touching
 * itself. The MIN reduction of the shared `cellGaps` primitive — the smallest
 * normalized gap over all non-adjacent cell pairs, and which pair realizes it.
 *
 * A *value* map, not an energy — `certify` records it, the embedded `Region`
 * reports it, the search scripts log it. (A gap ≥ ε means the cell-margin energy
 * is zero; the gate itself is `isEmbedded`, the topological truth, not `margin > 0`.)
 * The repulsion energies reduce the SAME `forEachCellGap` stream with Σ penalty.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import { forEachCellGap, type GapType } from './cellGaps.ts';

export { linearSize } from './cellGaps.ts';

export type MarginReport = {
  /** Smallest normalized gap d̃ = d/√area over all penalized pairs. */
  margin: number;
  /** Which pair type realizes it. */
  type: GapType;
  /** The two cell indices (meaning depends on type). */
  cells: [number, number];
};

/** The minimum normalized gap and which pair achieves it. Pure geometry. */
export function minMargin(torus: Triangulation, p: ArrayLike<number>): MarginReport {
  let best: MarginReport = { margin: Infinity, type: 'vv', cells: [-1, -1] };
  forEachCellGap(torus, p, (gap, type, a, b) => {
    if (gap < best.margin) best = { margin: gap, type, cells: [a, b] };
  });
  return best;
}
