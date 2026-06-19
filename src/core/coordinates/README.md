# coordinates/ — the coordinate systems

The **instances** to `configuration/`'s machinery: each file builds a coordinate
system — an `Embedding` φ : ℝⁿ → ℝ³ⱽ paired (via `makeConfigSpace`) with a
triangulation into a `ConfigSpace`. Same machinery↔instances split as
`topology/`↔`triangulations/` and `functions/`↔`constraints/`. Depends on
`configuration/` and `functions/`; nothing depends back.

Every coordinate system is an `Embedding` with BOTH directions — `push` (φ: params → config)
and `coords` (config → params, the retraction). Two kinds:

- **restrictions** — carve out a subspace you *solve in*:
  - `full.ts` — `fullSpace`: the trivial system, all of ℝ³ⱽ (φ = id).
  - `pin.ts` — `pinCoords` / `pinVertices`: hold some coordinates fixed.
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

(The Doyle–Schwartz parametric family is a value-only SEED, not a coordinate system — it
lives in `search/doyleSchwartz.ts`.)

Pure: no three.js, no DOM.
