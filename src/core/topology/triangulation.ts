/**
 * Triangulation descriptor + `defineTriangulation` builder.
 *
 * A `Triangulation` bundles ONE triangulation of the torus with everything derivable
 * from it (vertex count, edges, oriented vertex links, dual adjacency, degree
 * sequence, the unfolding attachment tree) plus the small amount of data that
 * is genuinely a choice (the developing order and the two homology generators)
 * — and even those are auto-derived if you don't supply them. So you can grab
 * any new triangulation and `defineTriangulation({ triangles })` to get a fully working
 * torus; nothing here is hard-wired to a particular vertex/edge/face count.
 *
 * Every triangulation is a value you pass around (no global singleton). The seven
 * 8-vertex combinatorial types live as data in `triangulations/eightVertex.ts`
 * (`EIGHT_VERTEX`); the registry `triangulations/index.ts` maps each through
 * `defineTriangulation`, computing its canonical marking on load (`canonicalDecoration`).
 *
 * Pure data/combinatorics — no three.js, no DOM, no metric (3D coords).
 *
 * Each triangulation carries two decorations — a `FundamentalDomain` (how to
 * unfold it) and a `Marking` (its H₁ basis) — supplied by the registry (from
 * `canonicalDecoration`) via the spec, or a layout-free fallback when the spec omits
 * them; see `buildDecoration`.
 *
 * NB: degree is NEVER assumed — among the 8-vertex types only Rich's (#7) is
 * degree-6-regular; the rest mix degree 5/7. Every count is derived/validated
 * from the triangle list (Euler characteristic V−E+F = 0 for the torus), so a
 * triangulation of any size drops in cleanly.
 */


import { spanningTree, dualSpanningTree, coTreeEdges, treePath } from './trees.ts';

export type Tri = readonly [number, number, number];
export type Edge = readonly [number, number];

/** Radix for packing an undirected edge {u,v} into one integer key. Fixed and
 *  decoupled from the vertex count, so `edgeKey`/`edgeEnds` stay exact inverses
 *  for any triangulation up to KEY_RADIX vertices. */
const KEY_RADIX = 1 << 16;

/** Vertex count of a triangulation = highest vertex index + 1 (vertices are the
 *  contiguous range 0..n−1). */
function vertexCountOf(triangles: readonly Tri[]): number {
  let max = -1;
  for (const t of triangles) for (const v of t) if (v > max) max = v;
  return max + 1;
}

/** Triangle `t` is glued onto `parent` across global edge (u, v). */
export type Attach = {
  readonly parent: number; // -1 for the root
  readonly u: number;
  readonly v: number;
};

/** One unfolding step: triangle `t` attached across edge `edge` to `parent`
 *  (parent = -1 for the root), in develop-order sequence. Combinatorial gluing
 *  data — the per-step form of the develop order; the geometric developing map
 *  (`moduli/develop`) and the winding net (`fundamentalDomain`) both lay points
 *  out along these steps. */
export type DevelopStep = {
  readonly t: number;
  readonly parent: number;
  readonly edge: readonly [number, number];
};

/** Specification of a torus: just the triangulation, plus optional choices. The
 *  triangle list is the only required field — everything else is derived (or
 *  auto-derived, for the develop order / generators) when omitted, so a brand
 *  new triangulation needs only `defineTriangulation({ triangles })`. */
export type TriangulationSpec = {
  /** Stable id for the registry; defaults to 0 for ad-hoc/one-off tori. */
  readonly id?: number;
  /** Display name; defaults to `torus-<F>f`. */
  readonly name?: string;
  readonly triangles: readonly Tri[];
  /** Saved canonical marking (from the cache), injected by the registry. Omit
   *  and a layout-free fallback (BFS order + tree–cotree generators) is derived. */
  readonly cut?: readonly number[];
  readonly developOrder?: readonly number[];
  readonly generatorLoops?: readonly (readonly number[])[];
};

/**
 * The DEVELOPING CHART: how to cut this triangulation open and unfold it into the
 * plane. A presentation choice — it does NOT affect the modulus τ; we take the
 * most compact one (minimal cut).
 */
export type FundamentalDomain = {
  /** edgeKeys of the minimal cut — the domain boundary. */
  readonly cut: readonly number[];
  /** Unfolding order: a permutation of 0..F−1, root first, traversing the glued
   *  (non-cut) complement — each non-root triangle non-cut-adjacent to an earlier one. */
  readonly developOrder: readonly number[];
  /** The gluing tree (parent + shared edge per triangle), along non-cut edges. */
  readonly attach: readonly Attach[];
};

