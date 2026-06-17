# Plan: triangulation-agnostic system — add & search any triangulation, no embedding required

> **Status: proposed** — approved design, not yet implemented.

## Context

We want to **add any triangulation and immediately set it up for search problems — without
knowing a flat embedding first** (and, later, triangulations of other vertex counts, still
genus-1 tori). An audit shows the codebase is **already ~90% there**: every core routine
threads a `Torus` and sizes buffers from `torus.vertexCount` / `torus.triangles` (confirmed
generic: `angles`, `newton`, `embedding`, `embedded`, `embeddedFlow`, `energies/*`, `mesh/*`,
`io/embeddings`, and every sampling script). Types 1–6 already prove it — they carry only
auto-derived markings, no reference embedding, and are searched from random seeds via
`sample-flat --seed-mode uniform`. The remaining work is to make that an **explicit contract**,
**remove the one place a specific embedding is baked onto the combinatorial object** (type-7's
`referenceCoords`), unify the scattered entry path, and generalize off the hardcoded `8`.

## Design tenet (locked)

**An embedding is data, never a prerequisite.** A triangulation is purely combinatorial; its
flat embeddings are outputs of search — you may have zero, one, or hundreds of thousands, and
nothing in the system (registry, core math, search) may require that any exist or single one out
as a privileged "reference." A never-embedded triangulation is fully first-class.

- **To ADD a triangulation:** a coherently-oriented `triangles` list + `id` + `name`. Optionally
  hand-author `developOrder` and the generator marking (`generatorLoops`) for a nicer net / a
  deliberate τ basis — both auto-derive otherwise. **Nothing geometric.** `defineTorus` validates
  genus-1 (`χ=0` **and** exactly 2 generators) and derives all structure.
- **To SEARCH it (no embedding needed):** synthetic seeds — random configs (`--seed-mode uniform`)
  or any formula/ansatz — feed the existing `newtonFlatten → embeddedFlow → verify` pipeline
  (already triangulation-generic). Found embeddings are written as data; none is required to start.

## Change 1 — Entry path: one declaration per triangulation, derived registry

Replace the three scattered touch-points (`tori.ts` raw lists + `torus1..7.ts` wrappers +
hand-edited `index.ts`) with **a single declarations array** of purely combinatorial specs:

```ts
// src/tori/registry.ts — the one source of truth
export const ALL_TORI = [
  defineTorus({ id: 1, name: 'type1', triangles: [[0,1,2], …] }),
  …
  defineTorus({ id: 7, name: 'type7 (Rich)', triangles: RICH_TRIANGLES /* + optional markings */ }),
];
```
- Each triangulation's triangle list lives inline; `developOrder`/`generatorLoops` stay optional
  (auto-derived). **Adding a triangulation of any vertex count = append one `defineTorus({ id,
  name, triangles })`.** Nothing else, nothing geometric.
- `src/tori/index.ts` derives the public surface from `ALL_TORI`: `byId`, `byVertexCount(n)`, and
  named re-exports for back-compat. (`RICH = byId(7)` stays as a convenience handle, not a
  privileged object.)
- **Delete** `tori.ts` (root) and `src/tori/torus1.ts … torus7.ts`; repoint importers of
  `TORUS_8V` / `VERTEX_COUNT` (grep: a few tests + `docs/drawing-tori.md`).
- Headless-safe: plain imports, no Vite `import.meta.glob` (scripts/tests run under `tsx`/node).

## Change 2 — Embeddings are data, not triangulation fields (the tenet, made concrete)

- **Strike `referenceCoords` from `Torus` / `TorusSpec`.** A 3D embedding is not triangulation
  data. (`symmetryPairing` and `lattice` stay as optional *combinatorial* metadata — they're
  derivable in principle; out of scope to auto-derive now, but they don't violate the tenet.)
- **Rich's 24 numbers become plain data** in `src/tori/rich-data.ts` as `RICH_COORDS` (and the
  triangle list / lattice / symmetry it already needs) — *not* attached to the torus.
- **Remove the core `RICH_REFERENCE` constant / `src/math/reference.ts`** as a load-bearing
  concept. The ~7 tests + the renders that want Rich's torus build a `PaperTorus` from
  `RICH_COORDS` as a **fixture/data**, like any other embedding row. The system never imports it.
- **`energies/distanceFromRich.ts` → `distanceFromTarget(targetPositions)`** (parameterized by a
  passed embedding), or drop it. `sample-flat`'s `'rich'` seed becomes "seed from a given file/cloud."

## Change 3 — `normalize.ts`: vertex-count-generic

