/**
 * separation — the geometric closeness of the realization to itself, two ways:
 *
 *   minSeparation  the TRUE minimum distance between any two non-adjacent (vertex-
 *                  disjoint) cells — a clean geometric diagnostic ("how close does the
 *                  surface come to touching itself, relative to its size"). Closest-
 *                  feature distances, no shortcuts; → 0 exactly when two such cells
 *                  touch. (Distinct from `embedded.clearance`, which is gate-aligned —
 *                  only the pairs that can actually cross.)
 *
 *   forEachCellGap / minCellGap  the cell-gap SUBSTRATE the FATTEN energies descend
 *                  (`cellMargin`/`cellBarrier`). These deliberately also include pairs
 *                  that share a vertex (an edge near a face it touches), measured from
 *                  edge midpoints so the shared vertex doesn't zero the gap — a fold
 *                  proximity the energies want to repel. `minCellGap` is the min over
 *                  it (the energy-relevant min).
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import { totalArea } from '../moduli/develop.ts';
import {
  pointPointDist2, pointSegmentDist2, pointTriangleDist2,
  segmentSegmentDist2, segmentTriangleDist2, triangleTriangleDist2,
} from '../geometry/distance.ts';
import { cellTables } from './cells.ts';

/** Linear size of the torus, L = √(total area) — the normalizing length. */
export function linearSize(triang: Triangulation, p: ArrayLike<number>): number {
  return Math.sqrt(totalArea(triang, p));
}

export type GapType = 'vv' | 've' | 'vf' | 'ee' | 'ef' | 'ff';

// --- true closest-feature gaps (for minSeparation) ---

function vvDist(p: ArrayLike<number>, i: number, j: number): number {
  const oi = 3 * i, oj = 3 * j;
  return Math.sqrt(pointPointDist2(p[oi], p[oi + 1], p[oi + 2], p[oj], p[oj + 1], p[oj + 2]));
}
function veDist(triang: Triangulation, p: ArrayLike<number>, v: number, e: number): number {
  const ov = 3 * v;
  const [a, b] = triang.edges[e];
  const oa = 3 * a, ob = 3 * b;
  return Math.sqrt(pointSegmentDist2(p[ov], p[ov + 1], p[ov + 2], p[oa], p[oa + 1], p[oa + 2], p[ob], p[ob + 1], p[ob + 2]));
}
function vfDist(triang: Triangulation, p: ArrayLike<number>, v: number, f: number): number {
  const ov = 3 * v;
  const [a, b, c] = triang.triangles[f];
  const oa = 3 * a, ob = 3 * b, oc = 3 * c;
  return Math.sqrt(pointTriangleDist2(p[ov], p[ov + 1], p[ov + 2], p[oa], p[oa + 1], p[oa + 2], p[ob], p[ob + 1], p[ob + 2], p[oc], p[oc + 1], p[oc + 2]));
}
function eeDist(triang: Triangulation, p: ArrayLike<number>, e1: number, e2: number): number {
  const [a1, b1] = triang.edges[e1];
  const [a2, b2] = triang.edges[e2];
  const oa1 = 3 * a1, ob1 = 3 * b1, oa2 = 3 * a2, ob2 = 3 * b2;
  return Math.sqrt(segmentSegmentDist2(
    p[oa1], p[oa1 + 1], p[oa1 + 2], p[ob1], p[ob1 + 1], p[ob1 + 2],
    p[oa2], p[oa2 + 1], p[oa2 + 2], p[ob2], p[ob2 + 1], p[ob2 + 2],
  ));
}
function efDist(triang: Triangulation, p: ArrayLike<number>, e: number, f: number): number {
  const [a, b] = triang.edges[e];
  const oa = 3 * a, ob = 3 * b;
  const [c0, c1, c2] = triang.triangles[f];
  const o0 = 3 * c0, o1 = 3 * c1, o2 = 3 * c2;
  return Math.sqrt(segmentTriangleDist2(
    p[oa], p[oa + 1], p[oa + 2], p[ob], p[ob + 1], p[ob + 2],
    p[o0], p[o0 + 1], p[o0 + 2], p[o1], p[o1 + 1], p[o1 + 2], p[o2], p[o2 + 1], p[o2 + 2],
  ));
}
function ffDist(triang: Triangulation, p: ArrayLike<number>, fa: number, fb: number): number {
  const [a0, a1, a2] = triang.triangles[fa];
  const [b0, b1, b2] = triang.triangles[fb];
  const A0 = 3 * a0, A1 = 3 * a1, A2 = 3 * a2, B0 = 3 * b0, B1 = 3 * b1, B2 = 3 * b2;
  return Math.sqrt(triangleTriangleDist2(
    p[A0], p[A0 + 1], p[A0 + 2], p[A1], p[A1 + 1], p[A1 + 2], p[A2], p[A2 + 1], p[A2 + 2],
    p[B0], p[B0 + 1], p[B0 + 2], p[B1], p[B1 + 1], p[B1 + 2], p[B2], p[B2 + 1], p[B2 + 2],
  ));
}

