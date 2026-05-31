# CLAUDE.md

## What this is

A search engine + visualizer for **flat, embedded 8-vertex paper tori**: piecewise-linear
torus embeddings in R³ where every vertex has cone angle exactly 2π (intrinsically flat,
buildable from flat paper triangles) and no two faces intersect (embedded). It's a TypeScript
port of Rich Schwartz's research code.

Mental model: **the combinatorics are fixed; only the 8 vertex coordinates vary.** The 16
triangles / 24 edges / vertex links live in `src/math/topology.ts` and are a global constant.
A configuration is a valid result only when it is **both** flat (`maxConeDeficit < tol`)
**and** `isEmbedded` — neither check alone is sufficient.

## Layout

- `src/math/` — headless geometry: topology, `PaperTorus`, cone angles, Newton flattener,
  repulsion `energies/`, `embeddedFlow` (Newton → descent → re-Newton), embeddedness test.
- `src/viewer/` — three.js rendering (`TorusView`, coloring palette).
- `demos/` — one folder per demo (`reference`, `animate`, `grid`, `grid-25`, `flat-samples`, …).
- `scripts/` — `.mjs` runners (import `.ts` directly via `tsx`), incl. the search sampler.
- `rich/` — original Java/Mathematica papers (see below).

## Commands

- `npm run dev <demo-name>` — serve a demo. **This rewrites the script path in `index.html`**;
  that edit is a side effect, not a change to commit.
- `npm run build <demo-name>` / `npm run preview <demo-name>`.
- `npm run sample-flat -- [options]` — run the flat-embedded search. Options (`--seed`,
  `--seed-mode`, `--energy`, `--angle-tol`, …) are documented in the header of
  `scripts/sample-flat.mjs`.

## Verification

There is no test suite. The gate before considering a change done is a clean strict compile:

```
npx tsc --noEmit
```

`tsconfig.json` is strict (`noUnusedLocals`, `noUnusedParameters`, etc.), so dead bindings
fail the build.

## Hard rules

- **Keep `src/math/` pure.** No three.js, no DOM — it's headless geometry consumed by both the
  viewer and the Node scripts. Rendering belongs only in `src/viewer/` and `demos/`.
- **`rich/` is read-only reference.** It holds the original Java/Mathematica from the papers and
  the canonical coordinates ported into `src/math/reference.ts`. Read it to cross-check the math;
  never edit or refactor it.

## Conventions

- Sample CSVs are 24 full-precision floats per line (`x0,y0,z0,…,x7,y7,z7`), written with
  `Number.prototype.toString()` so each round-trips exactly. Curated finds in
  `demos/flat-samples/samples/` are tracked; raw runs land in the gitignored root `samples/`.
  See `demos/flat-samples/samples/README.md`.
- Source files carry thorough header comments — read the relevant file before changing it
  rather than relying on this summary.
