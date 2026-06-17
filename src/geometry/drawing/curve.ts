/**
 * Parametric plane curves with arclength queries.
 *
 * A curve is discretized ONCE into a dense polyline with a cumulative-arclength
 * table; every query (point-at-arclength, uniform resampling, nearest-point
 * projection) runs off that table. So the same type serves both a parametric
 * function t↦(x,y) and a hand-listed polyline, open or closed.
 *
 * Pure: no DOM, no three.js.
 */

import { type Vec2, dist, lerp, projectToSegment } from './vec2';

export interface PlaneCurve {
  readonly length: number;
  readonly closed: boolean;
  /** Discretization vertices (for drawing); for a closed curve the first vertex
   *  is repeated at the end so the closing edge is present. */
  readonly polyline: Vec2[];
  /** Point at arclength s (clamped to [0,length] if open, wrapped if closed). */
  pointAt(s: number): Vec2;
  /** n points equally spaced in arclength (open: n−1 intervals; closed: n intervals). */
  uniform(n: number): { s: number; p: Vec2 }[];
  /** Nearest point ON the curve to p: its arclength s, true distance, and foot. */
  project(p: Vec2): { s: number; dist: number; foot: Vec2 };
}

export function makeCurve(
  f: (t: number) => Vec2,
  opts: { t0?: number; t1?: number; samples?: number; closed?: boolean } = {},
): PlaneCurve {
  const { t0 = 0, t1 = 1, samples = 512, closed = false } = opts;
  const pts: Vec2[] = [];
  for (let i = 0; i < samples; i++) {
    const t = t0 + (t1 - t0) * (i / (samples - 1));
    const q = f(t);
    pts.push([q[0], q[1]]);
  }
  return makePolyline(pts, { closed });
}

export function makePolyline(points: readonly Vec2[], opts: { closed?: boolean } = {}): PlaneCurve {
  const closed = opts.closed ?? false;
  if (points.length < 2) throw new Error('makePolyline: need at least 2 points');
  const verts: Vec2[] = points.map((p) => [p[0], p[1]]);
  if (closed) verts.push([verts[0][0], verts[0][1]]); // closing edge
  const n = verts.length;

  const cum = new Float64Array(n);
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + dist(verts[i - 1], verts[i]);
  const length = cum[n - 1];

  /** Largest segment index i with cum[i] ≤ s (binary search on the sorted cum). */
  function segmentAt(s: number): number {
    let lo = 0, hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (cum[mid] <= s) lo = mid; else hi = mid - 1;
    }
    return Math.min(lo, n - 2); // a segment, not the last vertex
  }

  function pointAt(s: number): Vec2 {
    let q = s;
    if (closed) q = ((q % length) + length) % length;
    else q = q < 0 ? 0 : q > length ? length : q;
    const seg = segmentAt(q);
    const segLen = cum[seg + 1] - cum[seg];
    const t = segLen < 1e-30 ? 0 : (q - cum[seg]) / segLen;
    return lerp(verts[seg], verts[seg + 1], t);
  }

  function uniform(count: number): { s: number; p: Vec2 }[] {
    const out: { s: number; p: Vec2 }[] = [];
    const intervals = closed ? count : count - 1;
    for (let i = 0; i < count; i++) {
      const s = intervals <= 0 ? 0 : (i * length) / intervals;
      out.push({ s, p: pointAt(s) });
    }
    return out;
  }

  function project(p: Vec2): { s: number; dist: number; foot: Vec2 } {
    let bestSeg = 0, bestT = 0, bestFoot: Vec2 = verts[0], bestD2 = Infinity;
    for (let i = 0; i + 1 < n; i++) {
      const r = projectToSegment(p, verts[i], verts[i + 1]);
      if (r.dist2 < bestD2) { bestD2 = r.dist2; bestSeg = i; bestT = r.t; bestFoot = r.foot; }
    }
    const segLen = cum[bestSeg + 1] - cum[bestSeg];
    return { s: cum[bestSeg] + bestT * segLen, dist: Math.sqrt(bestD2), foot: bestFoot };
  }

  return { length, closed, polyline: verts, pointAt, uniform, project };
}
