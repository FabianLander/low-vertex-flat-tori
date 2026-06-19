/**
 * Intersection chord of two triangles in 3D — a torus-blind kernel.
 *
 * For two triangles A, B (given as vertex offsets into a shared `positions`
 * buffer) returns the line segment A ∩ B that lies on the line L = plane(A) ∩
 * plane(B), with its endpoints and length. Returns null if the triangles don't
 * meet (or only meet at a measure-zero set: a single point or a shared vertex).
 *
 * The caller supplies the six vertex offsets `o = 3·vertexIndex` — so this knows
 * nothing of a `Triangulation`; the triangle→vertex lookup lives in the layer
 * above (the embeddedness/energy code that owns the cell-pair tables).
 *
 * Strategy:
 *   1. Signed distances of A's vertices to plane(B) and vice versa.
 *      Quick reject if all on one side.
 *   2. L's direction = n_A × n_B.
 *   3. Each triangle's edges that cross the opposite plane give the boundary
 *      points of L's clip to that triangle (up to 2 points each, deduplicated).
 *   4. Parametrize the four boundary points along L. Chord = overlap of the
 *      two intervals.
 *
 * Vertex-shared pairs work naturally: when a shared vertex sits on both planes
 * its incident edges register a crossing at the vertex itself, which after dedup
 * gives one of the two endpoints on triangle A's chord. The other endpoint comes
 * from the non-shared edge of A crossing plane(B).
 */

export type ChordResult = {
  length: number;
  p: [number, number, number];
  q: [number, number, number];
};

const SMALL = 1e-12;
const TINY = 1e-20;

export function triTriChord(
  pos: ArrayLike<number>,
  oa0: number, oa1: number, oa2: number,
  ob0: number, ob1: number, ob2: number,
): ChordResult | null {
  const a0x = pos[oa0], a0y = pos[oa0 + 1], a0z = pos[oa0 + 2];
  const a1x = pos[oa1], a1y = pos[oa1 + 1], a1z = pos[oa1 + 2];
  const a2x = pos[oa2], a2y = pos[oa2 + 1], a2z = pos[oa2 + 2];
  const b0x = pos[ob0], b0y = pos[ob0 + 1], b0z = pos[ob0 + 2];
  const b1x = pos[ob1], b1y = pos[ob1 + 1], b1z = pos[ob1 + 2];
  const b2x = pos[ob2], b2y = pos[ob2 + 1], b2z = pos[ob2 + 2];

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
  // Magnitudes scale with |n_B|, |n_A| but signs and ratios are correct.
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

  // Collect crossings of A's edges with plane(B) — up to 2 distinct points
  // on L. aPts is a flat list of x,y,z triples.
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

  // Parametrize all four boundary points along L. Use aPts[0] as reference;
  // it lies on L, so its parameter is 0.
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
 * Push an edge's crossing with the plane (defined implicitly by the signs dp,
 * dq of the endpoints) onto the points list. Deduplicates against existing
 * points; bails out at 2 distinct points.
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
