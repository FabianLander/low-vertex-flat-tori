# docs/math — the system, mathematically

How the code maps onto the mathematics. Each document describes one layer first **mathematically**,
then **how it is computed and stored in code**. The top-level [`README.md`](../../README.md) is the
overview; this folder is the depth.

The intrinsic flat torus, built up in order:

| layer | document | what it is | code |
| --- | --- | --- | --- |
| topology | — | the torus (genus 1). Not an object — the fact `V − E + F = 0`. | — |
| discrete topology | [triangulation.md](triangulation.md) | a combinatorial triangulation realizing the torus | `topology/triangulation.ts`, `triangulations/` |
| developing chart | [fundamental-domain.md](fundamental-domain.md) | how to cut it open and unroll it — the minimal cut + unroll order | `topology/fundamentalDomain.ts` |
| marking | [marking.md](marking.md) | a basis of `H₁(T²,ℤ)` — the two τ-generators | `topology/marking.ts` |
| measurement | [developing.md](developing.md) | the developing map: unfold → holonomy → τ ∈ ℍ (Teichmüller), and the `SL(2,ℤ)` quotient to moduli | `topology/develop.ts` |

Two structural lines run through all of it:

- **intrinsic vs. extrinsic.** Everything above is *intrinsic* — independent of any ℝ³ embedding.
  The realization in space (`PaperTorus`), the flatness/embeddedness checks, and the search live in
  `src/math/` (the extrinsic half). The developing map reads coordinates only to extract the
  intrinsic metric (edge lengths).
- **machinery vs. instances.** `src/topology/` is generic machinery — it works on *any*
  triangulation and depends on nothing. The specific triangulations we study are *data* in
  `src/triangulations/` (a census → a registry), which depends on `topology`, never the reverse.

A marking and a fundamental domain are both *decorations* of a triangulation, computed together by
one pass (`canonicalDecoration`) and stored as two fields (`tri.marking`, `tri.fundamentalDomain`).
The **cut** is their shared root: the fundamental domain owns it, the marking reads it. See the two
documents for why they are kept separate (one is presentation, the other is Teichmüller data).
