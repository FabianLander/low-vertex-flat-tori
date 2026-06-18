/**
 * trees — the spanning-tree graph primitives the intrinsic combinatorics share.
 *
 * Three derivations build trees on a triangulation's 1-skeleton or dual graph and
 * read loops off them — the developing marking (`marking.cutGenerators`), the
 * layout-free homology fallback (`triangulation.homologyGenerators`), and the
 * harmonic embedding's period cocycles (`harmonicLayout.treeCotree`). They were
 * three near-identical copies of the same BFS + LCA code; the differences that
 * matter (which edges to exclude, what to read off the tree) are the call site's,
 * not the traversal's. These are that shared traversal.
 *
 * The BFS order is LOAD-BEARING: it fixes which leftover edges become the H₁
 * generators, hence the marking and the raw modulus τ. The traversal here matches
 * the original three verbatim — primal adjacency built by iterating `edges` in
 * array order (push v onto adj[u], then u onto adj[v]); BFS from root 0 visiting
 * neighbors in push order — so the markings are unchanged.
 *
 * Pure: no DOM, no three.js. (Imports `edgeKey` from `triangulation.ts`; the cycle
 * is benign — every function here runs well after both modules are evaluated.)
 */

import type { Tri, Edge } from './triangulation.ts';
import { edgeKey } from './triangulation.ts';

export interface SpanningTree {
  /** parent[v] in the BFS tree from `root`; −1 for the root and any unreached vertex. */
  readonly parent: number[];
  /** edgeKeys of the tree edges (each `edgeKey(parent, child)`). */
  readonly inTree: Set<number>;
  /** How many vertices the BFS reached (= vertexCount iff the graph minus `exclude` is connected). */
  readonly reached: number;
}

/**
 * Primal spanning tree of the 1-skeleton: BFS over vertices from `root`, skipping
 * any edge whose key is in `exclude`. Returns the parent pointers (for `treePath`),
 * the in-tree edge keys, and the reached-vertex count (a connectivity check).
 */
export function spanningTree(
  vertexCount: number,
  edges: readonly Edge[],
  exclude?: ReadonlySet<number>,
  root = 0,
): SpanningTree {
  const adj: number[][] = Array.from({ length: vertexCount }, () => []);
  for (const [u, v] of edges) {
    if (exclude && exclude.has(edgeKey(u, v))) continue;
    adj[u].push(v);
    adj[v].push(u);
  }
  const parent = new Array<number>(vertexCount).fill(-1);
  const inTree = new Set<number>();
  const seen = new Set<number>([root]);
  const q = [root];
  for (let h = 0; h < q.length; h++) {
    const u = q[h];
    for (const v of adj[u]) {
      if (seen.has(v)) continue;
      seen.add(v);
      parent[v] = u;
      inTree.add(edgeKey(u, v));
      q.push(v);
    }
  }
  return { parent, inTree, reached: seen.size };
}

/**
 * Dual spanning tree: BFS over triangles from `root`, never crossing an edge in
 * `blocked` (the primal tree edges — the dual tree may not cross the primal one).
 * Returns the edgeKeys used by the dual tree.
 */
export function dualSpanningTree(
  triangles: readonly Tri[],
  edgeToTris: ReadonlyMap<number, readonly [number, number]>,
  blocked: ReadonlySet<number>,
  root = 0,
): Set<number> {
  const inDual = new Set<number>();
  const seen = new Set<number>([root]);
  const q = [root];
  for (let h = 0; h < q.length; h++) {
    const t = q[h];
    const tri = triangles[t];
    for (let s = 0; s < 3; s++) {
      const k = edgeKey(tri[s], tri[(s + 1) % 3]);
      if (blocked.has(k)) continue;
      const [tA, tB] = edgeToTris.get(k)!;
      const nbr = tA === t ? tB : tA;
      if (seen.has(nbr)) continue;
      seen.add(nbr);
      inDual.add(k);
      q.push(nbr);
    }
  }
  return inDual;
}

/**
 * Tree–cotree generators: the edge keys (in `edges` order) that are neither in the
 * primal tree nor the dual tree — exactly 2g of them (2 for a torus). Each, closed
 * by the primal-tree path between its ends, is an H₁ generator.
 */
export function coTreeEdges(
  edges: readonly Edge[],
  inTree: ReadonlySet<number>,
  inDual: ReadonlySet<number>,
): number[] {
  const out: number[] = [];
  for (const [u, v] of edges) {
    const k = edgeKey(u, v);
    if (!inTree.has(k) && !inDual.has(k)) out.push(k);
  }
  return out;
}

/**
 * The vertex path u → … → lca → … → v through a BFS tree given by `parent`. Walks
 * each endpoint up to the root, finds the lowest common ancestor, and splices the
 * two ascents. Assumes both u and v are in the same tree component.
 */
export function treePath(parent: readonly number[], u: number, v: number): number[] {
  const ascend = (x: number): number[] => {
    const p = [x];
    while (parent[p[p.length - 1]] !== -1) p.push(parent[p[p.length - 1]]);
    return p;
  };
  const pu = ascend(u), pv = ascend(v);
  const idxInPv = new Map(pv.map((x, i) => [x, i] as const));
  let lca = -1, iu = -1;
  for (let i = 0; i < pu.length; i++) if (idxInPv.has(pu[i])) { lca = pu[i]; iu = i; break; }
  const left = pu.slice(0, iu + 1);                         // u → … → lca
  const right = pv.slice(0, idxInPv.get(lca)!).reverse();   // lca → … → v
  return [...left, ...right];
}
