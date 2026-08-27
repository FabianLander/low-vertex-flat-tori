/**
 * shape — extrinsic shape descriptors of a realization: how INFLATED it is, as opposed to
 * how far it is from crossing itself. The sibling of `measure.ts`, and deliberately a
 * separate concern from it.
 *
 * `measure` answers "is this a paper torus, and which one" — flat, embedded, at what modulus.
 * `clearance` in particular is about the nearest CROSSING, so a torus can be comfortably
 * embedded and still be a nearly-planar crumpled sheet. These answer the other question, the
 * one you ask if you want to fold the thing out of paper and have it hold its shape: how much
 * air does it enclose, how far is it from lying in a plane, and is any crease so close to flat
 * that it is not really a fold at all.
 *
 * All three are SCALE-FREE, so they are comparable across the fiber — which matters because
 * flatness and τ are both scale-invariant, making that fiber a cone (see `fiber-cloud`).
 *
 *   volumeRatio  |enclosed volume| / area^{3/2}. Zero exactly when the realization is planar;
 *                0.0940 for a round sphere, so it reads as a fraction of the roundest possible
 *                shape. Measured on Lander's folded bases: 0 at the fold, 8.1e-3 for the
 *                inflated square torus — 8.6% of a sphere, i.e. still very deflated.
 *   squash       smallest / largest principal extent of the vertex cloud. Zero when planar,
 *                1 for an isotropic blob. The widest dynamic range of the three on our tori
 *                (0 → 0.28), so it is the most useful one to bin or descend on.
 *   creaseRoom   min over edges of |π − dihedral|: how far the tightest crease is from being
 *                no crease at all. Every torus in the inflation ladders scores under 0.3°,
 *                the numerical face of Lander's own remark that nine of the square torus's
 *                twenty-four folds close to within fifteen degrees of flat on flat.
 *   holeSize     the literal question "can you see through it": looking down some axis, the
 *                radius of the largest disc of the picture that is empty but ENCLOSED by the
 *                silhouette. Zero unless the torus is genuinely open. This is not implied by
 *                the other two — measured, an inflated torus at 16% of a sphere's volume can
 *                still have no hole at all, and Rich's reference torus has none whatsoever.
 *                NOTE it is exactly 0 on every closed torus, so it cannot be CLIMBED — it
 *                ranks, it does not steer. Several signed relaxations were tried and all were
 *                gamed by rods sliding past a near-planar torus edge-on; use it with an
 *                unselected roaming search, which needs no gradient.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import { totalArea } from '@core/moduli/develop.ts';
import { edgeKey } from '@core/topology/triangulation.ts';

/**
 * The volume enclosed by the realized surface, by the divergence theorem: the sum of the
 * signed volumes of the tetrahedra from the origin over the oriented faces. Meaningful as a
 * volume when the realization is embedded; still a finite, continuous number when it is not,
 * which is what lets it be optimized from a crossing configuration.
 */
function enclosedVolume(triang: Triangulation, p: ArrayLike<number>): number {
  let six = 0;
  for (const [a, b, c] of triang.triangles) {
    const A = 3 * a, B = 3 * b, C = 3 * c;
    six += p[A] * (p[B + 1] * p[C + 2] - p[B + 2] * p[C + 1])
         - p[A + 1] * (p[B] * p[C + 2] - p[B + 2] * p[C])
         + p[A + 2] * (p[B] * p[C + 1] - p[B + 1] * p[C]);
  }
  return Math.abs(six) / 6;
}

/** |enclosed volume| / area^{3/2} — scale-free inflatedness. 0 ⟺ planar; 0.0940 for a sphere. */
export function volumeRatio(triang: Triangulation, p: ArrayLike<number>): number {
  const a = totalArea(triang, p);
  return a > 0 ? enclosedVolume(triang, p) / Math.pow(a, 1.5) : 0;
}

/**
 * Smallest / largest principal extent of the vertex cloud (the ratio of the extreme square
 * roots of the covariance eigenvalues). 0 ⟺ the vertices are coplanar, 1 ⟺ isotropic.
 * Triangulation-agnostic — it reads the vertex count from `p`.
 */
