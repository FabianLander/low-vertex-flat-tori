/**
 * exactMinCutDomain — the PROVABLY-minimal compact fundamental domain for small
 * triangulations, by exhaustive search over cut graphs.
 *
 * Exposed edges = 2 × (cut edges), so we want the smallest edge set C whose
 * removal opens the torus into a disk. We enumerate cut sets by increasing size
 * and return the first VALID one — valid = the glued complement (edges \ C)
 * develops to a connected, consistent disk (one copy of each triangle, every
 * glued edge coincident, i.e. no holonomy). First valid size = the optimum.
 *
 * Exact and fast for small triangulations (E ≈ 24, min cut ≈ 5); the subset
 * enumeration is exponential in the edge count, so this is a small-case tool —
 * a large triangulation would need a heuristic or an ILP instead.
 *
 * Pure: no DOM/three.js.
 */

import type { Triangulation } from './triangulation.ts';
import { edgeKey, edgeEnds } from './triangulation.ts';
import { type HarmonicLayout, type HarmonicTile } from './harmonicLayout.ts';
import type { Vec2 } from '@core/geometry/vec2.ts';
import type { DevelopStep } from './triangulation.ts';

export type ExactDomainResult = {
  readonly domain: HarmonicTile[];   // one positioned copy of each triangle
  readonly developOrder: number[];   // triangle ids, glued-BFS order
  readonly exterior: number;         // = 2·|cut|, provably minimal
  readonly cut: number[];            // edgeKeys of the minimal cut graph
};

const EPS = 1e-6;

export function exactMinCutDomain(triang: Triangulation, layout: HarmonicLayout): ExactDomainResult {
  const { edges, edgeToTris, triangles } = triang;
  const { tiles } = layout;
  const F = triangles.length;
  const E = edges.length;
  const eKeys = edges.map(([u, v]) => edgeKey(u, v));
  const close = (a: Vec2, b: Vec2) => Math.abs(a[0] - b[0]) < EPS && Math.abs(a[1] - b[1]) < EPS;

  // develop the glued complement of `cut`; valid iff connected AND every glued
  // edge is coincident (a consistent disk). returns the domain+order or null.
  const validate = (cut: Set<number>): { domain: HarmonicTile[]; order: number[] } | null => {
    const gadj: { nbr: number; u: number }[][] = Array.from({ length: F }, () => []);
    for (const [k, [t1, t2]] of edgeToTris) {
      if (cut.has(k)) continue;
      const [u] = edgeEnds(k);
      gadj[t1].push({ nbr: t2, u }); gadj[t2].push({ nbr: t1, u });
    }
    const placed: (Vec2[] | null)[] = new Array(F).fill(null);
    placed[0] = tiles[0].corners.map(([x, y]): Vec2 => [x, y]);
    const order = [0]; const q = [0];
    for (let h = 0; h < q.length; h++) {
      const p = q[h];
      for (const { nbr, u } of gadj[p]) if (!placed[nbr]) {
        const ip = triangles[p].indexOf(u), it = triangles[nbr].indexOf(u);
        const dx = placed[p]![ip][0] - tiles[nbr].corners[it][0], dy = placed[p]![ip][1] - tiles[nbr].corners[it][1];
        placed[nbr] = tiles[nbr].corners.map(([x, y]): Vec2 => [x + dx, y + dy]);
        order.push(nbr); q.push(nbr);
      }
    }
    if (order.length !== F) return null;                          // glued-dual disconnected
    for (const [k, [t1, t2]] of edgeToTris) {                     // consistency: glued edges coincident
      if (cut.has(k)) continue;
      const [u, v] = edgeEnds(k);
      const u1 = placed[t1]![triangles[t1].indexOf(u)], u2 = placed[t2]![triangles[t2].indexOf(u)];
      const v1 = placed[t1]![triangles[t1].indexOf(v)], v2 = placed[t2]![triangles[t2].indexOf(v)];
      if (!close(u1, u2) || !close(v1, v2)) return null;          // holonomy ⟹ not a disk
    }
    return { domain: placed.map((c, id): HarmonicTile => ({ id, corners: c! })), order };
  };

  // enumerate cut sets by increasing size; first valid = the minimum cut
  for (let k = 2; k <= E; k++) {
    const comb = Array.from({ length: k }, (_, i) => i);
    for (;;) {
      const cut = new Set<number>();
      for (const i of comb) cut.add(eKeys[i]);
      const res = validate(cut);
      if (res) return { domain: res.domain, developOrder: res.order, exterior: 2 * k, cut: comb.map((i) => eKeys[i]) };
      let i = k - 1;
      while (i >= 0 && comb[i] === E - k + i) i--;
      if (i < 0) break;
      comb[i]++;
      for (let j = i + 1; j < k; j++) comb[j] = comb[j - 1] + 1;
    }
  }
  throw new Error(`exactMinCutDomain: no valid cut for torus #${triang.id}`);
}

// ---------------------------------------------------------------------------
// Unroll ORDER over the minimal domain — a centered spiral. Determines the
// `developOrder` of the fundamental domain (and the develop-winding animation).
// ---------------------------------------------------------------------------

const centroid = (c: readonly Vec2[]): Vec2 => [(c[0][0] + c[1][0] + c[2][0]) / 3, (c[0][1] + c[1][1] + c[2][1]) / 3];


