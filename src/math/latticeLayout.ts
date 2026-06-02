/**
 * Abstract combinatorial layout of a degree-6-regular triangulation on the
 * regular triangular lattice (every vertex degree 6 ⟹ the triangulation is a
 * quotient of ℤ²). This is the *equilateral* picture — fixed equilateral tiles,
 * independent of any embedding.
 *
 * ONLY valid for the degree-6-regular torus (#7); `latticeLayout(torus)` throws
 * unless `torus.lattice` is present. For the other six types, which have
 * degree-5/7 vertices, use the harmonic embedding (`harmonicLayout.ts`) instead.
 *
 * Pure: no DOM, no three.js. Plane coordinates only (a 60° basis).
 */

import type { Torus, Attach } from '../tori/defineTorus';
import { edgeKey } from '../tori/defineTorus';

export type XY = [number, number];
export type Tile = {
  readonly id: number;
  readonly lat: XY[];   // 3 corners in integer lattice coords (torus.triangles[id] order)
  readonly P: XY[];     // the same corners in plane coords
  readonly cen: XY;     // plane centroid
};

export type LatticeLayout = {
  readonly periodBasis: readonly XY[];
  planeOf(xy: XY): XY;
  periodicTiles(win: { x0: number; x1: number; y0: number; y1: number }): Tile[];
  hexDomain(center?: XY): Tile[];
  vertexLabels(tiles: Tile[]): { pos: XY; id: number }[];
  tracePath(verts: readonly number[]): XY[];
  /** Develop attachment tree consistent with the hexagonal lattice net: each
   *  triangle glues onto its earliest-placed neighbor across the edge they are
   *  COINCIDENT on in the abstract domain — so a metric `developNet` unfolds with
   *  the same gluing topology as the lattice picture. */
  developAttach(developOrder: readonly number[], center?: XY): Attach[];
};

const D: XY[] = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]; // hex directions
const E1: XY = [1, 0], E2: XY = [0.5, Math.sqrt(3) / 2];              // 60° plane basis

/**
 * Build the equilateral lattice layout for a degree-6-regular torus. Solves the
 * rotational offsets r_i ∈ ℤ/6 (so edge directions are globally consistent) and
 * the integer vertex coordinates once, then returns the layout API bound to it.
 */