/**
 * The MARKING: a basis of H₁(T²,ℤ), as two oriented vertex edge-loops. This is the
 * Teichmüller marking — the holonomy of these loops under the developing map gives
 * τ; forgetting it (the SL(2,ℤ) quotient) drops to moduli.
 */
export type Marking = {
  readonly generatorLoops: readonly (readonly number[])[];
};

/** Fully derived torus: the spec plus every combinatorial table. */
export type Triangulation = {
  readonly id: number;
  readonly name: string;
  readonly vertexCount: number;
  readonly triangles: readonly Tri[];
  readonly edges: readonly Edge[];
  /** vertexLinks[i]: neighbors of i in CCW cyclic order (length = degree(i)). */
  readonly vertexLinks: readonly (readonly number[])[];
  /** Sorted ascending — a cheap combinatorial fingerprint. */
  readonly degreeSequence: readonly number[];
  /** edgeKey(u,v) → the two triangles sharing that edge, ascending. */
  readonly edgeToTris: ReadonlyMap<number, readonly [number, number]>;
  /** How to unfold it — the developing chart (cut + order + gluing tree). */
  readonly fundamentalDomain: FundamentalDomain;
  /** The H₁ basis decorating it — gives τ. */
  readonly marking: Marking;
};

/** Symmetric integer key for an undirected edge {u,v}. */
export function edgeKey(u: number, v: number): number {
  return u < v ? u * KEY_RADIX + v : v * KEY_RADIX + u;
}

/** Inverse of `edgeKey`: recover the endpoints {u,v} (ascending). */
export function edgeEnds(k: number): readonly [number, number] {
  return [Math.floor(k / KEY_RADIX), k % KEY_RADIX];
}

// ---------------------------------------------------------------------------
// Derivations — every combinatorial table from the triangle list, degree-generic
// ---------------------------------------------------------------------------

function deriveEdges(triangles: readonly Tri[]): Edge[] {
  const seen = new Set<number>();
  const out: Edge[] = [];
  for (const [a, b, c] of triangles) {
    for (const [p, q] of [[a, b], [b, c], [c, a]] as const) {
      const k = edgeKey(p, q);
      if (!seen.has(k)) {
        seen.add(k);
        out.push([Math.min(p, q), Math.max(p, q)]);
      }
    }
  }
  return out;
}

/**
 * Oriented cyclic vertex links. Triangle (a,b,c) contributes the directed link
 * edges b→c at a, c→a at b, a→b at c; walking those closes each 1-ring into a
 * single cycle of length = degree(i). Works for any degree (NO degree-6
 * assumption).
 */
function deriveVertexLinks(triangles: readonly Tri[], vertexCount: number): number[][] {
  const next: Map<number, number>[] = Array.from(
    { length: vertexCount },
    () => new Map<number, number>(),
  );
  for (const [a, b, c] of triangles) {
    next[a].set(b, c);
    next[b].set(c, a);
    next[c].set(a, b);
  }
  const links: number[][] = [];
  for (let i = 0; i < vertexCount; i++) {
    const m = next[i];
    const deg = m.size;
    if (deg < 3) throw new Error(`vertex ${i} has degree ${deg}, expected ≥3`);
    const start = m.keys().next().value as number;
    const cycle: number[] = [start];
    let cur = start;
    for (let step = 0; step < deg - 1; step++) {
      const nxt = m.get(cur);
      if (nxt === undefined) throw new Error(`broken link at vertex ${i}`);
      cycle.push(nxt);
      cur = nxt;
    }
    if (m.get(cur) !== start) throw new Error(`link at vertex ${i} does not close into a single cycle`);
    links.push(cycle);
  }
  return links;
}

function deriveEdgeToTris(triangles: readonly Tri[]): Map<number, readonly [number, number]> {
  const m = new Map<number, number[]>();
  for (let t = 0; t < triangles.length; t++) {
    const tri = triangles[t];
    for (let s = 0; s < 3; s++) {
      const k = edgeKey(tri[s], tri[(s + 1) % 3]);
      const arr = m.get(k);
      if (arr) arr.push(t);
      else m.set(k, [t]);
    }
  }
  const out = new Map<number, readonly [number, number]>();
  for (const [k, arr] of m) {
    if (arr.length !== 2) throw new Error(`edge ${k} shared by ${arr.length} triangles, expected 2`);
    out.set(k, arr[0] < arr[1] ? [arr[0], arr[1]] : [arr[1], arr[0]]);
  }
  return out;
}

