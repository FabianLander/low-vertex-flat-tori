/**
 * full — the trivial coordinate system: the whole space ℝ³ⱽ, nothing restricted
 * (φ = id). The default ConfigSpace of a triangulation.
 *
 * A coordinate system is a map (`Fn`) φ : ℝⁿ → ℝ³ⱽ paired (via `makeConfigSpace`)
 * with a triangulation; see `configuration/space.ts` for the machinery. Pure: no
 * three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import { identity } from '@core/functions/compose.ts';
import { makeConfigSpace, type ConfigSpace } from '@core/configuration/space.ts';

/** The default configuration space of `triang`: all of ℝ³ⱽ, nothing restricted (φ = id,
 *  Dφ = I). Because φ is the branded `identity`, `makeConfigSpace`'s `pull`/`pullScalar`
 *  (`compose(g, φ)`) short-circuit to `g` itself (`g ∘ id = g`) — zero pullback overhead,
 *  bit-identical to working ambiently. No per-instance override is needed: the identity
 *  fact lives in `compose`, not here. */
export function fullSpace(triang: Triangulation): ConfigSpace {
  const n = triang.vertexCount * 3;
  return makeConfigSpace(triang, identity(n), (p, outX) => { for (let i = 0; i < n; i++) outX[i] = p[i]; });
}
