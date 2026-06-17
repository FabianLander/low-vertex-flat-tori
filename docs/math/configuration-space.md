# The configuration space — the spine of the search

> A **triangulation `T` is what gives coordinates meaning.** It fixes `V`, hence the *default*
> configuration space `ℝ³ⱽ` of all realizations of `T` in space; a *problem's* configuration space is
> a (possibly smaller) `ℝⁿ` mapped into `ℝ³ⱽ` by an embedding. The whole search lives on `ℝⁿ`: you
> build functions there by sending a point up to `ℝ³ⱽ`, measuring with `T`, and reading the result
> back down. This document is that one idea, made into objects. Code: `src/configuration/` (the
> machinery), `src/coordinates/` (the coordinate systems), `src/functions/` (the `Embedding` contract).

## The mathematics

Fix a triangulation `T` with `V` vertices. A **configuration** is an assignment of a point in `ℝ³` to
each vertex — a vector in `ℝ³ⱽ`. The triangulation is *constitutive*: `ℝ³ⱽ` without `T` is a bag of
numbers; *the configuration space is the space of realizations of `T`*, a `T`-indexed object. Every
condition we search for (flat, embedded, a fixed modulus) is a subset of this space.

For a given **problem** we rarely vary all of `ℝ³ⱽ`. We pin some vertices, or impose a symmetry, and
the configurations we actually move through form a smaller space `ℝⁿ` sitting inside `ℝ³ⱽ` via an
embedding

```
    φ : ℝⁿ → ℝ³ⱽ          (n = the problem's degrees of freedom)
```

The **default** problem is `φ = id`, `n = 3V` — the full space. Restricting again (pin, *then*
impose a symmetry) just composes embeddings, `φ ∘ ψ`, and lands you in another space of the same
kind. So **the configuration space is closed under restriction**: a restriction is itself a
configuration space, recursively. That closure is the load-bearing invariant — everything below is
written once against "a configuration space" and works on every restriction of it.

`φ` is an **embedding** in the precise sense: an immersion (`Dφ` has full column rank), so `ℝⁿ`
injects onto its image `φ(ℝⁿ) ⊂ ℝ³ⱽ`. (Immersion is exactly the condition that the pullback metric
below is nondegenerate.)

## One family of maps: `Fn`, `ScalarFn`, `Embedding`

All three are the *same data* — a differentiable map between Euclidean spaces, carrying its Jacobian
— differing only in **role** relative to the configuration space:

| | shape | role |
| --- | --- | --- |
| `Fn` | `ℝⁿ → ℝᵏ`, `value` + `jacobian` | **measures** a configuration (driven to 0, or read). Domain is the space you're on (inDim implicit). |
| `ScalarFn` | `Fn` with `k = 1` | an `Fn` + `compute`/`grad` — the shape of an energy. |
| `Embedding` | `ℝⁿ → ℝᵐ`, `value` + `jacobian` | **maps between** configuration spaces (the `φ` that *defines* a restriction). Both dims explicit; must be an immersion. |

An `Fn` is a map *out of* the one space you've chosen; an `Embedding` is a map *between* spaces — it
is *how you chose it*. That is the whole distinction, and it is why an `Embedding` carries an
expectation (immersion) an arbitrary `Fn` does not. All three are generic machinery, with **no torus
content**: they live in `functions/`, alongside the algebra that combines them.

## The configuration space object

```
    ConfigSpace = (T, φ)          dim = φ.inDim (n)     ambient = φ.outDim (3V)
```

A `ConfigSpace` bundles the triangulation (the *meaning*) with the embedding (the *restriction*). It
exposes **four operations**, two of them a dual pair along `φ`:

- **`pull(g) → Fn on ℝⁿ`** — the **pullback** `φ*g = g ∘ φ`. Takes an *ambient* function
  `g : ℝ³ⱽ → ℝᵏ` (a condition, built from `T`) and returns a genuine `Fn` on the problem's space
  `ℝⁿ`, with Jacobian `Dg(φ(x))·Dφ(x)` by the chain rule. **This is how you get actual functions on
  `ℝⁿ` to optimize.** On the full space `pull` is the identity, so writing everything through it costs
  nothing there. (`pull` of a `ScalarFn` is a `ScalarFn`; of a constraint, a constraint.)
