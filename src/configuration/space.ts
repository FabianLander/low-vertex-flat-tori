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
 * embedding-specific (the choice of retraction off the image), so each constructor
 * supplies it.
 */
function makeConfigSpace(
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

// ─── the full space ───────────────────────────────────────────────────────────

/** The identity embedding ℝⁿ → ℝⁿ (φ = id, Dφ = I). */
function identityEmbedding(n: number): Embedding {
  return {
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

// ─── pinned coordinates ─────────────────────────────────────────────────────────

/**
 * The space with a set of COORDINATES held fixed at `pin` (default 0). φ scatters
 * the free coordinates back and writes `pin` into the frozen slots; Dφ is the
 * selection matrix of the free columns (orthonormal). `coords` keeps the free
 * coordinates. `frozen` are flat coord indices (vertex v, axis a → 3v + a).
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

// ─── symmetry ───────────────────────────────────────────────────────────────────

export type Reflection = readonly [number, number, number];
export type Pairing = readonly (readonly [number, number])[];

/** Rich's ρ-symmetry: the involution ρ(u,v,w) = (−u,−v,w) with the antipodal
 *  vertex pairing of the 8-vertex torus. */
export const RICH_SYMMETRY: { reflection: Reflection; pairing: Pairing } = {
  reflection: [-1, -1, 1],
  pairing: [[0, 7], [1, 6], [2, 5], [3, 4]],
};

interface SymCoord {
  src: number;   // C-index of the representative coordinate (3a + k)
  dst: number;   // C-index of the determined partner coordinate (3b + k), or -1
  sign: number;  // the axis sign R[k]
}

/**
 * The space of configurations invariant under a linear involution `R` (a per-axis
 * sign `reflection`) plus a vertex `pairing`: P_{partner(a)} = R·P_a. Each 2-cycle
 * contributes its representative's 3 coordinates as free parameters (the partner is
 * determined); a fixed/unpaired vertex contributes only R's +1-eigenspace
 * coordinates (the −1 ones pinned to 0). For Rich's 4-pair ρ on an 8-vertex torus,
 * ℝ²⁴ ↦ ℝ¹², every realized config EXACTLY symmetric.
 *
 * Dφ's columns have norm √2 (rep + determined partner), so the pullback metric is
 * 2·I on the paired coordinates — uniform, hence harmless under the solver's current
 * g = I (it only rescales the step). `coords` is the orthogonal projection onto the
 * invariant subspace, then read the reps (the old `applyZ2`).
 */
export function symmetry(
  triang: Triangulation,
  pairing: Pairing = RICH_SYMMETRY.pairing,
  reflection: Reflection = RICH_SYMMETRY.reflection,
): ConfigSpace {
  const ambient = triang.vertexCount * 3;
  const V = triang.vertexCount;
  const partnerOf = new Array<number>(V).fill(-1);
  for (const [a, b] of pairing) { partnerOf[a] = b; partnerOf[b] = a; }

  const cs: SymCoord[] = [];
  const pinned: number[] = [];
  for (let v = 0; v < V; v++) {
    const p = partnerOf[v];
    if (p === -1) {
      for (let k = 0; k < 3; k++) {
        if (reflection[k] === 1) cs.push({ src: 3 * v + k, dst: -1, sign: 1 });
        else pinned.push(3 * v + k);
      }
    } else if (v < p) {
      for (let k = 0; k < 3; k++) cs.push({ src: 3 * v + k, dst: 3 * p + k, sign: reflection[k] });
    }
  }
  const d = cs.length;

  const phi: Embedding = {
    inDim: d,
    outDim: ambient,
    value(x, out) {
      for (const c of pinned) out[c] = 0;
      for (let j = 0; j < d; j++) {
        const { src, dst, sign } = cs[j];
        out[src] = x[j];
        if (dst >= 0) out[dst] = sign * x[j];
      }
    },
    jacobian(_x, out) {
      out.fill(0);                          // ambient×d
      for (let j = 0; j < d; j++) {
        const { src, dst, sign } = cs[j];
        out[src * d + j] = 1;
        if (dst >= 0) out[dst * d + j] = sign;
      }
    },
  };

  return makeConfigSpace(triang, phi, (p, outX) => {
    for (let j = 0; j < d; j++) {
      const { src, dst, sign } = cs[j];
      outX[j] = dst >= 0 ? 0.5 * (p[src] + sign * p[dst]) : p[src];
    }
  });
}
