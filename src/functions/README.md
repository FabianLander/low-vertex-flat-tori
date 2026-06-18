# functions/ — the differentiable-map toolkit

Pure machinery, no torus content: what a differentiable map of the configuration
**is**, and how to build and combine them. The generic layer that `constraints/` +
`embedding/` (and anything else) build their concrete maps from — the same
machinery-vs-instances split as `topology/` (generic) ↔ `triangulations/` (data).

- `types.ts` — `Fn` (the C → ℝᵏ contract: `value` + `jacobian`) and `ScalarFn` (an
  `Fn` at dim 1 with `compute`/`grad`). One concept: a *constraint* is an `Fn`
  driven to zero, an *energy* is a `ScalarFn` descended — uses of an `Fn`, not
  separate types.
- `compose.ts` — the algebra: `fdFn`/`fdScalar` (finite-difference a value-only map
  into an `Fn`), `scalarFn` (a scalar `Fn` from value + analytic gradient),
  `postcompose` + `affine` (stack an exact outer `SmoothMap` onto an `Fn` by the
  chain rule — e.g. the frozen Möbius onto `tau`).

The concrete maps (cone-angle deficit, τ, cell gaps, the energies) live with the
conditions they define — the closed ones in `constraints/`, the embedded region in
`embedding/`.
