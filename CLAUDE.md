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

These write 24-float CSV rows and are thin runners over `src/core/search/` (flags in each script
header). **`scripts/legacy/` is a read-only archive** — its files still import the deleted `src/math/`
and are intentionally left stale, NOT built or run.

## Architecture

### Three rings: `src/{core, display, app}`

`src/` is split into three rings by **purity**, the load-bearing invariant made visible as folders:

- **`src/core/`** — the pure, headless, `tsx`-runnable heart: **no three.js, no DOM**. Every algorithm
  here runs under `tsx`. Holds the 12 dependency-ordered folders (`geometry … search`, below) as flat
  siblings.
- **`src/display/`** — `viewer`, `mesh`: turn a torus into three.js objects.
- **`src/app/`** — `render`: the torus-blind three.js scene / path-trace / present harness (room here for
  `app/animation/`, `app/backgrounds/` later).

Imports cross folders through **ring aliases** (configured in tsconfig + vite + vitest): `@core/*`,
`@display/*`, `@app/*` (e.g. `import { byId } from '@core/triangulations'`). Same-folder imports stay
relative (`./x`). The rings layer one-way: `display`/`app` depend on `core`; **`core` never imports
`display`/`app`** (a `@display`/`@app` import inside `src/core/` is a glaring purity violation). `app`'s
`render` is torus-blind and imports nothing from `src/`; the browser entries (`demos/`/`renders/`)
are the glue that wires a `display` view into an `app` studio.

### The dependency rule (load-bearing)

Inside `src/core/`, the extrinsic search stack is **dependency-ordered**, each layer using only the ones
below (all flat siblings within `core/`):

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
separate map types:

- a **constraint** is an `Fn` `fn` paired with a `target` value it is driven to — `{ fn, target }`,
  a *function equated to a value* `{fn(x) = target}` (solved by `project`/`continuation`; `target`
  absent ⟺ 0). A bare `Fn` is a MAP, not a constraint — the sharpened line `coneDeficit` (map) vs
  `flat` (constraint); a rank-deficient `fn` states its rank at the source (`flat`'s `fn` emits its
  V−1 independent rows).
- an **energy** is a scalar `Fn` (`ScalarFn`: `compute`/`grad`) descended (`minimize`).

The three verbs on an `Fn` live in `functions/compose`: solve it hard (`project`/`continuation`),
`stack` it with others into one higher-dim `Fn`, or `leastSquares` it into the `½‖·‖²` energy
`minimize` descends — so any condition can be Newton-solved OR gradient-descended toward, and the
embedded `Region` composes on top.

There is **no `ConstraintMap`, no `Energy`, no `SmoothMap`, and no `Embedding`** — they were all
retired onto the one `Fn` (a map ℝⁿ → ℝᵏ with `inDim`/`outDim` + `value`/`jacobian`; `ScalarFn` =
`outDim 1`). A reparameterization φ and a Möbius chart are bare `Fn`s; an energy is a `ScalarFn`; a
constraint is a thin `{ fn, target }` over an `Fn` (and a locus is just a constraint living on ℍ).
`functions/` is the **generic toolkit** — the `Fn`/`ScalarFn` contracts (`types.ts`) and the
algebra (`fdFn`/`fdScalar`/`scalarFn`/`affine`, the one chain-rule `compose`, `stack`, `leastSquares`),
no torus content. The **concrete maps** live with the condition they define — the closed ones in
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

- `topology/triangulation.ts` — the `Triangulation` type + the builder. The cheap combinatorics
  (edges, oriented vertex links, dual adjacency, degree sequence) are **derived from the triangle list
  and validated by V−E+F=0** (+ manifold edges, single-cycle links, coherent orientation) — no
  baked-in 8/24/16 counts. `deriveCombinatorics(triangles)` derives them; `makeTriangulation(data,
  marking)` joins them with a **precomputed** `Marking` into one torus. Types: `TriangulationData`
  (the stored input `{ id, triangles, label? }`), `Marking` (the developing chart — loops + cut +
  develop order, in readable vertex/edge/face numbers), `Combinatorics`, `Attach`, `DevelopStep`. It
  **never imports `marking.ts`** (the marking arrives precomputed, so building stays cheap). (The
  extrinsic triangle-collision tables are derived separately in `embedding/cells.ts`, not here.)
- `topology/trees.ts` — the shared spanning-tree primitives (primal/dual trees, tree–cotree co-edges,
  LCA `treePath`) the homology generators and the canonical marking are read off of.
- `topology/marking.ts` — `canonicalMarking(combinatorics)`: computes a triangulation's canonical
  marking (cut + develop order + cut-aligned H₁ generators). The **expensive** step (harmonic layout +
  exact min-cut); run **OFFLINE** by `scripts/compute-markings` (which writes
  `triangulations/markings.generated.ts`), never at load — so the heavy code is out of the runtime.
- `topology/{harmonicLayout,fundamentalDomain}.ts` — the planar-layout helpers `marking` builds on:
  the harmonic (Tutte) flat-torus embedding + the exact minimal-cut domain / centered-spiral unroll.
  The harmonic torus is a convenient *scratch* layout (not one of OUR metrics) — geometry used only as a
  *method* to choose the combinatorial marking/cut.
