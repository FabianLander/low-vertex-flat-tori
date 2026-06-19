/**
 * Incidence between two triangles in ℝ³ — do they cross (boolean predicates), WHERE
 * (the intersection chord), and HOW MUCH (the plane-cut ratio). Torus-blind and
 * coordinates-only: every routine takes raw scalar corner coordinates, so the
 * triangle→vertex/buffer lookup lives in the layer above (the embedding code that owns
 * the cell-pair tables reads the corners out of its `positions` buffer and passes them).
 *
 * The boolean predicates are built on the ORIENTATION predicate `orient3d` (the sign of
 * a 4-point signed volume = `det3` of the edge vectors): a self-intersection is a
 * function of orientation signs, so the test is sign-only — no divisions, robust in the
 * near-flat regime where division-based tests (Möller–Trumbore) lose precision.
 * (`orient3d` inlines the determinant rather than calling `vec3.det3`, for the same
 * allocation-free reason `flat`'s Jacobian inlines `cross`/`dot` — these run in the
 * inner embeddedness loop.) Validated to agree with a Möller–Trumbore implementation
 * over 20k embedded/crossing configs.
 *
 * Pure: no three.js, no DOM, no Triangulation.
 */

// ─── orientation predicate ─────────────────────────────────────────────────────

/**
 * Sign of the signed volume of tetrahedron (a,b,c,d) = sign of det[b−a, c−a, d−a]
 * = sign of (b−a)·((c−a)×(d−a)) = sign of `det3` on the three edge vectors. +1 / −1 / 0
 * (coplanar). The fundamental robust geometric predicate — no divisions, so the float
 * sign is the exact sign except for genuinely (near-)coplanar 4-tuples, which on a
 * generic config don't arise for the disjoint pairs we test (they share no vertices).
 */
export function orient3d(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
  dx: number, dy: number, dz: number,
): number {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const cax = cx - ax, cay = cy - ay, caz = cz - az;
  const dax = dx - ax, day = dy - ay, daz = dz - az;
  const nx = cay * daz - caz * day;
  const ny = caz * dax - cax * daz;
  const nz = cax * day - cay * dax;
  const det = bax * nx + bay * ny + baz * nz;
  return det > 0 ? 1 : det < 0 ? -1 : 0;
}

// ─── boolean interior intersection (the embeddedness predicates) ───────────────

/**
 * Segment p→q vs triangle (a,b,c), open interiors only — true iff the segment's
 * interior pierces the triangle's interior. Orientation form:
 *   1. p, q strictly on opposite sides of plane(a,b,c)  [the segment crosses the plane], and
 *   2. the three tetrahedra (p,q,·) over the triangle's edges share one sign
 *      [the line pq passes through the triangle's interior].
 * Any zero ⇒ a boundary touch ⇒ reported as NOT intersecting (open interiors).
 */
export function segmentTriangleIntersect(
  px: number, py: number, pz: number,
  qx: number, qy: number, qz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): boolean {
  // 1. p, q on opposite sides of plane(a,b,c)?
  const sp = orient3d(ax, ay, az, bx, by, bz, cx, cy, cz, px, py, pz);
  const sq = orient3d(ax, ay, az, bx, by, bz, cx, cy, cz, qx, qy, qz);
  if (sp === 0 || sq === 0 || sp === sq) return false;

  // 2. does line pq pass through the triangle interior? (consistent winding)
  const u = orient3d(px, py, pz, qx, qy, qz, ax, ay, az, bx, by, bz);
  const v = orient3d(px, py, pz, qx, qy, qz, bx, by, bz, cx, cy, cz);
  const w = orient3d(px, py, pz, qx, qy, qz, cx, cy, cz, ax, ay, az);
  if (u === 0 || v === 0 || w === 0) return false;
  return u === v && v === w;
}

