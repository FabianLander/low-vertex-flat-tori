# Triangulation — the discrete topology

> A **triangulation** is the combinatorial object that realizes the torus. It is pure
> combinatorics: no metric, no coordinates, no marking. Everything here is derived from a list
> of triangles and validated against the torus's topology.

## The mathematics

A triangulation of the torus is a simplicial complex whose underlying space is the genus-1
surface. Combinatorially it is a set of triangles glued edge-to-edge such that

1. **every edge is shared by exactly two triangles** (the surface is closed, no boundary),
2. **the triangles around each vertex form a single cycle** (each vertex has a disk neighborhood —
   its *link* is one closed loop), and
3. **the Euler characteristic vanishes:** `V − E + F = 0`.

For the **vertex-minimal** case, `V = 8`. The counts are then forced: each triangle has 3 edges
and each edge lies in 2 triangles, so `E = 3F/2`; with `V − E + F = 0` this gives `F = 16`,
`E = 24`. There are exactly **7 combinatorial types** of 8-vertex torus triangulation. Six of
them mix vertex degrees 5 and 7; only **type #7** (Rich Schwartz's) is **degree-6-regular** —
every vertex link is a hexagon — so it is the only one carrying an equilateral structure.
**Nothing downstream may assume degree 6.**

Everything else is *derived* from the triangle list, with no choices:

| derived | meaning |
| --- | --- |
| **edges** | the unordered vertex pairs occurring in some triangle (24 of them) |
| **vertex links** | for each vertex, its neighbors in cyclic (CCW) order — the boundary of its star; a single cycle on a valid triangulation |
| **dual adjacency** (`edgeToTris`) | each edge ↦ the two triangles sharing it — the dual graph, the "discrete topology" used to unfold and to cut |
| **degree sequence** | the sorted vertex degrees — a cheap combinatorial fingerprint that distinguishes the 7 types |
| **triangle-pair tables** | which triangle pairs are disjoint / share a vertex — for the embedding test and the repulsion energies |

The torus-ness is **checked, never assumed**: `defineTriangulation` validates `V − E + F = 0`
and that every vertex link closes up. Drop in any triangle list, of any size, and it works — the
pipeline is triangulation-generic.

## In code

| symbol | file | role |
| --- | --- | --- |
| `Triangulation` | `src/tori/triangulation.ts` | the combinatorial object — `triangles`, `edges`, `vertexLinks`, `degreeSequence`, `edgeToTris`, pair tables, plus its `marking` (see [marking.md](marking.md)) |
| `defineTriangulation(spec)` | `src/tori/triangulation.ts` | builds it from `{ triangles }` (+ optional `id`/`name`); derives & validates every field |
| `edgeKey(u,v)` / `edgeEnds(k)` | `src/tori/triangulation.ts` | pack/unpack an undirected edge into one integer (radix 2¹⁶) — exact inverses, vertex-count-independent |
| `TORUS_8V` | `tori.ts` (repo root) | the 7 raw triangle lists, vertices `0..7` |
| `ALL_TORI`, `RICH`, `byId(n)` | `src/tori/index.ts` | the registry; `RICH = byId(7)` is the degree-6 type |
| `torusN.ts` | `src/tori/` | wraps `TORUS_8V[n−1]` as `defineTriangulation({ id, name, triangles })` |

A `Triangulation` carries **no metric**. Two things sit on top of it:

- to *realize* it in ℝ³ (give it coordinates) is a **`PaperTorus`** (`src/math/embedding.ts`) — 8
  vertex positions, the object the discovery search moves around;
- to *decorate* it for unfolding and for measuring τ is a **`Marking`** — the next document,
  [marking.md](marking.md).

## Notes

- The split is deliberate: `src/tori/` and `src/math/` are pure (no three.js, no DOM), so every
  algorithm runs headless. The triangulation knows nothing about rendering or embeddings.
- "8/24/16" appear nowhere as magic constants — they are consequences of `V − E + F = 0` that the
  builder re-derives, so a different vertex count drops in cleanly.