export type SeparationReport = {
  /** Smallest normalized gap d̃ = d/√area over all vertex-disjoint cell pairs. */
  distance: number;
  /** Which pair type realizes it. */
  type: GapType;
  /** The two cell indices (meaning depends on type). */
  cells: [number, number];
};

/**
 * The minimum true distance between any two NON-ADJACENT (vertex-disjoint) cells,
 * normalized by √area, and which pair achieves it. The shared-vertex `edge↔face`
 * pairs in `cellPairs` are skipped (they touch at the shared vertex — distance 0).
 */
export function minSeparation(triang: Triangulation, p: ArrayLike<number>): SeparationReport {
  const invL = 1 / linearSize(triang, p);
  const { vertexVertex, vertexEdge, vertexFace, edgeEdge, edgeFace, faceFace } = cellTables(triang).cellPairs;
  let best: SeparationReport = { distance: Infinity, type: 'vv', cells: [-1, -1] };
  const consider = (d: number, type: GapType, a: number, b: number) => {
    const g = d * invL;
    if (g < best.distance) best = { distance: g, type, cells: [a, b] };
  };
  for (const [i, j] of vertexVertex) consider(vvDist(p, i, j), 'vv', i, j);
  for (const [v, e] of vertexEdge) consider(veDist(triang, p, v, e), 've', v, e);
  for (const [v, f] of vertexFace) consider(vfDist(triang, p, v, f), 'vf', v, f);
  for (const [e1, e2] of edgeEdge) consider(eeDist(triang, p, e1, e2), 'ee', e1, e2);
  for (const [e, f] of edgeFace) {
    const [a, b] = triang.edges[e], [c0, c1, c2] = triang.triangles[f];
    if (a === c0 || a === c1 || a === c2 || b === c0 || b === c1 || b === c2) continue; // shares a vertex
    consider(efDist(triang, p, e, f), 'ef', e, f);
  }
  for (const [fa, fb] of faceFace) consider(ffDist(triang, p, fa, fb), 'ff', fa, fb);
  return best;
}

// --- the FATTEN-energy substrate: the cell gaps the near-miss energies descend ---
//
// For point-like cells (a vertex against a vertex/edge/face, and face↔face) the gap
// IS the true closest-feature distance (the `*Dist` kernels above). For a cell with an
// EDGE in it we instead measure from the edge's MIDPOINT: it is a smooth proxy (no
// closest-feature branch to differentiate through), and for the edge–face pairs that
// share a vertex it keeps the shared vertex from zeroing the gap (a fold the energy
// must still repel). So only the edge cases get a dedicated function here.

