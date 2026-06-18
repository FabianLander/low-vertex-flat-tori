# coordinates/ — the coordinate systems

The **instances** to `configuration/`'s machinery: each file builds a coordinate
system — an `Embedding` φ : ℝⁿ → ℝ³ⱽ paired (via `makeConfigSpace`) with a
triangulation into a `ConfigSpace`. Same machinery↔instances split as
`topology/`↔`triangulations/` and `functions/`↔`constraints/`. Depends on
`configuration/` and `functions/`; nothing depends back.

Two kinds of coordinate system, both `Embedding`s:

- **restrictions** — carve out a subspace you *solve in*:
  - `full.ts` — `fullSpace`: the trivial system, all of ℝ³ⱽ (φ = id).
  - `pin.ts` — `pinCoords` / `pinVertices`: hold some coordinates fixed.
  - `symmetry.ts` — `symmetry` (+ `RICH_SYMMETRY`): configs invariant under an
    involution + vertex pairing, exactly symmetric in half the dimension.
- **constructions** — build configs from meaningful parameters, you *seed from*
  (and could solve in, once given a Jacobian):
  - `doyleSchwartz.ts` — the Doyle–Schwartz family: a flat #7 immersion of modulus
    τ = x+iy. Currently value-only (used for seeding); a natural `Embedding` upgrade.

Pure: no three.js, no DOM.