/**
 * Attachment tree from the develop order alone: each non-root triangle glues
 * onto its EARLIEST-already-placed edge-adjacent neighbor. (The old code used
 * the abstract hexagonal domain to disambiguate; that only exists for the
 * degree-6 torus, so we drop it. Any valid spanning tree yields the same cut
 * edges / holonomy / τ — only the picture's exact shape changes.)
 */
function deriveAttach(
  triangles: readonly Tri[],
  developOrder: readonly number[],
  edgeToTris: Map<number, readonly [number, number]>,
  cut?: readonly number[],
): Attach[] {
  // When the minimal cut is known, those edges are the domain BOUNDARY — never
  // glue across them, so the developed net is exactly the compact minimal domain.
  const cutSet = cut && cut.length ? new Set(cut) : null;
  const placedAt = new Array<number>(triangles.length).fill(-1);
  const out = new Array<Attach>(triangles.length);
  const root = developOrder[0];
  out[root] = { parent: -1, u: -1, v: -1 };
  placedAt[root] = 0;
  for (let i = 1; i < developOrder.length; i++) {
    const t = developOrder[i];
    const tri = triangles[t];
    let parent = -1, best = Infinity, su = -1, sv = -1;
    for (let s = 0; s < 3; s++) {
      const u = tri[s], v = tri[(s + 1) % 3];
      if (cutSet && cutSet.has(edgeKey(u, v))) continue; // boundary edge — not a gluing
      const [tA, tB] = edgeToTris.get(edgeKey(u, v))!;
      const nbr = tA === t ? tB : tA;
      if (placedAt[nbr] >= 0 && placedAt[nbr] < best) {
        best = placedAt[nbr];
        parent = nbr;
        su = u;
        sv = v;
      }
    }
    if (parent < 0) throw new Error(`developOrder: triangle ${t} has no already-placed non-cut edge-neighbor (not a spanning tree of the glued complement)`);
    out[t] = { parent, u: su, v: sv };
    placedAt[t] = i;
  }
  return out;
}

/**
 * Decorate a triangulation with its fundamental domain + marking: the canonical
 * decoration if the spec supplies it (the registry computes it via `canonicalDecoration`),
 * else a layout-free fallback — a BFS develop order and a tree–cotree H₁ basis with no
 * minimal cut. `attach` is always re-derived here.
 */
function buildDecoration(
  spec: TriangulationSpec,
  triangles: readonly Tri[],
  edgeToTris: Map<number, readonly [number, number]>,
  name: string,
): { fundamentalDomain: FundamentalDomain; marking: Marking } {
  const cut = spec.cut ?? [];
  const developOrder = spec.developOrder ?? autoDevelopOrder(triangles);
  const generatorLoops = spec.generatorLoops ?? homologyGenerators(triangles);
  checkDevelopOrder(developOrder, triangles.length, name);
  checkGeneratorLoops(generatorLoops, edgeToTris, name);
  const attach = deriveAttach(triangles, developOrder, edgeToTris, cut);
  return {
    fundamentalDomain: { cut, developOrder, attach },
    marking: { generatorLoops },
  };
}

// ---------------------------------------------------------------------------
// Auto-derivation helpers (valid defaults to hand-override per torus)
// ---------------------------------------------------------------------------

/**
 * A valid develop order: BFS spanning tree of the dual graph rooted at triangle
 * `root`. Every non-root triangle appears after an edge-adjacent neighbor, so
 * `deriveAttach` always resolves. Hand-authored orders give nicer nets; this is
 * the fallback / starting point.
 */
export function autoDevelopOrder(triangles: readonly Tri[], root = 0): number[] {
  const edgeToTris = deriveEdgeToTris(triangles);
  const order: number[] = [root];
  const seen = new Set<number>([root]);
  for (let head = 0; head < order.length; head++) {
    const t = order[head];
    const tri = triangles[t];
    for (let s = 0; s < 3; s++) {
      const [a, b] = [tri[s], tri[(s + 1) % 3]];
      const [tA, tB] = edgeToTris.get(edgeKey(a, b))!;
      const nbr = tA === t ? tB : tA;
      if (!seen.has(nbr)) { seen.add(nbr); order.push(nbr); }
    }
  }
  return order;
}

