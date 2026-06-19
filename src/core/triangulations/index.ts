/**
 * Registry of the triangulations we study. Each census's stored data (`*Vertex.ts`) is
 * joined with its precomputed markings (`*Vertex.markings.generated.ts`, 1:1 with the data
 * file) and built into `Triangulation`s. Building is CHEAP — it loads the marking, it does
 * not compute it — so the whole registry is a plain eager const array; `byId` looks up by
 * stable id ('v8-7', 'v9-047', …).
 *
 * To add triangulations: extend a data file (or add a new vertex-count file), run
 * `npm run compute-markings`, and add the (data, markings) pair to `ALL_TORI` below.
 */

import { makeTriangulation, type Triangulation, type Marking, type TriangulationData } from '@core/topology/triangulation.ts';
import { SEVEN_VERTEX } from './sevenVertex.ts';
import { EIGHT_VERTEX } from './eightVertex.ts';
import { NINE_VERTEX } from './nineVertex.ts';
import { TEN_VERTEX } from './tenVertex.ts';
import { MARKINGS as SEVEN_MARKINGS } from './sevenVertex.markings.generated.ts';
import { MARKINGS as EIGHT_MARKINGS } from './eightVertex.markings.generated.ts';
import { MARKINGS as NINE_MARKINGS } from './nineVertex.markings.generated.ts';
import { MARKINGS as TEN_MARKINGS } from './tenVertex.markings.generated.ts';

/** Join a census with its precomputed markings, building each entry into a `Triangulation`. */
function build(data: readonly TriangulationData[], markings: Record<string, Marking>): Triangulation[] {
  return data.map((d) => {
    const m = markings[d.id];
    if (!m) throw new Error(`no precomputed marking for '${d.id}' — run \`npm run compute-markings\``);
    return makeTriangulation(d, m);
  });
}

export const ALL_TORI: readonly Triangulation[] = [
  ...build(SEVEN_VERTEX, SEVEN_MARKINGS),
  ...build(EIGHT_VERTEX, EIGHT_MARKINGS),
  ...build(NINE_VERTEX, NINE_MARKINGS),
  ...build(TEN_VERTEX, TEN_MARKINGS),
];

export function byId(id: string): Triangulation {
  const t = ALL_TORI.find((x) => x.id === id);
  if (!t) throw new Error(`no triangulation '${id}'`);
  return t;
}

/** The degree-6-regular type (Rich) — the historical default. */
export const RICH: Triangulation = byId('v8-7');
