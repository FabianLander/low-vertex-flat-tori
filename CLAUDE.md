# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Numerically discovering **flat, embedded 8-vertex tori** (Rich Schwartz's vertex-minimal
construction). A flat torus is intrinsically a flat sheet ℝ²/Λ; the challenge is realizing one as a
straight-edge polyhedron in ℝ³ that is both *flat* (every vertex has cone angle exactly 2π) and
*embedded* (no two triangles cross). There are **7 combinatorial types** of 8-vertex torus
triangulation (V=8, E=24, F=16). Only type **#7 (Rich's)** is degree-6-regular; the other six mix
degree 5/7 — so **nothing may assume degree 6**.

## Commands

```bash
npm install                       # once
npm test                          # vitest run (all *.test.ts under test/, mirroring src/)
npm run test:watch
npx vitest run test/topology/develop.test.ts    # a single test file
npx vitest run -t "modulus"                    # tests matching a name
npx tsc --noEmit                  # typecheck — this is the lint (no eslint configured)
```

There is **no linter**: `tsc --noEmit` under a strict tsconfig is the gate. `erasableSyntaxOnly` is
on, so **no TS-only runtime constructs** (no `enum`, no constructor parameter-properties, no
`namespace`); `verbatimModuleSyntax` requires `import type` for type-only imports; imports use
explicit `.ts` extensions.

### Demos / renders (browser, vite)

```bash
npm run dev <name>        # serve a demo or render (omit <name> to list all)
npm run build <name>      # self-contained build → dist/<name>/
npm run preview <name>
```

`scripts/run-demo.mjs` discovers entries from **both** `demos/` and `renders/` (each a folder with a
`main.ts`). `dev` writes a gitignored `.dev/<name>.html` on a **stable per-name port** (5200–5599).
`build`/`preview` rewrite the tracked `index.html`, so `git status` shows it modified — expected.

### Searches (headless, tsx)

```bash
npm run discover       -- [opts]   # find flat embedded tori (any modulus); --seed-mode rich|uniform
npm run wall           -- --c 0    # flat embedded tori on a modulus wall |Re τ̂|=c (0 rect, 0.5 rhombic)
npm run semi-solutions -- [opts]   # Doyle–Schwartz semi-solution scan (flat immersions; embeddedness recorded)
npm run march-modulus  -- --c 0    # transport a torus onto a wall by continuation; reports the pinch
```

These write 24-float CSV rows. They are thin runners over `src/search/`; flags are in each script
header. **`scripts/legacy/` is a read-only archive** — kept for inspiration when writing new scripts,
NOT built or run; its files still import the deleted `src/math/` and are intentionally left stale.

## Architecture

### The dependency rule (load-bearing)

Everything outside `render/`, `mesh/`, `viewer/`, `io/` (and the browser entries `demos/`,
`renders/`) is **pure** — no three.js, no DOM — so every algorithm runs headless under `tsx`. The
extrinsic search stack is **dependency-ordered**, each layer using only the ones below:

```
geometry/ → functions/ → { configuration/, coordinates/, conditions/ } → solvers/ → sampling/ → search/
```

with `topology/` (intrinsic machinery) + `triangulations/` (the 7 as data) underneath. Do not import
three.js or touch `window`/`document` from any of these. **Machinery and its instances are flat
siblings, never nested** — `topology/`↔`triangulations/`, `functions/`↔`conditions/`,
`configuration/`↔`coordinates/` — because the arrow is *dependency*, not *containment* (so a
machinery-purity violation like `topology/` importing `triangulations/` is a glaring cross-folder import).

### The one concept: `Fn` — toolkit (`functions/`) vs instances (`conditions/`)

The system is built from **one** thing — a differentiable map of the configuration,
`Fn : C = ℝ³ⱽ → ℝᵏ` (`value` + `jacobian`). "Constraint" and "energy" are *uses* of an `Fn`, not
separate interfaces:

- a **constraint** is an `Fn` driven to zero (`project`/`march`); held with optional usage (`Held`:
  which rows to drive). `flat` = `coneDeficit` driving V−1 rows.
- an **energy** is a scalar `Fn` (`ScalarFn`: `compute`/`grad`) descended (`flow`).

There is **no `ConstraintMap` and no `Energy` interface** — they were retired onto `Fn`/`ScalarFn`.
`functions/` is the **generic toolkit** — the `Fn`/`ScalarFn`/`Embedding` contracts (`types.ts`,
`compose.ts`) and the compose algebra (`fdFn`/`fdScalar`, `precompose`/`postcompose`/`affine`), no
torus content. The **concrete maps** live with the condition they define, in `conditions/` — the same
machinery↔instances split as `topology/`↔`triangulations/` and `configuration/`↔`coordinates/`.

### Configuration is a bare `Float64Array`

A configuration is just `positions` (length 3·V); the `Triangulation` rides in the `Fn`/`ConfigSpace`
closures, never bundled with the coordinates. There is **no global triangulation singleton, no hidden
`RICH` default** — thread the `torus` parameter (or close over it in a factory). `PaperTorus`
(`configuration/paperTorus.ts`) is the explicit `{triang, positions}` **boundary bundle** (a plain
interface) — the form a configuration takes at the IO / render / certify edge, where it must carry its
triangulation; not used on the interior hot path.

### Intrinsic: `topology/` (machinery) + `triangulations/` (data)

