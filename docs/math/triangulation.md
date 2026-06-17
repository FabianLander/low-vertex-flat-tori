# Triangulation — the discrete topology

> A **triangulation** is the combinatorial object that realizes the torus. It is pure
> combinatorics — no metric, no coordinates, no decoration. Everything here is derived from a list
> of triangles and validated against the torus's topology.

## The mathematics

A triangulation of the torus is a simplicial complex whose underlying space is the genus-1
surface. Combinatorially it is a set of triangles glued edge-to-edge such that

1. **every edge is shared by exactly two triangles** (closed, no boundary),
2. **the triangles around each vertex form a single cycle** (each vertex has a disk neighborhood —
   its *link* is one closed loop), and
3. **the Euler characteristic vanishes:** `V − E + F = 0`.

For the **vertex-minimal** case `V = 8`, the counts are forced: each triangle has 3 edges and each
edge lies in 2 triangles, so `E = 3F/2`; with `V − E + F = 0` this gives `F = 16`, `E = 24`. There
are exactly **7 combinatorial types**. Six mix vertex degrees 5 and 7; only **type #7** is
**degree-6-regular** (every link a hexagon). Nothing downstream may assume degree 6.

Everything else is *derived* from the triangle list, with no choices:

| derived | meaning |
| --- | --- |
| **edges** | the unordered vertex pairs occurring in some triangle |
| **vertex links** | each vertex's neighbors in cyclic (CCW) order — a single cycle on a valid triangulation |
| **dual adjacency** (`edgeToTris`) | each edge ↦ the two triangles sharing it — the dual graph, used to cut and unfold |
| **degree sequence** | the sorted vertex degrees — a combinatorial fingerprint distinguishing the 7 types |
| **triangle-pair tables** | which pairs are disjoint / share a vertex — for the embedding test and energies |

The torus-ness is **checked, never assumed**: `defineTriangulation` validates `V − E + F = 0` and
that every link closes up. Drop in any triangle list, of any size, and it works.

A triangulation also carries two **decorations** — a [fundamental domain](fundamental-domain.md)
and a [marking](marking.md) — but those are not combinatorics; see their own documents.

## Machinery vs. instances

The split that keeps this scalable:

- **`src/topology/triangulation.ts`** — the **machinery**: the `Triangulation` type and the
  `defineTriangulation(spec)` builder. Generic; it knows nothing about *which* triangulations exist.
- **`src/triangulations/`** — the **instances**, as data. `eightVertex.ts` is a *census* (an array
  of `{ name, triangles }`); `index.ts` maps it through `defineTriangulation` to build `ALL_TORI`,
  `RICH = byId(7)`, `byId(n)`. Adding a triangulation is one census entry — there are no
  per-instance modules. A new vertex count is a sibling census file (`nineVertex.ts`, …).

`triangulations` depends on `topology`; never the reverse.

## In code

| symbol | file | role |
| --- | --- | --- |
| `Triangulation`, `TriangulationSpec` | `topology/triangulation.ts` | the type; the builder input |
| `defineTriangulation(spec)` | `topology/triangulation.ts` | derive & validate every field from `triangles` |
| `edgeKey(u,v)` / `edgeEnds(k)` | `topology/triangulation.ts` | pack/unpack an undirected edge into one integer — exact inverses, vertex-count-independent |
| `EIGHT_VERTEX` | `triangulations/eightVertex.ts` | the 7 V=8 lists (the census) |
| `ALL_TORI`, `RICH`, `byId(n)` | `triangulations/index.ts` | the registry |

A `Triangulation` carries **no metric and no bespoke per-instance data** — `#7` is just another
census entry. To *realize* it in ℝ³ (give it coordinates) is a **`PaperTorus`**
(`src/configuration/paperTorus.ts`), the extrinsic object the search moves around.

## Notes

- `src/topology` and `src/triangulations` are pure (no three.js, no DOM), so every algorithm runs
  headless. The triangulation knows nothing about rendering or embeddings.
- "8/24/16" appear nowhere as magic constants — they are consequences of `V − E + F = 0` that the
  builder re-derives, so a different vertex count drops in cleanly.
