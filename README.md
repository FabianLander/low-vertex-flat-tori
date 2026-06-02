# low-vertex-flat-tori

Numerically discovering **flat, embedded 8-vertex tori**, following Rich Schwartz's
vertex-minimal construction (`rich/`).

A flat torus is intrinsically a flat sheet ℝ²/Λ. The challenge is realizing one with only
**8 vertices** as a straight-edge polyhedron in ℝ³ that is both *flat* (every vertex has cone
angle exactly 2π) and *embedded* (no two triangles cross). The fixed triangulation is
V=8, E=24, F=16, every vertex degree 6.

## Layout

```
src/math/        Pure math — no three.js, no DOM. The engine.
src/viewer/      three.js rendering (TorusView) + color palettes.
demos/           Per-demo browser entry points (one main.ts each).
scripts/         Node CLI tools (sampling, validation, figures).
data/            CSV result sets (one torus per row, 24 floats).
docs/            Design plans + combinatorial figures.
rich/            Rich Schwartz's reference papers (PDFs) and original code.
```

The dependency rule: `src/math/` never imports three.js or touches the DOM, so every
algorithm runs headless under `tsx` in `scripts/`. The viewer and demos sit on top.

### Key modules (`src/math/`)

| File | Role |
| --- | --- |
| `topology.ts` | The fixed triangulation. Triangles, edges, vertex links — all derived once and cross-checked against Rich's published data at load time. |
| `embedding.ts` | `PaperTorus`: 8 vertex positions in ℝ³ (a `Float64Array` of 24). |
| `angles.ts` | Cone-angle sums and deficits (2π − coneAngle). The flatness residual. |
| `newton.ts` | `newtonFlatten` — min-norm Gauss–Newton projection onto the flatness manifold. |
| `embedded.ts` | `isEmbedded` / `firstViolation` — triangle-triangle intersection test. |
| `distance.ts`, `intersectionChord.ts` | Geometry primitives (closest-feature distances, triangle∩triangle chords). |
| `energies/` | Pluggable `RepulsionEnergy` objects (chord², cut-off-area, cell-margin, …) consumed by the flow. |
| `embeddedFlow.ts` | Alternating "Newton — gradient step — Newton" descent on a repulsion energy, with optional hard feasibility backtracking. |
| `develop.ts` | Unfold the triangulation into the plane; read off the modulus τ ∈ ℍ. |
| `latticeLayout.ts` | Abstract combinatorial layout on the triangular lattice (for figures + the develop demo). |

## Two pipelines

**1. Discovery — find a flat embedded torus.** `scripts/sample-flat.mjs`: sample a seed →
`newtonFlatten` (land on the flatness manifold) → `embeddedFlow` (descend a repulsion energy,
re-flattening each step) → verify `maxConeDeficit < tol` **and** `isEmbedded`. Accepted tori
are written as CSV rows.

**2. Develop — compute the modulus τ.** `develop.ts` unfolds a flat torus and reads the
holonomy of two marked generator loops to get its point τ ∈ ℍ in Teichmüller space. Validate
the whole develop pipeline with:

```
npx tsx scripts/develop-check.mjs [path/to.csv]   # defaults to data/explore-from-seeds/seeds.csv
```

It asserts covolume = intrinsic area, rotational defect ≈ 0, and cone deficit ≈ 0 on Rich +
every row, then prints τ and its SL(2,ℤ)-reduced τ̂.

> **Note on strategy.** `docs/search-plan.md` and `docs/realization-search.md` describe an
> alternative "paper-sheet" reformulation (realize edge lengths from a flat lattice chart with
> τ as an input dial). It was **explored and set aside** — it underperformed the flatten-first
> pipeline in practice. The discovery pipeline above is the committed approach; the docs are
> kept for reference, not as the active roadmap.

## Running

Install once: `npm install`.

```
npm run dev <demo>        # serve a demo (vite). Omit <demo> to list them.
npm run build <demo>      # self-contained build → dist/<demo>/
npm run preview <demo>
```

> `npm run dev <demo>` writes a private entry to `.dev/<demo>.html` (gitignored) and serves it on
> a **stable per-demo port** (a hash of the name, in 5200–5599) — so each demo always lives at the
> same URL and two demos never collide. Run them in separate terminals in parallel; re-running a
> demo that's already up just prints its URL. `build`/`preview` still rewrite the tracked
> `index.html` (they run one at a time and emit a self-contained `dist/<demo>/`), so `git status`
> shows `index.html` modified after a build.

Available demos: `reference`, `animate`, `grid`, `grid-25`, `flat-samples`, `develop`,
`develop-orig-7`, `develop-walk4u`, `placeholder`.

### Search / data scripts

```
npm run sample      -- [opts]   # rejection-sample embedded then flat tori → .bin
npm run sample-flat -- [opts]   # full Newton + repulsion-flow search → .csv
npm run fatten      -- [opts]   # push already-flat samples to a larger embedding margin
```

Each script documents its flags in a header comment (`--help`-style). Run with `npx tsx`.

## Data format

CSV result files (`data/`, `demos/flat-samples/samples/`): **one torus per line, 24
comma-separated full-precision floats** in `x0,y0,z0, x1,y1,z1, …, x7,y7,z7` order — exactly
a `PaperTorus`'s `positions`. Values round-trip to their double-precision representation.

The `.bin` files from `scripts/sample-embedded.mjs` are Float32, same 24-float packing
(96 bytes/sample).

## Normalization convention

`src/math/normalize.ts` puts an 8-vertex torus into a **canonical pose** under the similarity
group of ℝ³ (translation ⊕ rotation ⊕ uniform scale = 7 continuous degrees of freedom). This is
the project-wide convention; use it whenever a torus needs a canonical representative.

`normalize(p)` does, in order:

1. **Translate** so vertex 0 is at the origin.
2. **Rotate + uniformly scale** so vertex 1 is at (1, 0, 0) — scale by 1/|v₁−v₀|, then rotate that
   direction onto the +x axis.
3. **Rotate about the x-axis** so vertex 2 lies in the xy-plane (z₂ = 0), choosing the half-turn
   that puts it on the +y side (**y₂ ≥ 0**).

The three **anchor vertices** are then pinned to v₀ = (0,0,0), v₁ = (1,0,0), v₂ = (x₂, y₂, 0) with
y₂ ≥ 0. This removes exactly the 7 similarity DOF (3 translation + 3 rotation + 1 scale), so the
free data is **24 − 7 = 17** numbers: `[x₂, y₂, v3(3), v4(3), v5(3), v6(3), v7(3)]`.
`toReduced(p)` returns those 17; `fromReduced(r)` rebuilds the full 24 (`fromReduced∘toReduced =
normalize`). Only **proper** rotations are used (e₃ = e₁×e₂ right-handed), so reflection/chirality
is preserved, not quotiented — a Z/2 that doesn't change the count of 17.
</content>
</invoke>
