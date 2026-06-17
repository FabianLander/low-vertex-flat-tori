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
| measurement | [developing.md](developing.md) | the developing map: unfold → holonomy → τ ∈ ℍ (Teichmüller), and the `SL(2,ℤ)` quotient to moduli | `topology/develop.ts` |

The **extrinsic** half — realizing a flat torus in ℝ³ and *searching* for flat embedded ones. This
is the **search system**: find points on a high-codimension submanifold that also lie inside a tiny
open set.

| layer | document | what it is | code |
| --- | --- | --- | --- |
| kernels | — | torus-blind ℝ²/ℝ³ primitives (distances, the intersection chord) the conditions are built from | `geometry/` |
| functions | [conditions.md](conditions.md) | the differentiable maps C → ℝᵏ (`Fn`) — one concept; a constraint/energy is a *use* of one | `functions/` |
| configuration | [configuration.md](configuration.md) | the search space `C = ℝ³ⱽ`, the gauge, and charts ι: X → C (subspaces) | `configuration/` |
| conditions | [conditions.md](conditions.md) | what we ask of a config — closed **submanifolds** `{g=0}` and open **regions** | `submanifolds/`, `regions/` |
| operations | [solvers.md](solvers.md) | project / flow / march — all from the held Jacobian — and `certify` | `solvers/`, `search/certify.ts` |

Two structural lines run through all of it:

- **intrinsic vs. extrinsic.** The topology half is *intrinsic* — independent of any ℝ³ embedding.
  The extrinsic half — the realization in space, the flatness/embeddedness maps, and the search — is
  the dependency-ordered stack `geometry/ → functions/ → {configuration, submanifolds, regions} →
  solvers/ → search/`. (`PaperTorus` and a few primitives still sit in `src/math/`, being drained
  into that stack.) The developing map reads coordinates only to extract the intrinsic metric (edge
  lengths).
- **machinery vs. instances.** `src/topology/` is generic machinery — it works on *any*
  triangulation and depends on nothing. The specific triangulations we study are *data* in
  `src/triangulations/` (a census → a registry), which depends on `topology`, never the reverse.

A marking and a fundamental domain are both *decorations* of a triangulation, computed together by
one pass (`canonicalDecoration`) and stored as two fields (`tri.marking`, `tri.fundamentalDomain`).
The **cut** is their shared root: the fundamental domain owns it, the marking reads it. See the two
documents for why they are kept separate (one is presentation, the other is Teichmüller data).
