# Drawing the 8-vertex flat tori — how it's computed

This explains how we take the **7 combinatorial types** of 8-vertex torus triangulation and
draw each one "developed into the plane" as a lattice patch, including the parts that are
not obvious (why only one of them is equilateral, what the period jumps are, and what
"whitening" does). It documents the code in `src/tori/` and `src/math/{harmonicLayout,tutteLayout}.ts`
and the demos `tori-grid` and `tutte-gallery`.

---

## 1. The objects: 7 triangulated tori on 8 vertices

A triangulation of the torus with `V = 8` vertices has, by Euler's formula
(`V − E + F = 0`) together with `3F = 2E` (every triangle has 3 edges, every edge in 2
triangles):

```
E = 24,  F = 16.
```

Up to relabeling there are exactly **7** such triangulations. They live in
[`tori.ts`](../tori.ts) as `TORUS_8V` (from F. Lutz's *Manifold Page* enumeration), each a
list of 16 oriented triangles `[a,b,c]`.

### Degree sequences — the key fact

The **degree** of a vertex is how many edges meet it. Summing degrees counts each edge
twice, so the degrees sum to `2E = 48`, averaging `48/8 = 6`. But only **one** of the seven
types has *every* vertex at degree exactly 6:

| Torus | degree sequence            | all 6? |
|------:|----------------------------|:------:|
| #1    | 3,6,6,6,6,7,7,7            | ✗ |
| #2    | 4,5,5,6,7,7,7,7            | ✗ |
| #3    | 4,6,6,6,6,6,7,7            | ✗ |
| #4    | 5,5,6,6,6,6,7,7            | ✗ |
| #5    | 5,5,5,6,6,7,7,7            | ✗ |
| #6    | 5,5,6,6,6,6,7,7            | ✗ |
| **#7**| **6,6,6,6,6,6,6,6**       | **✓** |

#7 is Rich Schwartz's torus. This single fact drives everything below.

### Why it matters: equilateral ⟺ degree 6

The regular **triangular lattice** in the plane (equilateral triangles) has every vertex
surrounded by exactly 6 triangles — degree 6. So a torus can be drawn with all-equilateral
triangles **iff** it is degree-6-regular. Degree-5 vertices are "too pointy" (cone of 5
equilateral triangles = 300° < 360°) and degree-7 "too flat" (420° > 360°) — they are
combinatorial curvature defects incompatible with the flat equilateral lattice.

So the old equilateral picture ([`latticeLayout.ts`](../src/math/latticeLayout.ts)) only ever
worked for #7. For all 7 we need a method that tolerates degree 5/7. That method is the
**harmonic embedding** (§4). (All seven are still genuine *flat* tori — their flat metric
just uses non-equilateral triangles whose angles still sum to 360° at each vertex.)

---

## 2. The `Torus` descriptor

Previously the code hard-wired one triangulation as a global constant. Now each torus is a
value built by [`defineTorus`](../src/tori/defineTorus.ts) from a small **authored spec**:

```ts
{ id, name, triangles, developOrder, generatorLoops, /* optional: referenceCoords, lattice */ }
```

and `defineTorus` derives everything else once: `edges` (24), `vertexLinks` (the cyclic
neighbor ring of each vertex — degree-generic, no "==6" assumption), `edgeToTris` (dual
adjacency), `degreeSequence`, and the unfolding tree `attach`. The seven are registered in
[`src/tori/index.ts`](../src/tori/index.ts) as `ALL_TORI`, with `RICH = torus7`.

Two pieces are genuine **choices**, authored per torus:

- **`developOrder`** — the order to unfold the 16 triangles (a spanning tree of the dual
  graph). Used by the metric developing map and the step-through animation.
- **`generatorLoops`** — two closed edge-loops that generate the first homology `H₁(T²)=ℤ²`
  (the two independent "ways around" the torus).

For #1–#6 these currently hold valid **auto-derived** placeholders
(`autoDevelopOrder`, `homologyGenerators`); you replace them by hand after viewing the
diagrams.

---

## 3. Two ways to draw it

There are two planar pictures, both implemented:

- **`tutteLayout`** (demo `tutte-gallery`) — cut the torus open along a spanning tree's
  complement into a single **fundamental polygon** (an 18-gon), the whole surface flattened
  onto one convex polygon, with the 9 cut edges paired on the boundary. Faithful but not
  lattice-like (every vertex ends up on the boundary).
- **`harmonicLayout`** (demo `tori-grid`) — the **lattice patch**: place the vertices in the
  plane so the triangulation tiles periodically, like a patch of wallpaper. This is the
  generalization of the equilateral picture and is the main method. The rest of this doc is
  about it.

---

## 4. The harmonic lattice patch — `harmonicLayout.ts`

Goal: assign each vertex `i` a point `xᵢ ∈ ℝ²` and a period lattice `Λ = ⟨V₁, V₂⟩` so that
the triangulation, repeated by `Λ`, tiles the plane with no overlaps. This is a **harmonic
(Tutte) embedding of a torus**.

### 4a. The harmonic condition

A drawing where **every vertex sits at the average of its neighbors** has no folds — this is
Tutte's spring/barycentric embedding. On a disk you pin the boundary and average the
interior. A torus has no boundary, so instead we use periodicity: the "average of neighbors"
must account for neighbors that live in an adjacent copy of the tile.

### 4b. Period jumps: a vertex can be its own neighbor "one tile over"

When you walk along an edge that wraps around the torus, you land in a neighboring copy of
the fundamental domain — offset by a lattice vector. We encode this with a **period jump**
`P(i→j) ∈ Λ` for each directed edge: the lattice offset you pick up traversing `i→j`. Most
edges have jump `0`; only edges crossing the "seams" of the torus jump by `±V₁` or `±V₂`.

The jumps are computed combinatorially, independent of any geometry:

1. **Tree–cotree decomposition** (`treeCotree`): grow a spanning tree `T` of the vertex graph
   (7 edges), then a spanning tree of the *dual* graph using only non-`T` edges (15 edges).
   That uses `7 + 15 = 22` of the 24 edges; the **2 leftover edges `g₁, g₂` are exactly a
   basis of `H₁`** — the two independent loops around the torus.
2. **Integer cocycles** (`cocycle`): we build two integer-valued functions on directed edges,
   `α` and `β`, each summing to zero around every triangle (a *cocycle* / discrete closed
   1-form), normalized so `α` counts crossings of `g₁` and `β` counts crossings of `g₂`. Then

   ```
   P(i→j) = α(i→j)·V₁ + β(i→j)·V₂.
   ```

   Concretely we set `α = 0` on the tree, `α(g₁)=1, α(g₂)=0`, and solve the
   "sum-around-each-triangle = 0" linear system for the rest (and symmetrically for `β`). The
   result is integer and exact.

### 4c. Solve the harmonic system

Fix a provisional basis (`V₁=(1,0)`, `V₂=(½,√3⁄2)` — a 60° rhombus) and solve, per
coordinate, the **graph-Laplacian** system that says "each vertex = neighbor average,
counting period jumps":

```
for every vertex i:   Σ_j ( x_j + P(i→j) − x_i ) = 0
```

i.e. `L x = b`, where `L` is the graph Laplacian and `b` collects the period jumps. Pin one
vertex to the origin to remove the translation ambiguity and solve (an 8×8 dense solve).
Positive edge weights guarantee a **flip-free** embedding (no inverted triangles) — we verify
all 16 triangles come out the same orientation.

At this point #7 already develops as a *perfect* lattice. Reading off its 24 edge vectors:

```
8 edges at 40.9°   length 0.331
8 edges at 90.0°   length 0.433
8 edges at 139.1°  length 0.331
```

Exactly three directions, eight edges each — a triangular lattice — but **sheared**: the
directions are 49° apart instead of 60°, because we picked `V₁, V₂` arbitrarily. That shear is
what whitening removes.

### 4d. Whitening — removing the arbitrary global shear

Because the basis `V₁, V₂` was an arbitrary choice, the whole picture is globally
stretched/sheared. **Whitening** is a standard linear-algebra normalization that undoes it:

1. Form the **covariance matrix** of all the edge vectors,
   `C = Σ_e e eᵀ` (a symmetric 2×2 matrix describing the average length-and-direction, i.e.
   the "stretch ellipse" of the drawing).
2. Apply the linear map `C^{−1/2}` to every point. This is the unique transform making the
   edge covariance the **identity** — equal in all directions (*isotropic*). The name comes
   from signal processing: a "white" signal has identity covariance, equal power in every
   direction.

Geometrically it detects the average stretch baked into the arbitrary basis and cancels it,
so the **average triangle becomes as round/equilateral as possible**. Because #7 is
vertex-transitive (all triangles equivalent), "average equilateral" forces *every* triangle
equilateral — whitening recovers the exact triangular lattice (measured edge-length ratio
`1.000`). The other six keep ratios `1.4–2.1`: whitening strips their arbitrary shear too, but
they *cannot* be equilateral, so a genuine residual distortion remains. We also flip the
`y`-axis if the triangles came out clockwise, so all seven share one orientation.

> Implementation note: `C^{−1/2}` is built from the 2×2 symmetric eigendecomposition. The one
> subtlety (and an earlier bug) is pairing each eigenvector with **its own** eigenvalue —
> when `C` happens to be diagonal, the axes and eigenvalues must not be mismatched, or
> whitening *adds* distortion instead of removing it.

### 4e. Tiling

`periodicTiles(layout, window)` returns the 16 base triangles translated by integer
combinations `n·V₁ + m·V₂` whose centroid lands in a window — the universal-cover patch. The
`tori-grid` demo draws one fundamental domain solid with a thin ring of these neighbor copies
around it.

---

## 5. Correctness checks

`src/tori/tori.test.ts` runs over all seven (42 assertions), all metric-free:

- `V=8, E=24, F=16`, Euler `χ = 0`;
- the degree sequence matches the table in §1 (guards against a corrupt triangulation);
- every vertex link is a single cycle of length = its degree;
- `developOrder` is a permutation of `0..15` forming a valid spanning tree;
- **the two generator loops are a unit-index `H₁` basis** — checked over `GF(2)`: each loop's
  edge-vector is not a boundary (sum of triangles), and neither is their sum, so they are
  independent in `H₁(T²;ℤ/2)`;
- the `tutteLayout` cut-polygon is a non-degenerate triangulated 18-gon.

The harmonic embedding additionally verifies flip-free orientation and (for #7) edge-length
ratio `1.000`.

---

## 6. Where things live

| What | File |
|------|------|
| Raw 7 triangulations | [`tori.ts`](../tori.ts) |
| `Torus` type + builder + auto-derivations | [`src/tori/defineTorus.ts`](../src/tori/defineTorus.ts) |
| Per-torus specs + registry | `src/tori/torus{1..7}.ts`, [`index.ts`](../src/tori/index.ts) |
| Harmonic lattice patch | [`src/math/harmonicLayout.ts`](../src/math/harmonicLayout.ts) |
| Cut-polygon (fundamental polygon) | [`src/math/tutteLayout.ts`](../src/math/tutteLayout.ts) |
| Equilateral renderer (#7 only) | [`src/math/latticeLayout.ts`](../src/math/latticeLayout.ts) |
| Metric developing map → modulus τ | [`src/math/develop.ts`](../src/math/develop.ts) |
| Grid of all 7 | `demos/tori-grid` — `npm run dev tori-grid` |
| Per-torus step-through | `demos/tutte-gallery` — `npm run dev tutte-gallery` |
| Invariant tests | `src/tori/tori.test.ts` |
