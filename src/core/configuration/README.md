# configuration/ — the configuration space and its machinery

Configuration space C = ℝ³ⱽ (an immersion of the triangulation in ℝ³) and the
generic machinery that operates on it. **A configuration is a bare `Float64Array` of
positions** in the interior — the torus rides in the `Fn`/`ConfigSpace` closures,
never bundled with the coordinates.

This folder is the **machinery**; the coordinate-system *instances* (`full`, `pin`,
`symmetry`, `normalized`) live in `coordinates/`, and the seeding/sampling tools
in `sampling/` — same machinery↔instances split as `topology/`↔`triangulations/`.

- `space.ts` — the `ConfigSpace` = (T, φ): `pull` (φ\*g, an ambient `Fn` → a real `Fn`
  on ℝⁿ), `push` (φ), `coords` (the retraction π, for seeds), `metric` (the pullback
  metric DφᵀDφ), `paperTorus`. Plus `makeConfigSpace`, the factory every coordinate
  system in `coordinates/` is built from. The spine of the search.
- `paperTorus.ts` — the boundary bundle `{ triang, positions }`: the form a
  configuration takes at the IO / render / certify boundary, where it must carry its
  triangulation. `makePaperTorus` / `paperTorusFromVec3s` / `clonePaperTorus`.
(The canonical similarity pose — the gauge — is now a coordinate system, the section of
C → C/Sim in `coordinates/normalized.ts`; storage/dedup uses its `coords` retraction.)

Pure: no three.js, no DOM.
