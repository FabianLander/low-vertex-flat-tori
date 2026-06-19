# triangulations/ — the specific tori, as data

The **instances** to `topology/`'s machinery: the triangulations we actually study,
as raw triangle lists, joined with their precomputed markings and built into working
`Triangulation`s. Same machinery↔instances split as `configuration/`↔`coordinates/`
and `functions/`↔`constraints/`. Depends only on `topology/`; the search/render stack
depends on this registry.

There are exactly **two stored things**, joined by id:

- `eightVertex.ts` — `EIGHT_VERTEX`: the seven combinatorial types of 8-vertex torus
  triangulation (V=8, E=24, F=16), as `TriangulationData` (`{ id, triangles, label? }`),
  ids `'v8-1'…'v8-7'`. Types 1–6 from F. Lutz's Manifold Page; `'v8-7'` is Rich
  Schwartz's. Pure combinatorics — hand-authored input. To add a different vertex count,
  add a sibling data file (e.g. `nineVertex.ts`).
- `markings.generated.ts` — `MARKINGS`: each triangulation's precomputed marking (the
  developing chart: loops + cut + develop order, in readable vertex/edge/face numbers),
  keyed by id. **GENERATED** by `npm run compute-markings` (a thin runner over the core
  `canonicalMarking`); committed; do not hand-edit. One file for all triangulations —
  the id prefixes (`'v8-'`, `'v9-'`, …) keep the keys distinct.
- `index.ts` — the registry: `ALL_TORI`, `byId('v8-7')`, and `RICH = byId('v8-7')` (the
  degree-6-regular type, the historical default). Joins each data entry with its marking
  from `MARKINGS` and builds it via `makeTriangulation`. Building is **cheap** — it loads
  the marking, it does not compute it — so the registry is a plain eager const array.

The marking is a deterministic function of the triangle list, so precomputing it is a
pure on-disk cache: build-time only (the generator), never recomputed at runtime. The
cheap combinatorics (edges, links, …) are still derived live by `makeTriangulation`.

**Adding a triangulation:** append a `{ id, triangles }` entry to a data file, run
`npm run compute-markings` to (re)generate the marking table, and add the data array to
`DATA` in `index.ts`. The builder derives all combinatorics and validates V − E + F = 0
(+ manifold edges, single-cycle links, coherent orientation); no count is hard-wired.

Pure: no three.js, no DOM.
