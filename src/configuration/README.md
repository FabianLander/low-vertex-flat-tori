# configuration/ — the space we search and its structure

Configuration space C = ℝ³ⱽ (an immersion of the triangulation in ℝ³) plus the
things that act on it. **A configuration is a bare `Float64Array` of positions** —
not a wrapper object. The whole search core (`functions/`, `solvers/`, …) threads
bare positions; the torus rides in the `Fn`/`Chart` closures, never bundled with
the coordinates. (`PaperTorus` is a `{torus, positions}` *render* bundle, a
rendering/IO concern — deliberately NOT a configuration type here.)

- `chart.ts` — linear charts: `identity`, `pinCoords` (the `Chart` contract itself
  lives in `solvers/types.ts`).
- `symmetry.ts` — the symmetry chart: configs invariant under a linear involution +
  vertex pairing (Rich's ρ), realized exactly symmetric in half the dimension.
- `gauge.ts` — the canonical pose under the ℝ³ similarity group (7 DOF → 17 reduced
  coords: `normalize`/`toReduced`/`fromReduced`). Storage/dedup only — off the
  search path; the gauge is handled implicitly by the solvers' min-norm step.
- `rng.ts` — seeded PRNGs (`mulberry32`, `xoshiro128pp`, `makeRng`, `gaussian`).
- `perturb.ts` — Gaussian perturbation of a configuration (bare positions in/out).
- `doyleSchwartz.ts` — the Doyle–Schwartz seed family: an explicit flat #7 torus of
  any modulus τ = x+iy, the starting point for the semi-solution search.

The semi-solution *search* (`semiSolutionFlatten`, `scanSemiSolutions`) is not here —
that's solver-use + a driver (to be rebuilt as `project([flat, collinear, collinear])`
and moved to `search/`).
