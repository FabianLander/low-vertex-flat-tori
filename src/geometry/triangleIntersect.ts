/**
 * Torus-blind triangle/segment interior-intersection predicates in 3D — the
 * boolean kernels behind the embeddedness test. Möller–Trumbore segment-vs-triangle
 * (open interiors only), and triangle-vs-triangle as 6 of those. Coordinates come
 * from a shared `positions` buffer at vertex indices, like the rest of `geometry/`.
 *
 * Pure: no three.js, no DOM, no Triangulation.
 */

/**
 * Möller–Trumbore segment-vs-triangle. True only when the segment's *open* interior
 * crosses the triangle's *open* interior (no boundary touches). The caller ensures
 * the segment endpoints are not vertices of the triangle.
 */
export function segmentTriangleIntersect(
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

/**
 * Triangle-vs-triangle interior intersection — true iff any edge of one pierces
 * the other's interior (6 segment-triangle tests). Triangles given as vertex
 * indices (a0,a1,a2), (b0,b1,b2) into `positions`.
 */
export function triangleTriangleIntersect(
  positions: ArrayLike<number>,
  a0: number, a1: number, a2: number,
  b0: number, b1: number, b2: number,
): boolean {
  if (segmentTriangleIntersect(positions, a0, a1, b0, b1, b2)) return true;
  if (segmentTriangleIntersect(positions, a1, a2, b0, b1, b2)) return true;
  if (segmentTriangleIntersect(positions, a2, a0, b0, b1, b2)) return true;
  if (segmentTriangleIntersect(positions, b0, b1, a0, a1, a2)) return true;
  if (segmentTriangleIntersect(positions, b1, b2, a0, a1, a2)) return true;
  if (segmentTriangleIntersect(positions, b2, b0, a0, a1, a2)) return true;
  return false;
}