/**
 * Two oriented vertex edge-loops forming a basis of H₁(T²;ℤ), via the
 * tree–cotree (Eppstein) decomposition: a primal spanning tree T, a dual
 * spanning tree of the edges NOT in T, leaving exactly 2g = 2 edges. Each
 * leftover edge closed by its primal-tree path is a homology generator. Returns
 * each loop as a closed vertex walk [u, …, v, u]. (The graph primitives are in
 * `trees.ts`; this reads loops off them.)
 */
export function homologyGenerators(triangles: readonly Tri[]): number[][] {
  const vertexCount = vertexCountOf(triangles);
  const edges = deriveEdges(triangles);
  const edgeToTris = deriveEdgeToTris(triangles);

  const { parent, inTree } = spanningTree(vertexCount, edges);
  const inDual = dualSpanningTree(triangles, edgeToTris, inTree);

  // leftover (co-tree) edges = generators (exactly 2 for a torus)
  const gens: number[][] = [];
  for (const k of coTreeEdges(edges, inTree, inDual)) {
    const [u, v] = edgeEnds(k);
    gens.push([...treePath(parent, v, u), v]);   // v → … → u in the tree, close with edge u→v
  }
  if (gens.length !== 2) throw new Error(`tree–cotree gave ${gens.length} generators, expected 2`);
  return gens;
}

// ---------------------------------------------------------------------------
// Validation guards on the marking (developOrder / generator loops)
// ---------------------------------------------------------------------------

function checkDevelopOrder(developOrder: readonly number[], faceCount: number, name: string): void {
  if (developOrder.length !== faceCount) throw new Error(`[${name}] developOrder must have ${faceCount} entries, got ${developOrder.length}`);
  const seen = new Set(developOrder);
  if (seen.size !== faceCount) throw new Error(`[${name}] developOrder has duplicates`);
  for (const t of developOrder) if (t < 0 || t >= faceCount) throw new Error(`[${name}] developOrder entry ${t} out of range`);
}

function checkGeneratorLoops(
  loops: readonly (readonly number[])[],
  edgeToTris: Map<number, readonly [number, number]>,
  name: string,
): void {
  if (loops.length !== 2) throw new Error(`[${name}] expected 2 generator loops, got ${loops.length}`);
  for (const loop of loops) {
    if (loop.length < 2 || loop[0] !== loop[loop.length - 1]) {
      throw new Error(`[${name}] generator loop [${loop}] is not closed (first must equal last)`);
    }
    for (let k = 0; k + 1 < loop.length; k++) {
      if (!edgeToTris.has(edgeKey(loop[k], loop[k + 1]))) {
        throw new Error(`[${name}] generator loop step ${loop[k]}→${loop[k + 1]} is not an edge`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function defineTriangulation(spec: TriangulationSpec): Triangulation {
  const { triangles } = spec;
  const id = spec.id ?? 0;
  const name = spec.name ?? `torus-${triangles.length}f`;

  // Derive every count from the triangle list — nothing is hard-wired.
  const vertexCount = vertexCountOf(triangles);
  const edges = deriveEdges(triangles);            // each edge in exactly 2 triangles (manifold)
  const V = vertexCount, E = edges.length, F = triangles.length;
  // The torus has Euler characteristic 0: V − E + F = 0. This (with the
  // manifold/single-cycle-link checks in the derivations) is the only structural
  // gate — replacing the old hard-coded V=8, E=24, F=16 asserts.
  if (V - E + F !== 0) {
    throw new Error(`[${name}] V−E+F = ${V}−${E}+${F} = ${V - E + F} ≠ 0 — not a torus triangulation`);
  }

  const vertexLinks = deriveVertexLinks(triangles, vertexCount);
  const edgeToTris = deriveEdgeToTris(triangles);
  const degreeSequence = vertexLinks.map((l) => l.length).slice().sort((a, b) => a - b);

  // Decorate with the fundamental domain + marking: the canonical decoration when
  // the spec supplies it (registry → canonicalDecoration), else a layout-free
  // fallback. attach is re-derived.
  const { fundamentalDomain, marking } = buildDecoration(spec, triangles, edgeToTris, name);

  return {
    id,
    name,
    vertexCount,
    triangles,
    edges,
    vertexLinks,
    degreeSequence,
    edgeToTris,
    fundamentalDomain,
    marking,
  };
}