- **`push(x) → positions ∈ ℝ³ⱽ`** — apply `φ`: send a problem-space point *up* to its realization in
  position space. The forward dual of `pull`. (See the note below on "pushforward".)
- **`coords(p) → x ∈ ℝⁿ`** — the **left-inverse of `push`**: read the problem-space coordinates *off*
  an ambient configuration `p`. `coords(push(x)) = x` always; `push(coords(p)) = p` only when `p`
  already lies in the restricted space — otherwise `coords` is a **retraction** onto it (drop the
  pinned coordinates / least-squares project). Its job is **seeding**: turn an ambient starting point
  (`RICH_REFERENCE`, a perturbed config, a CSV row) into the `ℝⁿ` coordinates to start from. For the
  full space it is the identity.
- **`paperTorus(x) → PaperTorus`** — the boundary bundle `{ triang, positions: push(x) }`, the
  explicit `(T, positions)` object the boundary layers (certify, IO, render) consume (below).

> **A note on "pushforward."** In differential geometry *pushforward* canonically names `Dφ·v` on
> tangent **vectors**, and *pullback* names `φ*` on **functions/covectors**. We use both: `pull` is
> the function pullback; the vector pushforward `Dφ·v` appears too, but only *internally* — inside
> `pull`'s chain rule, and when mapping an `ℝⁿ` step to an `ℝ³ⱽ` displacement. The public `push` is
> the pushforward of a **point** (just `φ(x)`). The overload is harmless because the vector version
> is never a named public method, but it is named here so it does not surprise.

The duality in one line: **`pull` moves functions backward** along `φ` (`ℝ³ⱽ → ℝⁿ`); **`push` moves a
point forward** (`ℝⁿ → ℝ³ⱽ`); **`coords` moves a point back** (`ℝ³ⱽ → ℝⁿ`, retracting).

## Building the search out of these

The pipeline reads as the opening sentence:

```
T  →  space = (T, φ)                       pick the triangulation, pick the problem's ℝⁿ
flat = space.pull(coneDeficit(T))          a REAL function on ℝⁿ — gradient and all
…run the solver on ℝⁿ with pulled functions + a pulled gate…
render(space.paperTorus(x))                same φ, now drawing
```

Three consequences fix the responsibilities of the layers around it:

- **Conditions are pure *ambient* facts.** `coneDeficit(T)`, `tau(T)`, `embedded(T)` are functions of
  a realization in `ℝ³ⱽ` — they know nothing about restrictions, because a cone angle is a cone angle.
  Restriction is *not their concern*; it is `pull`'s. (Code: `conditions/`.)
- **The solver is pure `ℝⁿ`, fully `T`-blind.** The caller `pull`s the constraints/energy to `ℝⁿ` and
  `pull`s the `embedded` *gate* to an `ℝⁿ` predicate (`x ↦ embedded.contains(push(x))`); the solver
  then sees only a dimension, some `Fn`s on `ℝⁿ`, a predicate on `ℝⁿ`, and a metric. No `Triangulation`,
  no embedding, no chart threaded through — which is exactly what makes the sphere/circle toy tests
  *just `ℝⁿ` with some functions, no space at all*. (Code: `solvers/`.)
- **Visualization rides the same `φ`.** Measuring and drawing share their first step — `push` a point
  to `ℝ³ⱽ`, then use `T`. Measurement then evaluates an ambient `Fn`; drawing builds a mesh. One path,
  two leaves. So viz takes the `paperTorus(x)` bundle (and an `Fn` for any scalar field, e.g. cone
  deficit for coloring); it is a leaf and does **not** mimic the factory pattern.

## Interior vs boundary — why a point is sometimes bare, sometimes bundled

There is a deliberate asymmetry, and it is principled, not sloppy:

| | triangulation | a point is | because |
| --- | --- | --- | --- |
| **interior** (functions, solvers) | implicit (in closures) | a bare `Float64Array` | the solver must be generic; the hot loop wants bare arrays |
| **boundary** (certify, IO, render) | explicit (bundled) | a `PaperTorus` `(T, positions)` | you have left the closure context — a point must carry `T` to mean anything |

`PaperTorus` *is* the boundary form of a configuration: the materialized point that can travel
without its space on the stack (a CSV row needs its `T`; a renderer needs `T` + positions in `ℝ³`).
It is a `configuration/` type, not a "math" object, and it is produced by `space.paperTorus(x)`.

