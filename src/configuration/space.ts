/**
 * ConfigSpace — the spine of the search. A triangulation `T` fixes the meaning of
 * coordinates (and the default space ℝ³ⱽ of all realizations); an `Embedding`
 * φ : ℝⁿ → ℝ³ⱽ presents the problem's actual configuration space ℝⁿ inside it. A
 * `ConfigSpace` is the pair (T, φ), and it is the COMPILER between the
 * triangulation's language ("pin these vertices", "impose this symmetry") and the
 * plain linear algebra the solvers run on.
 *
 * Four operations, two of them a dual pair along φ:
 *   pull(g)      φ*g = g∘φ : an ambient measurement (built from T, on ℝ³ⱽ) → a real
 *                `Fn` on ℝⁿ — the thing you optimize. (`precompose`.)
 *   push(x)      φ(x) : a problem-space point → its realization in ℝ³ⱽ.
 *   coords(p)    π(p) : an ambient config → its ℝⁿ coordinates. Left-inverse of push
 *                (a retraction onto the restricted space for off-space inputs); for SEEDS.
 *   paperTorus(x)  the (T, positions) boundary bundle for certify / IO / render.
 * plus metric(x) = Dφᵀ Dφ, the pullback metric (the canonical solver metric; the
 * solver currently defaults to I — see docs/math/configuration-space.md).
 *
 * Closed under restriction: each constructor returns a `ConfigSpace`, and an
 * embedding composed with another embedding is again an embedding, so a restriction
 * of a restriction is a `ConfigSpace` of the same kind.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import type { Fn, ScalarFn } from '../functions/types.ts';
import { precompose, precomposeScalar, type Embedding } from '../functions/compose.ts';
import type { PaperTorus } from './paperTorus.ts';

export interface ConfigSpace {
  readonly triang: Triangulation;
  /** φ : ℝⁿ → ℝ³ⱽ, the embedding presenting this space inside the full one. */
  readonly phi: Embedding;
  /** n — the problem's degrees of freedom (= φ.inDim). */
  readonly dim: number;
  /** 3V — the ambient configuration dimension (= φ.outDim). */
  readonly ambient: number;

  /** Pull an ambient `Fn` (on ℝ³ⱽ) back to a real `Fn` on ℝⁿ: φ*g = g∘φ. */
  pull(g: Fn): Fn;
  /** Pull an ambient `ScalarFn` (energy) back to ℝⁿ, preserving compute/grad. */
  pullScalar(g: ScalarFn): ScalarFn;
  /** push: φ(x) → ambient positions (length 3V). */
  push(x: ArrayLike<number>, outP: Float64Array): void;
  /** coords: read the ℝⁿ coordinates off an ambient config (left-inverse of push). */
  coords(p: ArrayLike<number>, outX: Float64Array): void;
  /** The pullback metric g(x) = Dφ(x)ᵀ Dφ(x), n×n row-major. */
  metric(x: ArrayLike<number>, outG: Float64Array): void;
  /** The (T, positions) boundary bundle at x. */
  paperTorus(x: ArrayLike<number>): PaperTorus;
}

// ─── the factory: attach the generic operations to (T, φ, coords) ─────────────

/**
 * Build a `ConfigSpace` from a triangulation, its embedding φ, and the coords
 * retraction π. The four operations + metric are generic in φ; only `coords` is
 * embedding-specific (the choice of retraction off the image), so each coordinate
 * system (`coordinates/`) supplies it. This is the machinery; the coordinate-system
 * INSTANCES (full / pin / symmetry / doyleSchwartz) live in `coordinates/`.
 */
export function makeConfigSpace(
  triang: Triangulation,
  phi: Embedding,
  coordsImpl: (p: ArrayLike<number>, outX: Float64Array) => void,
): ConfigSpace {
  const n = phi.inDim;
  const m = phi.outDim;
  const expected = triang.vertexCount * 3;
  if (m !== expected) {
    throw new Error(`ConfigSpace: φ.outDim ${m} ≠ 3·V ${expected} for ${triang.name}`);
  }
  return {
    triang,
    phi,
    dim: n,
    ambient: m,
    pull: (g) => precompose(g, phi),
    pullScalar: (g) => precomposeScalar(g, phi),
    push: (x, outP) => phi.value(x, outP),
    coords: coordsImpl,
    metric: (x, outG) => pullbackMetric(phi, x, outG),
    paperTorus: (x) => {
      const p = new Float64Array(m);
      phi.value(x, p);
      return { triang, positions: p };   // a literal — push already builds the right length
    },
  };
}

/** g(x) = Dφ(x)ᵀ Dφ(x), the n×n Gram matrix of φ's Jacobian columns (row-major). */
function pullbackMetric(phi: Embedding, x: ArrayLike<number>, outG: Float64Array): void {
  const m = phi.outDim, n = phi.inDim;
  const J = new Float64Array(m * n);
  phi.jacobian(x, J);                       // m×n, row-major (stride n)
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let s = 0;
      for (let r = 0; r < m; r++) s += J[r * n + i] * J[r * n + j];
      outG[i * n + j] = s;
      outG[j * n + i] = s;
    }
  }
}
