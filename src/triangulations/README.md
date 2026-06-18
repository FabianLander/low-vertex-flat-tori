# triangulations/ — the specific tori, as data

The **instances** to `topology/`'s machinery: the triangulations we actually
study, as raw triangle lists, mapped through `defineTriangulation` into working
`Triangulation`s. Same machinery↔instances split as `configuration/`↔`coordinates/`
and `functions/`↔`conditions/`. Depends only on `topology/`; the search/render
stack depends on this registry.

- `eightVertex.ts` — `EIGHT_VERTEX`: the seven combinatorial types of 8-vertex
  torus triangulation (V=8, E=24, F=16), as a census of `{ name, triangles }`.
  Types 1–6 from F. Lutz's Manifold Page; type 7 is Rich Schwartz's. To add a
  different vertex count, add a sibling census file (e.g. `nineVertex.ts`).
- `index.ts` — the registry: `ALL_TORI` (ordered by id 1..N), `byId(n)`, and
  `RICH = byId(7)` (the degree-6-regular type, the historical default). Maps each
  census entry through `defineTriangulation`, computing its canonical marking **on
  load** with `canonicalDecoration` (deterministic, ~0.1s per triangulation). No
  generated cache file — a much larger census would warrant precomputing instead.

**Adding a triangulation:** append a `{ name, triangles }` entry to the census.
That's it — the registry computes its marking on load, the builder derives all
combinatorics and validates V − E + F = 0; no count is hard-wired.

Pure: no three.js, no DOM.
