# low-vertex-flat-tori

Numerically discovering **flat, embedded 8-vertex tori**, following Rich Schwartz's
vertex-minimal construction (`rich/`).

A flat torus is intrinsically a flat sheet ℝ²/Λ. The challenge is realizing one with only
**8 vertices** as a straight-edge polyhedron in ℝ³ that is both *flat* (every vertex has cone
angle exactly 2π) and *embedded* (no two triangles cross). There are **7 combinatorial types**
of 8-vertex torus triangulation (each V=8, E=24, F=16); only type **#7** is degree-6-regular —
the other six mix degree 5/7, so nothing in the pipeline assumes degree 6.

## The mathematics, in layers

The repository is organized so the code reads like the mathematics. See **[`docs/math/`](docs/math/)**
for the full write-up of each layer.

1. **The torus** — the *topology* (a genus-1 surface). Never an object, just the fact that
   `V − E + F = 0`.
2. **A [triangulation](docs/math/triangulation.md)** — the *discrete topology*: a combinatorial
   structure realizing the torus. Pure combinatorics, all derived from a triangle list.
3. **A [fundamental domain](docs/math/fundamental-domain.md)** — a developing *chart*: how to cut
   the torus open along a minimal graph and unroll it into the plane. A presentation choice.
4. **A [marking](docs/math/marking.md)** — a basis of `H₁(T²,ℤ)`, two oriented loops. The
   Teichmüller marking.
5. **The [developing map](docs/math/developing.md)** — unfold a flat realization → read the
   holonomy of the marking → its modulus **τ ∈ ℍ** (its point in **Teichmüller** space). Forget
   the marking (the `SL(2,ℤ)` quotient, `reduceModulus`) → **moduli** space.

These five are *intrinsic* — true independent of any embedding. Realizing the flat torus as a
polyhedron in ℝ³, and *searching* for flat embedded ones, is the **extrinsic** half.

## Layout

```
src/topology/        the intrinsic flat torus, as generic machinery — works on ANY triangulation:
  triangulation.ts     the Triangulation builder + types (combinatorics, derived & Euler-checked)
  fundamentalDomain.ts the developing chart — minimal cut + centered-spiral unroll order
  marking.ts           the H₁ generators (canonicalDecoration), the SavedMarking type
  develop.ts           the developing map → τ, and reduceModulus → moduli
  harmonicLayout.ts    a combinatorial flat-structure helper (period-jump cocycle for generators)
  tutteLayout.ts       abstract cut-polygon drawing
  (depends on nothing else in src/)

src/triangulations/  the specific triangulations we study, as DATA — scales to many:
  eightVertex.ts       the 7 V=8 lists (a census); add nineVertex.ts, … later
  index.ts             the registry: ALL_TORI, RICH, byId — maps the census through the builder
  markings.generated.ts  the derived marking cache (npm run compute-markings)
  (depends on topology)

src/math/            the EXTRINSIC half — realization in ℝ³ and the search:
  embedding.ts (PaperTorus), angles.ts (cone-angle flatness), embedded.ts (self-intersection),
  newton.ts (flatten), energies/, embeddedFlow.ts (the descent), normalize.ts (canonical pose),
  reference.ts (Rich's known embedding, a fixture/seed)

src/mesh|render|viewer|io   three.js geometry, the path-traced Studio, the preview viewer, CSV ⇄ PaperTorus
demos/ renders/      browser entry points (interactive demos; path-traced figures)
scripts/             headless Node CLI tools (sampling, search, validation, compute-markings)
data/                CSV result sets (one torus per row, 24 floats)
```

The dependency rule: **`src/topology` and `src/triangulations` never import three.js or touch the
DOM**, and `topology` depends on nothing — so every intrinsic algorithm runs headless under `tsx`.
The arrow is one-way: `triangulations → topology`; `src/math` builds on both; rendering sits on top.

## Two pipelines

**1. Discovery — find a flat embedded torus.** `scripts/sample-flat.mjs`: sample a seed →
`newtonFlatten` (land on the flatness manifold, cone angles → 2π) → `embeddedFlow` (descend a
repulsion energy, re-flattening each step) → verify `maxConeDeficit < tol` **and** `isEmbedded`.
Accepted tori are written as CSV rows.

**2. Develop — compute the modulus τ.** `develop.ts` unfolds a flat torus along its fundamental
domain and reads the holonomy of the two generator loops to get its point τ ∈ ℍ in Teichmüller
space. Validate the whole pipeline:

```
npx tsx scripts/develop-check.mjs [path/to.csv]   # defaults to data/explore-from-seeds/seeds.csv
```

It asserts covolume = intrinsic area, rotational defect ≈ 0, and cone deficit ≈ 0, then prints τ
and its SL(2,ℤ)-reduced τ̂.

## Running

Install once: `npm install`.

```
npm run dev <demo>        # serve a demo (vite). Omit <demo> to list them.
npm run build <demo>      # self-contained build → dist/<demo>/
npm run compute-markings  # recompute & save the marking cache (after adding/changing a triangulation)
npm test                  # vitest
npx tsc --noEmit          # the typecheck — there is no separate linter
```

> `npm run dev <demo>` writes a gitignored `.dev/<demo>.html` and serves it on a **stable per-demo
> port** (a hash of the name, 5200–5599), so demos never collide and run in parallel. `build`
> rewrites the tracked `index.html`, so `git status` shows it modified after a build.

### Adding a triangulation

Add an entry `{ name, triangles }` to the census (`src/triangulations/eightVertex.ts`, or a new
per-vertex-count file), then `npm run compute-markings` to fill its marking. Nothing else — the
builder derives all combinatorics and validates `V − E + F = 0`; the marking is computed, not
authored. No vertex/edge/face count is hard-wired.

## Data format

CSV result files (`data/`): **one torus per line, 24 comma-separated full-precision floats** in
`x0,y0,z0, …, x7,y7,z7` order — exactly a `PaperTorus`'s `positions`. A row records only points;
interpret it by pairing with a chosen triangulation. `.bin` files are the same 24-float packing
in Float32.

## Normalization convention

`src/math/normalize.ts` puts an 8-vertex torus into a **canonical pose** under the similarity
group of ℝ³ (translation ⊕ rotation ⊕ uniform scale = 7 DOF): vertex 0 at the origin, vertex 1 at
(1,0,0), vertex 2 in the xy-plane with y₂ ≥ 0. That removes the 7 similarity DOF, leaving **24 − 7
= 17** free numbers (`toReduced`/`fromReduced`). Only proper rotations are used, so chirality is
preserved, not quotiented.