- `triangulations/` — the tori as **two stored things joined by id**: `eightVertex.ts`
  (`EIGHT_VERTEX`, the combinatorics as `TriangulationData`, ids `v8-1`…`v8-7`) and
  `markings.generated.ts` (`MARKINGS`, the precomputed markings, generated by `compute-markings`,
  committed). The registry `ALL_TORI`/`byId('v8-7')`/`RICH = byId('v8-7')` joins them via
  `makeTriangulation` — an eager const array, since building **loads** the marking, not computes it.

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
- `functions/` — the generic toolkit: `types` (just `Fn` = a map ℝⁿ→ℝᵏ with `inDim`/`outDim` +
  `value`/`jacobian`; `ScalarFn` = `outDim 1`) + `compose` (the builders `fdFn`/`scalarFn`/`fdScalar`/
  `affine`; the one chain-rule `compose` — which is both the pullback `g∘φ` and the post-map `locus∘τ`;
  `stack` — combine conditions into one higher-dim `Fn`; `leastSquares` — soften a condition into the
  `½‖·‖²` energy `minimize` descends). No instances, no separate "smooth map"/"embedding" type. A condition
  is one `Fn`: `project`/`continuation` solve it hard, `leastSquares`+`minimize` move toward it soft, `stack` combines.
- `configuration/` — the configuration-space **machinery**: `space` (`ConfigSpace = (T, φ)` with
  `pull`/`push`/`coords`/`metric` + `makeConfigSpace`), `paperTorus` (the `{triang, positions}`
  boundary bundle), `csv` (the bundle's CSV form).
- `coordinates/` — the coordinate-system **instances** (each a map (`Fn`) φ paired with both `push` and
  `coords`): `full`, `pin` (`pinCoords`/`pinVertices`), `symmetry` (+`RICH_SYMMETRY` = Rich's ρ), and
  `normalized` (+`normalizePose`) — the gauge-fixed section of C → C/Sim (kills the 7 similarity DOF,
  3V−7 free coords; the realization-side mirror of `moduli/reduce`; replaces the old `gauge`).
- `constraints/` — the **closed** conditions `{fn=target}` you *project onto* (+ `types`:
  `Constraint = { fn, target? }`): `flat` (its `fn` emits the V−1 independent cone-deficit rows),
  `collinear` (analytic), `modulus` — the **point/line/circle × Teichmüller/moduli grid**:
  `pinTeichmuller`/`pinModuli` (the chart) × `point`/`verticalLine`/`circle` (the locus, itself a
  `Constraint` on ℍ), each pinning `{ fn: compose(locus.fn, chart∘tau), target: locus.target }` and
  fully analytic; named cells `fixedModulus`, `modulusWall`. (`tau`, `mobiusMap` consume `moduli/`.)
- `embedding/` — the **open** condition Ω you *stay inside* (the search's hard part): `embedded`
  (`isEmbedded` gate + `clearance`, its continuous companion) · `separation` (`minSeparation`, the honest
  cell-to-cell diagnostic, + the fatten-energy cell-gap substrate) · `energies/` (overlap — Fabi's
  `chordLengthSquared`/`cutOffArea`, drive a crossing torus onto Ω; fatten — `cellMargin`/`cellBarrier`,
  push an embedded one deeper) · `cells` (`cellTables`) · `index`. The **`Region`** contract
  ({`contains`, optional `margin`}) lives in `embedding/types.ts` (mirroring `constraints/types.ts`);
  `minimize`/`continuation` stay inside it.
- `solvers/` — problem-agnostic steppers run **entirely on ℝⁿ**, all on one QR kernel (`qr.ts`,
  `Jᵀ = QR` → the min-norm step + the tangent projection): `project` (min-norm Gauss–Newton onto
  ⋂{gᵢ=0}), `minimize` (Riemannian descent of a `ScalarFn` along the manifold, staying in a `Region`),
  `continuation` (tracking a `Family` ∩ region). They take pulled `Fn`s + a `Region`/`Family` — never a
  `Triangulation`, coordinate system, or chart. Metric = I (the
  pullback-metric `DφᵀDφ` is a documented, deferred seam).
- `sampling/` — producing seeds: `rng`, `perturb`, `seeds` (random `perturbedSeeds`/… + deterministic
  `gridSeeds`, a finite Cartesian sweep over a coordinate system's params), `reference` (`RICH_REFERENCE`).
- `search/` — `certify` (the result record: cone deficit, embedded, margin, raw τ AND reduced τ̂),
  `collect` (rejection-sampling driver), `pull` (pull a `Constraint`/`Region` into a coordinate system),
  and the recipes `discover` (`held=[flat]`), `wall` (`held=[flat, modulusWall(c)]`) via `flattenFlowEmbed`
  (`seed → project(held) → minimize(held, energy, region=embedded) → certify`), `semiSolution`, `marchModulus`.

### Rendering — one subject, the k-cells realized (`display/` = `mesh/` + `viewer/`; `app/` = `render/` harness)

The impure boundary (three.js, DOM) — the `display` and `app` rings. One shape — **`triang → (positions → three.js)`**, the visual
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
