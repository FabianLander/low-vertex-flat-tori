# coordinates/ — the coordinate systems

The **instances** to `configuration/`'s machinery: each file builds a coordinate
system — a map (`Fn`) φ : ℝⁿ → ℝ³ⱽ, an immersion, paired (via `makeConfigSpace`) with a
triangulation into a `ConfigSpace`. Same machinery↔instances split as
`topology/`↔`triangulations/` and `functions/`↔`constraints/`. Depends on
`configuration/` and `functions/`; nothing depends back.

Each φ is just an `Fn`; the coordinate system pairs it with BOTH directions of the change —
`push` (φ: params → config) and `coords` (config → params, the retraction). Two kinds:

- **restrictions** — carve out a subspace you *solve in*:
  - `full.ts` — `fullSpace`: the trivial system, all of ℝ³ⱽ (φ = id).
  - `pin.ts` — `pinCoords` / `pinVertices`: hold some coordinates fixed (all at one constant);
    `freeCoords`: hold them at their OWN values in a given configuration, so a chosen handful
    of coordinates move and the rest stay exactly where they are.
  - `symmetry.ts` — `symmetry` (+ `RICH_SYMMETRY`): configs invariant under an
    involution + vertex pairing, exactly symmetric in half the dimension.
- **sections** — a chosen representative of a group quotient:
  - `normalized.ts` — `normalized` (+ `normalizePose`): the section of the similarity
    bundle C = ℝ³ⱽ → C/Sim. Pins v0=(0,0,0), v1=(1,0,0), v2 in the y≥0 xy-plane — kills the
    7 similarity DOF (translation ⊕ rotation ⊕ scale), leaving **3V−7** free coords. `push`
    is the linear gauge scatter (so the pullback metric is exactly I), `coords` is
    `normalizePose` (project any config onto the slice) then read. The realization-side
    mirror of `moduli/reduce` (the SL(2,ℤ) quotient of ℍ); replaces the old
    `configuration/gauge`. Searching here removes the similarity null space (full-rank
    constraints) and deduplicates up to similarity.
- **models** — a construction's own degrees of freedom (a parametric family, not a subspace of
  ℝ³ⱽ):
  - `dsScaffold.ts` — `dsScaffold`: the Doyle–Schwartz tent as a 10-dimensional `ConfigSpace` for
    the type-7 torus — two coplanar pinned–free segments (each split at its midpoint) plus two
    lifted tent-pole vertices. Searching here (`discover(triang, { space: dsScaffold(triang) })`)
    flows in the DS model's own DOF; its ρ-symmetric, fixed-modulus slice is the value-only
    closed-form seed `sampling/doyleSchwartz` (which is NOT a coordinate system — no Jacobian).

Pure: no three.js, no DOM.
