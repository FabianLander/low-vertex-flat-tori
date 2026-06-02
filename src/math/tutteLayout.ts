/**
 * Universal abstract drawing of any 8-vertex torus triangulation, developed
 * into the plane as a single cut fundamental polygon.
 *
 * Unlike `latticeLayout` (equilateral, degree-6 only), this works for ALL seven
 * combinatorial types — including the six with degree-5/7 vertices.
 *
 * Method (a degenerate Tutte / convex-polygon embedding):
 *   1. Cut the torus to a disk along the complement of the develop spanning tree
 *      (`torus.attach`). The 15 tree edges are glued (interior); the 9 cut edges
 *      each appear twice on the boundary.
 *   2. The cut disk's vertices are the corner-classes (triangle corners union-ed
 *      across glued tree edges). For an 8-vertex torus Euler gives V_disk =
 *      1 + E_disk − F = 1 + (15 + 18) − 16 = 18, all on an 18-edge boundary — so
 *      the disk is a TRIANGULATED POLYGON (no interior vertices).
 *   3. Place the 18 boundary classes on a convex regular polygon in boundary
 *      order ⟹ a guaranteed non-overlapping straight-line drawing (any
 *      triangulation of a convex polygon is planar). A barycentric Gauss–Seidel
 *      relaxes interior classes if any ever appear (none for n=8).
 *
 * Each cut edge's two boundary copies are reported so the gluing can be colored.
 *
 * Pure: no DOM, no three.js. Output is plane coordinates only.
 */

import type { Torus } from '../tori/defineTorus';
import { edgeKey } from '../tori/defineTorus';

export type XY = [number, number];

export type TutteTile = {
  readonly id: number;       // triangle index
  readonly corners: XY[];    // 3 plane points, in triangles[id] order
};

export type CutPair = {
  readonly edge: readonly [number, number];   // the glued primal edge (u < v)
  readonly sides: readonly [XY, XY][];         // its two boundary copies (as [start,end] segments)
};

export type TutteLayout = {
  readonly tiles: TutteTile[];
  readonly boundaryLoop: XY[];                 // the convex polygon, in order
  readonly cutPairs: CutPair[];                // 9 identified edge-pairs (color these)
  readonly vertexLabels: { pos: XY; id: number }[]; // one per boundary corner-class
};

const localIndex = (tri: readonly number[], g: number): number => {
  const i = tri.indexOf(g);
  if (i < 0) throw new Error(`vertex ${g} not in triangle`);
  return i;
};

