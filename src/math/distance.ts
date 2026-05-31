/**
 * Minimum-distance primitives between the geometric pieces of cells:
 * points, segments, and (filled) triangles. Used by the cell-margin energy
 * to measure how close non-adjacent cells come to touching.
 *
 * Every function returns the SQUARED distance. Squared distance is exact in
 * comparisons (monotone in the true distance, so min/argmin are unaffected)
 * and lets callers defer the single sqrt to the very end. The cell-margin
 * energy takes one sqrt per pair, after the triangle–triangle min has already
 * been resolved on squared values.
 *
 * All routines are allocation-free: coordinates are passed as scalar
 * components, mirroring the style in cutOffArea.ts. Conventions follow
 * Ericson, *Real-Time Collision Detection* (closest-point routines).
 */

const DEGEN = 1e-30; // squared-length floor for treating a segment as a point

/** Squared Euclidean distance between two points. */
export function pointPointDist2(
  px: number, py: number, pz: number,
  qx: number, qy: number, qz: number,
): number {
  const dx = px - qx, dy = py - qy, dz = pz - qz;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Squared distance from point p to segment [a,b]. The foot of the
 * perpendicular is clamped to the segment, so an off-the-end point measures
 * to the nearer endpoint. Degenerate (zero-length) segment → distance to a.
 */
export function pointSegmentDist2(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
): number {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const abLen2 = abx * abx + aby * aby + abz * abz;
  if (abLen2 < DEGEN) return apx * apx + apy * apy + apz * apz;
  let t = (apx * abx + apy * aby + apz * abz) / abLen2;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const cx = ax + t * abx, cy = ay + t * aby, cz = az + t * abz;
  const dx = px - cx, dy = py - cy, dz = pz - cz;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Squared distance from point p to the FILLED triangle (a,b,c).
 * Ericson's ClosestPtPointTriangle: classify p against the 7 Voronoi regions
 * of the triangle (3 vertices, 3 edges, interior) and measure to the closest
 * feature. Handles obtuse/degenerate triangles correctly.
 */
export function pointTriangleDist2(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;

  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  // Region: vertex a
  if (d1 <= 0 && d2 <= 0) return apx * apx + apy * apy + apz * apz;

  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz;
  const d4 = acx * bpx + acy * bpy + acz * bpz;
  // Region: vertex b
  if (d3 >= 0 && d4 <= d3) return bpx * bpx + bpy * bpy + bpz * bpz;

  // Region: edge ab
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    const qx = ax + v * abx, qy = ay + v * aby, qz = az + v * abz;
    const dx = px - qx, dy = py - qy, dz = pz - qz;
    return dx * dx + dy * dy + dz * dz;
  }

  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz;
  const d6 = acx * cpx + acy * cpy + acz * cpz;
  // Region: vertex c
  if (d6 >= 0 && d5 <= d6) return cpx * cpx + cpy * cpy + cpz * cpz;

  // Region: edge ac
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    const qx = ax + w * acx, qy = ay + w * acy, qz = az + w * acz;
    const dx = px - qx, dy = py - qy, dz = pz - qz;
    return dx * dx + dy * dy + dz * dz;
  }

  // Region: edge bc
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    const qx = bx + w * (cx - bx), qy = by + w * (cy - by), qz = bz + w * (cz - bz);
    const dx = px - qx, dy = py - qy, dz = pz - qz;
    return dx * dx + dy * dy + dz * dz;
  }

  // Region: interior — project onto the triangle's plane via barycentric.
  const denom = 1 / (va + vb + vc);
  const v = vb * denom, w = vc * denom;
  const qx = ax + abx * v + acx * w;
  const qy = ay + aby * v + acy * w;
  const qz = az + abz * v + acz * w;
  const dx = px - qx, dy = py - qy, dz = pz - qz;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Squared distance between segments [p1,q1] and [p2,q2].
 * Ericson's ClosestPtSegmentSegment: solve for the clamped parameters (s,t)
 * of the closest points, handling parallel and degenerate cases.
 */