/** Edge–edge gap: each edge's midpoint to the other segment (two values). */
function edgeEdgeMidpointGaps(triang: Triangulation, p: ArrayLike<number>, e1: number, e2: number): [number, number] {
  const [a1, b1] = triang.edges[e1];
  const [a2, b2] = triang.edges[e2];
  const oa1 = 3 * a1, ob1 = 3 * b1, oa2 = 3 * a2, ob2 = 3 * b2;
  const m1x = 0.5 * (p[oa1] + p[ob1]), m1y = 0.5 * (p[oa1 + 1] + p[ob1 + 1]), m1z = 0.5 * (p[oa1 + 2] + p[ob1 + 2]);
  const m2x = 0.5 * (p[oa2] + p[ob2]), m2y = 0.5 * (p[oa2 + 1] + p[ob2 + 1]), m2z = 0.5 * (p[oa2 + 2] + p[ob2 + 2]);
  const d1 = Math.sqrt(pointSegmentDist2(m1x, m1y, m1z, p[oa2], p[oa2 + 1], p[oa2 + 2], p[ob2], p[ob2 + 1], p[ob2 + 2]));
  const d2 = Math.sqrt(pointSegmentDist2(m2x, m2y, m2z, p[oa1], p[oa1 + 1], p[oa1 + 2], p[ob1], p[ob1 + 1], p[ob1 + 2]));
  return [d1, d2];
}
/** Edge–face gap: the edge's midpoint to the filled face (shared-vertex-safe). */
function edgeFaceMidpointGap(triang: Triangulation, p: ArrayLike<number>, e: number, f: number): number {
  const [a, b] = triang.edges[e];
  const oa = 3 * a, ob = 3 * b;
  const mx = 0.5 * (p[oa] + p[ob]), my = 0.5 * (p[oa + 1] + p[ob + 1]), mz = 0.5 * (p[oa + 2] + p[ob + 2]);
  const [c0, c1, c2] = triang.triangles[f];
  const o0 = 3 * c0, o1 = 3 * c1, o2 = 3 * c2;
  return Math.sqrt(pointTriangleDist2(mx, my, mz, p[o0], p[o0 + 1], p[o0 + 2], p[o1], p[o1 + 1], p[o1 + 2], p[o2], p[o2 + 1], p[o2 + 2]));
}

/**
 * Visit the normalized gap d̃ = d/√area of every cell pair in `cellPairs` — the
 * substrate the fatten energies descend. Edge gaps use midpoints (shared-vertex-safe);
 * edge–edge yields two gaps. Allocation-free.
 */
export function forEachCellGap(
  triang: Triangulation,
  p: ArrayLike<number>,
  visit: (gap: number, type: GapType, a: number, b: number) => void,
): void {
  const invL = 1 / linearSize(triang, p);
  const { vertexVertex, vertexEdge, vertexFace, edgeEdge, edgeFace, faceFace } = cellTables(triang).cellPairs;
  for (const [i, j] of vertexVertex) visit(vvDist(p, i, j) * invL, 'vv', i, j);
  for (const [v, e] of vertexEdge) visit(veDist(triang, p, v, e) * invL, 've', v, e);
  for (const [v, f] of vertexFace) visit(vfDist(triang, p, v, f) * invL, 'vf', v, f);
  for (const [e1, e2] of edgeEdge) {
    const [d1, d2] = edgeEdgeMidpointGaps(triang, p, e1, e2);
    visit(d1 * invL, 'ee', e1, e2);
    visit(d2 * invL, 'ee', e1, e2);
  }
  for (const [e, f] of edgeFace) visit(edgeFaceMidpointGap(triang, p, e, f) * invL, 'ef', e, f);
  for (const [fa, fb] of faceFace) visit(ffDist(triang, p, fa, fb) * invL, 'ff', fa, fb);
}

/** The smallest normalized gap over the fatten-energy substrate (the energy-relevant min). */
export function minCellGap(triang: Triangulation, p: ArrayLike<number>): number {
  let m = Infinity;
  forEachCellGap(triang, p, (g) => { if (g < m) m = g; });
  return m;
}
