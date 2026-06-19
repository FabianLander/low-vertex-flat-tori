/**
 * Registry of the triangulations we study. Each entry is its stored data (`eightVertex.ts`)
 * joined with its precomputed marking (`markings.generated.ts`) and built into a
 * `Triangulation`. Building is CHEAP — it loads the marking, it does not compute it — so
 * the whole registry is a plain eager const array; `byId` looks up by stable id ('v8-7', …).
 *
 * To add triangulations: extend the data files, run `npm run compute-markings`, add the new
 * data array to `DATA` below.
 */

import { makeTriangulation, type Triangulation } from '@core/topology/triangulation.ts';
import { EIGHT_VERTEX } from './eightVertex.ts';
import { MARKINGS } from './markings.generated.ts';

const DATA = [...EIGHT_VERTEX];   // …add NINE_VERTEX here once it lands

export const ALL_TORI: readonly Triangulation[] = DATA.map((d) => {
  const marking = MARKINGS[d.id];
  if (!marking) throw new Error(`no precomputed marking for '${d.id}' — run \`npm run compute-markings\``);
  return makeTriangulation(d, marking);
});

export function byId(id: string): Triangulation {
  const t = ALL_TORI.find((x) => x.id === id);
  if (!t) throw new Error(`no triangulation '${id}'`);
  return t;
}

/** The degree-6-regular type (Rich) — the historical default. */
export const RICH: Triangulation = byId('v8-7');
