# scripts/UPDATE.md — migrating the runners onto the new search substrate

The top-level runners fall into three buckets: **already on the new stack**, **one-line migrations
once a piece exists**, and a couple that **need a new routine built first**. This file says which,
and gives build instructions for the missing pieces.

*(Ignores `scripts/legacy/` — that's the read-only archive. "Legacy" below means `src/core/search/legacy/`.)*

The new substrate a runner composes: `discover` / `improve` / `steer-modulus` routines, the `measure`
readout, the `collect` driver, and the condition vocabulary (`flat`, the modulus loci
`point`/`verticalLine`/`circle` pinned via `pinTeichmuller`, the energies `makeCutOffArea` /
`makeCellBarrier`, `embeddedRegion`).

---

## Pieces to build now

### 1. `discoverAt` — ungated "does an embedded torus exist AT a modulus, by any path?"

The ungated sibling of gated `steer-modulus`: instead of transporting a *known* embedded torus while
staying in Ω, this **enters Ω from any seed while pinning the modulus** — the existence question (does
`τ₀` admit an embedded realization at all?), e.g. the square-torus-`i` / Doyle–Schwartz Remark 6 study.

**Buildable today — no new substrate.** It is `discover` with the modulus pinned into the held (the
"hard-modulus" combo): search the thin slice `{flat ∧ τ = τ₀}` for an embedded point, flow **ungated**
(you're entering Ω, so you can't gate). New file `search/discover-at.ts`:

```ts
export function discoverAt(triang, target /* Vec2, a raw τ */, opts = {}) {
  const held = [flat(triang), pinTeichmuller(triang, point(target))];   // flat ∧ raw τ = τ₀ (hard)
  const energy = opts.energy ?? makeCutOffArea(triang);                 // overlap → drives into Ω
  const angleTol = opts.angleTol ?? 1e-10;
  return (x) => {
    if (project(x, held).status !== 'converged') return null;           // land on {flat ∧ τ = τ₀}
    minimize(x, held, energy, { maxIters: opts.maxIters ?? 500 });      // flow toward embedded, τ held
    const m = measure(triang, x);
    return m.coneDeficit < angleTol && m.embedded ? m : null;           // τ = τ₀ by construction
  };
}
```

- **Loci, not just points:** swap `point(target)` for `verticalLine(c)` / `circle(ctr, r)` to search
  "flat embedded tori whose modulus satisfies a closed condition."
- **Refinement (later, one small piece):** the "soft-modulus" combo — `held=[flat]`, energy =
  `overlap + w·‖τ − τ₀‖²` — gives the flow more path freedom (find `τ₀` even when it's only reachable
  *through* other moduli), then a final hard `project([flat, pinTeichmuller(point(τ₀))])` nails it. This
  needs a **weighted-sum-of-`ScalarFn`s** helper (`sumScalars` — ~5 lines in `functions/compose`).
- **Migrates:** `random-imaginary` → `collect(seeds, discoverAt(triang, [0,1]))`.
  *(Raw-vs-reduced nuance: `discoverAt` pins **raw** τ; the rectangular study is a **reduced** τ̂ wall, so
  either target the raw representative or add a reduced-locus variant using `pinModuli`.)*

### 2. `steer-modulus` codim-1 targets (walls / curves)

`steer-modulus` reaches a modulus **point** (geodesic homotopy). For a **wall** `|Re τ̂| = c` or a curve
you don't need a path — drive the locus's own scalar to its target, the other coordinate floating.
Generalize steer's `family` behind a `SteerTarget`:

- **point** (codim-2): the current homotopy, `held = [flat, pinTeichmuller(point(path(s)))]`.
- **wall / line** (codim-1): `param = Re τ̂`; `held = [flat, pinTeichmuller(verticalLine(s))]`; drive
  `s: currentRe → c` (Im floats). Same fatten-interleave.

Pieces exist (`verticalLine`/`circle`); build the target abstraction + the codim-1 family.
- **Migrates:** `march-modulus`/`wall` → `steer-modulus(triang, wall(c))`.

### 3. Small / optional

- **`semiSolution` thin script** — the DS flat-*immersion* scan is thin on the new stack:
  `project(x, [flat, collinear(1,2,3), collinear(4,5,6)])` in `pinCoords(baseZ)` → `measure` (accept any
  flat immersion; embeddedness recorded, not required). All pieces exist; no routine needed, just a script.
- **graceful descent** (for `graceful-path`) — the constant-modulus path from max-margin to the graceful
  (margin→0) limit: `improve` **on the modulus fiber** (the modulus-held fatten already inside
  `steer-modulus` — factor it out as a helper) to ascend, then a **clearance descent** on that fiber to
  margin→0 (a new piece, the inverse of `improve`). Specialized; do after 1–2.

---

## Per-script migration table

| runner | what it does | new-stack path | status |
|---|---|---|---|
| `discover` | find flat embedded tori | `discover` | ✓ current |
| `discover-ds` | discover in the DS scaffold | `discover(triang, { space: dsScaffold })` | ✓ current (WIP parametrization) |
| `march-to-i`, `collect-imaginary` | march to `i` / down the imaginary axis, report the pinch | `steer-modulus(triang, [0, s])` | **ready now** (point target exists; raw-vs-reduced nuance) |
| `random-imaginary` | does `i` embed by *any* path (ungated) | `discoverAt(triang, [0, 1])` | **build piece 1** |
| `march-modulus`, `wall` | reach / search a modulus **wall** | `steer-modulus(wall(c))` / `discoverAt(verticalLine(c))` | **build piece 2** |
| `semi-solutions` | DS flat-immersion scan | thin script over `project` + `measure` in `pinCoords` | build piece 3 (thin) |
| `graceful-path` | constant-modulus max-margin → graceful path | fiber-`improve` + clearance descent | needs graceful descent |
| `build-moduli-data` | assemble the `torus-moduli` demo dataset | `certify → measure`, wall via `discoverAt` | infra, low priority |
| `hull-experiment` | convex-hull type-2 test (commit: "idea failed") | — | **archive → `scripts/legacy/`** |

---

## Recommended order

1. **`discoverAt`** (piece 1) — highest value, buildable today, answers the existence question in the
   clean system and retires `random-imaginary`.
2. **`steer-modulus` codim-1 targets** (piece 2) — retires `march-modulus`/`wall` and consolidates the
   whole "reach a modulus locus" family under `steer-modulus`.
3. Then `march-to-i`/`collect-imaginary` collapse onto `steer-modulus` point targets (no new code),
   `semi-solutions` becomes a thin script, and `hull-experiment` gets archived.
