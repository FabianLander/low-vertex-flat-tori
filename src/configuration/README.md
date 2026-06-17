# configuration/ — the configuration space and its machinery

Configuration space C = ℝ³ⱽ (an immersion of the triangulation in ℝ³) and the
generic machinery that operates on it. **A configuration is a bare `Float64Array` of
positions** in the interior — the torus rides in the `Fn`/`ConfigSpace` closures,
never bundled with the coordinates.

This folder is the **machinery**; the coordinate-system *instances* (`full`, `pin`,
`symmetry`, `doyleSchwartz`) live in `coordinates/`, and the seeding/sampling tools
in `sampling/` — same machinery↔instances split as `topology/`↔`triangulations/`.

- `space.ts` — the `ConfigSpace` = (T, φ): `pull` (φ\*g, an ambient `Fn` → a real `Fn`
  on ℝⁿ), `push` (φ), `coords` (the retraction π, for seeds), `metric` (the pullback
  metric DφᵀDφ), `paperTorus`. Plus `makeConfigSpace`, the factory every coordinate
  system in `coordinates/` is built from. The spine of the search — see
  [docs/math/configuration-space.md](../../docs/math/configuration-space.md).
- `paperTorus.ts` — the boundary bundle `{ triang, positions }`: the form a
  configuration takes at the IO / render / certify boundary, where it must carry its
  triangulation. `makePaperTorus` / `paperTorusFromVec3s` / `clonePaperTorus`.
- `gauge.ts` — the canonical pose under the ℝ³ similarity group (7 DOF → 17 reduced
  coords). Storage/dedup only — off the search path; the gauge is handled implicitly
  by the solvers' min-norm step.

Pure: no three.js, no DOM.