export function squash(p: ArrayLike<number>): number {
  const n = p.length / 3;
  const m = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) m[k] += p[3 * i + k] / n;
  const A = new Array<number>(9).fill(0);
  for (let i = 0; i < n; i++) {
    const d = [p[3 * i] - m[0], p[3 * i + 1] - m[1], p[3 * i + 2] - m[2]];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) A[3 * r + c] += (d[r] * d[c]) / n;
  }
  // symmetric 3×3 eigenvalues by Jacobi sweeps (tiny, cold path)
  for (let sweep = 0; sweep < 40; sweep++) {
    for (const [q, w] of [[0, 1], [0, 2], [1, 2]] as const) {
      const a = A[3 * q + w];
      if (Math.abs(a) < 1e-18) continue;
      const th = 0.5 * Math.atan2(2 * a, A[3 * w + w] - A[3 * q + q]);
      const c = Math.cos(th), s = Math.sin(th);
      for (let k = 0; k < 3; k++) { const x = A[3 * k + q], y = A[3 * k + w]; A[3 * k + q] = c * x - s * y; A[3 * k + w] = s * x + c * y; }
      for (let k = 0; k < 3; k++) { const x = A[3 * q + k], y = A[3 * w + k]; A[3 * q + k] = c * x - s * y; A[3 * w + k] = s * x + c * y; }
    }
  }
  const ev = [A[0], A[4], A[8]].map((v) => Math.sqrt(Math.max(v, 0))).sort((a, b) => a - b);
  return ev[2] > 0 ? ev[0] / ev[2] : 0;
}

/**
 * min over edges of |π − dihedral|, in RADIANS: how far the tightest crease is from being no
 * crease. Near 0 means some pair of faces is nearly coplanar (or folded flat back on itself),
 * which is what makes these tori awkward to fold from paper.
 */
export function creaseRoom(triang: Triangulation, p: ArrayLike<number>): number {
  const opposite = new Map<number, number[]>();
  for (const [a, b, c] of triang.triangles) {
    for (const [u, v, w] of [[a, b, c], [b, c, a], [c, a, b]] as const) {
      const k = edgeKey(u, v);
      const list = opposite.get(k);
      if (list) list.push(w); else opposite.set(k, [w]);
    }
  }
  const V = (i: number): [number, number, number] => [p[3 * i], p[3 * i + 1], p[3 * i + 2]];
  const sub = (u: readonly number[], v: readonly number[]) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const cross = (u: readonly number[], v: readonly number[]) =>
    [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const dot = (u: readonly number[], v: readonly number[]) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];

  // for each face and each of its edges, pair with the other face's opposite vertex
  let worst = Math.PI;
  for (const [a, b, c] of triang.triangles) {
    for (const [u, v, w] of [[a, b, c], [b, c, a], [c, a, b]] as const) {
      const opp = opposite.get(edgeKey(u, v));
      if (!opp || opp.length !== 2) continue;
      const other = opp[0] === w ? opp[1] : opp[0];
      if (other === w) continue;
      const e = sub(V(v), V(u));
      const n1 = cross(sub(V(w), V(u)), e);
      const n2 = cross(e, sub(V(other), V(u)));
      const l1 = Math.hypot(n1[0], n1[1], n1[2]), l2 = Math.hypot(n2[0], n2[1], n2[2]);
      if (l1 < 1e-15 || l2 < 1e-15) return 0;
      const cosang = Math.max(-1, Math.min(1, dot(n1, n2) / (l1 * l2)));
      const dihedral = Math.acos(cosang);
      worst = Math.min(worst, Math.min(dihedral, Math.PI - dihedral));
    }
  }
  return worst;
}

/** The three descriptors together. */
export interface ShapeReport {
  readonly volumeRatio: number;
  readonly squash: number;
  /** radians */
  readonly creaseRoom: number;
}

export function shapeReport(triang: Triangulation, p: ArrayLike<number>): ShapeReport {
  return { volumeRatio: volumeRatio(triang, p), squash: squash(p), creaseRoom: creaseRoom(triang, p) };
}

// ─── the hole: can you see through it? ───────────────────────────────────────

/**
 * Looking along `direction`, the radius of the largest empty disc ENCLOSED by the torus's
 * silhouette — the hole you could poke a rod through — in the same units as `positions`.
 *
 * Rasterize the projected triangles on an `n`×`n` grid, flood the empty cells inward from the
 * border (those are the outside, not a hole), and take the largest inscribed disc among the
 * empty cells that the flood never reached. The inscribed radius comes from a two-pass
 * chamfer distance transform, so the whole thing is O(n²) per direction and cheap enough to
 * put inside a search loop.
 *
 * Grid-quantized, so it UNDERESTIMATES by up to a cell — fine for ranking, and it never
 * reports a hole that is not there, which is the direction that matters.
 */
