/**
 * unfoldPaper — the fixed unfolding of Lander §4, at TRUE scale.
 *
 * The paper pins one unfolding order for both triangulations: the first face of the
 * printed list goes down first, and whenever a face is down its three neighbours go
 * down next, in the order the shared edges appear in its boundary cycle, skipping
 * faces already placed — breadth-first on the dual graph rooted at the first face.
 * Every unfolded face is a POSITIVELY oriented congruent copy of its spatial face.
 * Our stored face lists for v8-7 and v8-3 match the paper's printed lists exactly,
 * in order, so this reproduces the nets of the paper's Figure 5.
 *
 * Two deliberate departures from the paper's normalization, both gauge only:
 *   - true scale (the paper scales the root edge to 1) — so each net face is
 *     CONGRUENT to its face in the folded configuration, which is what a figure
 *     placing the net beside the fold wants;
 *   - the root edge is placed on the fold's own root edge (the paper puts it on
 *     (0,0)→(1,0)) — so the net sits in the fold's frame.
 *
 * This is NOT `moduli/develop`: that unfolds along the canonical marking's tree
 * (a different net). It is figure-local, like `paper-folds/incidences.ts`.
 * Pure (no three.js, no DOM) — runs under tsx.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import { edgeKey, edgeEnds } from '@core/topology/triangulation.ts';
import type { Vec2 } from '@core/geometry/vec2.ts';

/** One of the nine gluings left after unfolding: a cut edge placed twice. */
export type Gluing = {
  /** The shared global edge, as (u, v) with u < v. */
  readonly edge: readonly [number, number];
  /** The two faces sharing it (ascending). */
  readonly tris: readonly [number, number];
  /** The edge as placed in tris[0] / tris[1], both ordered (u, v). */
  readonly segA: readonly [Vec2, Vec2];
  readonly segB: readonly [Vec2, Vec2];
  /** The deck translation taking segB onto segA. Zero ⟺ the net closes back up
   *  here (the dashed edges of the paper's Figures 2 and 5). */
  readonly translation: Vec2;
  /** Angle between the two placements of the edge — ≈ 0 iff the gluing is a pure
   *  translation, which over all nine gluings is exactly flatness (Lander §4). */
  readonly rotDefect: number;
};

export type PaperNet = {
  /** corners[t] = planar positions of face t's corners, in triangles[t] order. */
  readonly corners: readonly (readonly Vec2[])[];
  /** Faces in the order the unfolding placed them (root first). */
  readonly order: readonly number[];
  /** The fifteen tree edges the net is joined along, one coincident segment each. */
  readonly seams: readonly (readonly [Vec2, Vec2])[];
  /** The nine cut-edge gluings, sorted by edgeKey. */
  readonly gluings: readonly Gluing[];
  /** max over faces and edges of | net length − fold length |: the congruence check. */
  readonly maxShapeError: number;
};

/** The §4 unfolding of the FOLD's own metric: each face's true shape is read straight
 *  off its planar triangle (the fold is isometric to the intrinsic metric). */
export function unfoldPaper(triang: Triangulation, planar: readonly Vec2[]): PaperNet {
  return unfoldShapes(triang, triang.triangles.map((t) => t.map((v) => planar[v])));
}

/**
 * The same unfolding for ANY flat metric on the triangulation, given per-face shapes:
 * `shapes[f]` is a Euclidean triangle congruent to face f, corners in `triangles[f]`
 * order (any gauge — only its edge lengths are consumed). Used for the combinatorial
 * panel, whose faces come from `topology/harmonicLayout` (equilateral on v8-7) rather
 * than from a folded configuration.
 */