/** Develop a torus into a cut fundamental polygon (see module doc). */
export function tutteLayout(torus: Torus): TutteLayout {
  const { triangles, attach, edgeToTris } = torus;
  const F = triangles.length;

  // tree edges (glued) vs cut edges (boundary)
  const treeKeys = new Set<number>();
  for (let t = 0; t < F; t++) if (attach[t].parent >= 0) treeKeys.add(edgeKey(attach[t].u, attach[t].v));
  const isTree = (a: number, b: number) => treeKeys.has(edgeKey(a, b));

  // corner-class union-find over the 3F corners (corner = 3t + s)
  const uf = new Int32Array(3 * F).map((_, i) => i);
  const find = (x: number): number => { while (uf[x] !== x) { uf[x] = uf[uf[x]]; x = uf[x]; } return x; };
  const union = (a: number, b: number) => { uf[find(a)] = find(b); };
  const corner = (t: number, g: number) => 3 * t + localIndex(triangles[t], g);
  for (let t = 0; t < F; t++) {
    const { parent, u, v } = attach[t];
    if (parent < 0) continue;
    union(corner(t, u), corner(parent, u));
    union(corner(t, v), corner(parent, v));
  }

  // half-edge twin: each undirected edge has one half-edge per incident triangle
  const heOf = (t: number, s: number) => 3 * t + s; // from corner s to (s+1)%3
  const twin = (t: number, s: number): [number, number] => {
    const a = triangles[t][s], b = triangles[t][(s + 1) % 3];
    const [tA, tB] = edgeToTris.get(edgeKey(a, b))!;
    const t2 = tA === t ? tB : tA;
    const s2 = localIndex(triangles[t2], b); // twin runs b→a, so it starts at b
    return [t2, s2];
  };

  // walk the boundary: from a boundary half-edge, pivot around its end vertex
  const isBoundaryHe = (t: number, s: number) => !isTree(triangles[t][s], triangles[t][(s + 1) % 3]);
  let startT = -1, startS = -1;
  for (let t = 0; t < F && startT < 0; t++) for (let s = 0; s < 3; s++) if (isBoundaryHe(t, s)) { startT = t; startS = s; break; }

  const boundaryHes: [number, number][] = [];
  let ct = startT, cs = startS;
  do {
    boundaryHes.push([ct, cs]);
    // next boundary half-edge starting at the END vertex of (ct,cs)
    let nt = ct, ns = (cs + 1) % 3;
    while (isTree(triangles[nt][ns], triangles[nt][(ns + 1) % 3])) {
      const [tt, ss] = twin(nt, ns);
      nt = tt; ns = (ss + 1) % 3;
    }
    ct = nt; cs = ns;
  } while ((ct !== startT || cs !== startS) && boundaryHes.length < 3 * F);

  // place boundary corner-classes on a convex regular polygon
  const pos = new Map<number, XY>();
  const n = boundaryHes.length;
  boundaryHes.forEach(([t, s], i) => {
    const cls = find(heOf(t, s));
    const ang = (2 * Math.PI * i) / n + Math.PI / 2;
    if (!pos.has(cls)) pos.set(cls, [Math.cos(ang), Math.sin(ang)]);
  });

  // relax any interior classes (none for n=8) via barycentric Gauss–Seidel
  const neighbors = new Map<number, Set<number>>();
  for (let t = 0; t < F; t++) for (let s = 0; s < 3; s++) {
    const a = find(heOf(t, s)), b = find(heOf(t, (s + 1) % 3));
    (neighbors.get(a) ?? neighbors.set(a, new Set()).get(a)!).add(b);
    (neighbors.get(b) ?? neighbors.set(b, new Set()).get(b)!).add(a);
  }
  const interior = [...neighbors.keys()].filter((c) => !pos.has(c));
  for (const c of interior) pos.set(c, [0, 0]);
  for (let iter = 0; iter < 500 && interior.length; iter++) {
    for (const c of interior) {
      let x = 0, y = 0, k = 0;
      for (const nb of neighbors.get(c)!) { const p = pos.get(nb)!; x += p[0]; y += p[1]; k++; }
      pos.set(c, [x / k, y / k]);
    }
  }

  // assemble tiles
  const at = (t: number, s: number): XY => pos.get(find(heOf(t, s)))!;
  const tiles: TutteTile[] = [];
  for (let t = 0; t < F; t++) tiles.push({ id: t, corners: [at(t, 0), at(t, 1), at(t, 2)] });

  const boundaryLoop: XY[] = boundaryHes.map(([t, s]) => at(t, s));

  // cut-edge pairs (the 9 identifications) — both boundary copies of each cut edge
  const cutSides = new Map<number, [XY, XY][]>();
  for (let t = 0; t < F; t++) for (let s = 0; s < 3; s++) {
    const a = triangles[t][s], b = triangles[t][(s + 1) % 3];
    if (isTree(a, b)) continue;
    const k = edgeKey(a, b);
    const seg: [XY, XY] = [at(t, s), at(t, (s + 1) % 3)];
    (cutSides.get(k) ?? cutSides.set(k, []).get(k)!).push(seg);
  }
  const cutPairs: CutPair[] = [...cutSides.entries()].map(([k, sides]) => ({
    edge: [Math.floor(k / torus.vertexCount), k % torus.vertexCount] as const,
    sides,
  }));

  // labels: one per boundary corner-class (its original vertex id)
  const seenCls = new Set<number>();
  const vertexLabels: { pos: XY; id: number }[] = [];
  boundaryHes.forEach(([t, s]) => {
    const cls = find(heOf(t, s));
    if (seenCls.has(cls)) return;
    seenCls.add(cls);
    vertexLabels.push({ pos: at(t, s), id: triangles[t][s] });
  });

  return { tiles, boundaryLoop, cutPairs, vertexLabels };
}

/** Signed (×2) area of a plane triangle; for non-degeneracy checks. */
export function tileSignedArea2(c: readonly XY[]): number {
  return (c[1][0] - c[0][0]) * (c[2][1] - c[0][1]) - (c[1][1] - c[0][1]) * (c[2][0] - c[0][0]);
}

/**
 * Draw each generator loop on the layout as a set of segments: for every
 * directed edge of the loop, the segment in some triangle carrying it. Returned
 * per generator (segments may break across the cut — that is the loop crossing
 * the fundamental-domain boundary).
 */
export function generatorSegments(torus: Torus, layout: TutteLayout): [XY, XY][][] {
  const { triangles, edgeToTris } = torus;
  const at = (t: number, g: number): XY => layout.tiles[t].corners[localIndex(triangles[t], g)];
  return torus.generatorLoops.map((loop) => {
    const segs: [XY, XY][] = [];
    for (let k = 0; k + 1 < loop.length; k++) {
      const a = loop[k], b = loop[k + 1];
      const t = edgeToTris.get(edgeKey(a, b))![0];
      segs.push([at(t, a), at(t, b)]);
    }
    return segs;
  });
}
