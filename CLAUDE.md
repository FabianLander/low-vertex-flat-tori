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
npx vitest run test/moduli/develop.test.ts      # a single test file
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

These write 24-float CSV rows and are thin runners over `src/search/` (flags in each script
header). **`scripts/legacy/` is a read-only archive** — its files still import the deleted `src/math/`
and are intentionally left stale, NOT built or run.

## Architecture

### The dependency rule (load-bearing)

Everything outside `mesh/`, `viewer/`, `render/` (and the browser entries `demos/`,
`renders/`) is **pure** — no three.js, no DOM — so every algorithm runs headless under `tsx`. The
extrinsic search stack is **dependency-ordered**, each layer using only the ones below:

```
geometry/ → functions/ → { configuration/, coordinates/, constraints/, embedding/ } → solvers/ → sampling/ → search/
```

`geometry/` is the **ℝ²/ℝ³ metric floor** — pure point/vector/line/triangle math, no torus — and it sits
below *everything*. The intrinsic side rests on it too: `topology/` (combinatorial — the discrete torus +
its marking; the harmonic *scratch* layout uses `geometry/vec2`) → `triangulations/` (the 7 as data); and
`moduli/` (develop a metric torus → its modulus τ, and the space ℍ/SL(2,ℤ)) is a separate pure leaf on
`geometry/` + `topology/`, consumed by `constraints/modulus` and `search/certify`. So `geometry/` is the
one true bottom. Do not import three.js or touch `window`/`document` from any of these. **Machinery and
its instances are flat siblings, never nested** — `topology/`↔`triangulations/`, `functions/`↔`constraints/`,
`configuration/`↔`coordinates/` — because the arrow is *dependency*, not *containment* (so a
machinery-purity violation like `topology/` importing `triangulations/` is a glaring cross-folder import).

### The one concept: `Fn` — toolkit (`functions/`) vs instances (`constraints/` + `embedding/`)

The system is built from **one** thing — a differentiable map of the configuration,
`Fn : C = ℝ³ⱽ → ℝᵏ` (`value` + `jacobian`). "Constraint" and "energy" are *uses* of an `Fn`, not
separate interfaces:

- a **constraint** is an `Fn` driven to zero (`project`/`march`); held with optional usage (`Held`:
  which rows to drive). `flat` = `coneDeficit` driving V−1 rows.
- an **energy** is a scalar `Fn` (`ScalarFn`: `compute`/`grad`) descended (`flow`).

The three verbs on an `Fn` live in `functions/compose`: solve it hard (`project`/`march`), `stack` it
with others into one higher-dim `Fn`, or `leastSquares` it into the `½‖·‖²` energy `flow` descends —
so any condition can be Newton-solved OR gradient-flowed toward, and the embedded gate composes on top.

There is **no `ConstraintMap` and no `Energy` interface** — they were retired onto `Fn`/`ScalarFn`.
`functions/` is the **generic toolkit** — the `Fn`/`ScalarFn`/`Embedding` contracts (`types.ts`,
`compose.ts`) and the compose algebra (`fdFn`/`fdScalar`, `precompose`/`postcompose`/`affine`), no
torus content. The **concrete maps** live with the condition they define — the closed ones in
`constraints/`, the open embedded region in `embedding/` — the same machinery↔instances split as
`topology/`↔`triangulations/` and `configuration/`↔`coordinates/`.

### Configuration is a bare `Float64Array`

A configuration is just `positions` (length 3·V); the `Triangulation` rides in the `Fn`/`ConfigSpace`
closures, never bundled with the coordinates. There is **no global triangulation singleton, no hidden
`RICH` default** — thread the `torus` parameter (or close over it in a factory). `PaperTorus`
(`configuration/paperTorus.ts`) is the explicit `{triang, positions}` **boundary bundle** (a plain
interface) — the form a configuration takes at the serialize / render / certify edge, where it must carry
its triangulation; not used on the interior hot path.

### Intrinsic: `topology/` (combinatorics) + `triangulations/` (data)

**`topology/` is combinatorial.** It is the discrete torus — its combinatorics, homology, and the
*choice* of developing chart (cut, develop order, marking) — and it does NO geometric measurement;
that (developing a metric torus → its modulus) is `moduli/`, below.

- `topology/triangulation.ts` — the `Triangulation` type + `defineTriangulation(spec)`. Everything
  (edges, oriented vertex links, dual adjacency, develop order, gluing tree, H₁ generators, the
  combinatorial decoration types `Marking`/`FundamentalDomain`/`Attach`/`DevelopStep`) is **derived
  from the triangle list and validated by V−E+F=0** — no baked-in 8/24/16 counts.
  `defineTriangulation({ triangles })` alone yields a working torus. (The extrinsic triangle-collision
  tables are derived separately in `embedding/cells.ts`, not here.)
- `topology/trees.ts` — the shared spanning-tree primitives (primal/dual trees, tree–cotree co-edges,
  LCA `treePath`) the homology generators and the canonical marking are read off of.
