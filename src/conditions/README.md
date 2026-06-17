# conditions/ — what we ask of a configuration

Each module is one mathematical condition, **self-contained**: its *measurement*
(an `Fn`/`ScalarFn` built from the `functions/` toolkit), its *gate* if it is open,
and how it is *used* (the constraint, the region). Downstream — `certify`, the
viewer — imports the measurement from its condition; `solvers/` consumes the usage.

Conditions come in two kinds, carried by the **return type**, not the directory:

- **closed** `{g = 0}` — you *project onto* them. A bare `Fn` (or an `Fn` + `Held`
  usage). `project`/`march` consume them.
  - `flat.ts` — the cone-angle deficit measurement + the `flat` constraint (drive V−1).
  - `collinear.ts` — the planar signed-area measurement (analytic) + the constraint.
  - `modulus.ts` — the modulus `tau` (FD) + `fixedModulus` / `modulusWall` (frozen-chart).
- **open** — you *stay inside* them. A `Region` (gate + margin); `flow`/`march` gate on it.
  - `embedded/` — the embeddedness condition, in one folder (it has the most to it):
    `gate.ts` (`isEmbedded`, the topological truth) · `margin.ts` (cell gaps + `minMargin`) ·
    `energies.ts` (the overlap + near-miss potentials `flow` descends) · `region.ts` (the
    `Region`) · `index.ts` (the public surface). Blind intersection kernels are in `geometry/`.

A condition is a file when it fits in one, a folder when it genuinely needs several
(`embedded/`). The `functions/` toolkit + `topology/` + `geometry/` are below; the
solvers consume these via the abstract contracts.