export function unfoldShapes(triang: Triangulation, shapes: readonly (readonly Vec2[])[]): PaperNet {
  const tris = triang.triangles;
  const F = tris.length;
  const corners: Vec2[][] = new Array(F);
  const placed = new Array<boolean>(F).fill(false);
  const order: number[] = [];
  const seams: (readonly [Vec2, Vec2])[] = [];
  const treeKeys = new Set<number>();

  const local = (f: number, v: number): number => {
    const t = tris[f];
    return t[0] === v ? 0 : t[1] === v ? 1 : 2;
  };

  /** Place face f given the net positions of the directed edge p→q AS F TRAVERSES IT,
   *  putting its third vertex on the left (positive orientation) at the true shape. */
  const place = (f: number, p: number, q: number, up: Vec2, uq: Vec2): void => {
    const t = tris[f];
    const r = t[0] !== p && t[0] !== q ? t[0] : t[1] !== p && t[1] !== q ? t[1] : t[2];
    // the face's true shape, read off its provided congruent triangle
    const s = shapes[f];
    const A = s[local(f, p)], B = s[local(f, q)], W = s[local(f, r)];
    const ax = B[0] - A[0], ay = B[1] - A[1];
    const wx = W[0] - A[0], wy = W[1] - A[1];
    const L2 = ax * ax + ay * ay;
    const xi = (wx * ax + wy * ay) / L2;
    const eta = Math.abs(ax * wy - ay * wx) / L2;   // |·|: r goes LEFT of p→q
    const ex = uq[0] - up[0], ey = uq[1] - up[1];
    const cn: Vec2[] = new Array(3);
    cn[local(f, p)] = up;
    cn[local(f, q)] = uq;
    cn[local(f, r)] = [up[0] + xi * ex - eta * ey, up[1] + xi * ey + eta * ex];
    corners[f] = cn;
    placed[f] = true;
    order.push(f);
  };

  // root: the first printed face, its first edge laid on its shape's own copy of it
  const [r0, r1] = tris[0];
  place(0, r0, r1, [shapes[0][0][0], shapes[0][0][1]], [shapes[0][1][0], shapes[0][1][1]]);

  // breadth-first over the dual, neighbours in boundary-cycle order of the shared edges
  const queue: number[] = [0];
  while (queue.length > 0) {
    const g = queue.shift()!;
    const [g0, g1, g2] = tris[g];
    for (const [s, t] of [[g0, g1], [g1, g2], [g2, g0]] as const) {
      const k = edgeKey(s, t);
      const pair = triang.edgeToTris.get(k)!;
      const f = pair[0] === g ? pair[1] : pair[0];
      if (placed[f]) continue;
      // f traverses the shared edge in the opposite direction to g (coherent orientation)
      const tf = tris[f];
      let p = -1, q = -1;
      for (let i = 0; i < 3; i++) {
        const a = tf[i], b = tf[(i + 1) % 3];
        if ((a === s && b === t) || (a === t && b === s)) { p = a; q = b; break; }
      }
      const ug = corners[g];
      place(f, p, q, ug[local(g, p)], ug[local(g, q)]);
      treeKeys.add(k);
      seams.push([ug[local(g, p)], ug[local(g, q)]]);
      queue.push(f);
    }
  }

  // the nine gluings: every non-tree edge, placed once in each of its two faces
  const gluings: Gluing[] = [];
  for (const [k, [t1, t2]] of triang.edgeToTris) {
    if (treeKeys.has(k)) continue;
    const [u, v] = edgeEnds(k);
    const Au = corners[t1][local(t1, u)], Av = corners[t1][local(t1, v)];
    const Bu = corners[t2][local(t2, u)], Bv = corners[t2][local(t2, v)];
    const e1x = Av[0] - Au[0], e1y = Av[1] - Au[1];
    const e2x = Bv[0] - Bu[0], e2y = Bv[1] - Bu[1];
    gluings.push({
      edge: [u, v], tris: [t1, t2],
      segA: [Au, Av], segB: [Bu, Bv],
      translation: [Au[0] - Bu[0], Au[1] - Bu[1]],
      rotDefect: Math.abs(Math.atan2(e1x * e2y - e1y * e2x, e1x * e2x + e1y * e2y)),
    });
  }
  gluings.sort((a, b) => edgeKey(a.edge[0], a.edge[1]) - edgeKey(b.edge[0], b.edge[1]));

  // congruence: every net face carries its shape's true edge lengths
  let maxShapeError = 0;
  for (let f = 0; f < F; f++) {
    const s = shapes[f], c = corners[f];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      const netLen = Math.hypot(c[j][0] - c[i][0], c[j][1] - c[i][1]);
      const trueLen = Math.hypot(s[j][0] - s[i][0], s[j][1] - s[i][1]);
      maxShapeError = Math.max(maxShapeError, Math.abs(netLen - trueLen));
    }
  }

  return { corners, order, seams, gluings, maxShapeError };
}
