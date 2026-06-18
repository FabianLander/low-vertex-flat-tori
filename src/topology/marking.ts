/**
 * marking — choosing a triangulation's canonical MARKING: a basis of H₁(T²,ℤ), as
 * two oriented vertex edge-loops. This is the Teichmüller marking — its holonomy
 * under the developing map gives τ.
 *
 * `canonicalDecoration` is the single pass that picks it: a planar harmonic layout
 * of the triangulation → the minimal cut → {develop order ∥ cut-aligned generators}.
 * The cut is the shared root — the fundamental domain owns it; the marking reads it
 * to align its generators. The pass returns the triple `{ cut, developOrder,
 * generatorLoops }`, which `defineTriangulation` splits into the triangulation's two
 * decorations (`fundamentalDomain`, `marking`).
 *
 * It uses the planar-drawing helpers `harmonicLayout` (harmonic embedding) +
 * `fundamentalDomain` (exact minimal-cut domain), so it is heavier than the rest of
 * the builder — the registry runs it once per triangulation when building `ALL_TORI`
 * (~0.1s each for the 8-vertex census). Deterministic and memoized; no cached file.
 *
 * Pure: no DOM/three.js.
 */

import type { Triangulation } from './triangulation.ts';
import { edgeEnds, homologyGenerators } from './triangulation.ts';
import { spanningTree, treePath } from './trees.ts';
import { harmonicLayout, type HarmonicLayout } from './harmonicLayout.ts';
import { exactMinCutDomain, windingDevelop } from './fundamentalDomain.ts';

/** The savable canonical decoration — the cache shape. `attach` is re-derived. */
export type SavedMarking = {
  developOrder: number[];
  generatorLoops: number[][];
  cut: number[];
};

const cache = new WeakMap<Triangulation, SavedMarking>();

/**
 * The canonical decoration (the triple: cut + unfold order + cut-aligned H₁ basis;
 * `attach` is re-derived from these at construction). The EXPENSIVE step (harmonic
 * layout + exact min-cut) — the registry calls it once per triangulation when
 * building `ALL_TORI`. Deterministic and memoized.
 */
export function canonicalDecoration(triang: Triangulation): SavedMarking {
  const hit = cache.get(triang);
  if (hit) return hit;
  const layout = harmonicLayout(triang);
  const { domain, cut } = exactMinCutDomain(triang, layout);
  // Order the SAME minimal domain as a centered spiral (root nearest the
  // centroid, outward) rather than exactMinCutDomain's raw BFS-from-0 — same
  // domain, but central triangles develop first.
  const { order: developOrder } = windingDevelop(triang, domain);
  const generatorLoops = cutGenerators(triang, layout, cut) ?? homologyGenerators(triang.triangles);
  const decoration: SavedMarking = { cut, developOrder, generatorLoops };
  cache.set(triang, decoration);
  return decoration;
}

/**
 * Two H₁ generators from the minimal cut. Build a primal spanning tree that
 * AVOIDS the cut edges, so each cut edge, closed by the tree path between its
 * ends, is a non-trivial loop. A loop's class in the lattice (V₁,V₂) basis is
 * Σ jump over its directed edges (the cocycle pairing). Return the first pair
 * whose class vectors are unimodular — |det| = 1 ⟺ unit-index basis ⟺ covolume
 * = area. Null if the cut disconnects the vertices or no unimodular pair exists
 * (caller falls back to the tree–cotree basis).
 */
function cutGenerators(triang: Triangulation, layout: HarmonicLayout, cut: number[]): number[][] | null {
  const { edges, vertexCount } = triang;
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
