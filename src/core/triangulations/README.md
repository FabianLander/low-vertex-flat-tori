# triangulations/ — the specific tori, as data

The **instances** to `topology/`'s machinery: the triangulations we actually study,
as raw triangle lists, joined with their precomputed markings and built into working
`Triangulation`s. Same machinery↔instances split as `configuration/`↔`coordinates/`
and `functions/`↔`constraints/`. Depends only on `topology/`; the search/render stack
depends on this registry.

Two kinds of **stored thing**, paired per census by id — the combinatorics and the
precomputed markings, one file each per vertex count:

- `sevenVertex.ts` / `eightVertex.ts` / `nineVertex.ts` / `tenVertex.ts` — the
  combinatorics as `TriangulationData` (`{ id, triangles, label? }`), one file per vertex
  count, ids `'v7-1'`, `'v8-1'…'v8-7'`, `'v9-1'…'v9-112'`, `'v10-1'…'v10-2109'`. The
  7-vertex Möbius–Császár torus, the seven 8-vertex types (`'v8-7'` = Rich), and Lutz's 112
  nine-vertex and 2109 ten-vertex types. Pure combinatorics — hand-authored / imported
  input. To add a vertex count, add a sibling file.
- `<census>.markings.generated.ts` — `MARKINGS`: that census's precomputed markings (the
  developing chart: loops + cut + develop order, in readable vertex/edge/face numbers),
  keyed by id. **GENERATED** by `npm run compute-markings` (a thin runner over the core
  `canonicalMarking`); committed; do not hand-edit. One marking file per data file (1:1), so
  re-importing one census never churns the others.
- `index.ts` — the registry: `ALL_TORI`, `byId('v8-7')`, and `RICH = byId('v8-7')` (the
  degree-6-regular type, the historical default). `build(data, markings)` joins each census
  with its markings via `makeTriangulation`. Building is **cheap** — it loads the marking, it
  does not compute it — so the registry is a plain eager const array (all 2229 in ~0.3s).

The marking is a deterministic function of the triangle list, so precomputing it is a
pure on-disk cache: build-time only (the generator), never recomputed at runtime. The
cheap combinatorics (edges, links, …) are still derived live by `makeTriangulation`.

**Adding a triangulation:** append a `{ id, triangles }` entry to a data file (or add a new
vertex-count file), run `npm run compute-markings` to (re)generate the per-census marking
files, and add the `build(data, markings)` pair to `ALL_TORI` in `index.ts`. The builder
derives all combinatorics and validates V − E + F = 0 (+ manifold edges, single-cycle links,
coherent orientation); no count is hard-wired.

Pure: no three.js, no DOM.