export function holeAlong(
  triang: Triangulation,
  p: ArrayLike<number>,
  direction: readonly [number, number, number],
  n = 48,
): number {
  // orthonormal frame with e3 = direction
  const dl = Math.hypot(direction[0], direction[1], direction[2]);
  const e3 = [direction[0] / dl, direction[1] / dl, direction[2] / dl];
  const t = Math.abs(e3[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const e1r = [t[1] * e3[2] - t[2] * e3[1], t[2] * e3[0] - t[0] * e3[2], t[0] * e3[1] - t[1] * e3[0]];
  const l1 = Math.hypot(e1r[0], e1r[1], e1r[2]);
  const e1 = [e1r[0] / l1, e1r[1] / l1, e1r[2] / l1];
  const e2 = [e3[1] * e1[2] - e3[2] * e1[1], e3[2] * e1[0] - e3[0] * e1[2], e3[0] * e1[1] - e3[1] * e1[0]];

  const V = triang.vertexCount;
  const px = new Float64Array(V), py = new Float64Array(V);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let v = 0; v < V; v++) {
    const a = p[3 * v], b = p[3 * v + 1], c = p[3 * v + 2];
    const u = a * e1[0] + b * e1[1] + c * e1[2];
    const w = a * e2[0] + b * e2[1] + c * e2[2];
    px[v] = u; py[v] = w;
    if (u < x0) x0 = u; if (u > x1) x1 = u;
    if (w < y0) y0 = w; if (w > y1) y1 = w;
  }
  const pad = 0.05 * Math.max(x1 - x0, y1 - y0);
  x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
  const sx = (x1 - x0) / n, sy = (y1 - y0) / n;
  if (!(sx > 0) || !(sy > 0)) return 0;

  const blocked = new Uint8Array(n * n);          // covered by the surface, or outside it
  for (const [ia, ib, ic] of triang.triangles) {
    const ax = px[ia], ay = py[ia], bx = px[ib], by = py[ib], cx = px[ic], cy = py[ic];
    const det = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(det) < 1e-18) continue;
    const iLo = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / sx));
    const iHi = Math.min(n - 1, Math.ceil((Math.max(ax, bx, cx) - x0) / sx));
    const jLo = Math.max(0, Math.floor((Math.min(ay, by, cy) - y0) / sy));
    const jHi = Math.min(n - 1, Math.ceil((Math.max(ay, by, cy) - y0) / sy));
    for (let j = jLo; j <= jHi; j++) {
      const qy = y0 + (j + 0.5) * sy;
      for (let i = iLo; i <= iHi; i++) {
        const qx = x0 + (i + 0.5) * sx;
        const u = ((bx - qx) * (cy - qy) - (by - qy) * (cx - qx)) / det;
        if (u < 0) continue;
        const w = ((cx - qx) * (ay - qy) - (cy - qy) * (ax - qx)) / det;
        if (w < 0 || u + w > 1) continue;
        blocked[j * n + i] = 1;
      }
    }
  }

  // flood the empty cells in from the border — anything reached is the outside, not a hole
  const stack: number[] = [];
  for (let i = 0; i < n; i++) {
    for (const k of [i, (n - 1) * n + i, i * n, i * n + n - 1]) {
      if (!blocked[k]) { blocked[k] = 1; stack.push(k); }
    }
  }
  while (stack.length) {
    const k = stack.pop()!;
    const i = k % n, j = (k - i) / n;
    if (i > 0 && !blocked[k - 1]) { blocked[k - 1] = 1; stack.push(k - 1); }
    if (i < n - 1 && !blocked[k + 1]) { blocked[k + 1] = 1; stack.push(k + 1); }
    if (j > 0 && !blocked[k - n]) { blocked[k - n] = 1; stack.push(k - n); }
    if (j < n - 1 && !blocked[k + n]) { blocked[k + n] = 1; stack.push(k + n); }
  }

  // two-pass chamfer distance (in cells) from the blocked set; the max over enclosed cells
  const BIG = 1e9;
  const dist = new Float64Array(n * n);
  for (let k = 0; k < n * n; k++) dist[k] = blocked[k] ? 0 : BIG;
  const D1 = 1, D2 = Math.SQRT2;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i; let d = dist[k];
    if (i > 0) d = Math.min(d, dist[k - 1] + D1);
    if (j > 0) d = Math.min(d, dist[k - n] + D1);
    if (i > 0 && j > 0) d = Math.min(d, dist[k - n - 1] + D2);
    if (i < n - 1 && j > 0) d = Math.min(d, dist[k - n + 1] + D2);
    dist[k] = d;
  }
  let best = 0;
  for (let j = n - 1; j >= 0; j--) for (let i = n - 1; i >= 0; i--) {
    const k = j * n + i; let d = dist[k];
    if (i < n - 1) d = Math.min(d, dist[k + 1] + D1);
    if (j < n - 1) d = Math.min(d, dist[k + n] + D1);
    if (i < n - 1 && j < n - 1) d = Math.min(d, dist[k + n + 1] + D2);
    if (i > 0 && j < n - 1) d = Math.min(d, dist[k + n - 1] + D2);
    dist[k] = d;
    if (d < BIG && d > best) best = d;
  }
  return best * Math.min(sx, sy);
}