- `topology/marking.ts` — `canonicalDecoration`: picks each triangulation's canonical marking (cut +
  develop order + cut-aligned H₁ generators), run **on load** by the registry (~0.1s each).
- `topology/{harmonicLayout,fundamentalDomain}.ts` — the planar-layout helpers `marking` builds on:
  the harmonic (Tutte) flat-torus embedding + the exact minimal-cut domain / centered-spiral unroll.
  The harmonic torus is a convenient *scratch* layout (not one of OUR metrics) — geometry used only as a
  *method* to choose the combinatorial marking/cut.
- `triangulations/` — the 7 types as data: `EIGHT_VERTEX`, registry `ALL_TORI`/`byId(n)`/`RICH = byId(7)`,
  computing each triangulation's marking on load.

### The modulus: `moduli/` (measure τ, and the space it lives in)

The **geometric** counterpart to combinatorial `topology/`: it develops one of OUR metric tori into the
plane and reads its modulus. `topology/` supplies the finite combinatorial data it walks along; `moduli/`
does the measurement and owns the target space.

- `moduli/develop.ts` — the developing map via per-triangle **frames** (each triangle's canonical shape
  carried by a unit-complex rotation `R_t` built along the gluing tree — no circle–circle, no branch).
  `developFrames` (the core) · `developNet` (vertex positions, for the rendered net + cut edges) ·
  `framePlan` (the cached combinatorial recipe) · `canonicalShape`/`totalArea` · `tauFromNet` (read τ off
  the developed image — the alternate route kept for the consistency check) · `cmul`/`cdiv`.
- `moduli/modulus.ts` — the measurement: `modulus` (τ ∈ ℍ **directly** from the frames — holonomy of the
  generator loops, no positions) + `tauJacobian` (the exact analytic ∂τ/∂p, forward-mode complex AD) +
  the `Modulus` record.
- `moduli/reduce.ts` — the space ℍ/SL(2,ℤ): `applyMobius`, `reduceModulus`/`reduceModulusWithMatrix`
  (the quotient + the reducing matrix for the frozen chart), and the orbifold points `SQUARE`/`HEXAGONAL`.
  Torus-blind (`Vec2` in/out).

### Extrinsic: the search stack

- `geometry/` — the **ℝ²/ℝ³ metric floor** (torus-blind; the one bottom both halves rest on):
  `vec2`/`vec3` (the `Vec2`/`Vec3` point types + tuple ops), `triangle` (single-simplex math —
  `cornerAngle`+`cornerAngleGrad`, `triangleNormal`/`Area`/`SignedArea2`, `signedVolume6`,
  `planeCutRatio`), `distance` (point/segment/triangle), `intersectionChord` (`triTriChord`),
  `triangleIntersect` (the Möller–Trumbore predicates behind `isEmbedded`), and `curve` (`PlaneCurve`).
  Two tiers: tuple ops for cold code, allocation-free scalar/buffer kernels for the hot search loops.
- `functions/` — the generic toolkit: `types` (`Fn`/`ScalarFn`) + `compose` (`Embedding` + the algebra
  `fdFn`/`scalarFn`/`precompose`/`postcompose`/`affine`, plus `stack` — combine conditions into one
  higher-dim `Fn` — and `leastSquares` — soften a condition into the `½‖·‖²` energy `flow` descends).
  No instances. A condition is one `Fn`: `project`/`march` solve it hard, `leastSquares`+`flow` move
  toward it soft, `stack` combines.
