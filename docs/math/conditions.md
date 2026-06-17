# Conditions — what we ask of a configuration

> A **condition** is a property a configuration may or may not have. They come in two mathematically
> distinct kinds, and the distinction is the whole shape of the search: **closed** conditions are
> *submanifolds* `{g=0}` you land *on*; **open** conditions are *regions* you stay *inside*.
> Code: `src/submanifolds/`, `src/regions/` (built on the analytic primitives in `src/math/`).

## Closed conditions — submanifolds `{g = 0}`

A smooth map `g : C → ℝᵏ` cuts out a closed submanifold `M = {g = 0}` of codimension `k`. You reach
it by *projecting* (Newton) and move on it along its tangent space. Each is a **`ConstraintMap`**:
a value `g(c)`, a Jacobian `Dg`, and a convergence measure.

- **`flat`** — every cone-angle deficit `2π − θ_v = 0`. The flat locus has codimension **V−1**, not V:
  Gauss–Bonnet forces `Σ deficits ≡ 0`, so the V-th deficit is redundant. `flat` *drives* V−1 rows
  (full-rank, well-conditioned) but *measures* all V for convergence (the dropped one can lag above
  tol while the others are below it). The Jacobian is the exact analytic cone-angle derivative.
- **`collinear(i,j,k)`** — a vertex triple is collinear in the plane (planar signed area = 0). codim 1.
  Used by the Doyle–Schwartz semi-solution search.
- **`fixedModulus(τ̂₀)` / `modulusWall(c)`** — fix the moduli point (`τ̂ = τ̂₀`) or pin a wall
  (`|Re τ̂| = c`: the rectangular `c=0`, the rhombic `c=½`). The reduced modulus τ̂ is only
  piecewise-smooth (the reducing `SL(2,ℤ)` element jumps at fundamental-domain walls), so we use the
  **frozen-chart trick**: capture the reducing matrix `m` at a seed; then `applyMobius(m, τ(·))` is a
  smooth function of positions — an ordinary `value(c)`. Valid in the seed's `SL(2,ℤ)` chamber;
  `march` re-freezes each substep. (See [developing.md](developing.md) for τ and the reduction.)

Submanifolds compose: `project(chart, x, [flat, modulusWall(c)])` lands a flat torus on the wall.

## Open conditions — regions

An **open** condition is a region `Ω ⊆ C` you must stay *inside*; you cannot "land on" it. It is a
**`Region`**: a predicate `contains` (the gate), a signed `margin` (diagnostic), and two energies
that move a config with respect to it.

- **`embedded`** — the realization is an embedded polyhedron (no two triangle interiors cross). `Ω` is
  the "tiny open set" the search lives inside. `contains` is **exactly `isEmbedded`** — the
  *topological* intersection test. It is **not** `margin > 0`: the geometric gap `minMargin` and the
  topological test disagree at the boundary and on edge-shared pairs (a config can have `minMargin >
  0` yet fail `isEmbedded`). The gate must be the truth, not its surrogate.

**Energies.** A region supplies two scalar potentials (each an `Energy`: `compute` + gradient ∇E in C):
- **`enterEnergy`** — a *repulsion* (zero once every pair is ≥ ε apart): pushes a config toward / into
  the region. Used to reach it or spread cells apart.
- **`stayEnergy`** — a *barrier* (→ ∞ at contact): holds a config strictly inside, away from the
  boundary (fattening). These are `math/energies/` (`makeCellMargin`, `makeCellBarrier`), wrapped.

Energies are *descended* by `flow`; the region's `contains` is the *gate* `flow`/`march` enforce.
Note descending these energies lowers a sum of pair penalties — it does **not** monotonically
maximize the single smallest gap, and un-gated descent of a repulsion can even *leave* `Ω`. The
gate is what guarantees you stay in. See [solvers.md](solvers.md).

## Why the split is structural

Closed conditions are level sets of smooth maps — you factor the map out (it's reused for the
locus, for certificates, for diagnostics) and the locus is a thin constructor. Open conditions have
no smooth defining function; they're a coupled, non-smooth apparatus (predicate + margin + energies)
kept whole. The solvers consume them differently — `project`/`march` take submanifolds, `flow` takes
an energy and a region — so organizing by this kind matches how the math is used.

## In code

| symbol | file | role |
| --- | --- | --- |
| `ConstraintMap`, `Region`, `Energy` | `solvers/types.ts` | the contracts |
| `flat`, `collinear` | `submanifolds/flat.ts`, `submanifolds/collinear.ts` | flatness; collinearity |
| `fixedModulus`, `modulusWall` | `submanifolds/modulus.ts` | moduli point / wall (frozen chart) |
| `embedded` | `regions/embedded.ts` | the embedded region (gate + enter/stay energies) |
| `isEmbedded`, `minMargin`, `makeCellMargin/Barrier` | `math/embedded.ts`, `math/energies/` | the analytic primitives the conditions wrap |