The canonical-pose scheme (v0→origin, v1→(1,0,0), v2 into the xy-plane) is already V-independent —
only the constants are hardwired. Derive `V = positions.length / 3` (require `V ≥ 3`); `FULL_DIM`/
`REDUCED_DIM` → `fullDim(V)=3V`, `reducedDim(V)=3V−7`; `ANCHOR_VERTICES` stays `[0,1,2]`. It is a
pure storage/dedup utility (not on the search hot path — Newton's min-norm step handles the gauge),
so this unblocks any-V with no pipeline risk.

## Change 4 — Make standing invariants explicit (small)

- `defineTorus`: the `expected 2 generators` throw → *"this codebase models genus-1 tori (τ ∈ ℍ
  needs g=1); got N generators."* Keep the gate.
- `latticeLayout` / `applyZ2`: keep the existing throws; one-line doc that they're type-7-only
  (require `lattice` / `symmetryPairing`).

**Important — what is and isn't type-7-only (correcting an earlier conflation):**
Every flat torus is ℝ²/Λ, so it **develops into the plane with lattice/parallelogram symmetry for
all types** (`develop.ts` `developNet`, generic — the triangles just come out scalene, not
equilateral). The **graph-paper grid is also generic**: it's lattice coordinates from the holonomy
basis Λ (`mesh/uv.ts` `latticeUV`), so the gold grid already works on the folded torus for **all 7
types** (rendered as a sheared parallelogram grid per that type's τ). The **only** genuinely
degree-6 thing is the **equilateral** layout — drawing the triangulation as the *regular triangular
lattice* (all 60° corners), which by the angle-sum `6×60°=360°` requires degree 6. That is all that
`latticeLayout` + the `lattice`/`periodBasis` metadata buy (the abstract combinatorial figure + a
tidy hexagon attach order). The developed-*net* render being #7-only is therefore a layout **choice**
(it borrowed that hexagon attach), not a limit — any type's net can be developed generically from
`torus.developOrder` (just a jaggier parallelogram patch).

## Change 5 — Cosmetic
`energies/types.ts` `"24-component"` → `"3V-component"`; the `24` alloc in `energies/energies.test.ts`
→ `torus.vertexCount*3`.

## Change 6 — The proof: add + search a never-embedded, non-8-vertex triangulation

`src/tori/triangulation-agnostic.test.ts` using the **7-vertex Császár torus** (the unique minimal
triangulated torus, V=7) — a triangulation we have **no embedding for**. Assert, *seeding only
synthetically*:
- `defineTorus(császár)` builds: `vertexCount===7`, Euler passes, exactly 2 generators.
- From a **random seed** (no embedding), the full pipeline runs without any 8-vertex assumption:
  `newtonFlatten` converges + drives `maxConeDeficit` down, `isEmbedded`/`modulus`/`minMargin` all
  run with 3·7-shaped buffers, `modulus` returns a finite τ.
- `normalize`/`toReduced`(len 14)/`fromReduced` round-trip (`fromReduced∘toReduced === normalize`).
This is the executable guarantee of the tenet: **register a triangulation and search it with no
embedding in hand.** (Whether a flat embedded Császár torus *exists* is research, not this test.)

## Critical files

- **New:** `src/tori/registry.ts`, `src/tori/rich-data.ts`, `src/tori/triangulation-agnostic.test.ts`.
- **Edited:** `src/tori/index.ts` (derive registry), `src/tori/defineTorus.ts` (drop `referenceCoords`
  from the spec; genus-1 message), `src/math/normalize.ts` (generalize), `energies/distanceFromRich.ts`
  (parameterize) + `energies/types.ts` and its test, the ~7 tests + renders that used `RICH_REFERENCE`
  (load `RICH_COORDS` as a fixture instead).
- **Deleted:** `tori.ts` (root), `src/tori/torus1.ts … torus7.ts`, `src/math/reference.ts` (or thin it
  to a test/render helper — no core dependency).
- **Reused unchanged:** `defineTorus`'s derivations, all of `src/math/*` core, `src/io/embeddings.ts`,
  `sample-flat`'s `uniform` seed mode (the no-embedding search entry).
- **Out of scope:** demos (redone after the search refactor); the equilateral regular-triangular-lattice
  *layout* (the only genuinely degree-6 thing — develop-into-plane and the graph-paper grid are already
  generic); genus ≠ 1 (no single τ); auto-deriving symmetry/lattice.

## Verification

1. `npx tsc --noEmit`.
2. `npx vitest run` — `tori.test.ts` + the new agnosticism test pass; the 7 types still build
   correctly (spot-check a known modulus); no test imports a core `RICH_REFERENCE`.
3. No-embedding search smoke: `npm run sample-flat -- --type 3 --seed-mode uniform --count 1`
   (a triangulation with no reference embedding runs the full discovery pipeline from random seeds).
4. Grep proof: `grep -rn "TORUS_8V\|VERTEX_COUNT\|referenceCoords\|RICH_REFERENCE" src scripts` returns
   only the new data module / fixtures — no core or registry dependency on a reference embedding.
