/**
 * The combinatorial torus: stored data (`TriangulationData` = id + triangle list) plus
 * the builder `makeTriangulation`, which turns that data + a precomputed `Marking` into a
 * fully-derived `Triangulation`.
 *
 * Two kinds of derived data:
 *   - CHEAP combinatorics (`deriveCombinatorics`): vertex count, edges, oriented vertex
 *     links, dual adjacency, degree sequence — fast pure functions of the triangle list,
 *     computed at build, never stored.
 *   - the EXPENSIVE marking (the developing chart: loops + cut + develop order) — also a
 *     deterministic function of the triangle list, but costly, so it is PRECOMPUTED
 *     (`marking.ts`'s `canonicalMarking`, run offline) and SUPPLIED to `makeTriangulation`.
 *     Hence this module never imports `marking.ts`.
 *
 * A `Triangulation` is one value you pass around (no global singleton). The combinatorial
 * types live as data in `triangulations/` (e.g. `eightVertex.ts`); their markings live in
 * the generated marking file; the registry `triangulations/index.ts` joins them by id.
 *
 * Pure data/combinatorics — no three.js, no DOM, no metric (3D coords).
 *
 * NB degree is NEVER assumed — among the 8-vertex types only Rich's is degree-6-regular;
 * the rest mix degree 5/7. Every count is derived/validated from the triangle list (Euler
 * V−E+F = 0, manifold edges, single-cycle links, coherent orientation), so a triangulation
 * of any size drops in cleanly.
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

/** A triangulation as stored DATA — the irreducible input: an id and its triangle
 *  list (vertices are the implicit range 0..V−1, coherently oriented). `label` is an
 *  optional human nickname. Everything else (edges, links, marking) is derived. */
export type TriangulationData = {
  readonly id: string;
  readonly triangles: readonly Tri[];
  readonly label?: string;
};

/**
 * A MARKING — the developing chart, written in readable vertex/edge/face numbers (the
 * form `canonicalMarking` computes and the marking file stores):
 *   - `loops`: the two oriented generator cycles (closed vertex walks) — the H₁ basis
 *     whose holonomy under the developing map gives τ;
 *   - `cut`: the edges (as vertex pairs) sliced to unfold the torus into a flat polygon;
 *   - `developOrder`: the order to lay the triangles down (a permutation of face indices).
 * It is a deterministic function of the triangle list (precomputed, not hand-authored).
 */
export type Marking = {
  readonly loops: readonly (readonly number[])[];
  readonly cut: readonly (readonly [number, number])[];
  readonly developOrder: readonly number[];
};

/** The cheap combinatorial tables derived from a triangle list — everything that is
 *  NOT the (expensive, precomputed) marking. `canonicalMarking` needs exactly this. */
export type Combinatorics = {
  readonly vertexCount: number;
  readonly triangles: readonly Tri[];
  readonly edges: readonly Edge[];
  /** vertexLinks[i]: neighbors of i in CCW cyclic order (length = degree(i)). */
  readonly vertexLinks: readonly (readonly number[])[];
  /** Sorted ascending — a cheap combinatorial fingerprint. */
  readonly degreeSequence: readonly number[];
  /** edgeKey(u,v) → the two triangles sharing that edge, ascending. */
  readonly edgeToTris: ReadonlyMap<number, readonly [number, number]>;
};

/** A fully-built torus, as ONE object: its data (id/name) + the derived combinatorics +
 *  its marking (the stored `Marking` plus the derived gluing tree `attach`). */
export type Triangulation = Combinatorics & {
  readonly id: string;
  readonly name: string;
  readonly marking: Marking & { readonly attach: readonly Attach[] };
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
  edgeToTris: ReadonlyMap<number, readonly [number, number]>,
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

// ---------------------------------------------------------------------------
// Build — the cheap combinatorics (gated), and the coherent-orientation check
// ---------------------------------------------------------------------------

/**
 * The cheap combinatorial tables of a triangle list — edges, links, degrees,
 * edgeToTris — with the structural gates: Euler V−E+F=0, each edge in exactly two
 * triangles (`deriveEdgeToTris`), each vertex link a single cycle (`deriveVertexLinks`),
 * and a coherent orientation. This is everything `canonicalMarking` needs, and the base
 * of a built `Triangulation`. Degree is never assumed.
 */
export function deriveCombinatorics(triangles: readonly Tri[]): Combinatorics {
  const vertexCount = vertexCountOf(triangles);
  const edges = deriveEdges(triangles);
  const V = vertexCount, E = edges.length, F = triangles.length;
  if (V - E + F !== 0) {
    throw new Error(`V−E+F = ${V}−${E}+${F} = ${V - E + F} ≠ 0 — not a torus triangulation`);
  }
  checkCoherentOrientation(triangles);
  const vertexLinks = deriveVertexLinks(triangles, vertexCount);
  const edgeToTris = deriveEdgeToTris(triangles);
  const degreeSequence = vertexLinks.map((l) => l.length).slice().sort((a, b) => a - b);
  return { vertexCount, triangles, edges, vertexLinks, degreeSequence, edgeToTris };
}

/** Each undirected edge must be traversed in OPPOSITE directions by its two triangles
 *  (a coherent orientation) — so a directed edge u→v never appears twice. The developing
 *  map and τ assume this; we validate it (cheap) so imported data can't break them silently. */
function checkCoherentOrientation(triangles: readonly Tri[]): void {
  const dir = new Set<number>();
  for (const [a, b, c] of triangles) {
    for (const [p, q] of [[a, b], [b, c], [c, a]] as const) {
      const k = p * KEY_RADIX + q;   // DIRECTED key (≠ the reverse q→p)
      if (dir.has(k)) throw new Error(`directed edge ${p}→${q} appears twice — triangles are not coherently oriented`);
      dir.add(k);
    }
  }
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
  edgeToTris: ReadonlyMap<number, readonly [number, number]>,
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
// makeTriangulation — stored data + its (precomputed) marking → one torus
// ---------------------------------------------------------------------------

/**
 * Build the full triangulation from its stored data and its marking: derive the cheap
 * combinatorics, validate the marking against them, derive the gluing tree `attach`
 * (from `developOrder` + `cut`), and return one object. The marking is SUPPLIED
 * (precomputed by `canonicalMarking`, loaded from the marking file) — never computed here,
 * which is why this stays cheap and `topology` does not depend on `marking.ts`.
 */
export function makeTriangulation(data: TriangulationData, marking: Marking): Triangulation {
  const { id, triangles } = data;
  const name = data.label ?? id;
  const c = deriveCombinatorics(triangles);
  checkDevelopOrder(marking.developOrder, triangles.length, name);
  checkGeneratorLoops(marking.loops, c.edgeToTris, name);
  const cutKeys = marking.cut.map(([u, v]) => edgeKey(u, v));
  const attach = deriveAttach(triangles, marking.developOrder, c.edgeToTris, cutKeys);
  return { ...c, id, name, marking: { ...marking, attach } };
}
