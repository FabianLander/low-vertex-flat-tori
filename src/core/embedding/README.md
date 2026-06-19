# embedding/ — the open condition Ω you stay inside

The **open** condition: the set of *embedded* realizations (no two triangle
interiors cross). The other species of condition from `constraints/` — not a
submanifold you project onto, but an open region `Ω ⊂ ℝ³ⱽ` you *stay inside* — and
it gets its own folder because it is the search's whole difficulty (a tiny open set)
and has the most to it. The search is "land on the closed constraints **while staying
inside** Ω."

One canonical signed quantity underlies it all — the geometric distance to
self-intersection — of which the gate is the **sign** and the clearance the **positive
magnitude**:

- `embedded.ts` — the condition itself: `isEmbedded` (the gate, the topological truth)
  and `clearance` (its continuous companion — Rich Schwartz's condition made
  continuous: the gate-aligned distance to the nearest crossing / √area, 0 on ∂Ω). The
  gate is built on **orientation predicates** (`geometry/triangleIntersect`, sign-only),
  robust on near-flat tori where division-based tests fail. Plus the violation
  diagnostics (`firstViolation`/`allViolations`/`violationFaceScalars`).
- `separation.ts` — geometry of self-closeness: `minSeparation` (true min distance
  between any two NON-ADJACENT (vertex-disjoint) cells — the honest geometric
  diagnostic) and the FATTEN-energy substrate `forEachCellGap`/`minCellGap` (the cell
  gaps the near-miss energies descend; midpoint-based so shared-vertex folds don't zero).
- `energies/` — the forces (smooth optimization surrogates — choices, not canonical):
  `overlap.ts` (`chordLengthSquared`/`cutOffArea`, drive a crossing torus onto Ω) +
  `fatten.ts` (`cellMargin`/`cellBarrier`, push an embedded torus deeper in).
- `cells.ts` — the substrate: which non-adjacent cell pairs to test (`cellTables`,
  derived from the triangulation and memoized). EXTRINSIC bookkeeping — it lives here
  with its only consumer, not on `Triangulation`.

`Region` — the OPEN-condition contract ({ `contains`, optional `margin` }) — is defined here
(`embedded.ts`), the open-condition twin of `constraints/Constraint`. The embedded set is its
instance: `isEmbedded` → `contains`, `clearance` → `margin`. `search/pull`'s `ambientRegion`
pulls it onto the solver's working space ℝⁿ for `minimize`/`continuation`.

The torus-blind intersection/distance kernels are in `geometry/` (`triangleIntersect`,
`distance`, `intersectionChord`, `triangle`). Pure: no three.js, no DOM.
