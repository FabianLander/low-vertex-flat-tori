/**
 * full — the trivial coordinate system: the whole space ℝ³ⱽ, nothing restricted
 * (φ = id). The default ConfigSpace of a triangulation.
 *
 * A coordinate system is a map (`Fn`) φ : ℝⁿ → ℝ³ⱽ paired (via `makeConfigSpace`)
 * with a triangulation; see `configuration/space.ts` for the machinery. Pure: no
 * three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import type { Fn } from '@core/functions/types.ts';
import { makeConfigSpace, type ConfigSpace } from '@core/configuration/space.ts';

/** The identity embedding ℝⁿ → ℝⁿ (φ = id, Dφ = I). */
function identityEmbedding(n: number): Fn {
  return {
    label: 'id',
    inDim: n,
    outDim: n,
    value(x, out) { for (let i = 0; i < n; i++) out[i] = x[i]; },
    jacobian(_x, out) { out.fill(0); for (let i = 0; i < n; i++) out[i * n + i] = 1; },
  };
}

/** The default configuration space of `triang`: all of ℝ³ⱽ, nothing restricted.
 *  Since φ = id, `pull`/`pullScalar` are the identity (g∘id = g) — the returned `Fn`
 *  is the ambient one unchanged, so the full-space path carries zero pullback overhead
 *  (and is bit-identical to working ambiently). */
export function fullSpace(triang: Triangulation): ConfigSpace {
  const n = triang.vertexCount * 3;
  const phi = identityEmbedding(n);
  const space = makeConfigSpace(triang, phi, (p, outX) => { for (let i = 0; i < n; i++) outX[i] = p[i]; });
  return { ...space, pull: (g) => g, pullScalar: (g) => g };
}
