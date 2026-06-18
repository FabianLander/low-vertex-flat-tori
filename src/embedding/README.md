# embedding/ — the open condition Ω you stay inside

The **open** condition: the set of *embedded* realizations (no two triangle interiors
cross). It is the other species of condition from `constraints/` — not a submanifold
you project onto, but an open region `Ω ⊂ ℝ³ⱽ` you *stay inside* — and it gets its own
folder because it is the search's whole difficulty (a tiny open set) and has the most
to it. A `Region` (gate + margin); `flow`/`march` gate on it.

The split into closed `constraints/` and open `embedding/` mirrors the math: the
search is "land on the closed constraints (flat, a modulus wall, …) **while staying
inside** this open region."

- `region.ts` — the `Region` type + `embedded(triang)`: the gate (`isEmbedded`, the
  topological truth) + a signed `margin` diagnostic. The repulsion energies are NOT
  dispensed by the region — `flow` takes them explicitly.
- `gate.ts` — `isEmbedded` / `firstViolation` / `allViolations`: the topological truth
  (NOT `margin > 0` — the two disagree at the boundary).
- `margin.ts` — the shared cell-gap primitive `forEachCellGap` + `minMargin` (smallest
  normalized cell gap; a diagnostic, not the gate).
- `energies.ts` — the scalar potentials `flow` descends toward Ω: the overlap energies
  (Fabi's `chordLengthSquared` / `cutOffArea`) and the near-miss fatteners
  (`cellMargin` hinge, `cellBarrier` log-barrier).
- `cells.ts` — `cellTables`: the triangle-collision tables (which non-adjacent cells to
  test), derived from the triangulation and memoized. EXTRINSIC bookkeeping — it lives
  here with its only consumer, not on `Triangulation`.
- `index.ts` — the public surface.

The torus-blind intersection/distance kernels are in `geometry/` (`triangleIntersect`,
`intersectionChord`, `distance`, `triangle`). Pure: no three.js, no DOM.
