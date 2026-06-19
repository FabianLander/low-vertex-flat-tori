/**
 * Registry of the specific torus triangulations we study. Each census entry is
 * built into a `Triangulation` by `defineTriangulation`, with its canonical marking
 * computed ON LOAD by `canonicalDecoration` (the deterministic minimal-cut pass).
 * `ALL_TORI` is ordered by id (1..N).
 *
 * For the 8-vertex census the marking derivation is ~0.1s each (the exact min-cut
 * search), so computing it eagerly here is fine. A much larger census would want it
 * precomputed and cached instead — build that system then; until it's needed, this
 * keeps a single source of truth (no generated file, no regeneration step).
 */

import { defineTriangulation, type Triangulation } from '@core/topology/triangulation.ts';
import { canonicalDecoration } from '@core/topology/marking.ts';
import { EIGHT_VERTEX } from './eightVertex.ts';

export const ALL_TORI: readonly Triangulation[] = EIGHT_VERTEX.map((t, i) => {
  const id = i + 1;
  // Derive the canonical marking from the triangle list, then rebuild with it.
  // (canonicalDecoration needs the combinatorics, which the first build provides;
  // the rebuild re-derives them cheaply and uses the supplied marking directly.)
  const base = defineTriangulation({ id, name: t.name, triangles: t.triangles });
  return defineTriangulation({ id, name: t.name, triangles: t.triangles, ...canonicalDecoration(base) });
});

export function byId(id: number): Triangulation {
  const t = ALL_TORI.find((x) => x.id === id);
  if (!t) throw new Error(`no torus with id ${id}`);
  return t;
}

/** The degree-6-regular type (#7) — the historical default. */
export const RICH: Triangulation = byId(7);
