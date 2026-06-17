/**
 * embedded — the OPEN condition Ω = { embedded realizations }, as a `Region`.
 *
 * This is the "tiny open set" the search must stay inside. A thin adapter over the
 * existing geometry primitives (it does NOT reimplement them — those get rehomed
 * into `geometry/`/`functions/` during the refactor):
 *   contains   = isEmbedded            — the TOPOLOGICAL truth (no triangle interiors cross)
 *   margin     = minMargin(...).margin — the smallest normalized gap (diagnostic only)
 *   enterEnergy = cell-margin (REPULSION: zero once every pair is ≥ ε apart — reach Ω / fatten)
 *   stayEnergy  = cell-barrier (BARRIER: →∞ at contact — hold strictly inside, never cross out)
 *
 * NB `contains` is `isEmbedded`, NOT `margin > 0`: embeddedness is the topological
 * intersection test, which differs from the geometric gap at the boundary and on
 * edge-shared pairs. The gate must be the truth, not its surrogate.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import type { Region } from '../solvers/types.ts';
import type { ScalarFn } from '../functions/types.ts';
import { isEmbedded } from '../math/embedded.ts';
import { minMargin } from '../functions/minMargin.ts';
import { makeCellMargin } from '../math/energies/cellMargin.ts';
import { makeCellBarrier } from '../math/energies/cellBarrier.ts';

export interface EmbeddedOptions {
  /** Fatness target for the enter (repulsion) energy, in units of √area. */
  epsilon?: number;
  /** Cutoff radius for the stay (barrier) energy, in units of √area. */
  delta?: number;
  /** Barrier strength μ. */
  strength?: number;
}

export function embedded(torus: Triangulation, opts: EmbeddedOptions = {}): Region {
  return {
    label: 'embedded',
    contains(c) {
      return isEmbedded(torus, c);
    },
    margin(c) {
      return minMargin(torus, c).margin;
    },
    enterEnergy(): ScalarFn {
      return makeCellMargin(torus, { epsilon: opts.epsilon });
    },
    stayEnergy(): ScalarFn {
      return makeCellBarrier(torus, { delta: opts.delta, strength: opts.strength });
    },
  };
}
