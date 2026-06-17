/**
 * Registry of the specific torus triangulations we study. Each census entry is
 * built into a `Triangulation` by `defineTriangulation`, with its saved marking
 * injected from the cache (`markings.generated.ts`). `ALL_TORI` is ordered by id (1..N).
 */

import { defineTriangulation, type Triangulation } from '../topology/triangulation';
import { EIGHT_VERTEX } from './eightVertex';
import { MARKINGS } from './markings.generated';

export const ALL_TORI: readonly Triangulation[] = EIGHT_VERTEX.map((t, i) =>
  defineTriangulation({ id: i + 1, name: t.name, triangles: t.triangles, ...MARKINGS[i + 1] }),
);

export function byId(id: number): Triangulation {
  const t = ALL_TORI.find((x) => x.id === id);
  if (!t) throw new Error(`no torus with id ${id}`);
  return t;
}

/** The degree-6-regular type (#7) — the historical default. */
export const RICH: Triangulation = byId(7);
