# Marking — the H₁ basis

> A **marking** is a basis of `H₁(T²,ℤ)` — two oriented vertex loops `γ₁, γ₂`. It is the second
> decoration on a [triangulation](triangulation.md): `tri.marking = { generatorLoops }`. This is the
> Teichmüller marking — the data that lifts a flat torus from moduli space to a *point* in
> Teichmüller space.

## The mathematics

The torus has `H₁(T²,ℤ) ≅ ℤ²`, and a marking is a choice of basis. That choice is exactly what
separates the two moduli pictures:

- **Teichmüller space** = *marked* flat structures. With a marking, the [developing
  map](developing.md) gives a well-defined point **τ ∈ ℍ**.
- **moduli space** = the quotient by change-of-marking — the `SL(2,ℤ)` action on the basis.

So the marking is the extra data, and `reduceModulus` *is* that quotient. Note the division of
labor with the [fundamental domain](fundamental-domain.md): the fundamental domain is *presentation*
(it does not affect τ); the marking is *Teichmüller data* (it picks which τ representative you read).

We need `γ₁, γ₂` to be a **unit-index** basis: the lattice they span must be *all* of the period
lattice `Λ`, not a sublattice. Equivalently the developed holonomies satisfy `|v₁ × v₂| = ` the
intrinsic area (covolume = area).

## How the generators are chosen

We take the generators **aligned to the cut** of the fundamental domain — the short, natural loops
crossing the domain boundary.

**The combinatorial gadget it uses.** Selection runs on the **harmonic flat structure**
(`harmonicLayout`): a uniform-weight discrete-harmonic (Gortler–Gotsman–Thurston) embedding of the
triangulation into a flat torus ℝ²/Λ, from a graph-Laplacian solve. *It takes no metric input* — its
real output is the **integer period-jump cocycle** `jump(i→j)` (the ℤ-cohomology data dual to `H₁`).
A closed loop's homology class in the `(V₁,V₂)` basis is `Σ jump` over its edges — an exact integer
vector.

**Algorithm** (`cutGenerators`). Cutting kills `H₁`, so the cut edges generate it. Build a primal
spanning tree of the vertices that **avoids the cut edges**. Each cut edge `(u,v)`, closed by the
tree path `v…u`, is a loop crossing the boundary — a nontrivial class. Compute each loop's class
`[n,m] = Σ jump`, and return the **first pair whose `|det| = 1`**:

> `|det([n₁,m₁],[n₂,m₂])| = 1`  ⟺  unimodular  ⟺  unit-index basis  ⟺  covolume = area.

If no unimodular pair exists (or the cut disconnects the 1-skeleton), fall back to a tree–cotree
(Eppstein) basis — `homologyGenerators` — which is always valid but not cut-aligned.

**Why any valid basis is "correct."** Holonomy is a homomorphism `H₁ → ℝ²`, so *every* unit-index
basis yields the same τ up to the `SL(2,ℤ)` change-of-basis that `reduceModulus` quotients away. The
cut-aligned choice just makes the generators the short boundary loops of the domain.

## Storage vs. computation

The marking and the fundamental domain are computed together — one pass, `canonicalDecoration`,
because they share the cut:

```
harmonicLayout → exactMinCutDomain → CUT ─┬→ windingDevelop → developOrder   (fundamental domain)
                                          └→ cutGenerators  → generatorLoops (marking)
```

The expensive part (the min-cut) makes the result worth **caching**: `canonicalDecoration` returns
the savable triple `{ cut, developOrder, generatorLoops }` (the `SavedMarking` shape), written by
`npm run compute-markings` to `triangulations/markings.generated.ts`. The registry injects it into
`defineTriangulation` via the spec; `attach` is re-derived (layout-free) at construction. The
computation is deterministic, so the cache is a pure optimization — a triangulation with no saved
entry falls back to a layout-free marking, so the build always works.

## In code

| symbol | file | role |
| --- | --- | --- |
| `Marking` (`tri.marking`) | `topology/triangulation.ts` | `{ generatorLoops }` |
| `cutGenerators` | `topology/marking.ts` | the cut-aligned generator selection |
| `canonicalDecoration`, `SavedMarking` | `topology/marking.ts` | the shared compute pass; the cache shape |
| `harmonicLayout` (`jump`) | `topology/harmonicLayout.ts` | the integer period-jump cocycle |
| `MARKINGS` | `triangulations/markings.generated.ts` | the saved cache |
