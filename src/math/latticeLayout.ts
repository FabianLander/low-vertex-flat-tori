/**
 * Abstract combinatorial layout of the 8-vertex triangulation on the regular
 * triangular lattice (every vertex has degree 6, so the triangulation is a
 * quotient of ℤ²). This is the *abstract* picture — fixed equilateral tiles,
 * independent of any embedding — used to draw the figures (scripts/draw-figures)
 * and the abstract panel of the develop demo.
 *
 * Pure: no DOM, no three.js. Plane coordinates only (a 60° basis).
 *
 * Period lattice L = ⟨(1,2),(3,-2)⟩ (index 8 in ℤ² = the 8 vertices).
 */

import { TRIANGLES, VERTEX_LINKS, VERTEX_COUNT } from './topology';

export type XY = [number, number];
export type Tile = {
  readonly id: number;
  readonly lat: XY[];   // 3 corners in integer lattice coords (TRIANGLES[id] order)
  readonly P: XY[];     // the same corners in plane coords
  readonly cen: XY;     // plane centroid
};

// ── solve rotational offsets r_i ∈ ℤ/6 so edge directions are globally consistent ──
const linkIdx = (v: number, n: number) => VERTEX_LINKS[v].indexOf(n);
const R = new Array<number | null>(VERTEX_COUNT).fill(null); R[0] = 0;
{
  const q = [0];
  while (q.length) {
    const i = q.shift()!;
    VERTEX_LINKS[i].forEach((j, k) => {
      const m = linkIdx(j, i);
      const w = (((R[i]! + k - m - 3) % 6) + 6) % 6;
      if (R[j] === null) { R[j] = w; q.push(j); }
    });
  }
}
const D: XY[] = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]; // hex directions
const dirOf = (i: number, j: number) => (R[i]! + linkIdx(i, j)) % 6;

// ── integer coordinates of each vertex (one lift) ──
const COORD = new Array<XY | null>(VERTEX_COUNT).fill(null); COORD[0] = [0, 0];
{
  const q = [0];
  while (q.length) {
    const i = q.shift()!;
    for (const j of VERTEX_LINKS[i]) {
      const d = D[dirOf(i, j)];
      if (COORD[j] === null) { COORD[j] = [COORD[i]![0] + d[0], COORD[i]![1] + d[1]]; q.push(j); }
    }
  }
}

export const PERIOD_BASIS: readonly XY[] = [[1, 2], [3, -2]];
const E1: XY = [1, 0], E2: XY = [0.5, Math.sqrt(3) / 2]; // 60° plane basis

/** Map integer lattice coordinates to plane coordinates. */
export function planeOf([x, y]: XY): XY {
  return [x * E1[0] + y * E2[0], x * E1[1] + y * E2[1]];
}

/** Lattice coords of triangle t's three corners (canonical lift). */
function canonTri(t: number): XY[] {
  const [a, b, c] = TRIANGLES[t];
  const A = COORD[a]!;
  const da = D[dirOf(a, b)]; const B: XY = [A[0] + da[0], A[1] + da[1]];
  const db = D[dirOf(b, c)]; const C: XY = [B[0] + db[0], B[1] + db[1]];
  return [A, B, C];
}

function makeTile(t: number, n: number, m: number): Tile {
  const lat = canonTri(t).map(([x, y]): XY => [
    x + n * PERIOD_BASIS[0][0] + m * PERIOD_BASIS[1][0],
    y + n * PERIOD_BASIS[0][1] + m * PERIOD_BASIS[1][1],
  ]);
  const P = lat.map(planeOf);
  const cen: XY = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3];
  return { id: t, lat, P, cen };
}

/** Periodic tiling whose centroids fall in a plane window (the universal cover). */
export function periodicTiles(win: { x0: number; x1: number; y0: number; y1: number }): Tile[] {
  const out: Tile[] = [];
  for (let t = 0; t < TRIANGLES.length; t++)
    for (let n = -4; n <= 4; n++) for (let m = -4; m <= 4; m++) {
      const tl = makeTile(t, n, m);
      if (tl.cen[0] >= win.x0 && tl.cen[0] <= win.x1 && tl.cen[1] >= win.y0 && tl.cen[1] <= win.y1) out.push(tl);
    }
  return out;
}

/**
 * Hexagonal fundamental domain: each triangle's representative nearest `center`
 * (the Voronoi cell of the period lattice). Default center ≈ vertex 2, which
 * puts a copy of vertex 0 on the left boundary.
 */
export function hexDomain(center: XY = [1.333, 0]): Tile[] {
  const out: Tile[] = [];
  for (let t = 0; t < TRIANGLES.length; t++) {
    let best: Tile | null = null, bestD = Infinity;
    for (let n = -4; n <= 4; n++) for (let m = -4; m <= 4; m++) {
      const tl = makeTile(t, n, m);
      const d = (tl.cen[0] - center[0]) ** 2 + (tl.cen[1] - center[1]) ** 2;
      if (d < bestD) { bestD = d; best = tl; }
    }
    out.push(best!);
  }
  return out;
}

/** Vertex labels for a tile set, deduped by lattice point. */
export function vertexLabels(tiles: Tile[]): { pos: XY; id: number }[] {
  const m = new Map<string, { pos: XY; id: number }>();
  for (const { lat, id } of tiles) {
    const verts = TRIANGLES[id];
    for (let k = 0; k < 3; k++) {
      const key = `${lat[k][0]},${lat[k][1]}`;
      if (!m.has(key)) m.set(key, { pos: planeOf(lat[k]), id: verts[k] });
    }
  }
  return [...m.values()];
}

/** Develop an edge-loop's lattice points starting from the (0,0) copy of vertex 0. */
export function tracePath(verts: readonly number[]): XY[] {
  let P: XY = [0, 0]; const pts: XY[] = [P];
  for (let k = 0; k + 1 < verts.length; k++) {
    const d = D[dirOf(verts[k], verts[k + 1])];
    P = [P[0] + d[0], P[1] + d[1]]; pts.push(P);
  }
  return pts;
}
