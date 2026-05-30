/**
 * Embeddedness check for the 8-vertex paper torus.
 *
 * A PL surface is embedded iff no two distinct triangle interiors intersect.
 * For our combinatorics the C(16,2) = 120 triangle pairs partition by
 * vertex overlap:
 *
 *   - 24 disjoint pairs       (share 0 vertices)  — full triangle-triangle test
 *   - 72 vertex-shared pairs  (share 1 vertex)    — 2 segment-triangle tests
 *   - 24 edge-shared pairs    (share an edge)     — generically no interior
 *                                                   intersection unless
 *                                                   coplanar; skipped in v1
 *
 * Why the vertex-shared case reduces to 2 segment-triangle tests:
 * if triangles A=(v,a1,a2) and B=(v,b1,b2) share only vertex v and lie in
 * distinct planes, their plane intersection is a line through v. Any
 * non-shared common point must lie on that line restricted to both
 * triangles, which forces one of the edges (a1,a2) or (b1,b2) — the only
 * edges of either triangle not containing v — to pierce the opposite
 * triangle's interior.
 *
 * Coplanar degenerate configurations (measure zero) report "not intersecting"
 * to keep the predicate robust on generic embeddings.
 */

import { TRIANGLES } from './topology';

type DisjointPair = readonly [number, number];

type SharedVertexPair = {
  readonly a: number;                              // triangle index
  readonly b: number;                              // triangle index
  readonly shared: number;                         // shared vertex index
  readonly aOpp: readonly [number, number];        // a's two other vertices
  readonly bOpp: readonly [number, number];        // b's two other vertices
};

function classifyPairs(): {
  disjoint: DisjointPair[];
  sharedVertex: SharedVertexPair[];
  edgeShared: number;
} {
  const disjoint: DisjointPair[] = [];
  const sharedVertex: SharedVertexPair[] = [];
  let edgeShared = 0;
  const n = TRIANGLES.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const t1 = TRIANGLES[i], t2 = TRIANGLES[j];
      const shared: number[] = [];
      for (let k = 0; k < 3; k++) {
        const v = t1[k];
        if (v === t2[0] || v === t2[1] || v === t2[2]) shared.push(v);
      }
      if (shared.length === 0) {
        disjoint.push([i, j]);
      } else if (shared.length === 1) {
        const sv = shared[0];
        const aOpp: number[] = [];
        const bOpp: number[] = [];
        for (let k = 0; k < 3; k++) {
          if (t1[k] !== sv) aOpp.push(t1[k]);
          if (t2[k] !== sv) bOpp.push(t2[k]);
        }
        sharedVertex.push({
          a: i, b: j, shared: sv,
          aOpp: [aOpp[0], aOpp[1]],
          bOpp: [bOpp[0], bOpp[1]],
        });
      } else {
        edgeShared++;
      }
    }
  }
  return { disjoint, sharedVertex, edgeShared };
}

const _pairs = classifyPairs();
if (
  _pairs.disjoint.length !== 24 ||
  _pairs.sharedVertex.length !== 72 ||
  _pairs.edgeShared !== 24
) {
  throw new Error(
    `triangle pair classification: expected 24/72/24, ` +
    `got ${_pairs.disjoint.length}/${_pairs.sharedVertex.length}/${_pairs.edgeShared}`,
  );
}

export const DISJOINT_TRIANGLE_PAIRS: readonly DisjointPair[] = _pairs.disjoint;
export const SHARED_VERTEX_TRIANGLE_PAIRS: readonly SharedVertexPair[] = _pairs.sharedVertex;

export type EmbeddingViolation = {
  /** 'tri-tri' = disjoint pair's interiors intersect.
   *  'edge-tri' = vertex-shared pair's non-shared edge pierces the other. */
  readonly kind: 'tri-tri' | 'edge-tri';
  readonly t1: number;
  readonly t2: number;
};

export function isEmbedded(positions: ArrayLike<number>): boolean {
  return firstViolation(positions) === null;
}

export function firstViolation(positions: ArrayLike<number>): EmbeddingViolation | null {
  for (const [t1, t2] of DISJOINT_TRIANGLE_PAIRS) {
    if (triangleTriangleIntersect(positions, t1, t2)) {
      return { kind: 'tri-tri', t1, t2 };
    }
  }
  for (const pair of SHARED_VERTEX_TRIANGLE_PAIRS) {
    const t1 = TRIANGLES[pair.a];
    const t2 = TRIANGLES[pair.b];
    if (segmentTriangleIntersect(positions, pair.aOpp[0], pair.aOpp[1], t2[0], t2[1], t2[2])) {
      return { kind: 'edge-tri', t1: pair.a, t2: pair.b };
    }
    if (segmentTriangleIntersect(positions, pair.bOpp[0], pair.bOpp[1], t1[0], t1[1], t1[2])) {
      return { kind: 'edge-tri', t1: pair.a, t2: pair.b };
    }
  }
  return null;
}

