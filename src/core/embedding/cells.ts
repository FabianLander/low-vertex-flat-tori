/**
 * cells — the triangle-collision tables behind the embeddedness condition: which
 * non-adjacent cell pairs must be tested (for the gate) and repelled (for the
 * energies). This is EXTRINSIC bookkeeping — it exists only to drive
 * `embedding` (`embedded`, `separation`, `energies`), not the intrinsic torus —
 * so it lives here with its sole consumer rather than on the `Triangulation`.
 *
 * Everything is derived from the triangle list and memoized per triangulation (a
 * `WeakMap`), so the O(F²) triangle-pair classification and the O(V·E)/O(E²) cell
 * enumerations run once per torus and are shared across the gate + every energy.
 *
 * Counts vary across the 7 tori — only vertex–vertex / vertex–edge / vertex–face /
 * edge–face / shared-vertex are topology-invariant — so we compute, never assert
 * magic numbers. The torus-blind ℝ³ intersection/distance kernels these tables
 * index into live in `geometry/`.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation, Tri, Edge } from '@core/topology/triangulation.ts';
import { edgeKey } from '@core/topology/triangulation.ts';

/** A pair of triangles sharing exactly one vertex (for the embedding check). */
export type SharedVertexPair = {
  readonly a: number;                        // triangle index
  readonly b: number;                        // triangle index
  readonly shared: number;                   // the shared vertex
  readonly aOpp: readonly [number, number];  // a's two other vertices
  readonly bOpp: readonly [number, number];  // b's two other vertices
};

/** Cell-pair tables for the repulsion/barrier energies (non-adjacent pairs). */
export type CellPairs = {
  readonly vertexVertex: readonly [number, number][]; // two vertex indices
  readonly vertexEdge: readonly [number, number][];   // [vertex, edge index]
  readonly vertexFace: readonly [number, number][];   // [vertex, face index]
  readonly edgeEdge: readonly [number, number][];     // two edge indices
  readonly edgeFace: readonly [number, number][];     // [edge index, face index]
  readonly faceFace: readonly [number, number][];     // = disjointTrianglePairs
};

/** The full collision-table bundle for one triangulation. */
export type CellTables = {
  /** The C(F,2) triangle pairs sharing 0 vertices (full tri–tri embedding test). */
  readonly disjointTrianglePairs: readonly [number, number][];
  /** Triangle pairs sharing exactly 1 vertex (reduce to 2 segment–tri tests). */
  readonly sharedVertexTrianglePairs: readonly SharedVertexPair[];
  /** Non-adjacent cell pairs of all six type combinations (repulsion energies). */
  readonly cellPairs: CellPairs;
};

const cache = new WeakMap<Triangulation, CellTables>();

/** The collision tables for `triang`, derived once and memoized. */
export function cellTables(triang: Triangulation): CellTables {
  const hit = cache.get(triang);
  if (hit) return hit;
  const { disjoint, sharedVertex } = classifyTrianglePairs(triang.triangles);
  const cellPairs = deriveCellPairs(triang.triangles, triang.vertexCount, triang.edges, disjoint);
  const tables: CellTables = {
    disjointTrianglePairs: disjoint,
    sharedVertexTrianglePairs: sharedVertex,
    cellPairs,
  };
  cache.set(triang, tables);
  return tables;
}

function classifyTrianglePairs(triangles: readonly Tri[]): {
  disjoint: [number, number][];
  sharedVertex: SharedVertexPair[];
} {
  const disjoint: [number, number][] = [];
  const sharedVertex: SharedVertexPair[] = [];
  const n = triangles.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const t1 = triangles[i], t2 = triangles[j];
      const shared: number[] = [];
      for (const v of t1) if (v === t2[0] || v === t2[1] || v === t2[2]) shared.push(v);
      if (shared.length === 0) {
        disjoint.push([i, j]);
      } else if (shared.length === 1) {
        const sv = shared[0];
        const aOpp = t1.filter((v) => v !== sv);
        const bOpp = t2.filter((v) => v !== sv);
        sharedVertex.push({ a: i, b: j, shared: sv, aOpp: [aOpp[0], aOpp[1]], bOpp: [bOpp[0], bOpp[1]] });
      }
      // shared.length === 2 (edge-shared): generically no interior intersection — skipped.
    }
  }
  return { disjoint, sharedVertex };
}

function deriveCellPairs(
  triangles: readonly Tri[],
  vertexCount: number,
  edges: readonly Edge[],
  disjointTrianglePairs: readonly [number, number][],
): CellPairs {
  const vertexVertex: [number, number][] = [];
  for (let i = 0; i < vertexCount; i++) for (let j = i + 1; j < vertexCount; j++) vertexVertex.push([i, j]);

  const vertexEdge: [number, number][] = [];
  for (let v = 0; v < vertexCount; v++) for (let e = 0; e < edges.length; e++) {
    const [a, b] = edges[e];
    if (v !== a && v !== b) vertexEdge.push([v, e]);
  }

  const vertexFace: [number, number][] = [];
  for (let v = 0; v < vertexCount; v++) for (let f = 0; f < triangles.length; f++) {
    const [a, b, c] = triangles[f];
    if (v !== a && v !== b && v !== c) vertexFace.push([v, f]);
  }

  const edgeEdge: [number, number][] = [];
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const [u1, v1] = edges[i], [u2, v2] = edges[j];
    if (u1 !== u2 && u1 !== v2 && v1 !== u2 && v1 !== v2) edgeEdge.push([i, j]);
  }

  const faceEdgeKeys = triangles.map(([a, b, c]) => new Set([edgeKey(a, b), edgeKey(b, c), edgeKey(c, a)]));
  const edgeFace: [number, number][] = [];
  for (let e = 0; e < edges.length; e++) {
    const k = edgeKey(edges[e][0], edges[e][1]);
    for (let f = 0; f < triangles.length; f++) if (!faceEdgeKeys[f].has(k)) edgeFace.push([e, f]);
  }

  return { vertexVertex, vertexEdge, vertexFace, edgeEdge, edgeFace, faceFace: disjointTrianglePairs.map((p) => p) };
}
