/**
 * Trace a parametric curve through a planar point cloud: select cloud points
 * that follow the curve, evenly spaced along it.
 *
 * Dead simple: lay down `count` points equally spaced in ARCLENGTH along the
 * curve (`curve.uniform`), and for each take the NEAREST cloud point. A sample
 * point whose nearest cloud point is farther than `maxDist` is left empty (a gap).
 *
 * `curve.uniform` spaces the sample points correctly for open and closed curves
 * (a closed curve's seam is not duplicated), so they are genuinely even.
 *
 * Generic over a payload T carried on each cloud point (its provenance — e.g.
 * the source row in ℝ²⁴), so a match maps straight back to its origin with no
 * inversion. Euclidean distance in the plane.
 *
 * Pure: no DOM, no three.js.
 */

import { type Vec2, dist2 } from './vec2';
import type { PlaneCurve } from './curve';

export type CloudPoint<T> = { p: Vec2; payload: T };

export type Match<T> = {
  /** Sample-point index 0..count−1. */
  index: number;
  /** Arclength of this sample point along the curve. */
  s: number;
  /** The sample point ON the curve (where the match is tied). */
  curvePoint: Vec2;
  /** The matched (nearest) cloud point and its distance to the sample point. */
  p: Vec2;
  dist: number;
  payload: T;
};

export type SampleResult<T> = {
  /** One Match-or-null per sample point, in arclength order (null = gap). */
  samples: (Match<T> | null)[];
  /** The non-null sample points (the selected cloud points), in arclength order. */
  matches: Match<T>[];
  /** Indices whose nearest cloud point was beyond `maxDist`. */
  gaps: number[];
  /** Arclength spacing between adjacent sample points. */
  spacing: number;
  length: number;
};

export type SampleOptions = {
  /** Number of points to sample along the curve (≥ 2). */
  count: number;
  /** Leave a sample point empty (a gap) if its nearest cloud point is farther than this. Default ∞. */
  maxDist?: number;
};

export function sampleAlongCurve<T>(
  curve: PlaneCurve,
  cloud: readonly CloudPoint<T>[],
  opts: SampleOptions,
): SampleResult<T> {
  const { count, maxDist = Infinity } = opts;
  if (count < 2) throw new Error('sampleAlongCurve: need count ≥ 2');

  const pts = curve.uniform(count);                      // evenly spaced in arclength
  const spacing = pts.length > 1 ? pts[1].s - pts[0].s : 0;
  const max2 = maxDist * maxDist;

  const samples: (Match<T> | null)[] = [];
  const gaps: number[] = [];
  for (let i = 0; i < count; i++) {
    const sp = pts[i];
    let best: CloudPoint<T> | null = null, bestD2 = Infinity;
    for (const c of cloud) {
      const d2 = dist2(c.p, sp.p);
      if (d2 < bestD2) { bestD2 = d2; best = c; }
    }
    if (best && bestD2 <= max2) {
      samples.push({ index: i, s: sp.s, curvePoint: sp.p, p: best.p, dist: Math.sqrt(bestD2), payload: best.payload });
    } else {
      samples.push(null);
      gaps.push(i);
    }
  }

  const matches = samples.filter((m): m is Match<T> => m !== null);
  return { samples, matches, gaps, spacing, length: curve.length };
}