export function allViolations(positions: ArrayLike<number>): EmbeddingViolation[] {
  const out: EmbeddingViolation[] = [];
  for (const [t1, t2] of DISJOINT_TRIANGLE_PAIRS) {
    if (triangleTriangleIntersect(positions, t1, t2)) {
      out.push({ kind: 'tri-tri', t1, t2 });
    }
  }
  for (const pair of SHARED_VERTEX_TRIANGLE_PAIRS) {
    const t1 = TRIANGLES[pair.a];
    const t2 = TRIANGLES[pair.b];
    const hitA = segmentTriangleIntersect(positions, pair.aOpp[0], pair.aOpp[1], t2[0], t2[1], t2[2]);
    const hitB = segmentTriangleIntersect(positions, pair.bOpp[0], pair.bOpp[1], t1[0], t1[1], t1[2]);
    if (hitA || hitB) out.push({ kind: 'edge-tri', t1: pair.a, t2: pair.b });
  }
  return out;
}

/**
 * Per-face scalar field: 1 on triangles involved in any violation, 0 elsewhere.
 * Hand this to `TorusView.setFaceScalars(..., somePalette)` to paint the
 * offending faces red.
 */
export function violationFaceScalars(
  positions: ArrayLike<number>,
  out?: Float32Array,
): Float32Array {
  const r = out ?? new Float32Array(TRIANGLES.length);
  r.fill(0);
  for (const v of allViolations(positions)) {
    r[v.t1] = 1;
    r[v.t2] = 1;
  }
  return r;
}

/** Triangle-triangle interior intersection via 6 segment-triangle tests. */
function triangleTriangleIntersect(
  positions: ArrayLike<number>,
  t1: number,
  t2: number,
): boolean {
  const a = TRIANGLES[t1];
  const b = TRIANGLES[t2];
  for (let k = 0; k < 3; k++) {
    if (segmentTriangleIntersect(positions, a[k], a[(k + 1) % 3], b[0], b[1], b[2])) return true;
  }
  for (let k = 0; k < 3; k++) {
    if (segmentTriangleIntersect(positions, b[k], b[(k + 1) % 3], a[0], a[1], a[2])) return true;
  }
  return false;
}

/**
 * Möller–Trumbore segment-vs-triangle. Returns true only when the segment's
 * open interior crosses the triangle's open interior (no boundary touches).
 * The caller is responsible for ensuring the segment endpoints are not
 * vertices of the triangle.
 */
function segmentTriangleIntersect(
  positions: ArrayLike<number>,
  pi: number, qi: number,
  ai: number, bi: number, ci: number,
): boolean {
  const op = 3 * pi, oq = 3 * qi;
  const oa = 3 * ai, ob = 3 * bi, oc = 3 * ci;
  const px = positions[op], py = positions[op + 1], pz = positions[op + 2];
  const qx = positions[oq], qy = positions[oq + 1], qz = positions[oq + 2];
  const ax = positions[oa], ay = positions[oa + 1], az = positions[oa + 2];
  const bx = positions[ob], by = positions[ob + 1], bz = positions[ob + 2];
  const cx = positions[oc], cy = positions[oc + 1], cz = positions[oc + 2];

  const dx = qx - px, dy = qy - py, dz = qz - pz;
  const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
  const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;

  // h = d × e2
  const hx = dy * e2z - dz * e2y;
  const hy = dz * e2x - dx * e2z;
  const hz = dx * e2y - dy * e2x;

  const det = e1x * hx + e1y * hy + e1z * hz;
  if (det > -1e-14 && det < 1e-14) return false;   // parallel / coplanar
  const invDet = 1 / det;

  const sx = px - ax, sy = py - ay, sz = pz - az;
  const u = invDet * (sx * hx + sy * hy + sz * hz);
  if (u <= 0 || u >= 1) return false;

  // q = s × e1
  const qqx = sy * e1z - sz * e1y;
  const qqy = sz * e1x - sx * e1z;
  const qqz = sx * e1y - sy * e1x;
  const v = invDet * (dx * qqx + dy * qqy + dz * qqz);
  if (v <= 0 || u + v >= 1) return false;

  const t = invDet * (e2x * qqx + e2y * qqy + e2z * qqz);
  if (t <= 0 || t >= 1) return false;

  return true;
}
