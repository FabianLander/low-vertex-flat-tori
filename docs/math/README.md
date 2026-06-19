# docs/math — the system, mathematically

How the code maps onto the mathematics. Each document describes one layer first **mathematically**,
then **how it is computed and stored in code**. The top-level [`README.md`](../../README.md) is the
overview; this folder is the depth.

The **intrinsic** flat torus, built up in order:

| layer | document | what it is | code |
| --- | --- | --- | --- |
| topology | — | the torus (genus 1). Not an object — the fact `V − E + F = 0`. | — |
| discrete topology | [triangulation.md](triangulation.md) | a combinatorial triangulation realizing the torus | `topology/triangulation.ts`, `triangulations/` |
| developing chart | [fundamental-domain.md](fundamental-domain.md) | how to cut it open and unroll it — the minimal cut + unroll order | `topology/fundamentalDomain.ts` |
| marking | [marking.md](marking.md) | a basis of `H₁(T²,ℤ)` — the two τ-generators | `topology/marking.ts` |
| measurement | [developing.md](developing.md) | the developing map: unfold (frames) → holonomy → τ ∈ ℍ (Teichmüller), and the `SL(2,ℤ)` quotient to moduli | `moduli/develop.ts`, `moduli/modulus.ts`, `moduli/reduce.ts` |

The **extrinsic** half — realizing a flat torus in ℝ³ and *searching* for flat embedded ones. This
is the **search system**: find points on a high-codimension submanifold that also lie inside a tiny
open set.

| layer | document | what it is | code |
| --- | --- | --- | --- |
| kernels | — | torus-blind ℝ²/ℝ³ primitives (distances, the intersection chord + predicates) | `geometry/` |
| functions | [conditions.md](conditions.md) | the differentiable-map **toolkit** — the `Fn`/`ScalarFn`/`Embedding` contracts + the compose algebra (machinery, no instances) | `functions/` |
| configuration | [configuration-space.md](configuration-space.md) | the `ConfigSpace = (T, φ)` spine — `pull`/`push`/`coords`, the metric, interior vs boundary | `configuration/` |
| coordinates | [configuration-space.md](configuration-space.md) | the coordinate systems — `Embedding`s φ → a `ConfigSpace` (full, pin, symmetry, Doyle–Schwartz) | `coordinates/` |
| conditions | [conditions.md](conditions.md) | what we ask of a config — the closed `{g=0}` kind in `constraints/` (driven hard, or softened to an energy via `leastSquares`); the open kind (the `isEmbedded` gate) in `embedding/` | `constraints/`, `embedding/` |
| operations | [solvers.md](solvers.md) | project / flow / march — all from the held Jacobian, run on ℝⁿ — and `certify` | `solvers/`, `search/certify.ts` |
| sampling | [searches.md](searches.md) | producing seeds: rng, perturb, random + deterministic grid sources | `sampling/` |
| searches | [searches.md](searches.md) | what each search *does* in C — the flat manifold, the modulus foliation, the embedded region; solving *for* a modulus vs *marching* to it | `search/` |

Two structural lines run through all of it:

- **intrinsic vs. extrinsic.** The topology half is *intrinsic* — independent of any ℝ³ embedding.
  The extrinsic half — the realization in space, the flatness/embeddedness maps, and the search — is
  the dependency-ordered stack `geometry/ → functions/ → {configuration, coordinates, conditions} →
  solvers/ → sampling/ → search/` (these folders now all live under `src/core/`). Both halves rest on
  `geometry/`, the pure ℝ²/ℝ³ metric floor: the
  developing map reads coordinates only to extract the intrinsic metric (edge lengths), and its planar
  net is built from `geometry`'s `Vec2`. So `geometry/` is the single bottom — `topology/` depends on
  it and nothing else.
- **machinery vs. instances.** Three places apply this split, all as flat sibling folders (never
  nested): `topology/` ↔ `triangulations/` (the 7 as data); `functions/` (the generic
  differentiable-map toolkit) ↔ `constraints/`+`embedding/` (the concrete maps + their uses); and `configuration/`
  (the `ConfigSpace` machinery) ↔ `coordinates/` (the coordinate-system instances). Machinery depends
  on nothing problem-specific; instances depend on the machinery, never the reverse.

A marking and a fundamental domain are both *decorations* of a triangulation, computed together by
one pass (`canonicalDecoration`) and stored as two fields (`tri.marking`, `tri.fundamentalDomain`).
The **cut** is their shared root: the fundamental domain owns it, the marking reads it. See the two
documents for why they are kept separate (one is presentation, the other is Teichmüller data).
