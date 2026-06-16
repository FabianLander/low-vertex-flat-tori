# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Numerically discovering **flat, embedded 8-vertex tori** (Rich Schwartz's vertex-minimal
construction, `rich/`). A flat torus is intrinsically a flat sheet ℝ²/Λ; the challenge is
realizing one as a straight-edge polyhedron in ℝ³ that is both *flat* (every vertex has cone
angle exactly 2π) and *embedded* (no two triangles cross). There are **7 combinatorial types**
of 8-vertex torus triangulation (V=8, E=24, F=16). Only type **#7 (Rich's)** is degree-6-regular;
the other six mix degree 5/7 — so **nothing may assume degree 6**.

## Commands

```bash
npm install                       # once

npm test                          # vitest run (all *.test.ts under src/)
npm run test:watch
npx vitest run src/math/develop.test.ts        # a single test file
npx vitest run -t "modulus"                    # tests matching a name

npx tsc --noEmit                  # typecheck — this is the lint (no eslint configured)
```

There is **no linter**: `tsc --noEmit` under a strict tsconfig is the gate. Note
`erasableSyntaxOnly` is on, so **no TS-only runtime constructs** (no `enum`, no constructor
parameter-properties like `constructor(readonly x)`, no `namespace`); `verbatimModuleSyntax`
requires `import type` for type-only imports; imports use explicit `.ts` extensions.

### Demos / renders (browser, vite)

```bash
npm run dev <name>        # serve a demo or render (omit <name> to list all)
npm run build <name>      # self-contained build → dist/<name>/
npm run preview <name>
```

`scripts/run-demo.mjs` discovers entries from **both** `demos/` and `renders/` (each is a
folder with a `main.ts`). `dev` writes a gitignored `.dev/<name>.html` and serves it on a
**stable per-name port** (hash → 5200–5599), so demos never collide and can run in parallel.
`build`/`preview` rewrite the tracked `index.html`, so `git status` will show `index.html`
modified after a build — that's expected.

### Search / develop scripts (headless, tsx)

```bash
npm run sample-immersed -- --type N --count K --out path.csv   # flat (cone-angle) only
npm run sample-flat     -- --type N --seed-mode uniform        # flat AND embedded
npm run sample-flat-nonrich -- [opts]                          # fans sample-flat over types 1–6
npm run sample          -- [opts]                              # rejection-sample embedded→flat → .bin
npm run polish-rect     -- [opts]                              # project near-rect samples exactly onto Re τ̂ = 0 → seed pool
npm run sample-rect     -- [opts]                              # random walk ON the rectangular locus (flat ∧ Re τ̂ = 0, embedded)
npm run near-rect       -- [opts]                              # perturb→flatten→filter walk toward |Re τ̂| = --target-re (0 or 0.5)
npm run curate-gallery  -- [opts]                              # collect best examples per Im bucket → demos/rect-gallery/gallery.csv
npm run fatten / barrier                                       # push samples to larger embedding margin
npx tsx scripts/develop-check.mjs [csv]                        # validate develop→τ pipeline
```

`--type N` (1–7) selects the triangulation; default 7 = Rich. Types 1–6 have no reference
embedding, so use `--seed-mode uniform`. Every script documents its flags in a header comment.

## Architecture

### The dependency rule (load-bearing)

`src/math/` and `src/tori/` are **pure** — no three.js, no DOM. This is why every algorithm
runs headless under `tsx` in `scripts/`. Rendering (`src/render/`, `src/mesh/`, `src/viewer/`)
and the browser entries (`demos/`, `renders/`) sit strictly on top. Do not import three.js or
touch `window`/`document` from `src/math` or `src/tori`.

### Torus is threaded explicitly — no global singleton, no `= RICH` defaults

Every pure function takes a `Torus` as an explicit argument; `PaperTorus`/`TorusView` hold one;
energies are `makeX(torus, opts)` factories. There is deliberately **no module-level triangulation
singleton and no hidden `RICH` default** — if you find yourself wanting one, thread the `torus`
parameter instead.

- `tori.ts` (repo root) — the 7 raw triangulations as `TORUS_8V` (vertices 0..7).
- `src/tori/defineTorus.ts` — the `Torus` type + `defineTorus(spec)` builder. Everything
  (vertexCount, edges, oriented vertex links, dual adjacency, attach tree, cell-pair tables) is
  **derived from the triangle list and validated by the Euler characteristic V−E+F=0** — there
  are no baked-in 8/24/16 counts. `developOrder` and `generatorLoops` are optional (auto-derived
  via `autoDevelopOrder` / `homologyGenerators` tree-cotree). `edgeKey`/`edgeEnds` pack an
  undirected edge into one int. **`defineTorus({ triangles })` alone yields a working torus**, so
  the pipeline is triangulation-independent — you can drop in any new triangulation.
