/**
 * section — the cross-section of a realization by a plane: plane ∩ polyhedron, as a
 * union of ORDERED closed loops (not a segment soup), so the slice is a measurable
 * object (`perimeter`, `area`), not just something to draw.
 *
 * Each triangle that straddles the plane is crossed on exactly two of its mesh edges;
 * the crossing point on a mesh edge is shared by the two triangles incident to it. So
 * the segments form a graph whose nodes are crossed mesh-edges (each of degree ≤ 2)
 * and whose links are the per-triangle segments — a union of cycles. We compute each
 * crossing once (keyed by the edge), build that adjacency, and walk the cycles.
 *
 * Factory over the triangulation (caches the per-triangle edge keys); `loops` streams
 * a realization + a plane. Impure render boundary (three.js Vector3/Plane).
 */

import * as THREE from 'three';
import type { Triangulation } from '@core/topology/triangulation.ts';
import { edgeKey, edgeEnds } from '@core/topology/triangulation.ts';

export type Loop = THREE.Vector3[];

export interface Section {
  /** Ordered closed loops of plane ∩ the realization (in the positions' frame). */
  loops(positions: ArrayLike<number>, plane: THREE.Plane): Loop[];
}

export function makeSection(triang: Triangulation): Section {
  const triEdgeKeys = triang.triangles.map(
    ([a, b, c]) => [edgeKey(a, b), edgeKey(b, c), edgeKey(c, a)] as const,
  );

  function loops(positions: ArrayLike<number>, plane: THREE.Plane): Loop[] {
    const V = triang.vertexCount;
    const tmp = new THREE.Vector3();
    const d = new Float64Array(V);
    for (let v = 0; v < V; v++) {
      d[v] = plane.distanceToPoint(tmp.set(positions[3 * v], positions[3 * v + 1], positions[3 * v + 2]));
    }

    // crossing point per crossed edge key (computed once, shared by both triangles)
    const cross = new Map<number, THREE.Vector3>();
    const crossedEdge = (key: number): boolean => {
      const [i, j] = edgeEnds(key);
      if ((d[i] < 0) === (d[j] < 0)) return false;      // both sides same ⟹ not crossed
      if (!cross.has(key)) {
        const s = d[i] / (d[i] - d[j]);
        cross.set(key, new THREE.Vector3(
          positions[3 * i] + s * (positions[3 * j] - positions[3 * i]),
          positions[3 * i + 1] + s * (positions[3 * j + 1] - positions[3 * i + 1]),
          positions[3 * i + 2] + s * (positions[3 * j + 2] - positions[3 * i + 2]),
        ));
      }
      return true;
    };

    // adjacency among crossed edge keys, one link per straddling triangle
    const adj = new Map<number, number[]>();
    const link = (e: number, f: number): void => { (adj.get(e) ?? adj.set(e, []).get(e)!).push(f); };
    for (let t = 0; t < triEdgeKeys.length; t++) {
      const hit = triEdgeKeys[t].filter(crossedEdge);
      if (hit.length === 2) { link(hit[0], hit[1]); link(hit[1], hit[0]); }
    }

    // walk the cycles
    const visited = new Set<number>();
    const out: Loop[] = [];
    for (const start of adj.keys()) {
      if (visited.has(start)) continue;
      const loop: Loop = [];
      let cur = start, prev = -1;
      while (cur !== -1 && !visited.has(cur)) {
        visited.add(cur);
        loop.push(cross.get(cur)!);
        let next = -1;
        for (const nb of adj.get(cur)!) if (nb !== prev && !visited.has(nb)) { next = nb; break; }
        prev = cur; cur = next;
      }
      if (loop.length >= 2) out.push(loop);
    }
    return out;
  }

  return { loops };
}

/** Total edge length of a closed loop. */
export function perimeter(loop: Loop): number {
  let s = 0;
  for (let i = 0; i < loop.length; i++) s += loop[i].distanceTo(loop[(i + 1) % loop.length]);
  return s;
}

/** Enclosed area of a planar closed loop: ½|Σ Vᵢ × Vᵢ₊₁|. */
export function area(loop: Loop): number {
  const sum = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < loop.length; i++) sum.add(c.crossVectors(loop[i], loop[(i + 1) % loop.length]));
  return 0.5 * sum.length();
}
