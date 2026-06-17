# Configuration space & charts — where the search lives

> **Being superseded.** The configuration-space refactor replaces the `Chart` picture below with a
> `ConfigSpace = (T, φ)` carrying `pull` / `push` / `coords` — see
> [configuration-space.md](configuration-space.md) for the target design. This document describes the
> present, chart-based code until that lands.

> A **configuration** is a realization of the triangulation in ℝ³: a point in `C = ℝ³ⱽ`. The search
> moves around `C` (modulo a gauge), often restricted to a parameterized subspace given by a **chart**.
> This is the entry to the *extrinsic* half — `src/configuration/`.

## The mathematics

Fix a triangulation with `V` vertices. A configuration is an assignment of a point in ℝ³ to each
vertex — equivalently a vector in `C = ℝ³ⱽ` (a `PaperTorus`'s `positions`). All the conditions we
search for (flat, embedded, a given modulus) are subsets of `C`.

**Gauge.** The Euclidean similarity group `G` of ℝ³ (translation ⊕ rotation ⊕ uniform scale, 7
continuous DOF) acts on `C`, and every condition we care about is `G`-invariant — the object of
study is really `C/G`. We never form that quotient. Instead the gauge is handled *implicitly*: the
solvers' minimum-norm step is orthogonal to the `G`-orbit directions, so projecting onto a condition
never drifts along gauge; scale is pinned only at measurement (unit-area). A canonical pose
(`configuration/gauge.ts`, the `v0→0, v1→ê₁, v2∈xy` convention) is used only for *storage/dedup* — a
representative of a `G`-orbit — never on the search path. (If one ever wanted explicit gauge-fixing
it would just be a chart of pinned coordinates — no new mechanism.)

## Charts — parameterized subspaces

A **chart** is a smooth map `ι : X = ℝᵈ → C` realizing a subspace of configurations, with its
derivative `Dι`. The search runs *entirely* in the chart's coordinates `X`; conditions are evaluated
on `ι(x)` and their derivatives pulled back through `Dι`. This is how *linear* conditions hold
**exactly by construction** rather than by projection — a symmetric search is a genuine lower-dim
search, not a full search projected onto an approximate symmetric set.

The current charts are all **linear** (`Dι` constant):

- **`identity(n)`** — the trivial chart `X = C`: the full configuration space, nothing fixed. The default.
- **`pinCoords(frozen, n)`** — holds a set of coordinates fixed (e.g. `z = 0` for planar vertices).
  `Dι` is a selection matrix; this is the structural form of "freeze these coordinates."
- **`symmetry(pairing, reflection)`** — configurations invariant under a linear involution `R` plus a
  vertex pairing, `P_{partner(a)} = R·P_a`. For Rich's ρ-symmetry (`ρ(u,v,w)=(−u,−v,w)`, antipodal
  pairing) an 8-vertex torus drops from `ℝ²⁴` to `ℝ¹²`, and every realized config is *exactly*
  symmetric. `lift` is the orthogonal projection onto the invariant subspace (the old `applyZ2`).

The contract a chart provides — `realize` (ι), `lift` (π, for seeds), `pullbackRows` (pull a Jacobian
or gradient back through `Dι`) — is all the solvers need. `identity`/`pinCoords` are *selections*
(orthonormal `Dι`), so a solve in `X` equals the ambient one; `symmetry`'s `Dι` is not orthonormal,
so it minimizes in the `X`-metric — still a correct projection/descent on the (smaller, exactly
symmetric) manifold, just metric-different. See [solvers.md](solvers.md).

## In code

| symbol | file | role |
| --- | --- | --- |
| `Chart` | `solvers/types.ts` | the contract: `realize`, `lift`, `pullbackRows`, `dim`, `ambient` |
| `identity`, `pinCoords` | `configuration/chart.ts` | the trivial and coordinate-pinning charts |
| `symmetry`, `RICH_SYMMETRY` | `configuration/symmetry.ts` | the involution+pairing chart; Rich's ρ |
| `normalize` / `toReduced` | `configuration/gauge.ts` | the canonical pose (storage/dedup only, not the search path) |
| `perturb`, `mulberry32`/`makeRng` | `configuration/perturb.ts`, `configuration/rng.ts` | Gaussian perturbation; seeded PRNGs |
| `doyleSchwartzPositions` | `configuration/doyleSchwartz.ts` | the DS seed family (a flat #7 torus of modulus τ) |

A **configuration is a bare `Float64Array`** of positions — every layer threads that, with the torus
bound into the `Fn`/`Chart` closures. `PaperTorus` (`math/embedding.ts`) is a `{torus, positions}`
*render/IO bundle*, not a configuration type. The `Chart` contract lives with the solvers (it is what
they consume); the implementations live in `configuration/`. Everything is pure — no three.js, no DOM.