/**
 * The minimal fundamental domain developed in a continuous WINDING order: the F
 * triangles ordered to spiral outward from the central triangle (by graph
 * distance, then polar angle), each gluing onto an already-placed coincident
 * neighbor. The abstract-net analogue of the metric develop net, valid for
 * every torus.
 */
export type WindingNet = {
  readonly tiles: HarmonicTile[];     // the fundamental domain (indexed by triangle id)
  readonly order: number[];           // triangle ids, root first (the winding reveal order)
  readonly steps: DevelopStep[];      // placement steps aligned with `order`
  readonly center: Vec2;
};

export function windingNet(triang: Triangulation, layout: HarmonicLayout): WindingNet {
  const dom = exactMinCutDomain(triang, layout).domain;
  return { tiles: dom, ...windingDevelop(triang, dom) };
}

/**
 * The centered-spiral develop of an already-positioned minimal domain: root =
 * the triangle nearest the domain centroid, then a continuous CCW winding walk
 * outward, each triangle gluing onto an already-placed coincident neighbor.
 * Shared by `windingNet` (animation) and the canonical `developOrder`.
 */
export function windingDevelop(triang: Triangulation, dom: HarmonicTile[]): { order: number[]; steps: DevelopStep[]; center: Vec2 } {
  const { triangles, edgeToTris } = triang;
  const F = triangles.length;
  const byId = new Map(dom.map((t) => [t.id, t]));
  const cornerOf = (t: number, g: number): Vec2 => byId.get(t)!.corners[triangles[t].indexOf(g)];
  const EPS = 1e-6;
  const close = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]) < EPS;

  // coincident-edge adjacency within the fundamental domain
  const adj: { nbr: number; u: number; v: number }[][] = Array.from({ length: F }, () => []);
  for (const [k, [t1, t2]] of edgeToTris) {
    const [u, v] = edgeEnds(k);
    if (close(cornerOf(t1, u), cornerOf(t2, u)) && close(cornerOf(t1, v), cornerOf(t2, v))) {
      adj[t1].push({ nbr: t2, u, v });
      adj[t2].push({ nbr: t1, u, v });
    }
  }

  const cen = (t: number) => centroid(byId.get(t)!.corners);
  let dcx = 0, dcy = 0;
  for (let t = 0; t < F; t++) { const g = cen(t); dcx += g[0]; dcy += g[1]; }
  dcx /= F; dcy /= F;
  const domCenter: Vec2 = [dcx, dcy];

  // central triangle = nearest the domain centroid
  let root = 0, rootD = Infinity;
  for (let t = 0; t < F; t++) { const g = cen(t); const d = (g[0] - dcx) ** 2 + (g[1] - dcy) ** 2; if (d < rootD) { rootD = d; root = t; } }

  // graph distance from root over coincident adjacency (the connectivity check)
  const dist = new Array<number>(F).fill(Infinity);
  dist[root] = 0;
  const q = [root];
  for (let h = 0; h < q.length; h++) for (const { nbr } of adj[q[h]]) if (dist[nbr] === Infinity) { dist[nbr] = dist[q[h]] + 1; q.push(nbr); }
  if (dist.some((d) => d === Infinity)) {
    throw new Error(`windingDevelop: fundamental domain is not coincident-connected for torus #${triang.id}`);
  }

  // Continuous winding walk: greedily extend from the just-placed triangle when
  // possible (a connected snake), otherwise hop to the angularly-next frontier
  // triangle going CCW around the center — so the net spirals outward without
  // teleporting. Every pick is on the frontier, so it stays a valid spanning order.
  const ang = (t: number) => { const g = cen(t); return Math.atan2(g[1] - dcy, g[0] - dcx); };
  const placed = new Array<boolean>(F).fill(false);
  placed[root] = true;
  const order = [root];
  let last = root, lastAng = ang(root);
  while (order.length < F) {
    const frontier: number[] = [];
    for (let t = 0; t < F; t++) if (!placed[t] && adj[t].some((e) => placed[e.nbr])) frontier.push(t);
    const fromLast = frontier.filter((t) => adj[t].some((e) => e.nbr === last));
    const pool = fromLast.length ? fromLast : frontier; // prefer continuing the walk
    let pick = pool[0], bestStep = Infinity;
    for (const t of pool) {
      let d = ang(t) - lastAng;
      while (d <= 1e-9) d += 2 * Math.PI; // strictly ahead, CCW
      if (d < bestStep) { bestStep = d; pick = t; }
    }
    placed[pick] = true; order.push(pick); last = pick; lastAng = ang(pick);
  }

  const placedAt = new Array<number>(F).fill(-1);
  order.forEach((t, i) => { placedAt[t] = i; });
  const steps: DevelopStep[] = order.map((t, i) => {
    if (i === 0) return { t, parent: -1, edge: [-1, -1] as const };
    // attach to the MOST-RECENTLY placed coincident neighbor (local, continuous growth)
    let parent = -1, best = -1, eu = -1, ev = -1;
    for (const { nbr, u, v } of adj[t]) {
      if (placedAt[nbr] >= 0 && placedAt[nbr] < i && placedAt[nbr] > best) { best = placedAt[nbr]; parent = nbr; eu = u; ev = v; }
    }
    return { t, parent, edge: [eu, ev] as const };
  });

  return { order, steps, center: domCenter };
}
