# Marking — decorating the topology

> A bare [triangulation](triangulation.md) has no preferred way to unfold and no way to measure
> its modulus. A **marking** supplies both: a compact **fundamental domain** (how to cut and
> unroll it) and a **basis of H₁** (the τ-generators). It is the decoration that turns discrete
> topology into something you can develop into the plane, and locate in Teichmüller space.

## The mathematics

The torus has first homology `H₁(T², ℤ) ≅ ℤ²`. A **marking** is, classically, a choice of basis
of `H₁` — and that is exactly what separates the two moduli pictures:

- **Teichmüller space** = *marked* flat structures. With a marking, the developing map gives a
  well-defined point **τ ∈ ℍ**.
- **moduli space** = the quotient by change-of-marking — the `SL(2,ℤ)` action on the basis.

So the marking is precisely the extra data that lifts moduli → Teichmüller, and `reduceModulus`
(in `develop.ts`) *is* that quotient. The developing map itself — unfolding, holonomy, τ — is its
own document *(planned: `developing.md`)*.

In this repo a marking on a triangulation is four pieces:

| field | what it is | role |
| --- | --- | --- |
| `cut` | edgeKeys of the minimal cut graph | the fundamental-domain **boundary** |
| `developOrder` | a permutation of the F triangles, root first | the **unroll** order |
| `generatorLoops` | two closed vertex walks γ₁, γ₂ | the **H₁ basis** (gives τ) |
| `attach` | parent + shared edge per triangle | the **gluing tree** (derived from `cut` + `developOrder`) |

`cut`, `developOrder`, `generatorLoops` are computed together (and cached); `attach` is re-derived
from them. The three computations are below.

---

## 1. The fundamental domain — the minimal cut (most efficient unrolling)

**Math.** To unfold the torus you cut it along a graph `C ⊆ edges` until the complement is a
single disk, which you lay flat. Each cut edge appears **twice** on the developed boundary, so

> exposed boundary edges = 2·|C|.

The *most compact* fundamental domain is therefore the one with the fewest cut edges — the
**minimum cut graph** that opens the torus to a disk. This is the minimum-cut-graph problem
(Erickson–Har-Peled): NP-hard in general, but at `E = 24` a direct search is cheap.

**Algorithm** (`exactMinCutDomain`, `src/math/exactDomain.ts`). Enumerate candidate cut sets by
increasing size `k = 2, 3, …`. For each candidate, develop the **glued complement** (the non-cut
edges): a BFS over the dual graph restricted to non-cut edges, from triangle 0, placing each
triangle coincident-edge against its already-placed parent. The candidate is a valid fundamental
domain iff

- **(a) connected** — the BFS reaches all `F` triangles (the non-cut edges keep the surface in one
  piece), and
- **(b) a consistent disk** — every glued (non-cut) edge is **coincident** in the development
  within `ε` (the two copies of each shared edge land on the same segment ⟹ *no holonomy*).

The first valid candidate, at the smallest `k`, is the minimum — by construction. Exposed = `2k`.

**Result.** For **all 7 combinatorial types** the minimum is `|cut| = 5`, **10 exposed edges**.