/**
 * Directions in a band about the EQUATOR of `axis` — the plane perpendicular to it.
 *
 * For a near-planar torus this is where the holes are, and it is not where intuition puts
 * them. Measured over six flat embedded tori that have a hole, the see-through direction sat
 * 85–89° from the flattest axis every time: you look through these things EDGE-ON, along the
 * plane, never at the broad face. Sampling the band instead of the whole sphere puts every
 * direction where holes actually live.
 */
function equatorialDirections(
  axis: readonly [number, number, number],
  count: number,
  halfWidthDeg = 40,
): [number, number, number][] {
  const t = Math.abs(axis[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const e1r = [t[1] * axis[2] - t[2] * axis[1], t[2] * axis[0] - t[0] * axis[2], t[0] * axis[1] - t[1] * axis[0]];
  const l = Math.hypot(e1r[0], e1r[1], e1r[2]);
  const e1 = [e1r[0] / l, e1r[1] / l, e1r[2] / l];
  const e2 = [axis[1] * e1[2] - axis[2] * e1[1], axis[2] * e1[0] - axis[0] * e1[2], axis[0] * e1[1] - axis[1] * e1[0]];
  const out: [number, number, number][] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const sMax = Math.sin((halfWidthDeg * Math.PI) / 180);
  for (let i = 0; i < count; i++) {
    // component along the axis, uniform in [-sMax, sMax]; the rest spun round the equator
    const a = sMax * (2 * ((i + 0.5) / count) - 1);
    const r = Math.sqrt(Math.max(0, 1 - a * a));
    const th = i * golden;
    out.push([
      a * axis[0] + r * (Math.cos(th) * e1[0] + Math.sin(th) * e2[0]),
      a * axis[1] + r * (Math.cos(th) * e1[1] + Math.sin(th) * e2[1]),
      a * axis[2] + r * (Math.cos(th) * e1[2] + Math.sin(th) * e2[2]),
    ]);
  }
  return out;
}

/**
 * The best visible hole over a spread of viewing directions, normalized by √area so it is
 * scale-free and comparable across the fiber. 0 ⟺ the torus is closed from every direction
 * tried. For scale: a standard torus with R=1, r=0.4 scores ≈ 0.10; Rich's reference
 * 8-vertex torus scores 3.3e-3; the best of 1232 embedded flat tori in the explore data
 * scores 8.8e-3.
 */
export function holeSize(
  triang: Triangulation,
  p: ArrayLike<number>,
  opts: { directions?: number; resolution?: number } = {},
): number {
  const area = totalArea(triang, p);
  if (!(area > 0)) return 0;
  const n = opts.resolution ?? 64;
  let best = 0;
  // aim at the equator of the flattest axis — measured, that is where the holes are
  for (const d of equatorialDirections(flattestAxis(p), opts.directions ?? 120)) {
    const h = holeAlong(triang, p, d, n);
    if (h > best) best = h;
  }
  return best / Math.sqrt(area);
}

/**
 * The direction that best shows the hole, for pointing a camera or a silhouette panel at it.
 *
 * When there IS no hole every direction scores 0, so a "best" has to come from somewhere
 * else. The fallback is the direction whose shadow COVERS THE LEAST — the view in which the
 * torus hides the smallest area — since that is the view a hole is most likely to show up in
 * and the most informative one to be staring at while a search runs. (The obvious guess, the
 * flattest axis, is measurably wrong: on a torus with a real hole, 150 directions within 60°
 * of that axis saw it zero times.)
 */
export function bestHoleView(
  triang: Triangulation,
  p: ArrayLike<number>,
  opts: { directions?: number; resolution?: number } = {},
): { size: number; direction: [number, number, number] } {
  const area = totalArea(triang, p);
  const n = opts.resolution ?? 96;
  let best = 0;
  let dir: [number, number, number] | null = null;
  let leastCovered = Infinity;
  let fallback: [number, number, number] = [0, 0, 1];
  for (const d of equatorialDirections(flattestAxis(p), opts.directions ?? 200)) {
    const h = holeAlong(triang, p, d, n);
    if (h > best) { best = h; dir = d; }
    if (dir === null) {
      const c = coveredArea(triang, p, d, 48);
      if (c < leastCovered) { leastCovered = c; fallback = d; }
    }
  }
  return { size: area > 0 ? best / Math.sqrt(area) : 0, direction: dir ?? fallback };
}

/** Area of the shadow along `direction` (in the units of `positions`, squared). */
function coveredArea(
  triang: Triangulation,
  p: ArrayLike<number>,
  direction: readonly [number, number, number],
  n = 48,
): number {
  const dl = Math.hypot(direction[0], direction[1], direction[2]);
  const e3 = [direction[0] / dl, direction[1] / dl, direction[2] / dl];
  const t = Math.abs(e3[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const e1r = [t[1] * e3[2] - t[2] * e3[1], t[2] * e3[0] - t[0] * e3[2], t[0] * e3[1] - t[1] * e3[0]];
  const l1 = Math.hypot(e1r[0], e1r[1], e1r[2]);
  const e1 = [e1r[0] / l1, e1r[1] / l1, e1r[2] / l1];
  const e2 = [e3[1] * e1[2] - e3[2] * e1[1], e3[2] * e1[0] - e3[0] * e1[2], e3[0] * e1[1] - e3[1] * e1[0]];
  const V = triang.vertexCount;
  const px = new Float64Array(V), py = new Float64Array(V);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let v = 0; v < V; v++) {
    const a = p[3 * v], b = p[3 * v + 1], c = p[3 * v + 2];
    const u = a * e1[0] + b * e1[1] + c * e1[2], w = a * e2[0] + b * e2[1] + c * e2[2];
    px[v] = u; py[v] = w;
    if (u < x0) x0 = u; if (u > x1) x1 = u;
    if (w < y0) y0 = w; if (w > y1) y1 = w;
  }
  const sx = (x1 - x0) / n, sy = (y1 - y0) / n;
  if (!(sx > 0) || !(sy > 0)) return 0;
  const cov = new Uint8Array(n * n);
  for (const [ia, ib, ic] of triang.triangles) {
    const ax = px[ia], ay = py[ia], bx = px[ib], by = py[ib], cx = px[ic], cy = py[ic];
    const det = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(det) < 1e-18) continue;
    const iLo = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / sx));
    const iHi = Math.min(n - 1, Math.ceil((Math.max(ax, bx, cx) - x0) / sx));
    const jLo = Math.max(0, Math.floor((Math.min(ay, by, cy) - y0) / sy));
    const jHi = Math.min(n - 1, Math.ceil((Math.max(ay, by, cy) - y0) / sy));
    for (let j = jLo; j <= jHi; j++) {
      const qy = y0 + (j + 0.5) * sy;
      for (let i = iLo; i <= iHi; i++) {
        const qx = x0 + (i + 0.5) * sx;
        const u = ((bx - qx) * (cy - qy) - (by - qy) * (cx - qx)) / det;
        if (u < 0) continue;
        const w = ((cx - qx) * (ay - qy) - (cy - qy) * (ax - qx)) / det;
        if (w < 0 || u + w > 1) continue;
        cov[j * n + i] = 1;
      }
    }
  }
  let k = 0;
  for (let i = 0; i < n * n; i++) k += cov[i];
  return k * sx * sy;
}

/** The least-extent principal axis of the vertex cloud — a near-planar torus's normal. */
function flattestAxis(p: ArrayLike<number>): [number, number, number] {
  const n = p.length / 3;
  const m = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) m[k] += p[3 * i + k] / n;
  const A = new Array<number>(9).fill(0);
  for (let i = 0; i < n; i++) {
    const d = [p[3 * i] - m[0], p[3 * i + 1] - m[1], p[3 * i + 2] - m[2]];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) A[3 * r + c] += (d[r] * d[c]) / n;
  }
  // power-iterate on (trace·I − A), whose dominant eigenvector is A's smallest
  const tr = A[0] + A[4] + A[8];
  let v = [0.3, 0.5, 0.81];
  for (let it = 0; it < 200; it++) {
    const y = [0, 0, 0];
    for (let r = 0; r < 3; r++) {
      let acc = 0;
      for (let c = 0; c < 3; c++) acc += ((r === c ? tr : 0) - A[3 * r + c]) * v[c];
      y[r] = acc;
    }
    const l = Math.hypot(y[0], y[1], y[2]);
    if (!(l > 0)) break;
    v = [y[0] / l, y[1] / l, y[2] / l];
  }
  return [v[0], v[1], v[2]];
}