/**
 * Triangle-vs-triangle interior intersection — true iff any edge of one pierces the
 * other's interior (6 segment-triangle tests). Corners as a 9-scalar triple each, in
 * [x0,y0,z0, x1,y1,z1, x2,y2,z2] order.
 */
export function triangleTriangleIntersect(
  a0x: number, a0y: number, a0z: number,
  a1x: number, a1y: number, a1z: number,
  a2x: number, a2y: number, a2z: number,
  b0x: number, b0y: number, b0z: number,
  b1x: number, b1y: number, b1z: number,
  b2x: number, b2y: number, b2z: number,
): boolean {
  // edges of A vs triangle B
  if (segmentTriangleIntersect(a0x, a0y, a0z, a1x, a1y, a1z, b0x, b0y, b0z, b1x, b1y, b1z, b2x, b2y, b2z)) return true;
  if (segmentTriangleIntersect(a1x, a1y, a1z, a2x, a2y, a2z, b0x, b0y, b0z, b1x, b1y, b1z, b2x, b2y, b2z)) return true;
  if (segmentTriangleIntersect(a2x, a2y, a2z, a0x, a0y, a0z, b0x, b0y, b0z, b1x, b1y, b1z, b2x, b2y, b2z)) return true;
  // edges of B vs triangle A
  if (segmentTriangleIntersect(b0x, b0y, b0z, b1x, b1y, b1z, a0x, a0y, a0z, a1x, a1y, a1z, a2x, a2y, a2z)) return true;
  if (segmentTriangleIntersect(b1x, b1y, b1z, b2x, b2y, b2z, a0x, a0y, a0z, a1x, a1y, a1z, a2x, a2y, a2z)) return true;
  if (segmentTriangleIntersect(b2x, b2y, b2z, b0x, b0y, b0z, a0x, a0y, a0z, a1x, a1y, a1z, a2x, a2y, a2z)) return true;
  return false;
}

// ─── the intersection chord (where two triangles meet) ─────────────────────────

export type ChordResult = {
  length: number;
  p: [number, number, number];
  q: [number, number, number];
};

const SMALL = 1e-12;
const TINY = 1e-20;

/**
 * The line segment A ∩ B that lies on the line L = plane(A) ∩ plane(B), with its
 * endpoints and length. Returns null if the triangles don't meet (or only meet at a
 * measure-zero set: a single point or a shared vertex).
 *
 * Strategy:
 *   1. Signed distances of A's vertices to plane(B) and vice versa. Quick reject if
 *      all on one side.
 *   2. L's direction = n_A × n_B.
 *   3. Each triangle's edges that cross the opposite plane give the boundary points of
 *      L's clip to that triangle (up to 2 points each, deduplicated).
 *   4. Parametrize the four boundary points along L. Chord = overlap of the two intervals.
 *
 * Vertex-shared pairs work naturally: a shared vertex on both planes registers a
 * crossing at the vertex itself, which after dedup gives one endpoint of A's chord; the
 * other comes from the non-shared edge of A crossing plane(B).
 */
