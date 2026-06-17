# Fundamental domain — the developing chart

> To unfold a torus into the plane you must cut it open. A **fundamental domain** is the chart that
> says how: which edges to cut, and the order to lay the triangles down. It is a *presentation*
> choice — it does **not** affect the modulus τ — so we take the most compact one.

It is one of the two decorations on a [triangulation](triangulation.md):
`tri.fundamentalDomain = { cut, developOrder, attach }`. Pure combinatorics; no metric.

## The mathematics — the minimal cut

Cut the torus along a graph `C ⊆ edges` until the complement is a single disk, then lay it flat.
Each cut edge appears **twice** on the developed boundary, so

> exposed boundary edges = 2·|C|.

The *most compact* fundamental domain is therefore the one with the fewest cut edges — the
**minimum cut graph** that opens the torus to a disk. This is the minimum-cut-graph problem
(Erickson–Har-Peled): NP-hard in general, but at `E = 24` a direct search is cheap.

**Algorithm** (`exactMinCutDomain`). Enumerate candidate cut sets by increasing size `k = 2, 3, …`.
For each, develop the **glued complement** (the non-cut edges): BFS over the dual graph restricted
to non-cut edges, from triangle 0, placing each triangle coincident-edge against its already-placed
parent. The candidate is a valid fundamental domain iff

- **(a) connected** — the BFS reaches all `F` triangles, and
- **(b) a consistent disk** — every glued (non-cut) edge is **coincident** in the development within
  `ε`: the two copies of each shared edge land on the same segment ⟹ *no holonomy*.

The first valid candidate, at the smallest `k`, is the minimum — by construction. Exposed = `2k`.
For **all 7 combinatorial types** the minimum is `|cut| = 5`, **10 exposed edges**.

> *History.* Earlier attempts — a Dirichlet/Voronoi cell, a greedy single+pair-move compaction, and
> a shortest-homology-basis (Erickson–Whittlesey, a 2-approximation) — were each suboptimal on some
> type (greedy 12 on #5, shortest-loops 12 on #6). The exact min-cut is provably minimal and fast
> here (~70–120 ms/type); it is exponential in `E`, so a large triangulation would need a heuristic.

## The unroll order — a centered spiral

The cut fixes *which* lifted triangles tile the domain and *where* they sit (on a flat structure
all non-cut edges are coincident, so the domain's shape is order-independent). The order is then a
presentation choice — a good one reveals central triangles first.

**Algorithm** (`windingDevelop`). Root at the triangle nearest the domain centroid; then walk a
continuous CCW spiral outward — at each step take the frontier triangle next by polar angle, gluing
it onto an already-placed coincident neighbor. The result is a valid spanning-tree traversal of the
glued complement. It is the saved `developOrder` (and drives the `develop-winding` animation).

## The gluing tree (`attach`)

`attach[t] = { parent, u, v }`: triangle `t` glues onto an earlier triangle across the shared edge
`(u, v)`. Derived from `developOrder` + `cut` by `deriveAttach`, gluing **only along non-cut
edges** — the cut edges are boundary and are never glued. This is what makes the developed net the
compact minimal domain rather than an arbitrary spanning tree across it. It is layout-free, so it is
re-derived at construction rather than cached.

## In code

| symbol | file | role |
| --- | --- | --- |
| `exactMinCutDomain` | `topology/fundamentalDomain.ts` | the minimum cut + a positioned domain |
| `windingDevelop`, `windingNet` | `topology/fundamentalDomain.ts` | the centered-spiral order; the animation net |
| `deriveAttach` | `topology/triangulation.ts` | the gluing tree, respecting the cut |
| `FundamentalDomain` (`tri.fundamentalDomain`) | `topology/triangulation.ts` | `{ cut, developOrder, attach }` |

The cut is consumed by `develop.ts` (it glues only along non-cut edges) and by the [marking](marking.md)
(its generators are aligned to the cut). The harmonic flat structure (`harmonicLayout.ts`) used here
is a purely combinatorial gadget — see [developing.md](developing.md) and [marking.md](marking.md).