- `src/tori/index.ts` — registry: `ALL_TORI` (ids 1..7), `RICH = torus7`, `byId(n)`.

### The pure-math pipeline (`src/math/`)

- `embedding.ts` — `PaperTorus`: a `Torus` + its positions (`Float64Array` of `vertexCount*3`).
- `angles.ts` — cone angles and deficits (2π − coneAngle); the flatness residual.
- `newton.ts` — `newtonFlatten`: min-norm Gauss–Newton projection onto the flatness manifold.
- `embedded.ts` — `isEmbedded` / `firstViolation` (triangle–triangle intersection).
- `energies/` — pluggable `RepulsionEnergy` factories (chord², cut-off-area, cell-margin).
- `embeddedFlow.ts` — alternating "Newton → gradient step → Newton" descent on a repulsion energy.
- `develop.ts` — unfold the triangulation into the plane; read the holonomy of two marked
  generator loops to get the modulus τ ∈ ℍ (Teichmüller point).
- `harmonicLayout.ts` / `tutteLayout.ts` / `latticeLayout.ts` — planar fundamental-domain layouts
  for figures and the develop demos. **`latticeLayout` (equilateral) is valid only for #7.**
- `normalize.ts` — canonical pose under the ℝ³ similarity group (7 DOF → 17 reduced coords). This
  one file is intrinsically **8-vertex-specific**; everything else is triangulation-generic.
- `reference.ts` — `RICH_REFERENCE`. The **only** non-test core file that legitimately uses
  `RICH`, since it's #7's hand-authored reference embedding.

### Two pipelines

1. **Discovery** (`scripts/sample-flat.mjs`): seed → `newtonFlatten` (land on the flatness
   manifold) → `embeddedFlow` (descend a repulsion energy, re-flattening each step) → verify
   `maxConeDeficit < tol` **and** `isEmbedded` → write accepted tori as CSV rows.
2. **Develop** (`develop.ts`): unfold a flat torus → its point τ ∈ ℍ. `sample-immersed` skips the
   embedding check (flat immersions only); `sample-flat` requires both.

### Rendering — two stacks

- **Studio (path-traced), `src/render/` + `src/mesh/`** — used by `renders/` (census,
  rich-birthday*, portrait, styles). `Studio` wraps one `WebGLRenderer` with a runtime-switchable
  backend: fast WebGL preview ↔ accumulating `three-gpu-pathtracer`. `styledTorus`/`paper`/`stage`
  build the gold graph-paper material, back wall, and soft spotlight; `controls.ts` is the
  reusable render/resolution/save UI. `setResolutionScale` clamps to single-buffer GPU limits;
  `saveTiled` exceeds them by tiling the camera (`setViewOffset`) and compositing on a 2D canvas.
- **TorusView (preview), `src/viewer/`** — the older, simpler three.js viewer + color palette used
  by interactive `demos/`.
- `src/io/embeddings.ts` — `parseEmbeddings(csv, torus)` / `paperFromRow(torus, row)` turn CSV
  rows into `PaperTorus[]` against a chosen triangulation.

`demos/` are interactive search/topology tools (e.g. `tori-grid`, `develop-winding`,
`tutte-gallery`, `moduli-trace`); `renders/` are path-traced figures.

## Data format

CSV result files: **one torus per line, 24 comma-separated full-precision floats** —
`x0,y0,z0, …, x7,y7,z7`, exactly a `PaperTorus`'s `positions`. `.bin` files (from
`sample-embedded.mjs`) are the same 24-float packing in Float32. A CSV row **does not record its
triangulation type** — it's just points; interpret it by pairing with a chosen `Torus` (check
`maxConeDeficit`/`isEmbedded`/`modulus` against that triangulation). Exception:
`search-near-rect.mjs` output appends a certificate — `…,x7,y7,z7, maxConeDeficit, Re τ̂, Im τ̂`
(27 cols); take the first 24 for the embedding.

## Notes

- `README.md` is partly **stale** (it predates the multi-type refactor: it still mentions a
  `src/math/topology.ts` singleton, "every vertex degree 6", and `src/viewer` as the only render
  layer). Trust the code over the README for the tori/render structure.
- `docs/` keeps a "paper-sheet" realization reformulation that was **explored and set aside** — the
  flatten-first discovery pipeline above is the committed approach, not that.
