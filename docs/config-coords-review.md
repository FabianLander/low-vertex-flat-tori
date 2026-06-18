# Review: `configuration/` + `coordinates/` — suggested improvements

A scrutiny pass (the level we gave `embedding`/`constraints`/`topology`/`moduli`), covering both the
files themselves and what they imply for the system overall. Goal: a clean, modular, close-to-the-math
codebase.

**Status:** items 1 + 2 below are DONE — Doyle–Schwartz moved to `search/doyleSchwartz.ts` (a value-only
seed family), and `gauge` became `coordinates/normalized.ts`: the gauge-fixed coordinate system, the
section of C → C/Sim (push = linear scatter, coords = `normalizePose`), generalized to `3V − 7`
(triangulation-agnostic), the realization-side mirror of `moduli/reduce`. Items 3 (wire the pullback
metric — only needed once a *nonlinear* chart is solved in; `normalized` is linear, metric = I) and 4
(a `symmetry`-reduced search) remain.

## What's already right (keep)

- The **machinery ↔ instances** split holds cleanly: `configuration/` is the `ConfigSpace = (T, φ)`
  machinery (`space`, `paperTorus`, `gauge`, `csv`); `coordinates/` is the instances (each an
  `Embedding` φ → a `ConfigSpace`). Same shape as `topology↔triangulations`, `functions↔constraints`.
- `ConfigSpace.pull` is the clean spine — it's exactly `precompose(g, φ)`, so the whole solver stack
  runs on ℝⁿ with conditions pulled through φ. Good.
- `fullSpace` overriding `pull`/`pullScalar` to the identity (`g∘id = g`) is an elegant zero-overhead
  fast path. `pin` is minimal and correct. `csv`/`paperTorus` serialization is well-placed (the bundle
  owns its own serialized form; writing is triangulation-free, reading needs the `T`).

## The deep observation (system-level)

There's a latent distinction the folder hasn't made explicit, and `doyleSchwartz` sits on the fault line:

> A **coordinate system** is an `Embedding` φ : ℝⁿ → ℝ³ⱽ *with a Jacobian* — you can `pull` conditions
> through it and `project`/`flow` **in** it. A **parametric seed family** is value-only — you `push`
> a point out of it and sample, but can't solve in it.

`full`/`pin`/`symmetry` are the first; `doyleSchwartz` is value-only (`doyleSchwartzPositions(x,y)`,
no Jacobian) — a *seed family* filed in the coordinate-systems folder, and in fact used only as a seed
(`search/semiSolution` perturbs it). Three of the findings below are really one coherent upgrade around
this distinction, and resolving it is what makes the `ConfigSpace` abstraction earn its full keep.

## Findings (file-level → system-level)

### 1. `gauge.ts` is hard-wired to V = 8 — the lone count violation
`VERTEX_COUNT = 8`, `FULL_DIM = 24`, `REDUCED_DIM = 17`, anchors `v0,v1,v2`, unroll `v3..v7`. Everything
else in the codebase is **count-agnostic** (no baked 8/24/16 — `defineTriangulation` derives all counts,
Euler-checked). `gauge` is the one holdout. The canonical pose generalizes trivially: pin the 3 anchors,
leave `3V − 7` reduced coords. **Recommend:** derive from `triang.vertexCount` (take a `triang`/`V`
param), so `REDUCED_DIM = 3V − 7` and the gauge drops in for any torus — restoring the stated
triangulation-agnostic invariant across the whole system.

### 2. `doyleSchwartz` should be a real `Embedding`, not value-only
It's a genuine **2-real-parameter chart** of the #7 flat-torus family (modulus τ = x+iy), but it only
returns positions. Give it the analytic `∂positions/∂(x,y)` (the formulas are explicit; the only
singular step is `ztop = √(8x)·y`, a √-fold needing a floor/guard exactly like `moduli`'s height floor)
→ a true `Embedding` → a `ConfigSpace` you can **`project`/`flow` the DS family in, in its own two
coordinates**. That's a real new capability (search the 2-DOF DS family directly), and it resolves the
mis-filing. **Alternative** if we don't want that: it's a seed — move `doyleSchwartzPositions` to
`sampling/` (where `doyleSchwartzTentSeeds` already lives) and drop it from `coordinates/`. Pick one;
the current half-state (a value-only "coordinate system") is the wart.

### 3. The pullback metric `DφᵀDφ` is computed but unused — and (2) is exactly what would need it
`ConfigSpace.metric`/`pullbackMetric` exist but no solver calls them (only `coordinates.test` does); the
min-norm/tangent steps use `g = I`. That's *correct today* only because every **live** chart has a
uniform metric: `full` → I, `pin` → a selection (I on the free coords), `symmetry` → 2·I (uniform). The
moment a **nonlinear** chart is solved in — i.e. the DS `Embedding` of (2) — `DφᵀDφ` is non-uniform and
`g = I` distorts the step. So the deferred metric seam and the DS upgrade are **coupled**: doing DS
properly is the use-case that finishes the metric. **Recommend:** keep `metric` as the documented seam
(note it only bites for non-uniform/nonlinear charts), and wire it into the solver step *when* the DS
`Embedding` lands — not before.

### 4. `symmetry` is built and tested but no search uses it — a ready opportunity
`symmetry`/`RICH_SYMMETRY` (Rich's ρ + the antipodal pairing) reduces ℝ²⁴ → ℝ¹² with every config exactly
symmetric by construction, yet only the tests exercise it; all search recipes use `full`/`pin`. Rich's
torus *is* ρ-symmetric, so a **symmetry-reduced search** (flatten in 12 DOF — faster and yielding
ρ-symmetric tori by construction) is a natural, valuable use the machinery is already set up for.
**Recommend:** wire one search recipe through `symmetry` (or confirm it's intentionally speculative and
note that in the README).

## Priority

1. **(consistency)** Generalize `gauge` off V = 8 → `3V − 7`. Mechanical; restores count-agnosticism.
2. **(modularity / close-to-math)** Resolve `doyleSchwartz`: upgrade to a real `Embedding` (preferred —
   a 2-DOF DS chart you can solve in) or move it to `sampling/` as the seed it currently is.
3. **(coupled seam)** Wire the pullback metric into the solver step **iff/when** (2) gives a nonlinear
   chart; until then, document it as the deferred seam it is.
4. **(opportunity)** A `symmetry`-reduced search recipe, or mark `symmetry` speculative.

The throughline: `gauge` is the count-agnosticism holdout; `doyleSchwartz` exposes the
coordinate-system-vs-seed distinction; finishing DS as a nonlinear chart is what gives the pullback
metric (and thus the full `ConfigSpace` abstraction) a reason to exist; and `symmetry` is a ready chart
waiting for a search. Items 2 + 3 together are the one upgrade that makes `configuration`/`coordinates`
fully carry their weight.