> *History.* Earlier attempts — a Dirichlet/Voronoi cell, a greedy single+pair-move compaction,
> and a shortest-homology-basis (Erickson–Whittlesey, a 2-approximation) — were each suboptimal on
> some type (greedy gave 12 on #5, shortest-loops 12 on #6). The exact min-cut is provably
> minimal and fast here (~70–120 ms/type), so it is the one kept. It is exponential in `E`; a
> large triangulation would need a heuristic or an ILP instead.

## 2. The unroll order — a centered spiral

**Math.** The cut fixes *which* lifted triangles tile the domain and *where* they sit (on a flat
structure all non-cut edges are coincident, so the domain's shape is independent of the traversal
order). The order is then a presentation choice — and a good one reveals central triangles first.

**Algorithm** (`windingDevelop`, `src/math/marking.ts`). Root at the triangle nearest the domain
centroid; then walk a continuous CCW spiral outward — at each step take the frontier triangle that
is next by polar angle, gluing it onto an already-placed coincident neighbor. The output is a
valid spanning-tree traversal of the glued complement; it is used both for the develop-winding
animation and as the saved `developOrder`.

## 3. The homology generators

**Math.** We need `γ₁, γ₂` to be a **unit-index** basis of `H₁(T², ℤ)`: the lattice they span must
be *all* of the period lattice `Λ`, not a sublattice. Equivalently the developed holonomies
`(v₁, v₂)` satisfy `|v₁ × v₂| = ` the intrinsic area (covolume = area).

**The flat structure it uses.** Selection is done on the **harmonic flat structure**
(`harmonicLayout`, `src/math/harmonicLayout.ts`): a discrete-harmonic
(Gortler–Gotsman–Thurston) embedding of the triangulation into a flat torus ℝ²/Λ, found by a
graph-Laplacian solve. It supplies a period basis `(V₁, V₂)` and an **integer cocycle**
`jump(i→j)` — the period jump of a directed edge in `(V₁, V₂)` coordinates. The homology class of
a closed loop is `Σ jump` over its edges, an **exact integer vector**.

**Algorithm** (`cutGenerators`, `src/math/marking.ts`). Cutting kills `H₁`, so the cut edges
generate it. Build a primal spanning tree of the vertices that **avoids the cut edges**. Each cut
edge `(u,v)`, closed by the tree path `v…u`, is a loop crossing the boundary — a nontrivial class.
Compute each loop's class `[n, m] = Σ jump`. Return the **first pair whose `|det| = 1`**:

> `|det([n₁,m₁],[n₂,m₂])| = 1`  ⟺  unimodular  ⟺  unit-index basis  ⟺  covolume = area.

If no unimodular pair exists (or the cut disconnects the 1-skeleton), fall back to a tree–cotree
(Eppstein) basis — `homologyGenerators` in `triangulation.ts` — which is always valid but not
cut-aligned.

**Why any valid basis is "correct."** Holonomy is a homomorphism `H₁ → ℝ²`, so *every* unit-index
basis yields the same τ up to the `SL(2,ℤ)` change-of-basis that `reduceModulus` quotients away.
The cut-aligned choice just makes the generators the short, natural boundary loops of the domain.

## 4. The gluing tree (`attach`)

`attach[t] = { parent, u, v }`: triangle `t` glues onto an earlier triangle `parent` across the
shared edge `(u, v)`. Derived from `developOrder` + `cut` by `deriveAttach`, gluing **only along
non-cut edges** — the cut edges are boundary and are never glued. This is what makes the developed
net the compact minimal domain instead of an arbitrary spanning tree across it. (Layout-free, so
it is re-derived at construction rather than cached.)

---

## Storage vs. computation

- **Stored on the object.** `triangulation.marking = { cut, developOrder, generatorLoops, attach }`
  is a plain field, built once when the triangulation is constructed. Read it as a field —
  `triangulation.marking.developOrder` — never a function call.
- **Cached on disk.** The *expensive* three — `cut`, `developOrder`, `generatorLoops` — need the
  harmonic layout and the min-cut search, so they are precomputed by **`canonicalMarking`**
  (`src/math/marking.ts`) and written to **`src/tori/markings.ts`** by `npm run compute-markings`.
  At construction `defineTriangulation` reads that cache and re-derives `attach`.
- **The cache is a pure optimization.** `canonicalMarking` is deterministic, so a saved marking is
  byte-identical to a recompute; for the 7 small types you could skip the cache and recompute
  (~100 ms each). It only matters once the min-cut search gets expensive. A triangulation with no
  saved entry falls back to a **layout-free** marking (BFS develop order + tree–cotree generators,
  no minimal cut), so the build always works even before `compute-markings` has run.

## In code

| symbol | file | role |
| --- | --- | --- |
| `Marking`, `buildMarking`, `deriveAttach` | `src/tori/triangulation.ts` | the type; attach the marking at construction (cache or fallback); derive the gluing tree |
| `canonicalMarking` | `src/math/marking.ts` | the expensive computation (harmonic + min-cut) → `{ cut, developOrder, generatorLoops }` |
| `cutGenerators`, `windingDevelop` | `src/math/marking.ts` | the generator selection and the centered-spiral order |
| `exactMinCutDomain` | `src/math/exactDomain.ts` | the minimum-cut fundamental domain |
| `harmonicLayout` | `src/math/harmonicLayout.ts` | the flat structure: `(V₁, V₂)` and the integer `jump` cocycle |
| `MARKINGS` (cache) + `compute-markings` | `src/tori/markings.ts`, `scripts/compute-markings.mjs` | the saved markings and the script that writes them |
| consumers | `src/math/develop.ts`, `src/math/tutteLayout.ts` | read `marking.developOrder` / `.attach` / `.generatorLoops` to unfold and to compute τ |
