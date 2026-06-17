# configuration/ — the space we search and its structure

Configuration space C = ℝ³ⱽ (an immersion of the triangulation in ℝ³) plus the things
that act on it: **charts** (parameterizations ι: X → C of subspaces — pins, symmetry,
gauge-fixing), the **gauge** group (similarity, handled implicitly by min-norm), and
random **perturbation** of configurations.

- `chart.ts` — linear charts: `identity`, `pinCoords` (the `Chart` contract itself
  lives in `solvers/types.ts`).
- `symmetry.ts` — the symmetry chart: configs invariant under a linear involution +
  vertex pairing (Rich's ρ), realized exactly symmetric in half the dimension.

To come (rewritten from `src/math` during the refactor): the immersion type
(`embedding.ts` → here), `gauge.ts` (`normalize.ts`), `perturb.ts`.
