/**
 * discover — the foundational search: find flat embedded tori (any modulus).
 *
 *   seed → project([flat]) → flow([flat], energy, region = embedded) → certify
 *
 * An instance of the shared `flattenFlowEmbed` recipe with `held = [flat]` and
 * acceptance = flat-to-tolerance ∧ embedded. The verification is a final gate:
 * `flow` only *thinks* it converged; `certify`'s `coneDeficit`/`embedded` are truth.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import { flat } from '../conditions/flat.ts';
import { flattenFlowEmbed, type FlowSearchOptions } from './recipe.ts';
import type { Certificate } from './certify.ts';

export interface DiscoverOptions extends FlowSearchOptions {
  /** Accept threshold on the flatness residual max|2π−θ|. Default 1e-10. */
  angleTol?: number;
}

export function discoverAttempt(
  torus: Triangulation,
  opts: DiscoverOptions,
): (seed: Float64Array) => Certificate | null {
  const held = [flat(torus)];
  const angleTol = opts.angleTol ?? 1e-10;
  return flattenFlowEmbed(torus, () => held, (c) => c.coneDeficit < angleTol && c.embedded, opts);
}
