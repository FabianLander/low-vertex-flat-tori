/**
 * marking.ts — choosing a triangulation's MARKING: a basis of H₁(T²,ℤ), as two
 * oriented vertex edge-loops. This is the Teichmüller marking — its holonomy
 * under the developing map gives τ.
 *
 * Also the single compute pass `canonicalDecoration`: layout → cut → {develop
 * order ∥ generators}. The cut is the shared root — the fundamental domain owns
 * it (`fundamentalDomain.ts`); the marking reads it to align its generators. The
 * pass returns the savable triple `{ cut, developOrder, generatorLoops }`, which
 * the cache stores and `defineTriangulation` splits into the two decorations.
 *
 * Pure: no DOM/three.js.
 */

import type { Triangulation } from '../tori/triangulation';
import { edgeKey, edgeEnds, homologyGenerators } from '../tori/triangulation';
import type { SavedMarking } from '../tori/markings';
import { harmonicLayout, type HarmonicLayout } from './harmonicLayout';
import { exactMinCutDomain, windingDevelop } from './fundamentalDomain';

const cache = new WeakMap<Triangulation, SavedMarking>();

/**
 * The canonical decoration (the savable triple: cut + unfold order + cut-aligned
 * H₁ basis; `attach` is re-derived from these at construction). The EXPENSIVE
 * step (harmonic layout + min-cut), run by `compute-markings` to fill the cache.
 * Deterministic and memoized, so saving it is a pure optimization.
 */
export function canonicalDecoration(torus: Triangulation): SavedMarking {
  const hit = cache.get(torus);
  if (hit) return hit;
  const layout = harmonicLayout(torus);
  const { domain, cut } = exactMinCutDomain(torus, layout);
  // Order the SAME minimal domain as a centered spiral (root nearest the
  // centroid, outward) rather than exactMinCutDomain's raw BFS-from-0 — same
  // domain, but central triangles develop first.
  const { order: developOrder } = windingDevelop(torus, domain);
  const generatorLoops = cutGenerators(torus, layout, cut) ?? homologyGenerators(torus.triangles);
  const decoration: SavedMarking = { cut, developOrder, generatorLoops };
  cache.set(torus, decoration);
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
function cutGenerators(torus: Triangulation, layout: HarmonicLayout, cut: number[]): number[][] | null {
  const { edges, vertexCount } = torus;
  const cutSet = new Set(cut);

  // primal spanning tree (BFS over vertices) using only non-cut edges
  const adj: number[][] = Array.from({ length: vertexCount }, () => []);
  for (const [u, v] of edges) { if (cutSet.has(edgeKey(u, v))) continue; adj[u].push(v); adj[v].push(u); }
  const parent = new Array<number>(vertexCount).fill(-1);
  const seen = new Set<number>([0]);
  const q = [0];
  for (let h = 0; h < q.length; h++) for (const v of adj[q[h]]) if (!seen.has(v)) { seen.add(v); parent[v] = q[h]; q.push(v); }
  if (seen.size !== vertexCount) return null; // cut disconnected the 1-skeleton

  const treePath = (u: number, v: number): number[] => {
    const up = (x: number) => { const p = [x]; while (parent[p[p.length - 1]] !== -1) p.push(parent[p[p.length - 1]]); return p; };
    const pu = up(u), pv = up(v);
    const iv = new Map(pv.map((x, i) => [x, i] as const));
    let lca = -1, iu = -1;
    for (let i = 0; i < pu.length; i++) if (iv.has(pu[i])) { lca = pu[i]; iu = i; break; }
    return [...pu.slice(0, iu + 1), ...pv.slice(0, iv.get(lca)!).reverse()]; // u … lca … v
  };

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
    const loop = [...treePath(v, u), v];
    loops.push(loop);
    cls.push(loopClass(loop));
  }

  for (let i = 0; i < loops.length; i++) for (let j = i + 1; j < loops.length; j++) {
    const det = cls[i][0] * cls[j][1] - cls[i][1] * cls[j][0];
    if (Math.abs(det) === 1) return [loops[i], loops[j]];
  }
  return null;
}
