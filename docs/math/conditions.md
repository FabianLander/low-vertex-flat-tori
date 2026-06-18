# Conditions — what we ask of a configuration

> A **condition** is a property a configuration may or may not have. They come in two mathematically
> distinct kinds, and the distinction is the whole shape of the search: **closed** conditions are
> *submanifolds* `{g=0}` you land *on*; **open** conditions are *regions* you stay *inside*.
> Code: the two kinds get two homes — the closed conditions in `src/constraints/`, the open
> embedded region in `src/embedding/` — each a module owning its measurement (an `Fn` built from
> the `functions/` toolkit) and its usage (a `Held`/`Fn` constraint, or the `Region`).

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
- **modulus** — pin the modulus to a **locus** in either **space**: `pinTeichmuller(t, locus)` (the
  raw τ) or `pinModuli(t, seed, locus)` (the reduced τ̂), where the locus is a `point` (codim 2),
  `verticalLine`, or `circle` (codim 1). That 2 × 3 grid covers fixing a moduli point, a wall
  `|Re τ̂| = c`, or the `|τ̂| = 1` arc; the named cells are `fixedModulus(τ̂₀)` and `modulusWall(c)`.
  Each is `postcompose(locus, chart ∘ tau)`: `tau` has an exact analytic Jacobian (`moduli/modulus`),
  the chart and the locus are exact, so the whole chain is analytic. The reduced τ̂ is only
  piecewise-smooth (the reducing `SL(2,ℤ)` element jumps at fundamental-domain walls), so the moduli
  chart is the **frozen Möbius** `mobius(m)` with `m` captured at the seed — valid in its `SL(2,ℤ)`
  chamber; `march` re-freezes each substep. Teichmüller uses no chart (identity), so it is globally
  smooth but its target is marking-dependent. (See [developing.md](developing.md) for τ / reduction.)

Constraints compose: `project(x, [flat, modulusWall(c)])` lands a flat torus on the wall.

**Combine and soften.** Two generic `functions/compose` operations make the constraint/energy
duality concrete: **`stack(...fns)`** concatenates conditions into one higher-dim `Fn` (its zero set
is the intersection), and **`leastSquares(fn)`** turns a condition into the `ScalarFn` energy
`½‖fn‖²` whose descent reaches `{fn = 0}`. So one condition is *solved hard* —
`project(x, [flat, modulusWall(c)])` — or *flowed toward soft* —
`flow(x, [flat], leastSquares(pinModuli(…)), {gate: embedded})` — and a collection becomes one energy
via `leastSquares(stack(…))`. Hard / soft / combine are the three verbs on an `Fn`.

## Open conditions — regions

An **open** condition is a region `Ω ⊆ C` you must stay *inside*; you cannot "land on" it. It is a
**`Region`**: a predicate `contains` (the gate) and a signed `margin` (diagnostic) — nothing more. The
energies that move a config with respect to it are separate standalone functions (below).

- **`embedded`** — the realization is an embedded polyhedron (no two triangle interiors cross). `Ω` is
  the "tiny open set" the search lives inside. `contains` is **exactly `isEmbedded`** — the
  *topological* intersection test. It is **not** `margin > 0`: the geometric gap `minMargin` and the
  topological test disagree at the boundary and on edge-shared pairs (a config can have `minMargin >
  0` yet fail `isEmbedded`). The gate must be the truth, not its surrogate.

**Energies.** An energy is **not its own type** — it's just a scalar `Fn` (`functions/`, a `ScalarFn`:
`compute` + `grad`) you push downhill, the dual of a constraint (an `Fn` driven to zero). The `Region`
itself supplies only the gate + margin; the energies are standalone functions `flow` takes explicitly.
Each is written out in full (formula inline), and they come in two families — all in
`embedding/energies.ts`:
- **overlap** — **Fabi's** `chordLengthSquared` / `cutOffArea`: penalize *actual* overlaps, zero on the
  whole embedded set, so they drive a *crossing* torus onto `Ω` (these found the tori).
- **near-miss / barrier** — alive in `Ω`'s interior, so they FATTEN a barely-embedded torus (the
  overlap energies can't: their gradient is zero once embedded). `cellMargin` is a finite hinge (zero
  once every gap ≥ ε); `cellBarrier` is a log-barrier (→ ∞ at contact, so descent settles strictly
  inside `Ω`), and it watches the full embedding test — the six cell-gap types AND the shared-vertex
  opposite-edge↔triangle gaps.

`minMargin` is the embedding diagnostic (`embedding/margin.ts`), not an energy.

Energies are *descended* by `flow`; the region's `contains` is the *gate* `flow`/`march` enforce.
Note descending these energies lowers a sum of pair penalties — it does **not** monotonically
maximize the single smallest gap, and un-gated descent of a repulsion can even *leave* `Ω`. The
gate is what guarantees you stay in. See [solvers.md](solvers.md).

## Why the split is structural

Closed conditions are level sets of smooth maps — the map is factored out as an `Fn` (reused for the
locus, for certificates, for diagnostics) and the locus is a thin `Held`. Open conditions have no
single smooth defining function; they're a coupled, non-smooth apparatus (predicate gate + margin +
energies) kept whole as a `Region`. The solvers consume them differently — `project`/`march` take
`Fn`s, `flow` takes a scalar `Fn` (an energy) and a `Gate` (the region's `contains`, pulled to ℝⁿ) —
so organizing by this kind matches how the math is used.

## In code

| symbol | file | role |
| --- | --- | --- |
| `Fn`, `ScalarFn` | `functions/types.ts` | the map contract (constraint/energy are uses of it) |
| `stack`, `leastSquares` | `functions/compose.ts` | combine conditions into one `Fn` / soften a condition to its `½‖·‖²` energy |
| `Held`, `Constraint` | `constraints/types.ts` | the closed-condition contracts — no `Energy` type |
| `Region` | `embedding/region.ts` | the open-condition contract (gate + margin) |
| `Gate` | `solvers/types.ts` | the runtime form of a region: a predicate on ℝⁿ the solvers gate on |
| `flat` (+ `coneDeficit`) | `constraints/flat.ts` | flatness: the deficit measurement + the constraint |
| `collinear` | `constraints/collinear.ts` | planar collinearity (analytic signed area) |
| `modulus` (`tau`, loci `point`/`verticalLine`/`circle`, `pinTeichmuller`/`pinModuli`, `fixedModulus`/`modulusWall`) | `constraints/modulus.ts` | the point/line/circle × Teichmüller/moduli grid (`postcompose(locus, chart∘tau)`) |
| `embedded` (`isEmbedded`, `minMargin`, the energies) | `embedding/` | the embeddedness gate + margin + repulsion energies, in one folder |
| intersection predicates | `geometry/triangleIntersect.ts` | the torus-blind kernels behind `isEmbedded` |