export function latticeLayout(torus: Torus): LatticeLayout {
  if (!torus.lattice) {
    throw new Error(`latticeLayout: torus #${torus.id} is not degree-6-regular (no lattice)`);
  }
  const { triangles, vertexLinks, vertexCount } = torus;
  const periodBasis = torus.lattice.periodBasis as readonly XY[];

  const linkIdx = (v: number, n: number) => vertexLinks[v].indexOf(n);

  // rotational offsets r_i via BFS over the link graph
  const R = new Array<number | null>(vertexCount).fill(null); R[0] = 0;
  {
    const q = [0];
    while (q.length) {
      const i = q.shift()!;
      vertexLinks[i].forEach((j, k) => {
        const m = linkIdx(j, i);
        const w = (((R[i]! + k - m - 3) % 6) + 6) % 6;
        if (R[j] === null) { R[j] = w; q.push(j); }
      });
    }
  }
  const dirOf = (i: number, j: number) => (R[i]! + linkIdx(i, j)) % 6;

  // integer coordinates of each vertex (one lift)
  const COORD = new Array<XY | null>(vertexCount).fill(null); COORD[0] = [0, 0];
  {
    const q = [0];
    while (q.length) {
      const i = q.shift()!;
      for (const j of vertexLinks[i]) {
        const d = D[dirOf(i, j)];
        if (COORD[j] === null) { COORD[j] = [COORD[i]![0] + d[0], COORD[i]![1] + d[1]]; q.push(j); }
      }
    }
  }

  const planeOf = ([x, y]: XY): XY => [x * E1[0] + y * E2[0], x * E1[1] + y * E2[1]];

  const canonTri = (t: number): XY[] => {
    const [a, b, c] = triangles[t];
    const A = COORD[a]!;
    const da = D[dirOf(a, b)]; const B: XY = [A[0] + da[0], A[1] + da[1]];
    const db = D[dirOf(b, c)]; const C: XY = [B[0] + db[0], B[1] + db[1]];
    return [A, B, C];
  };

  const makeTile = (t: number, n: number, m: number): Tile => {
    const lat = canonTri(t).map(([x, y]): XY => [
      x + n * periodBasis[0][0] + m * periodBasis[1][0],
      y + n * periodBasis[0][1] + m * periodBasis[1][1],
    ]);
    const P = lat.map(planeOf);
    const cen: XY = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3];
    return { id: t, lat, P, cen };
  };

  const periodicTiles = (win: { x0: number; x1: number; y0: number; y1: number }): Tile[] => {
    const out: Tile[] = [];
    for (let t = 0; t < triangles.length; t++)
      for (let n = -4; n <= 4; n++) for (let m = -4; m <= 4; m++) {
        const tl = makeTile(t, n, m);
        if (tl.cen[0] >= win.x0 && tl.cen[0] <= win.x1 && tl.cen[1] >= win.y0 && tl.cen[1] <= win.y1) out.push(tl);
      }
    return out;
  };

  const hexDomain = (center: XY = [1.333, 0]): Tile[] => {
    const out: Tile[] = [];
    for (let t = 0; t < triangles.length; t++) {
      let best: Tile | null = null, bestD = Infinity;
      for (let n = -4; n <= 4; n++) for (let m = -4; m <= 4; m++) {
        const tl = makeTile(t, n, m);
        const d = (tl.cen[0] - center[0]) ** 2 + (tl.cen[1] - center[1]) ** 2;
        if (d < bestD) { bestD = d; best = tl; }
      }
      out.push(best!);
    }
    return out;
  };

  const vertexLabels = (tiles: Tile[]): { pos: XY; id: number }[] => {
    const m = new Map<string, { pos: XY; id: number }>();
    for (const { lat, id } of tiles) {
      const verts = triangles[id];
      for (let k = 0; k < 3; k++) {
        const key = `${lat[k][0]},${lat[k][1]}`;
        if (!m.has(key)) m.set(key, { pos: planeOf(lat[k]), id: verts[k] });
      }
    }
    return [...m.values()];
  };

  const tracePath = (verts: readonly number[]): XY[] => {
    let P: XY = [0, 0]; const pts: XY[] = [P];
    for (let k = 0; k + 1 < verts.length; k++) {
      const d = D[dirOf(verts[k], verts[k + 1])];
      P = [P[0] + d[0], P[1] + d[1]]; pts.push(P);
    }
    return pts;
  };

  const developAttach = (developOrder: readonly number[], center?: XY): Attach[] => {
    const tiles = hexDomain(center);
    const byId = new Map(tiles.map((t) => [t.id, t]));
    const latOf = (t: number, g: number): XY => byId.get(t)!.lat[triangles[t].indexOf(g)];
    const same = (a: XY, b: XY) => a[0] === b[0] && a[1] === b[1];
    const placedAt = new Array<number>(triangles.length).fill(-1);
    const out = new Array<Attach>(triangles.length);
    const root = developOrder[0];
    out[root] = { parent: -1, u: -1, v: -1 };
    placedAt[root] = 0;
    for (let i = 1; i < developOrder.length; i++) {
      const t = developOrder[i], tri = triangles[t];
      let parent = -1, best = Infinity, su = -1, sv = -1;
      for (let s = 0; s < 3; s++) {
        const u = tri[s], v = tri[(s + 1) % 3];
        const [tA, tB] = torus.edgeToTris.get(edgeKey(u, v))!;
        const nbr = tA === t ? tB : tA;
        if (placedAt[nbr] >= 0 && placedAt[nbr] < best
          && same(latOf(t, u), latOf(nbr, u)) && same(latOf(t, v), latOf(nbr, v))) {
          best = placedAt[nbr]; parent = nbr; su = u; sv = v;
        }
      }
      if (parent < 0) throw new Error(`developAttach: triangle ${t} has no lattice-coincident placed neighbor`);
      out[t] = { parent, u: su, v: sv };
      placedAt[t] = i;
    }
    return out;
  };

  return { periodBasis, planeOf, periodicTiles, hexDomain, vertexLabels, tracePath, developAttach };
}
