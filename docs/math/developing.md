# Developing map — from a flat torus to its modulus

> Given a flat realization of a [triangulation](triangulation.md), unfold it into the plane and read
> off its **modulus τ ∈ ℍ** — its point in Teichmüller space. Forgetting the
> [marking](marking.md) projects to moduli space. This is `moduli/develop.ts`.

## The mathematics

Because every vertex has cone angle exactly 2π, the intrinsic metric has no cone points: the surface
is a smooth flat torus ℝ²/Λ. The **developing map** unfolds the universal cover into ℝ²; by flatness
the deck group is a group of pure **translations**, and the two generators of `π₁(T²) = ℤ²` map to a
basis `(v₁, v₂)` of the period lattice `Λ`. Then

> **τ = v₂ / v₁**   (as complex numbers),   `Im τ > 0`.

Only the **intrinsic** data enters — the edge lengths (hence the angles). The ℝ³ coordinates appear
only through them, so two different embeddings of the same flat torus give the **same** τ.

## Unfolding (`developNet`)

Lay the root triangle in the plane, then glue each later triangle (in the fundamental domain's
`developOrder`) onto its `attach` parent across the shared edge, by circle–circle intersection
against the parent's already-placed edge. The non-tree shared edges become the **boundary
identifications** (`cutEdges`): each carries the translation taking one developed copy onto the
other (its holonomy), plus a **rotational defect** — the angle between the two copies, which is `≈ 0`
exactly when the gluing is a pure translation (a flatness check).

## The modulus (`modulus`)

The holonomy of a closed loop is the sum of its developed edge vectors — well-defined because, on a
flat torus, holonomy is a homomorphism `H₁ → ℝ²`. So:

1. `v₁, v₂ = ` the holonomies of the two `marking.generatorLoops` (`loopHolonomy`).
2. orient so `Im τ > 0`; `τ = v₂/v₁`.
3. report alongside two diagnostics: `rotDefect` (max over the boundary — flatness) and `covolume =
   |v₁ × v₂|`, which equals the intrinsic `area` exactly when the generators are a unit-index basis.

Because holonomy is `H₁`-invariant, τ does **not** depend on the fundamental domain (the unfold
order) — only on the marking. Changing the marking changes τ by the corresponding `SL(2,ℤ)` element.

## Teichmüller → moduli (`reduceModulus`)

`reduceModulus` brings τ into the standard fundamental domain `{ |Re τ| ≤ ½, |τ| ≥ 1 }` of
`SL(2,ℤ)\ℍ`, using the generators `T: τ↦τ+1` and `S: τ↦−1/τ`. This **is** the projection from
Teichmüller space (marked) to moduli space (unmarked) — it quotients out the choice of marking.
`reduceModulusWithMatrix` also returns the `SL(2,ℤ)` element realizing the reduction (useful as a
*frozen* matrix, so `Re/Im` of the reduced τ is a smooth function of positions for constrained
searches).

## In code

| symbol | file | role |
| --- | --- | --- |
| `developNet` | `moduli/develop.ts` | unfold along the fundamental domain → planar corners + boundary identifications |
| `modulus` → `{ v1, v2, tau, area, covolume, rotDefect }` | `moduli/develop.ts` | the Teichmüller point + flatness/unit-index diagnostics |
| `totalArea` | `moduli/develop.ts` | intrinsic area Σ½‖(b−a)×(c−a)‖ (= covolume for a unit-index basis) |
| `reduceModulus`, `reduceModulusWithMatrix`, `applyMobius` | `moduli/develop.ts` | the moduli reduction (and its `SL(2,ℤ)` element) |

`modulus` reads `tri.marking` (the generators) and develops via `tri.fundamentalDomain`; it takes
raw coordinates (`ArrayLike<number>`), never a `PaperTorus` — so `topology` stays independent of the
extrinsic side. The flat embedded tori the search produces are exactly the realizations whose τ this
reads.