export function triTriChord(
  a0x: number, a0y: number, a0z: number,
  a1x: number, a1y: number, a1z: number,
  a2x: number, a2y: number, a2z: number,
  b0x: number, b0y: number, b0z: number,
  b1x: number, b1y: number, b1z: number,
  b2x: number, b2y: number, b2z: number,
): ChordResult | null {
  // Plane normals (un-normalized; only the directions matter for sign tests).
  const eA1x = a1x - a0x, eA1y = a1y - a0y, eA1z = a1z - a0z;
  const eA2x = a2x - a0x, eA2y = a2y - a0y, eA2z = a2z - a0z;
  const nAx = eA1y * eA2z - eA1z * eA2y;
  const nAy = eA1z * eA2x - eA1x * eA2z;
  const nAz = eA1x * eA2y - eA1y * eA2x;

  const eB1x = b1x - b0x, eB1y = b1y - b0y, eB1z = b1z - b0z;
  const eB2x = b2x - b0x, eB2y = b2y - b0y, eB2z = b2z - b0z;
  const nBx = eB1y * eB2z - eB1z * eB2y;
  const nBy = eB1z * eB2x - eB1x * eB2z;
  const nBz = eB1x * eB2y - eB1y * eB2x;

  // Signed distances of A's vertices to plane(B), of B's to plane(A).
  const dA0 = (a0x - b0x) * nBx + (a0y - b0y) * nBy + (a0z - b0z) * nBz;
  const dA1 = (a1x - b0x) * nBx + (a1y - b0y) * nBy + (a1z - b0z) * nBz;
  const dA2 = (a2x - b0x) * nBx + (a2y - b0y) * nBy + (a2z - b0z) * nBz;
  if (dA0 > SMALL && dA1 > SMALL && dA2 > SMALL) return null;
  if (dA0 < -SMALL && dA1 < -SMALL && dA2 < -SMALL) return null;

  const dB0 = (b0x - a0x) * nAx + (b0y - a0y) * nAy + (b0z - a0z) * nAz;
  const dB1 = (b1x - a0x) * nAx + (b1y - a0y) * nAy + (b1z - a0z) * nAz;
  const dB2 = (b2x - a0x) * nAx + (b2y - a0y) * nAy + (b2z - a0z) * nAz;
  if (dB0 > SMALL && dB1 > SMALL && dB2 > SMALL) return null;
  if (dB0 < -SMALL && dB1 < -SMALL && dB2 < -SMALL) return null;

  // L direction = n_A × n_B.
  const Lx = nAy * nBz - nAz * nBy;
  const Ly = nAz * nBx - nAx * nBz;
  const Lz = nAx * nBy - nAy * nBx;
  const L2 = Lx * Lx + Ly * Ly + Lz * Lz;
  if (L2 < TINY) return null;     // parallel planes
  const Linv = 1 / Math.sqrt(L2);
  const lx = Lx * Linv, ly = Ly * Linv, lz = Lz * Linv;

  // Collect crossings of A's edges with plane(B) — up to 2 distinct points on L.
  const aPts: number[] = [];
  pushCrossing(aPts, a0x, a0y, a0z, a1x, a1y, a1z, dA0, dA1);
  pushCrossing(aPts, a1x, a1y, a1z, a2x, a2y, a2z, dA1, dA2);
  pushCrossing(aPts, a2x, a2y, a2z, a0x, a0y, a0z, dA2, dA0);
  if (aPts.length < 6) return null;   // fewer than 2 distinct crossings → no real chord

  const bPts: number[] = [];
  pushCrossing(bPts, b0x, b0y, b0z, b1x, b1y, b1z, dB0, dB1);
  pushCrossing(bPts, b1x, b1y, b1z, b2x, b2y, b2z, dB1, dB2);
  pushCrossing(bPts, b2x, b2y, b2z, b0x, b0y, b0z, dB2, dB0);
  if (bPts.length < 6) return null;

  // Parametrize all four boundary points along L. Use aPts[0] as reference (param 0).
  const refX = aPts[0], refY = aPts[1], refZ = aPts[2];
  const tA1 = 0;
  const tA2 = (aPts[3] - refX) * lx + (aPts[4] - refY) * ly + (aPts[5] - refZ) * lz;
  const tB1 = (bPts[0] - refX) * lx + (bPts[1] - refY) * ly + (bPts[2] - refZ) * lz;
  const tB2 = (bPts[3] - refX) * lx + (bPts[4] - refY) * ly + (bPts[5] - refZ) * lz;

  const aLo = Math.min(tA1, tA2), aHi = Math.max(tA1, tA2);
  const bLo = Math.min(tB1, tB2), bHi = Math.max(tB1, tB2);
  const cLo = Math.max(aLo, bLo);
  const cHi = Math.min(aHi, bHi);

  const len = cHi - cLo;
  if (len <= 0) return null;

  return {
    length: len,
    p: [refX + cLo * lx, refY + cLo * ly, refZ + cLo * lz],
    q: [refX + cHi * lx, refY + cHi * ly, refZ + cHi * lz],
  };
}

