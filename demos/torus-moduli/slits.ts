/**
 * slits — a strip of paper cut into pieces by its slits, the mouths of the slits rounded or not:
 * the margin of the fundamental-domain sheet (`./domainCutout.ts`) and the slide-in tabs of the
 * net sheet (`./cutout.ts`).
 *
 * Pure.
 */

import type { V2 } from './cutout';

/** A stretch this long, in mm, gets two slits, at its thirds, or one in the middle. */
export const TWO_SLITS = 15, ONE_SLIT = 10;
/** The radius of a rounded slit mouth, in mm, and the number of straight steps its quarter circle is drawn in. */
export const SLIT_ROUND = 1.5, ARC_STEPS = 6;

/** Keep the part of a convex polygon where nx·x + ny·y ≥ c. */
export function clipHalf(poly: readonly V2[], nx: number, ny: number, c: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const sp = nx * p[0] + ny * p[1] - c, sq = nx * q[0] + ny * q[1] - c;
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
  }
  return out;
}
/** Where a convex polygon meets the line {coordinate `axis` = value}: the range of the other coordinate. */
export function span(poly: readonly V2[], axis: 0 | 1, value: number): [number, number] | null {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], sp = p[axis] - value, sq = q[axis] - value;
    if (sp === 0) { lo = Math.min(lo, p[1 - axis]); hi = Math.max(hi, p[1 - axis]); }
    if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
      const t = sp / (sp - sq), w = p[1 - axis] + t * (q[1 - axis] - p[1 - axis]);
      lo = Math.min(lo, w); hi = Math.max(hi, w);
    }
  }
  return lo <= hi ? [lo, hi] : null;
}

/** A strip of margin cut into pieces by its slits, in the strip's own frame. */
export interface SlitStrip {
  /** The pieces between the slits, by increasing x: one more than there are slits. */
  readonly pieces: V2[][];
  /** For each edge of the strip (corner i to corner i + 1) what is left of it, as polylines: all of it, or what the mouths of the slits leave. */
  readonly edges: V2[][][];
  /** The slits and the arcs of their mouths, as polylines. */
  readonly cuts: V2[][];
}

/**
 * Slit a strip of margin. The strip is a convex polygon in its own frame: it stands on y = 0 (the
 * side or seam it hangs on) and lies in y ≤ 0. Each slit runs square to y = 0, from the strip's
 * far edge at the given x down to y = 0.
 *
 * With a radius r > 0 the mouth of a slit is ROUNDED: the two corners the slit makes with the far
 * edge are cut off along quarter circles of radius r, so the mouth opens like a funnel 2r wide and
 * the pieces of the other strip find their way in. That is done where the far edge is flat
 * (parallel to y = 0) for r on both sides of the slit and the strip is deep enough. Elsewhere the
 * slit stays a plain cut.
 *
 * With `part` < 1 a slit stops short: it runs from the far edge over that part of the strip's depth
 * there and leaves the rest, next to y = 0, whole. The strip then stays in one piece; `pieces` are
 * still what full slits would make of it, which is the same region.
 */
export function slitStrip(poly: readonly V2[], slits: readonly number[], r = 0, part = 1): SlitStrip {
  const eps = 1e-7, n = poly.length;
  const arc = (cx: number, cy: number, from: number, to: number): V2[] => Array.from({ length: ARC_STEPS + 1 },
    (_, i) => { const th = from + (to - from) * i / ARC_STEPS; return [cx + r * Math.cos(th), cy + r * Math.sin(th)] as V2; });
  const cuts: V2[][] = [];
  const mouths: { x: number; y: number; edge: number }[] = [];
  for (const x of slits) {
    const reach = span(poly, 0, x);
    if (!reach) continue;
    const y = reach[0];                                                         // where the far edge is, at x
    const end = part >= 1 ? 0 : y * (1 - part);                                 // where the slit stops
    const edge = r > 0 && -y >= 2.5 * r && -y * part >= r ? poly.findIndex((p, i) => {
      const q = poly[(i + 1) % n];
      return Math.abs(p[1] - y) < eps && Math.abs(q[1] - y) < eps && Math.min(p[0], q[0]) <= x - r + eps && Math.max(p[0], q[0]) >= x + r - eps;
    }) : -1;
    if (edge < 0) { cuts.push([[x, y], [x, end]]); continue; }
    mouths.push({ x, y, edge });
    cuts.push([[x, y + r], [x, end]]);
    cuts.push(arc(x - r, y + r, -Math.PI / 2, 0));                            // from the far edge at x - r to the slit
    cuts.push(arc(x + r, y + r, Math.PI, 1.5 * Math.PI));                     // from the slit to the far edge at x + r
  }
  // the pieces, their corners at a rounded mouth replaced by its arc
  const pieces: V2[][] = [];
  const bounds = [-Infinity, ...slits, Infinity];
  for (let i = 0; i + 1 < bounds.length; i++) {
    let piece: V2[] = [...poly];
    if (Number.isFinite(bounds[i])) piece = clipHalf(piece, 1, 0, bounds[i]);
    if (Number.isFinite(bounds[i + 1])) piece = clipHalf(piece, -1, 0, -bounds[i + 1]);
    for (const m of mouths) {
      if (m.x !== bounds[i] && m.x !== bounds[i + 1]) continue;
      const at = piece.findIndex((p) => Math.abs(p[0] - m.x) < eps && Math.abs(p[1] - m.y) < eps);
      if (at < 0) continue;
      // the piece left of the slit loses its corner to the first arc, the piece right of it to the second
      const round = m.x === bounds[i + 1] ? arc(m.x - r, m.y + r, -Math.PI / 2, 0) : arc(m.x + r, m.y + r, 1.5 * Math.PI, Math.PI);
      // both arcs above run from the far edge to the slit: turn it round if the piece comes from the slit
      const before = piece[(at + piece.length - 1) % piece.length];
      if (Math.abs(before[0] - m.x) < eps) round.reverse();
      piece.splice(at, 1, ...round);
    }
    pieces.push(piece);
  }
  // the edges: the far edge loses 2r at every rounded mouth
  const edges = poly.map((p, i) => {
    const q = poly[(i + 1) % n], gaps = mouths.filter((m) => m.edge === i).map((m) => m.x), dir = q[0] >= p[0] ? 1 : -1;
    if (!gaps.length) return [[p, q]];
    const out: V2[][] = [];
    let from = p;
    for (const x of gaps.sort((g, h) => dir * (g - h))) {
      const stop: V2 = [x - dir * r, p[1]];
      if (dir * (stop[0] - from[0]) > eps) out.push([from, stop]);
      from = [x + dir * r, p[1]];
    }
    if (dir * (q[0] - from[0]) > eps) out.push([from, q]);
    return out;
  });
  return { pieces, edges, cuts };
}