## The metric — `g = I` now, the pullback metric is the canonical choice

The solver operates in a chosen metric on `ℝⁿ`, and the *same* `n×n` matrix `g(x)` enters in two
places:

- **corrector** (min-norm step): `δx = −g⁻¹Jᵀ(J g⁻¹ Jᵀ)⁻¹ F`
- **descent** (Riemannian gradient): `grad_g E = g⁻¹ ∇E`, tangent projector `P = I − g⁻¹Jᵀ(J g⁻¹ Jᵀ)⁻¹ J`

**We currently use `g = I`** (the parameter metric). The **canonical** choice is the pullback metric
`g(x) = Dφ(x)ᵀ Dφ(x)` — the metric `ℝⁿ` inherits from Euclidean `ℝ³ⱽ` through `φ`. The decisive
argument for it is **reparameterization invariance**: two embeddings with the same image but
different coordinatizations give *identical* dynamics under the pullback metric and *different*
dynamics under `g = I`. Since `φ` is an arbitrary modeling choice, anything that depends on it is a
leak, so the pullback metric is the "correct" one and `g = I` is "steepest descent in whatever
coordinates I happened to pick."

**It is genuinely moot today.** Every current embedding is linear with `Dφ` either orthonormal
(`identity`, `pinCoords`) or a *uniform* scaling (`symmetry`, columns of norm √2). In all of these
`g = cI`, and a uniform scale changes only the *length* of the step (absorbed by the line search /
damping), never its *direction*. So `g = I` and the pullback metric **coincide for every coordinate system we
run**. They diverge only for **anisotropic or nonlinear** embeddings — the headroom the `Embedding`
interface admits but no current restriction uses.

So `ConfigSpace` exposes `metric(x)` (the true `DφᵀDφ` is cheap — `Dφ` is already in hand for `pull`),
the solver takes it as a parameter defaulting to `I`, and adopting the pullback metric later is a
*localized* swap, not a rewrite. **Adopting it for anisotropic/nonlinear embeddings is an open
decision, deliberately deferred, not an oversight.**

One layer deeper, flagged but not acted on: the metric on `ℝ³ⱽ` itself is a choice — plain Euclidean
(what we use) versus a mass-matrix (lumped vertex-area) weighting that is more geometrically faithful
for discrete surfaces. Euclidean is the standard naive choice; the mass-weighted version is the same
*kind* of decision one level down.

## Gauge

The Euclidean similarity group `G` of `ℝ³` (translation ⊕ rotation ⊕ uniform scale, 7 DOF) acts on
`ℝ³ⱽ`, and every condition is `G`-invariant — the true object of study is `ℝ³ⱽ / G`. We never form
that quotient; the gauge is handled *implicitly* by the solver's minimum-norm step (orthogonal to the
`G`-orbit), with scale pinned only at measurement (unit area). A canonical pose
(`configuration/gauge.ts`) is used only for storage/dedup. Explicit gauge-fixing, if ever wanted, is
just another restriction — an embedding pinning the gauge coordinates — needing no new mechanism.

## In code

| symbol | file | role |
| --- | --- | --- |
| `Fn`, `ScalarFn` | `functions/types.ts` | the map contract (constraint/energy are uses of it) |
| `Embedding`, `precompose` | `functions/compose.ts` | the inner reparameterization (immersion) + `pull = precompose(g, φ)` |
| `ConfigSpace`, `makeConfigSpace` | `configuration/space.ts` | `(T, φ)`: `pull` / `push` / `coords` / `paperTorus` / `metric` — the machinery |
| `fullSpace`, `pinCoords`/`pinVertices`, `symmetry`, `doyleSchwartz` | `coordinates/*` | the coordinate-system instances (each an `Embedding` → `ConfigSpace`) |
| `PaperTorus` | `configuration/paperTorus.ts` | the `{triang, positions}` boundary bundle (a plain interface) |
| `gauge` | `configuration/gauge.ts` | the canonical pose (storage/dedup) |
| `rng`, `perturb`, `seeds`, `reference` | `sampling/*` | producing seeds (random + the deterministic `gridSeeds`) |

The configuration space is the **compiler** between the triangulation's language ("pin these
vertices", "impose this symmetry") and the linear algebra the solver runs on: `T`-aware at the
modeling face, emitting `T`-blind functions on `ℝⁿ` for the engine. Everything here is pure — no
three.js, no DOM.
