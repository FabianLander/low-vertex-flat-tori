# Curated flat embedded 8-vertex tori

This folder holds **curated, tracked** sample files: explicit coordinates for flat, embedded, 8-vertex paper tori found by the search pipeline. They are committed because they are genuinely hard to find (the sampler's accept rate is very low) and worth preserving. Raw sampler runs go to the repo-root `samples/` directory, which is gitignored; promote a good find by moving its CSV here.

The `flat-samples` demo reads every `*.csv` in this folder (via `import.meta.glob('./samples/*.csv')`), so dropping a new file here and refreshing the page is all that's needed to view it.

## File format

Each file is comma-separated values, **one torus per line, 24 floats per line**:

```
x0,y0,z0,x1,y1,z1,...,x7,y7,z7
```

i.e. the 3D coordinates of the 8 vertices in order. Values are written with `Number.prototype.toString()`, so each round-trips exactly to its IEEE-754 double under `Number(field)` — these are the full-precision coordinates, not rounded. The combinatorics (which triples of vertices form the 16 triangles) are fixed and live in [`src/math/topology.ts`](../../../src/math/topology.ts); only the coordinates vary between samples.

Filenames follow the sampler's convention `flat-<epoch-ms>-<NNN>.csv` (see [`scripts/sample-flat.mjs`](../../../scripts/sample-flat.mjs)); the timestamp is the run's launch time, not a seed.

## What "flat and embedded" means here

Every row was accepted only after passing two explicit checks at the end of the search ([`scripts/sample-flat.mjs`](../../../scripts/sample-flat.mjs)):

- **Flat:** `maxConeDeficit < angle-tol` (default `1e-10`) — every vertex's cone angle is within tolerance of 2π, so the surface is intrinsically Euclidean (zero curvature) at each vertex.
- **Embedded:** `isEmbedded(positions)` is true — no two triangle interiors intersect ([`src/math/embedded.ts`](../../../src/math/embedded.ts)).

Coordinates here are stored **as found** (raw scale and position). Flatness and embeddedness are invariant under translation and uniform scaling, so the demo normalizes each torus for display (centroid → 0, RMS centroid-distance → 1); the raw files intentionally keep the original values.

## Provenance

All rows in `flat-1780155692970-000.csv` were accumulated by a single long-running search, seeding from the uniform cube (not from Rich's reference torus):

```
npm run sample-flat -- --seed 2010769655 --seed-mode uniform \
  --max-flow-iters 10000 --report-secs 30
```

(The original invocation also passed `--momentum 0.5 --early-reject-iters 1000 --early-reject-ratio 0.5`, but `sample-flat.mjs` does not parse those flags — they had no effect on the run. Recorded here only so the exact command line is reproducible.)

This is a curated snapshot: the live run keeps appending to the gitignored repo-root copy, so the root file may have more rows than this tracked one. Re-copy it here when you want to promote new finds.

| File | Rows | Seed | Mode | Notes |
|------|-----:|------|------|-------|
| `flat-1780155692970-000.csv` | 7 | `2010769655` | `uniform` | snapshot of the run above |
