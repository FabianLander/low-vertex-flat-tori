/**
 * The embeddedness gate — the *topological truth* of the embedded condition: no two
 * triangle interiors cross. This is what a `Region` gates on (NOT `margin > 0`,
 * which is a different, geometric quantity that disagrees at the boundary).
 *
 * The 120 triangle pairs partition by vertex overlap:
 *   - disjoint pairs (share 0 vertices)  → a full triangle–triangle test
 *   - vertex-shared pairs (share 1)      → 2 segment–triangle tests (the non-shared
 *     edge of each must pierce the other; the shared-vertex line is the only place
 *     a non-shared common point can lie)
 *   - edge-shared pairs                  → generically no interior crossing; skipped
 * Coplanar degeneracies (measure zero) report "not intersecting" to stay robust.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../../topology/triangulation.ts';
import { segmentTriangleIntersect, triangleTriangleIntersect } from '../../geometry/triangleIntersect.ts';

export type EmbeddingViolation = {
  /** 'tri-tri' = disjoint pair's interiors cross; 'edge-tri' = vertex-shared pair's edge pierces the other. */
  readonly kind: 'tri-tri' | 'edge-tri';
  readonly t1: number;
  readonly t2: number;
};

/** The realization is embedded iff no two triangle interiors cross. */
export function isEmbedded(torus: Triangulation, positions: ArrayLike<number>): boolean {
  return firstViolation(torus, positions) === null;
}

/** The first crossing found, or null if embedded. */
export function firstViolation(torus: Triangulation, positions: ArrayLike<number>): EmbeddingViolation | null {
  const { triangles } = torus;
  for (const [t1, t2] of torus.disjointTrianglePairs) {
    const a = triangles[t1], b = triangles[t2];
    if (triangleTriangleIntersect(positions, a[0], a[1], a[2], b[0], b[1], b[2])) {
      return { kind: 'tri-tri', t1, t2 };
    }
  }
  for (const pair of torus.sharedVertexTrianglePairs) {
    const t1 = triangles[pair.a], t2 = triangles[pair.b];
    if (segmentTriangleIntersect(positions, pair.aOpp[0], pair.aOpp[1], t2[0], t2[1], t2[2])
      || segmentTriangleIntersect(positions, pair.bOpp[0], pair.bOpp[1], t1[0], t1[1], t1[2])) {
      return { kind: 'edge-tri', t1: pair.a, t2: pair.b };
    }
  }
  return null;
}

/** Every crossing (for diagnostics / painting). */
export function allViolations(torus: Triangulation, positions: ArrayLike<number>): EmbeddingViolation[] {
  const { triangles } = torus;
  const out: EmbeddingViolation[] = [];
  for (const [t1, t2] of torus.disjointTrianglePairs) {
    const a = triangles[t1], b = triangles[t2];
    if (triangleTriangleIntersect(positions, a[0], a[1], a[2], b[0], b[1], b[2])) {
      out.push({ kind: 'tri-tri', t1, t2 });
    }
  }
  for (const pair of torus.sharedVertexTrianglePairs) {
    const t1 = triangles[pair.a], t2 = triangles[pair.b];
    const hit = segmentTriangleIntersect(positions, pair.aOpp[0], pair.aOpp[1], t2[0], t2[1], t2[2])
      || segmentTriangleIntersect(positions, pair.bOpp[0], pair.bOpp[1], t1[0], t1[1], t1[2]);
    if (hit) out.push({ kind: 'edge-tri', t1: pair.a, t2: pair.b });
  }
  return out;
}

/** Per-face scalar: 1 on triangles involved in any violation, 0 elsewhere (for painting). */
export function violationFaceScalars(torus: Triangulation, positions: ArrayLike<number>, out?: Float32Array): Float32Array {
  const r = out ?? new Float32Array(torus.triangles.length);
  r.fill(0);
  for (const v of allViolations(torus, positions)) { r[v.t1] = 1; r[v.t2] = 1; }
  return r;
}
