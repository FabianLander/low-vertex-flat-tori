/**
 * marking — computing a triangulation's canonical MARKING: the developing chart
 * (`loops` + `cut` + `developOrder`), a deterministic function of the combinatorics.
 *
 * `canonicalMarking(combinatorics)` is the single pass: a planar harmonic layout of the
 * triangulation → the minimal cut → {develop order ∥ cut-aligned generators}. It is the
 * EXPENSIVE step (harmonic layout + the exact min-cut search), so it is run OFFLINE by
 * `scripts/compute-markings` and its result stored in the marking file; the runtime loads
 * that file and never calls this. The loops give τ (their holonomy under the developing map).
 *
 * It needs only the cheap `Combinatorics` (edges, faces, adjacency), not a built
 * `Triangulation` — so the generator builds combinatorics, marks, and stores, with no
 * cycle back through `makeTriangulation`.
 *
 * Pure: no DOM/three.js.
 */

import type { Combinatorics, Marking } from './triangulation.ts';
import { edgeEnds, homologyGenerators } from './triangulation.ts';
import { spanningTree, treePath } from './trees.ts';
import { harmonicLayout, type HarmonicLayout } from './harmonicLayout.ts';
import { exactMinCutDomain, windingDevelop } from './fundamentalDomain.ts';

/**
 * The canonical marking of a triangulation, in readable vertex/edge/face numbers:
 * the two cut-aligned H₁ generator loops, the minimal cut (as vertex pairs), and a
 * centered-spiral develop order. The EXPENSIVE step (harmonic layout + exact min-cut) —
 * run offline by the marking generator, never at runtime. Deterministic and memo-free.
 */
export function canonicalMarking(c: Combinatorics): Marking {
  const layout = harmonicLayout(c);
  const { domain, cut } = exactMinCutDomain(c, layout);          // cut = edgeKeys
  // Order the same minimal domain as a centered spiral (root nearest the centroid,
  // outward) rather than exactMinCutDomain's raw BFS-from-0 — same domain, but central
  // triangles develop first.
  const { order: developOrder } = windingDevelop(c, domain);
  const loops = cutGenerators(c, layout, cut) ?? homologyGenerators(c.triangles);
  return { loops, cut: cut.map((k) => edgeEnds(k) as [number, number]), developOrder };
}

/**
 * Two H₁ generators from the minimal cut. Build a primal spanning tree that AVOIDS the
 * cut edges, so each cut edge, closed by the tree path between its ends, is a non-trivial
 * loop. A loop's class in the lattice (V₁,V₂) basis is Σ jump over its directed edges (the
 * cocycle pairing). Return the first pair whose class vectors are unimodular — |det| = 1
 * ⟺ unit-index basis ⟺ covolume = area. Null if the cut disconnects the vertices or no
 * unimodular pair exists (caller falls back to the tree–cotree basis).
 */
function cutGenerators(c: Combinatorics, layout: HarmonicLayout, cut: number[]): number[][] | null {
  const { edges, vertexCount } = c;
  const cutSet = new Set(cut);

  // primal spanning tree over the NON-cut edges; if it doesn't reach every vertex,
  // the cut disconnected the 1-skeleton (no usable generators).
  const { parent, reached } = spanningTree(vertexCount, edges, cutSet);
  if (reached !== vertexCount) return null;

  // a closed vertex loop's class in (V₁,V₂) coordinates = Σ jump over its edges
  const loopClass = (loop: number[]): [number, number] => {
    let n = 0, m = 0;
    for (let k = 0; k + 1 < loop.length; k++) { const [a, b] = layout.jump(loop[k], loop[k + 1]); n += a; m += b; }
    return [n, m];
  };

  // one loop per cut edge: tree path back + the cut edge to close (v … u, v)
  const loops: number[][] = [];
  const cls: [number, number][] = [];
  for (const k of cut) {
    const [u, v] = edgeEnds(k);
    const loop = [...treePath(parent, v, u), v];
    loops.push(loop);
    cls.push(loopClass(loop));
  }

  for (let i = 0; i < loops.length; i++) for (let j = i + 1; j < loops.length; j++) {
    const det = cls[i][0] * cls[j][1] - cls[i][1] * cls[j][0];
    if (Math.abs(det) === 1) return [loops[i], loops[j]];
  }
  return null;
}
