# Conditions — what we ask of a configuration

> A **condition** is a property a configuration may or may not have. They come in two mathematically
> distinct kinds, and the distinction is the whole shape of the search: **closed** conditions are
> *submanifolds* `{g=0}` you land *on*; **open** conditions are *regions* you stay *inside*.
> Code: `src/conditions/` — one module per condition, each owning its measurement (an `Fn` built
> from the `functions/` toolkit) and its usage. Closed vs open is carried by the *return type*
> (a `Held`/`Fn` vs a `Region`), not the directory.

> **One concept underneath.** Every closed condition, and the potential of every open one, is the
> *same* thing — a differentiable map of the configuration, an **`Fn`** (`value` + `jacobian`, in
> `functions/`). A *constraint* is an `Fn` driven to zero; an *energy* is a scalar `Fn` pushed
> downhill. "Constraint" and "energy" are **uses** of an `Fn`, not separate interfaces — which is why
> the maps live on their own in `functions/`, measured in many roles (constraint, certificate,
> diagnostic, plot).

## Closed conditions — submanifolds `{g = 0}`

A smooth map `g : C → ℝᵏ` cuts out a closed submanifold `M = {g = 0}` of codimension `k`. You reach
it by *projecting* (Newton) and move on it along its tangent space. The map is just an `Fn`; how to
*use* it as a constraint — which rows to drive, how to measure convergence — is a thin **`Held`**
(default: drive all rows, converge on `‖value‖∞`).

- **`flat`** — every cone-angle deficit `2π − θ_v = 0`, i.e. the `coneDeficit` map (dim V) driven to
  zero. The flat locus has codimension **V−1**, not V: Gauss–Bonnet forces `Σ deficits ≡ 0`, so the
  V-th deficit is redundant. `flat` is `coneDeficit` as a `Held` with `drive: V−1` (full-rank,
  well-conditioned) — yet convergence still measures all V, because the default `‖value‖∞` over the
  map's full V-vector *is* `maxConeDeficit`, so no custom measure is needed and the dropped row can't
  lag above tol unseen. The Jacobian is the exact analytic cone-angle derivative.
- **`collinear(i,j,k)`** — a vertex triple is collinear in the plane (planar signed area = 0). codim 1,
  an `fdFn`. Used by the Doyle–Schwartz semi-solution search.
- **`fixedModulus(τ̂₀)` / `modulusWall(c)`** — fix the moduli point (`τ̂ = τ̂₀`) or pin a wall
  (`|Re τ̂| = c`: the rectangular `c=0`, the rhombic `c=½`). The reduced modulus τ̂ is only
  piecewise-smooth (the reducing `SL(2,ℤ)` element jumps at fundamental-domain walls), so we use the
  **frozen-chart trick**: capture the reducing matrix `m` at a seed. In code this is exactly a
  *post-composition* — `postcompose(mobius(m), tau)` (with an affine shift / take-Re on top) — so the
  exact frozen Möbius rides on the (finite-differenced) `tau` map and the chain rule fuses the
  Jacobians. Valid in the seed's `SL(2,ℤ)` chamber; `march` re-freezes each substep. (See
  [developing.md](developing.md) for τ and the reduction.)

Constraints compose: `project(chart, x, [flat, modulusWall(c)])` lands a flat torus on the wall.

## Open conditions — regions

An **open** condition is a region `Ω ⊆ C` you must stay *inside*; you cannot "land on" it. It is a
**`Region`**: a predicate `contains` (the gate), a signed `margin` (diagnostic), and two energies
that move a config with respect to it.

- **`embedded`** — the realization is an embedded polyhedron (no two triangle interiors cross). `Ω` is
  the "tiny open set" the search lives inside. `contains` is **exactly `isEmbedded`** — the
  *topological* intersection test. It is **not** `margin > 0`: the geometric gap `minMargin` and the
  topological test disagree at the boundary and on edge-shared pairs (a config can have `minMargin >
  0` yet fail `isEmbedded`). The gate must be the truth, not its surrogate.

**Energies.** A region supplies two scalar potentials. An energy is **not its own type** — it's just a
scalar `Fn` (`functions/`, a `ScalarFn`: `compute` + `grad`) you push downhill, the dual of a constraint
(an `Fn` driven to zero). The region hands out two:
- **`enterEnergy`** — a *repulsion* (zero once every pair is ≥ ε apart): pushes a config toward / into
  the region. Used to reach it or spread cells apart.
- **`stayEnergy`** — a *barrier* (→ ∞ at contact): holds a config strictly inside, away from the
  boundary (fattening).

The proven discovery repulsions are **Fabi's** `chordLengthSquared` / `cutOffArea` (penalize *actual*
overlaps, zero on the embedded set — they drive a crossing torus onto it; `functions/energies/`). The
near-miss `cellMargin` / `cellBarrier` (fatten an already-embedded one) are **parked in `math/energies/`**
awaiting a clean rebuild onto a shared `cellGaps` primitive. `minMargin` is the embedding diagnostic
(`functions/minMargin`), not an energy.

Energies are *descended* by `flow`; the region's `contains` is the *gate* `flow`/`march` enforce.
Note descending these energies lowers a sum of pair penalties — it does **not** monotonically
maximize the single smallest gap, and un-gated descent of a repulsion can even *leave* `Ω`. The
gate is what guarantees you stay in. See [solvers.md](solvers.md).

## Why the split is structural

Closed conditions are level sets of smooth maps — the map is factored out as an `Fn` (reused for the
locus, for certificates, for diagnostics) and the locus is a thin `Held`. Open conditions have no
single smooth defining function; they're a coupled, non-smooth apparatus (predicate gate + margin +
energies) kept whole as a `Region`. The solvers consume them differently — `project`/`march` take
`Fn`s, `flow` takes a scalar `Fn` (an energy) and a region — so organizing by this kind matches how
the math is used.

## In code

| symbol | file | role |
| --- | --- | --- |
| `Fn`, `ScalarFn` | `functions/types.ts` | the map contract (constraint/energy are uses of it) |
| `Held`, `Constraint`, `Region` | `solvers/types.ts` | how the solvers consume a condition (no `Energy` type) |
| `flat` (+ `coneDeficit`) | `conditions/flat.ts` | flatness: the deficit measurement + the constraint |
| `collinear` | `conditions/collinear.ts` | planar collinearity (analytic signed area) |
| `modulus` (`tau`, `fixedModulus`, `modulusWall`) | `conditions/modulus.ts` | the modulus measurement + point/wall constraints (frozen chart) |
| `embedded` (`isEmbedded`, `minMargin`, the energies) | `conditions/embedded/` | the embeddedness gate + margin + repulsion energies, in one folder |
| intersection predicates | `geometry/triangleIntersect.ts` | the torus-blind kernels behind `isEmbedded` |