export function segmentSegmentDist2(
  p1x: number, p1y: number, p1z: number,
  q1x: number, q1y: number, q1z: number,
  p2x: number, p2y: number, p2z: number,
  q2x: number, q2y: number, q2z: number,
): number {
  const d1x = q1x - p1x, d1y = q1y - p1y, d1z = q1z - p1z; // dir of seg 1
  const d2x = q2x - p2x, d2y = q2y - p2y, d2z = q2z - p2z; // dir of seg 2
  const rx = p1x - p2x, ry = p1y - p2y, rz = p1z - p2z;
  const a = d1x * d1x + d1y * d1y + d1z * d1z; // ‖d1‖²
  const e = d2x * d2x + d2y * d2y + d2z * d2z; // ‖d2‖²
  const f = d2x * rx + d2y * ry + d2z * rz;

  let s: number, t: number;
  if (a < DEGEN && e < DEGEN) {
    s = 0; t = 0;
  } else if (a < DEGEN) {
    s = 0;
    t = clamp01(f / e);
  } else {
    const c = d1x * rx + d1y * ry + d1z * rz;
    if (e < DEGEN) {
      t = 0;
      s = clamp01(-c / a);
    } else {
      const b = d1x * d2x + d1y * d2y + d1z * d2z;
      const denom = a * e - b * b; // ≥ 0
      s = denom > DEGEN ? clamp01((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp01(-c / a); }
      else if (t > 1) { t = 1; s = clamp01((b - c) / a); }
    }
  }
  const c1x = p1x + s * d1x, c1y = p1y + s * d1y, c1z = p1z + s * d1z;
  const c2x = p2x + t * d2x, c2y = p2y + t * d2y, c2z = p2z + t * d2z;
  const dx = c1x - c2x, dy = c1y - c2y, dz = c1z - c2z;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Squared minimum distance between two filled triangles A=(a0,a1,a2),
 * B=(b0,b1,b2). For disjoint convex polygons the closest pair is realized
 * either vertex-to-face or edge-to-edge, so we take the min over the 6
 * vertex→triangle and 9 edge→edge candidates.
 *
 * NOTE: if the triangles interpenetrate this returns the distance to the
 * other's boundary, not 0 — the closest-feature set above does not detect a
 * segment threading the interior with both endpoints outside. That case does
 * not arise on embedded meshes (where this energy is used); actual crossings
 * are the job of isEmbedded(). Coordinates are passed as a 9-tuple per
 * triangle in [x0,y0,z0, x1,y1,z1, x2,y2,z2] order.
 */
export function triangleTriangleDist2(
  a0x: number, a0y: number, a0z: number,
  a1x: number, a1y: number, a1z: number,
  a2x: number, a2y: number, a2z: number,
  b0x: number, b0y: number, b0z: number,
  b1x: number, b1y: number, b1z: number,
  b2x: number, b2y: number, b2z: number,
): number {
  let m = Infinity;

  // 3 vertices of A vs triangle B
  m = Math.min(m, pointTriangleDist2(a0x, a0y, a0z, b0x, b0y, b0z, b1x, b1y, b1z, b2x, b2y, b2z));
  m = Math.min(m, pointTriangleDist2(a1x, a1y, a1z, b0x, b0y, b0z, b1x, b1y, b1z, b2x, b2y, b2z));
  m = Math.min(m, pointTriangleDist2(a2x, a2y, a2z, b0x, b0y, b0z, b1x, b1y, b1z, b2x, b2y, b2z));
  // 3 vertices of B vs triangle A
  m = Math.min(m, pointTriangleDist2(b0x, b0y, b0z, a0x, a0y, a0z, a1x, a1y, a1z, a2x, a2y, a2z));
  m = Math.min(m, pointTriangleDist2(b1x, b1y, b1z, a0x, a0y, a0z, a1x, a1y, a1z, a2x, a2y, a2z));
  m = Math.min(m, pointTriangleDist2(b2x, b2y, b2z, a0x, a0y, a0z, a1x, a1y, a1z, a2x, a2y, a2z));

  // 9 edge–edge pairs (edges of A: a0a1, a1a2, a2a0; likewise B)
  const A = [[a0x, a0y, a0z, a1x, a1y, a1z], [a1x, a1y, a1z, a2x, a2y, a2z], [a2x, a2y, a2z, a0x, a0y, a0z]];
  const B = [[b0x, b0y, b0z, b1x, b1y, b1z], [b1x, b1y, b1z, b2x, b2y, b2z], [b2x, b2y, b2z, b0x, b0y, b0z]];
  for (const ea of A) {
    for (const eb of B) {
      m = Math.min(m, segmentSegmentDist2(
        ea[0], ea[1], ea[2], ea[3], ea[4], ea[5],
        eb[0], eb[1], eb[2], eb[3], eb[4], eb[5],
      ));
    }
  }
  return m;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