- `topology/triangulation.ts` — the `Triangulation` type + `defineTorus(spec)`. Everything
  (edges, oriented vertex links, dual adjacency, cell-pair tables, develop order, generator loops) is
  **derived from the triangle list and validated by V−E+F=0** — no baked-in 8/24/16 counts.
  `defineTorus({ triangles })` alone yields a working torus, so the pipeline is
  triangulation-independent.
- `topology/develop.ts` — unfold the triangulation; read the holonomy of the two marked generator
  loops to get the modulus τ ∈ ℍ, and reduce it to τ̂ ∈ ℍ/SL(2,ℤ) (`reduceModulusWithMatrix` returns
  the reducing matrix, for the frozen-chart wall constraints).
- `topology/{marking,fundamentalDomain,harmonicLayout,tutteLayout}.ts` — markings, cuts, planar layouts.
- `triangulations/` — the 7 types as data: `EIGHT_VERTEX`, registry `ALL_TORI`/`byId(n)`/`RICH = byId(7)`.

### Extrinsic: the search stack

- `geometry/` — torus-blind ℝ²/ℝ³ kernels: `distance` (point/segment/triangle), `intersectionChord`
  (`triTriChord`), `triangleIntersect` (the Möller–Trumbore predicates behind `isEmbedded`), all from
  a `positions` buffer + vertex indices. `geometry/drawing/` is plane-curve utilities for demos.
- `functions/` — the generic toolkit: `types` (`Fn`/`ScalarFn`) + `compose` (`Embedding` + the algebra
  `fdFn`/`scalarFn`/`precompose`/`postcompose`/`affine`). No instances.
- `configuration/` — the configuration-space **machinery**: `space` (`ConfigSpace = (T, φ)` with
  `pull`/`push`/`coords`/`metric` + `makeConfigSpace`), `paperTorus` (the `{triang, positions}`
  boundary bundle), `gauge` (canonical similarity pose, storage/dedup only).
- `coordinates/` — the coordinate-system **instances** (each builds an `Embedding`→`ConfigSpace`):
  `full`, `pin` (`pinCoords`/`pinVertices`), `symmetry` (+`RICH_SYMMETRY` = Rich's ρ), `doyleSchwartz`
  (the DS flat-#7 parameterization; a nonlinear coordinate system, currently value-only for seeding).
- `conditions/` — one self-contained module per condition (measurement + usage), plus `types`
  (`Held`/`Constraint`/`Region`): `flat` (`coneDeficit` + the V−1 constraint), `collinear` (analytic),
  `modulus` (`tau` + `fixedModulus`/`modulusWall`, frozen-chart), and `embedded/` (folder: `gate`
  `isEmbedded` · `margin` cell-gaps + `minMargin` · `energies` Fabi's `chordLengthSquared`/`cutOffArea`
  + `cellMargin` hinge + `cellBarrier` log-barrier · `region`).
- `solvers/` — problem-agnostic steppers run **entirely on ℝⁿ**, all on one J-hub: `project`
  (min-norm Gauss–Newton onto ⋂{gᵢ=0}), `flow` (Riemannian descent of a `ScalarFn` along the manifold,
  gated by a `Gate` predicate), `march` (continuation tracking a family ∩ region). They take pulled
  `Fn`s + a `Gate` (`types.ts`) — never a `Triangulation`, `Embedding`, or chart. Metric = I (the
  pullback-metric `DφᵀDφ` is a documented, deferred seam).
- `sampling/` — producing seeds: `rng`, `perturb`, `seeds` (random `perturbedSeeds`/… + deterministic
  `gridSeeds`, a finite Cartesian sweep over a coordinate system's params), `reference` (`RICH_REFERENCE`).
- `search/` — `certify` (the result record: cone deficit, embedded, margin, raw τ AND reduced τ̂),
  `collect` (rejection-sampling driver), `pull` (pull a `Constraint`/`Region` into a coordinate system),
  and the recipes `discover` (`held=[flat]`), `wall` (`held=[flat, modulusWall(c)]`) via `flattenFlowEmbed`
  (`seed → project(held) → flow(held, energy, gate=embedded) → certify`), `semiSolution`, `marchModulus`.

### Rendering — two stacks

- **Studio (path-traced), `render/` + `mesh/`** — used by `renders/`. `Studio` wraps one
  `WebGLRenderer` with a runtime-switchable WebGL ↔ `three-gpu-pathtracer` backend; `styledTorus`/
  `stage` build the gold graph-paper look; `saveTiled` exceeds GPU limits by tiling the camera.
- **TorusView (preview), `viewer/`** — the simpler three.js viewer used by interactive `demos/`.
- `io/embeddings.ts` — `parseEmbeddings(csv, torus)` turns CSV rows into `PaperTorus[]`.

## Data format

CSV result files: **one torus per line, 24 comma-separated full-precision floats** —
`x0,y0,z0, …, x7,y7,z7`. A row **does not record its triangulation type** — interpret it by pairing
with a chosen `Triangulation` (check `maxConeDeficit`/`isEmbedded`/`modulus` against it).

## Docs

`docs/math/` is the architecture, mathematically: each layer described first as math, then as code
(`README.md` overview; `configuration-space.md` the `ConfigSpace`/coordinate-system spine,
`conditions.md`, `solvers.md`, `searches.md`, `developing.md`, …). Keep it current. `docs/` also
holds figures and older design plans.
