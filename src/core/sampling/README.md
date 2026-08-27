# sampling/ — producing configurations to search from

The seeding technology: how to draw a starting configuration. A seed source is
`() => Float64Array`; you build one from a **coordinate system** (`coordinates/` —
*where* to sample) + a **sampling strategy** (*how* to draw parameters) + an RNG.
Depends on `coordinates/` + `configuration/`; consumed by `search/` (a feeder layer,
like `solvers/`).

- `rng.ts` — seeded PRNGs (`mulberry32`, `xoshiro128pp`, `makeRng`) + `gaussian`.
- `perturb.ts` — Gaussian random-walk perturbation of a configuration (bare in/out).
- `seeds.ts` — seed sources (`perturbedSeeds`, `poolSeeds`, `uniformSeeds`, and the deterministic
  finite `gridSeeds` — a Cartesian sweep over a coordinate system's params) + σ draws
  (`uniformSigma`/`logSigma`).
- `reference.ts` — `RICH_REFERENCE`, Rich's known flat embedded torus: a perturbation
  center for seeding and the standard fixture for tests/renders.
- `foldedBases.ts` — Lander's two FOLDED BASES: the exact planar configurations that are already
  flat tori of modulus exactly `i` (on `v8-7`) and exactly `ρ` (on `v8-3`), with eight of their
  sixteen triangles folded over so the sheet overlaps itself, plus the rational direction ζ that
  pulls those sheets apart. `liftedPositions(base, t)` puts vertex v at `(Q_v, t·ζ_v)` — embedded
  for every `t > 0`, exactly flat only at `t = 0`. The seed source the `search/correct-fold`
  routine and the folded-tori / fiber-cloud / hole-hunt demos start from.
- `doyleSchwartz.ts` — the Doyle–Schwartz seed family: `doyleSchwartzPositions(x, y)`, the
  closed-form #7 flat torus of modulus τ = x + iy as bare positions (value-only, no Jacobian —
  the seed sibling of `RICH_REFERENCE`). The DS model *as a coordinate system* — the same tent
  with a Jacobian — is `coordinates/dsScaffold`.

Pure: no three.js, no DOM.
