/**
 * Energy: cell-barrier (interior log-barrier on cell gaps).
 *
 * Unlike cellMargin (a finite hinge) and cutOffArea (a penalty that is zero on
 * the entire embedded region), this is a BARRIER: it is active throughout the
 * embedded interior and blows up to +∞ as any watched gap → 0. For one pair at
 * normalized gap d̃ = d/√area,
 *
 *     B(d̃) = −μ · log(d̃ / δ)   for 0 < d̃ < δ,   else 0.
 *
 * B = 0 at d̃ = δ and rises without bound as d̃ → 0. Because the gradient
 * (−μ/d̃) grows as a pair approaches contact, the barrier exerts an
 * ever-stronger *inward* (separating) force — so a descent flow settles at an
 * equilibrium strictly *inside* the embedded region (a genuinely fattened,
 * embedded fixed point), and cannot be walked across the boundary by any other
 * term the way cutOffArea could. It both keeps embedding and fattens.
 *
 * To actually *guarantee* embedding it must watch exactly what isEmbedded
 * checks. So in addition to the six non-adjacent cell-pair types (which fatten
 * the vertex/edge/face near-misses), it includes the SHARED-VERTEX triangle
 * pairs' edge↔triangle gaps — the adjacent configurations whose crossing is
 * the other half of the embedding test, and which broke earlier attempts.
 *
 * Scale-free: gaps are divided by √area (via linearSize), so the barrier
 * cannot be cheated by inflating the mesh. Gradient is finite-difference.
 *
 * This module is self-contained and does not modify cellMargin.ts.
 */

import { EDGES, TRIANGLES } from '../topology';
import {
  VERTEX_VERTEX_PAIRS, VERTEX_EDGE_PAIRS, VERTEX_FACE_PAIRS,
  EDGE_EDGE_PAIRS, EDGE_FACE_PAIRS, FACE_FACE_PAIRS,
} from '../cellPairs';
import { SHARED_VERTEX_TRIANGLE_PAIRS } from '../embedded';
import {
  pointPointDist2, pointSegmentDist2, pointTriangleDist2,
  triangleTriangleDist2, segmentTriangleDist2,
} from '../distance';
import { linearSize } from './cellMargin';
import { fdGradient } from './finiteDiffGradient';
import type { RepulsionEnergy } from './types';

export const DEFAULT_DELTA = 0.1;    // cutoff radius (units of √area): barrier acts within this
export const DEFAULT_STRENGTH = 1;   // μ

const GAP_FLOOR = 1e-9; // clamp d̃ so −log stays finite if a pair is essentially touching

// --- distance accessors (true Euclidean distance; normalization happens in compute) ---

function dVV(p: ArrayLike<number>, i: number, j: number): number {
  const oi = 3 * i, oj = 3 * j;
  return Math.sqrt(pointPointDist2(p[oi], p[oi + 1], p[oi + 2], p[oj], p[oj + 1], p[oj + 2]));
}

function dVE(p: ArrayLike<number>, v: number, e: number): number {
  const ov = 3 * v;
  const [a, b] = EDGES[e];
  const oa = 3 * a, ob = 3 * b;
  return Math.sqrt(pointSegmentDist2(
    p[ov], p[ov + 1], p[ov + 2],
    p[oa], p[oa + 1], p[oa + 2], p[ob], p[ob + 1], p[ob + 2],
  ));
}

function dVF(p: ArrayLike<number>, v: number, f: number): number {
  const ov = 3 * v;
  const [a, b, c] = TRIANGLES[f];
  const oa = 3 * a, ob = 3 * b, oc = 3 * c;
  return Math.sqrt(pointTriangleDist2(
    p[ov], p[ov + 1], p[ov + 2],
    p[oa], p[oa + 1], p[oa + 2], p[ob], p[ob + 1], p[ob + 2], p[oc], p[oc + 1], p[oc + 2],
  ));
}

function midpointSegDist(
  p: ArrayLike<number>, ea: number, eb: number, segA: number, segB: number,
): number {
  const oea = 3 * ea, oeb = 3 * eb, oa = 3 * segA, ob = 3 * segB;
  const mx = 0.5 * (p[oea] + p[oeb]), my = 0.5 * (p[oea + 1] + p[oeb + 1]), mz = 0.5 * (p[oea + 2] + p[oeb + 2]);
  return Math.sqrt(pointSegmentDist2(mx, my, mz, p[oa], p[oa + 1], p[oa + 2], p[ob], p[ob + 1], p[ob + 2]));
}

