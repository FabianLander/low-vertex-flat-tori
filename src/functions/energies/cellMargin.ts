/**
 * cellMargin — the FATTENING energy: a near-miss repulsion that pushes
 * non-adjacent cells apart until they are all ≥ ε apart, then stops.
 *
 *     E = Σ_pairs  hinge_ε(d̃),   hinge_ε(d̃) = c·max(0, (ε − d̃)/ε)
 *
 * over the shared `cellGaps` stream (d̃ = normalized gap). Each too-close pair
 * costs `c` at contact, falling linearly to 0 at d̃ = ε, so **E = 0 exactly when
 * every pair is ≥ ε apart** ("embedded with margin ε"). Scale-free (gaps are
 * /√area), so the descent fattens by changing *shape*, not by inflating.
 *
 * This is the piece Fabi's `chordLengthSquared`/`cutOffArea` cannot do: those are
 * zero on the whole embedded set (they penalize *overlaps*), so they have no
 * gradient in the interior of Ω. `cellMargin` is alive in the interior — it
 * penalizes *near-misses* — so descending it (gated embedded, holding `flat`)
 * drives a barely-embedded torus to a robust margin, giving `march` room to move.
 *
 * Rebuilt clean on `functions/cellGaps.forEachCellGap` (the parked
 * `math/energies/cellMargin.ts` was the copy-paste original). Gradient via `fdScalar`.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../../topology/triangulation.ts';
import type { ScalarFn } from '../types.ts';
import { forEachCellGap } from '../cellGaps.ts';
import { fdScalar } from '../compose.ts';

export interface CellMarginOptions {
  /** Margin target ε, in units of √area. Default 0.1. */
  epsilon?: number;
  /** Per-pair penalty height c at contact. Default 1. */
  weight?: number;
}

export function makeCellMargin(torus: Triangulation, opts: CellMarginOptions = {}): ScalarFn {
  const eps = opts.epsilon ?? 0.1;
  const weight = opts.weight ?? 1;
  const invEps = 1 / eps;
  return fdScalar(`cell-margin (ε=${eps}, c=${weight})`, (p) => {
    let E = 0;
    forEachCellGap(torus, p, (g) => { if (g < eps) E += weight * (1 - g * invEps); });
    return E;
  });
}