- `configuration/` — the configuration-space **machinery**: `space` (`ConfigSpace = (T, φ)` with
  `pull`/`push`/`coords`/`metric` + `makeConfigSpace`), `paperTorus` (the `{triang, positions}`
  boundary bundle), `csv` (the bundle's CSV form).
- `coordinates/` — the coordinate-system **instances** (each an `Embedding` φ with both `push` and
  `coords`): `full`, `pin` (`pinCoords`/`pinVertices`), `symmetry` (+`RICH_SYMMETRY` = Rich's ρ), and
  `normalized` (+`normalizePose`) — the gauge-fixed section of C → C/Sim (kills the 7 similarity DOF,
  3V−7 free coords; the realization-side mirror of `moduli/reduce`; replaces the old `gauge`).
- `constraints/` — the **closed** conditions `{g=0}` you *project onto* (+ `types` `Held`/`Constraint`):
  `flat` (`coneDeficit` + the V−1 constraint), `collinear` (analytic), `modulus` — the **point/line/circle
  × Teichmüller/moduli grid**: `pinTeichmuller`/`pinModuli` (the chart) × `point`/`verticalLine`/`circle`
  (the locus), each `postcompose(locus, chart∘tau)` and fully analytic; named cells `fixedModulus`,
  `modulusWall`. (`tau`, `mobiusMap` consume `moduli/`.)
- `embedding/` — the **open** condition Ω you *stay inside* (the search's hard part): `embedded`
  (`isEmbedded` gate + `clearance`, its continuous companion) · `separation` (`minSeparation`, the honest
  cell-to-cell diagnostic, + the fatten-energy cell-gap substrate) · `energies/` (overlap — Fabi's
  `chordLengthSquared`/`cutOffArea`, drive a crossing torus onto Ω; fatten — `cellMargin`/`cellBarrier`,
  push an embedded one deeper) · `cells` (`cellTables`) · `index`. **No `Region` type** — `flow`/`march`
  take a `Gate` predicate built from `isEmbedded`.
- `solvers/` — problem-agnostic steppers run **entirely on ℝⁿ**, all on one J-hub: `project`
  (min-norm Gauss–Newton onto ⋂{gᵢ=0}), `flow` (Riemannian descent of a `ScalarFn` along the manifold,
  gated by a `Gate` predicate), `march` (continuation tracking a family ∩ region). They take pulled
  `Fn`s + a `Gate` (`types.ts`) — never a `Triangulation`, `Embedding`, or chart. Metric = I (the
  pullback-metric `DφᵀDφ` is a documented, deferred seam).
- `sampling/` — producing seeds: `rng`, `perturb`, `seeds` (random `perturbedSeeds`/… + deterministic
  `gridSeeds`, a finite Cartesian sweep over a coordinate system's params), `reference` (`RICH_REFERENCE`).
- `search/` — `certify` (the result record: cone deficit, embedded, margin, raw τ AND reduced τ̂),
  `collect` (rejection-sampling driver), `pull` (pull a `Constraint`/gate into a coordinate system),
  and the recipes `discover` (`held=[flat]`), `wall` (`held=[flat, modulusWall(c)]`) via `flattenFlowEmbed`
  (`seed → project(held) → flow(held, energy, gate=embedded) → certify`), `semiSolution`, `marchModulus`.

### Rendering — one subject, the k-cells realized (`mesh/` + `viewer/` + the `render/` harness)

The impure boundary (three.js, DOM). One shape — **`triang → (positions → three.js)`**, the visual
sibling of `coneDeficit(triang)`: a viewer **closes over the triangulation** (the parts' buffers are
sized by V/E/F) and **streams bare positions**. It is NOT a `ConfigSpace` and never `pull`s — it
consumes already-realized ℝ³ points. `PaperTorus` is only the boundary envelope (`fromPaper`).

- `mesh/` — the geometry **parts**, the triangulation's **k-cells realized in ℝ³**, under one `Part`
  contract (`part.ts`: `domain` ∈ {vertex,edge,face} + `cellCount`): `vertices` (0-cells → spheres),
  `edges` (1-cells → tubes) — both via the shared `instanceGroup` scaffolding — and `faces` (2-cells →
  one non-indexed mesh; flat shading + per-face uv/tint need one geometry). Plus `section` (plane ∩
  polyhedron → ordered, measurable loops), `obj` (OBJ export), and the pure helpers `orient`/`uv`/`splat`.
  **All real geometry** (no `LineSegments`/`InstancedMesh`) ⇒ identical in WebGL + path tracer.
- `viewer/` — `makeTorusView(triang, opts)`, **the one subject** (replaces the old TorusView + TorusMesh):
  assembles the chosen parts, `draw(positions)` streams, `paint{Vertices,Edges,Faces}(values, palette)`
  color a cell-domain from a **condition's** scalar field (e.g. `coneAngleDeficits`) — the view stays dumb
  about meaning, the demo wires `condition → channel`. Plus the decorations (`slicePlane`, `developedSheet`,
  `modulusCell`) and the appearance (`materials`, `gridTexture`, `normalMap`, `palette`). Material ownership
  is **Model A** — the creator frees (the subject frees what it builds; injected/shared materials stay the caller's).
- `render/` — the **harness** only: `Studio` (runtime-switchable WebGL ↔ `three-gpu-pathtracer`;
  `saveTiled` tiles the camera past GPU limits), `stage` (lights/env/ground), `controls`.

Serialization lives with what it serializes: `configuration/csv.ts` is the bundle's CSV form
(`positions ⇄ row`: `parseEmbeddings`/`paperFromRow` read, `paperToRow` writes); `mesh/obj.ts` exports
the polyhedron as OBJ. (The old `io/` folder dissolved into these two homes.)

## Data format

CSV result files: **one torus per line, 24 comma-separated full-precision floats** —
`x0,y0,z0, …, x7,y7,z7`. A row **does not record its triangulation type** — interpret it by pairing
with a chosen `Triangulation` (check `maxConeDeficit`/`isEmbedded`/`modulus` against it). The format's
home is `configuration/csv.ts` (`parseEmbeddings`/`paperFromRow` read, `paperToRow` writes).

## Docs

`docs/math/` is the architecture, mathematically: each layer described first as math, then as code
(`README.md` overview; `configuration-space.md` the `ConfigSpace`/coordinate-system spine,
`conditions.md`, `solvers.md`, `searches.md`, `developing.md`, …). Keep it current. `docs/` also
holds figures and older design plans.
