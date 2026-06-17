# sampling/ — producing configurations to search from

The seeding technology: how to draw a starting configuration. A seed source is
`() => Float64Array`; you build one from a **coordinate system** (`coordinates/` —
*where* to sample) + a **sampling strategy** (*how* to draw parameters) + an RNG.
Depends on `coordinates/` + `configuration/`; consumed by `search/` (a feeder layer,
like `solvers/`).

- `rng.ts` — seeded PRNGs (`mulberry32`, `xoshiro128pp`, `makeRng`) + `gaussian`.
- `perturb.ts` — Gaussian random-walk perturbation of a configuration (bare in/out).
- `seeds.ts` — seed sources (`perturbedSeeds`, `poolSeeds`, `uniformSeeds`) + σ draws.
- `reference.ts` — `RICH_REFERENCE`, Rich's known flat embedded torus: a perturbation
  center for seeding and the standard fixture for tests/renders.

Pure: no three.js, no DOM.