function dEF(p: ArrayLike<number>, e: number, f: number): number {
  const [a, b] = EDGES[e];
  const oa = 3 * a, ob = 3 * b;
  const mx = 0.5 * (p[oa] + p[ob]), my = 0.5 * (p[oa + 1] + p[ob + 1]), mz = 0.5 * (p[oa + 2] + p[ob + 2]);
  const [c0, c1, c2] = TRIANGLES[f];
  const o0 = 3 * c0, o1 = 3 * c1, o2 = 3 * c2;
  return Math.sqrt(pointTriangleDist2(
    mx, my, mz,
    p[o0], p[o0 + 1], p[o0 + 2], p[o1], p[o1 + 1], p[o1 + 2], p[o2], p[o2 + 1], p[o2 + 2],
  ));
}

function dFF(p: ArrayLike<number>, fa: number, fb: number): number {
  const [a0, a1, a2] = TRIANGLES[fa];
  const [b0, b1, b2] = TRIANGLES[fb];
  const A0 = 3 * a0, A1 = 3 * a1, A2 = 3 * a2;
  const B0 = 3 * b0, B1 = 3 * b1, B2 = 3 * b2;
  return Math.sqrt(triangleTriangleDist2(
    p[A0], p[A0 + 1], p[A0 + 2], p[A1], p[A1 + 1], p[A1 + 2], p[A2], p[A2 + 1], p[A2 + 2],
    p[B0], p[B0 + 1], p[B0 + 2], p[B1], p[B1 + 1], p[B1 + 2], p[B2], p[B2 + 1], p[B2 + 2],
  ));
}

/** Distance from edge (u,w) to the filled triangle (a,b,c). */
function dEdgeTri(p: ArrayLike<number>, u: number, w: number, a: number, b: number, c: number): number {
  const ou = 3 * u, ow = 3 * w, oa = 3 * a, ob = 3 * b, oc = 3 * c;
  return Math.sqrt(segmentTriangleDist2(
    p[ou], p[ou + 1], p[ou + 2], p[ow], p[ow + 1], p[ow + 2],
    p[oa], p[oa + 1], p[oa + 2], p[ob], p[ob + 1], p[ob + 2], p[oc], p[oc + 1], p[oc + 2],
  ));
}

export interface CellBarrierOptions {
  delta?: number;
  strength?: number;
}

export function makeCellBarrier(opts: CellBarrierOptions = {}): RepulsionEnergy {
  const delta = opts.delta ?? DEFAULT_DELTA;
  const strength = opts.strength ?? DEFAULT_STRENGTH;

  const barrier = (dt: number): number => {
    if (dt >= delta) return 0;
    const d = dt < GAP_FLOOR ? GAP_FLOOR : dt;
    return -strength * Math.log(d / delta);
  };

  function compute(p: ArrayLike<number>): number {
    const invL = 1 / linearSize(p);
    let E = 0;

    // Fattening / degeneracy terms (the six non-adjacent cell-pair types).
    for (const [i, j] of VERTEX_VERTEX_PAIRS) E += barrier(dVV(p, i, j) * invL);
    for (const [v, e] of VERTEX_EDGE_PAIRS) E += barrier(dVE(p, v, e) * invL);
    for (const [v, f] of VERTEX_FACE_PAIRS) E += barrier(dVF(p, v, f) * invL);
    for (const [e1, e2] of EDGE_EDGE_PAIRS) {
      const [a1, b1] = EDGES[e1];
      const [a2, b2] = EDGES[e2];
      E += barrier(midpointSegDist(p, a1, b1, a2, b2) * invL);
      E += barrier(midpointSegDist(p, a2, b2, a1, b1) * invL);
    }
    for (const [e, f] of EDGE_FACE_PAIRS) E += barrier(dEF(p, e, f) * invL);

    // Embedding-critical terms (exactly what isEmbedded checks):
    //   disjoint triangle pairs → triangle–triangle gap
    for (const [fa, fb] of FACE_FACE_PAIRS) E += barrier(dFF(p, fa, fb) * invL);
    //   shared-vertex pairs → each non-shared edge vs the opposite triangle
    for (const pair of SHARED_VERTEX_TRIANGLE_PAIRS) {
      const tb = TRIANGLES[pair.b];
      const ta = TRIANGLES[pair.a];
      E += barrier(dEdgeTri(p, pair.aOpp[0], pair.aOpp[1], tb[0], tb[1], tb[2]) * invL);
      E += barrier(dEdgeTri(p, pair.bOpp[0], pair.bOpp[1], ta[0], ta[1], ta[2]) * invL);
    }
    return E;
  }

  return {
    label: `cell-barrier (δ=${delta}, μ=${strength}, L=√area)`,
    compute,
    gradient(positions, out) {
      fdGradient(compute, positions, out);
    },
  };
}

/** Default cell-barrier with δ = 0.1, μ = 1. */
export const CELL_BARRIER: RepulsionEnergy = makeCellBarrier();
