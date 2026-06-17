# functions/ — differentiable maps on configuration space

The smooth maps C → ℝᵏ (value + derivative) that everything else is built from.
There is really only **one concept** here — a differentiable function of the
configuration (`Fn`) — and the rest of the system is uses of it: a *constraint* is
an `Fn` driven to zero (`submanifolds/`), an *energy* is a scalar `Fn` pushed
downhill (`regions/`), a *certificate/diagnostic* just reads an `Fn`'s value. The
maps live here, separate from the loci and energies they define, because each is
measured in many roles.

- `types.ts` — `Fn` (the C → ℝᵏ contract: `value`, `jacobian`) and `ScalarFn`
  (an `Fn` at dim 1 with `compute`/`grad` conveniences — the shape of an energy).
- `compose.ts` — the algebra: `fdFn` (the one place finite-differencing lives —
  build an `Fn` from a value-only map), `postcompose` + `affine` (stack an exact
  outer `SmoothMap` onto an `Fn` by the chain rule).
- `coneDeficit.ts` — the cone-angle deficit map δ(c) = 2π − θ (dim V), with the
  analytic Jacobian. Feeds the flatness submanifold and the flatness certificate
  (`maxConeDeficit`).
- `tau.ts` — the Teichmüller modulus τ(c) ∈ ℍ (dim 2), finite-differenced. Feeds
  the modulus submanifolds, which post-compose the exact frozen Möbius on top.

- `minMargin.ts` — the embedding diagnostic: the smallest normalized gap between
  non-adjacent cells (the six pair types, written once).
- `energies/` — Fabi's proven repulsions `chordLengthSquared` + `cutOffArea` as
  `ScalarFn`s (the ones that found the tori). Built via `scalarFn`/`fdScalar`.

The near-miss `cellMargin`/`cellBarrier` energies stay parked in `math/energies/`
(grubby, awaiting a clean rebuild onto a shared `cellGaps` primitive). To come: an
analytic τ.