/**
 * Push an edge's crossing with the plane (defined implicitly by the signs dp, dq of the
 * endpoints) onto the points list. Deduplicates against existing points; bails at 2.
 */
function pushCrossing(
  pts: number[],
  px: number, py: number, pz: number,
  qx: number, qy: number, qz: number,
  dp: number, dq: number,
): void {
  if (pts.length >= 6) return;

  // Strictly same side → no crossing.
  if (dp > SMALL && dq > SMALL) return;
  if (dp < -SMALL && dq < -SMALL) return;

  // Locate crossing point.
  let cx: number, cy: number, cz: number;
  const pZero = Math.abs(dp) < SMALL;
  const qZero = Math.abs(dq) < SMALL;
  if (pZero && qZero) return;            // edge on plane — degenerate
  if (pZero) { cx = px; cy = py; cz = pz; }
  else if (qZero) { cx = qx; cy = qy; cz = qz; }
  else {
    const t = dp / (dp - dq);
    cx = px + t * (qx - px);
    cy = py + t * (qy - py);
    cz = pz + t * (qz - pz);
  }

  // Dedup.
  for (let i = 0; i < pts.length; i += 3) {
    const ddx = pts[i] - cx, ddy = pts[i + 1] - cy, ddz = pts[i + 2] - cz;
    if (ddx * ddx + ddy * ddy + ddz * ddz < TINY) return;
  }
  pts.push(cx, cy, cz);
}

// ─── plane cut (how much a plane divides a triangle) ────────────────────────────

const EPS = 1e-12;

/**
 * Ratio (smaller piece area / triangle area) ∈ [0, 0.5] of triangle (a,b,c) cut by the
 * plane through `(rx,ry,rz)` with normal `(nx,ny,nz)` (the normal need not be unit — the
 * ratio is scale-invariant in it). Zero if the plane doesn't divide the triangle. Both
 * "two vertices on one side" and "one vertex on the plane" reduce to min(t₁·t₂, 1 − t₁·t₂)
 * on the cut parameters.
 */
export function planeCutRatio(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
  nx: number, ny: number, nz: number,
  rx: number, ry: number, rz: number,
): number {
  const d0 = (ax - rx) * nx + (ay - ry) * ny + (az - rz) * nz;
  const d1 = (bx - rx) * nx + (by - ry) * ny + (bz - rz) * nz;
  const d2 = (cx - rx) * nx + (cy - ry) * ny + (cz - rz) * nz;
  if (d0 > EPS && d1 > EPS && d2 > EPS) return 0;
  if (d0 < -EPS && d1 < -EPS && d2 < -EPS) return 0;

  const s0 = d0 < -EPS ? -1 : 1, s1 = d1 < -EPS ? -1 : 1, s2 = d2 < -EPS ? -1 : 1;
  const numPos = (s0 > 0 ? 1 : 0) + (s1 > 0 ? 1 : 0) + (s2 > 0 ? 1 : 0);
  if (numPos === 0 || numPos === 3) return 0;

  const singleIsPos = numPos === 1;
  let dS: number, dO1: number, dO2: number;
  if ((s0 > 0) === singleIsPos)      { dS = d0; dO1 = d1; dO2 = d2; }
  else if ((s1 > 0) === singleIsPos) { dS = d1; dO1 = d2; dO2 = d0; }
  else                                { dS = d2; dO1 = d0; dO2 = d1; }

  const denom1 = dS - dO1, denom2 = dS - dO2;
  if (Math.abs(denom1) < EPS || Math.abs(denom2) < EPS) return 0;
  let prod = (dS / denom1) * (dS / denom2);
  if (prod < 0) prod = 0; else if (prod > 1) prod = 1;
  return Math.min(prod, 1 - prod);
}
