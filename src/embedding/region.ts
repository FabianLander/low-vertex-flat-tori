/**
 * embedded — the open condition Ω = { embedded realizations }, as a `Region`: the
 * topological gate (`isEmbedded`) and a signed-depth diagnostic (`minMargin`). The
 * gate is the *truth* (no triangle interiors cross), NOT `margin > 0` — the two
 * disagree at the boundary. The energies that drive a config toward Ω live in
 * `energies.ts` and are taken by `flow` explicitly (the Region doesn't dispense
 * them).
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import { isEmbedded } from './gate.ts';
import { minMargin } from './margin.ts';

/**
 * An OPEN condition Ω (the "tiny open set" the search lives inside): a predicate
 * `contains` gate and a signed `margin` diagnostic — the genuinely non-smooth parts
 * (the gate is the topological truth, exactly `isEmbedded`, NOT `margin > 0`). The
 * energies that drive a config toward Ω are plain scalar `Fn`s `flow` takes
 * explicitly — the Region doesn't dispense them. A `Region` is an AMBIENT condition
 * (on ℝ³ⱽ); the search pulls its `contains` to a working-space `Gate` (`search/pull`).
 */
export interface Region {
  readonly label: string;
  contains(c: ArrayLike<number>): boolean;   // the gate
  margin(c: ArrayLike<number>): number;      // signed depth — diagnostic only
}

export function embedded(triang: Triangulation): Region {
  return {
    label: 'embedded',
    contains: (c) => isEmbedded(triang, c),
    margin: (c) => minMargin(triang, c).margin,
  };
}
