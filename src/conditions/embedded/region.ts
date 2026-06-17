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

import type { Triangulation } from '../../topology/triangulation.ts';
import type { Region } from '../../solvers/types.ts';
import { isEmbedded } from './gate.ts';
import { minMargin } from './margin.ts';

export function embedded(torus: Triangulation): Region {
  return {
    label: 'embedded',
    contains: (c) => isEmbedded(torus, c),
    margin: (c) => minMargin(torus, c).margin,
  };
}
