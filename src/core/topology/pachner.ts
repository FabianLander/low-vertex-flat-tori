/**
 * Pachner 1↔3 moves on a torus triangulation. The 1→3 move subdivides a face by inserting
 * a vertex joined to its three corners (1 triangle → 3, +1 vertex); its inverse, the 3→1
 * `collapse`, deletes a degree-3 vertex and merges its three faces into one.
 *
 * `isReducible` asks the natural question this answers: is a triangulation **just a 1→3
 * subdivision of a smaller one** — i.e. does it have a degree-3 vertex that collapses to a
 * valid torus? Irreducible ⟺ genuinely "new" at its vertex count (not built up by 1→3 moves).
 *
 * (This is the 1↔3 notion of irreducibility — distinct from edge-contraction irreducibility,
 * the classical "21 irreducible torus triangulations".) Combinatorial; validity is gated by
 * `deriveCombinatorics`. Pure: no three.js, no DOM.
 */

import type { Tri } from './triangulation.ts';
import { deriveCombinatorics } from './triangulation.ts';

/**
 * The 3→1 collapse of vertex `v`: if `v` has degree 3, drop its three incident faces, fill
 * the link triangle, and delete `v` (relabeling the higher indices down). Returns the new
 * triangle list, or `null` if `v` is not a collapsible degree-3 vertex — i.e. it isn't
 * degree 3, or the result isn't a valid torus triangulation (`deriveCombinatorics` gates it).
 */
export function collapse(triangles: readonly Tri[], v: number): Tri[] | null {
  const incident = triangles.filter((t) => t.includes(v));
  if (incident.length !== 3) return null;                       // degree ≠ 3
  // the three directed link edges (each face's edge opposite v, in face order)
  const link = incident.map((f) => { const i = f.indexOf(v); return [f[(i + 1) % 3], f[(i + 2) % 3]] as const; });
  const next = new Map(link.map(([p, q]) => [p, q]));           // chain a→b→c→a
  const a = link[0][0];
  const b = next.get(a); if (b === undefined) return null;
  const c = next.get(b); if (c === undefined || next.get(c) !== a) return null;
  const relabel = (x: number): number => (x > v ? x - 1 : x);   // delete vertex v
  const out: Tri[] = [];
  for (const t of triangles) if (!t.includes(v)) out.push([relabel(t[0]), relabel(t[1]), relabel(t[2])]);
  out.push([relabel(a), relabel(b), relabel(c)]);               // the merged face
  try { deriveCombinatorics(out); return out; } catch { return null; }
}

/** Is this triangulation a 1→3 subdivision of a smaller torus? (∃ a collapsible degree-3
 *  vertex.) `false` ⟺ irreducible — genuinely new at its vertex count. */
export function isReducible(triangles: readonly Tri[]): boolean {
  const V = Math.max(...triangles.flat()) + 1;
  for (let v = 0; v < V; v++) if (collapse(triangles, v)) return true;
  return false;
}
