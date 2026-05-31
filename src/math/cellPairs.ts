/**
 * Non-adjacent cell-pair tables for the cell-margin energy.
 *
 * Cells of the 8-vertex flat torus: 8 vertices (0-cells), 24 edges (1-cells),
 * 16 triangles (2-cells). The margin energy penalizes pairs of cells that come
 * closer than ε, but only for pairs that are NOT "adjacent" — where adjacency
 * means the two cells are structurally allowed to touch, so a small distance is
 * legitimate rather than a near-degeneracy. The exclusion rule per type:
 *
 *   vertex–vertex : none excluded — distance 0 ⇔ coincident vertices OR a
 *                   collapsed edge, both degenerate.            C(8,2) = 28
 *   vertex–edge   : exclude when the vertex is an endpoint.      192−48 = 144
 *   vertex–face   : exclude when the vertex is a corner.         128−48 = 80
 *   edge–edge     : exclude when the edges share a vertex.      276−120 = 156
 *   edge–face     : exclude the 2 faces that contain the edge.  384−48 = 336
 *   face–face     : exclude when the faces share a vertex
 *                   (⇒ the 24 vertex-disjoint pairs).                    24
 *
 * Each table is derived once at load and its size asserted, matching the
 * defensive style of embedded.ts. Pairs are stored as the cell indices the
 * energy needs (vertex index, EDGES index, TRIANGLES index).
 */

import { VERTEX_COUNT, EDGES, TRIANGLES } from './topology';
import { DISJOINT_TRIANGLE_PAIRS } from './embedded';

export type VertexVertexPair = readonly [number, number]; // two vertex indices
export type VertexEdgePair = readonly [number, number];   // [vertex, edge]
export type VertexFacePair = readonly [number, number];   // [vertex, face]
export type EdgeEdgePair = readonly [number, number];     // two edge indices
export type EdgeFacePair = readonly [number, number];     // [edge, face]
export type FaceFacePair = readonly [number, number];     // two face indices

const edgeKey = (u: number, v: number) => (u < v ? `${u},${v}` : `${v},${u}`);

function deriveVertexVertex(): VertexVertexPair[] {
  const out: VertexVertexPair[] = [];
  for (let i = 0; i < VERTEX_COUNT; i++) {
    for (let j = i + 1; j < VERTEX_COUNT; j++) out.push([i, j]);
  }
  return out;
}

function deriveVertexEdge(): VertexEdgePair[] {
  const out: VertexEdgePair[] = [];
  for (let v = 0; v < VERTEX_COUNT; v++) {
    for (let e = 0; e < EDGES.length; e++) {
      const [a, b] = EDGES[e];
      if (v !== a && v !== b) out.push([v, e]);
    }
  }
  return out;
}

function deriveVertexFace(): VertexFacePair[] {
  const out: VertexFacePair[] = [];
  for (let v = 0; v < VERTEX_COUNT; v++) {
    for (let f = 0; f < TRIANGLES.length; f++) {
      const [a, b, c] = TRIANGLES[f];
      if (v !== a && v !== b && v !== c) out.push([v, f]);
    }
  }
  return out;
}

function deriveEdgeEdge(): EdgeEdgePair[] {
  const out: EdgeEdgePair[] = [];
  for (let i = 0; i < EDGES.length; i++) {
    const [u1, v1] = EDGES[i];
    for (let j = i + 1; j < EDGES.length; j++) {
      const [u2, v2] = EDGES[j];
      const share = u1 === u2 || u1 === v2 || v1 === u2 || v1 === v2;
      if (!share) out.push([i, j]);
    }
  }
  return out;
}

function deriveEdgeFace(): EdgeFacePair[] {
  // Precompute the 3 edge-keys of each face.
  const faceEdgeKeys = TRIANGLES.map(([a, b, c]) =>
    new Set([edgeKey(a, b), edgeKey(b, c), edgeKey(c, a)]));
  const out: EdgeFacePair[] = [];
  for (let e = 0; e < EDGES.length; e++) {
    const key = edgeKey(EDGES[e][0], EDGES[e][1]);
    for (let f = 0; f < TRIANGLES.length; f++) {
      if (!faceEdgeKeys[f].has(key)) out.push([e, f]);
    }
  }
  return out;
}

export const VERTEX_VERTEX_PAIRS: readonly VertexVertexPair[] = deriveVertexVertex();
export const VERTEX_EDGE_PAIRS: readonly VertexEdgePair[] = deriveVertexEdge();
export const VERTEX_FACE_PAIRS: readonly VertexFacePair[] = deriveVertexFace();
export const EDGE_EDGE_PAIRS: readonly EdgeEdgePair[] = deriveEdgeEdge();
export const EDGE_FACE_PAIRS: readonly EdgeFacePair[] = deriveEdgeFace();
export const FACE_FACE_PAIRS: readonly FaceFacePair[] = DISJOINT_TRIANGLE_PAIRS;

// One-time count assertions — wrong combinatorics should fail loudly at load.
const EXPECTED: ReadonlyArray<[string, number, number]> = [
  ['vertex-vertex', VERTEX_VERTEX_PAIRS.length, 28],
  ['vertex-edge', VERTEX_EDGE_PAIRS.length, 144],
  ['vertex-face', VERTEX_FACE_PAIRS.length, 80],
  ['edge-edge', EDGE_EDGE_PAIRS.length, 156],
  ['edge-face', EDGE_FACE_PAIRS.length, 336],
  ['face-face', FACE_FACE_PAIRS.length, 24],
];
for (const [name, got, want] of EXPECTED) {
  if (got !== want) {
    throw new Error(`cellPairs: ${name} expected ${want} pairs, got ${got}`);
  }
}
