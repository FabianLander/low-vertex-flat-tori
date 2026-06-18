# geometry/ — the ℝ²/ℝ³ metric floor

Pure point/vector/line/triangle math in the plane and in space. **Torus-blind**:
no `Triangulation`, no configuration-space knowledge — every routine takes raw
coordinates (scalars, a `Vec2`/`Vec3` tuple, or a `positions` buffer + vertex
indices), so the triangle→vertex lookup lives in the layer above.

This is the **single bottom of the whole codebase** — the one folder both halves
rest on. The extrinsic search stack builds up from here; and the *intrinsic* side
depends on it too (`topology/`'s developing map lays its net out in `Vec2`). So
`geometry/` imports nothing from `src/`; everything else may import it.

The vectors:

- `vec2.ts` — `Vec2` + 2D ops (sub/add/scale/dot/cross/len/dist/lerp/`signedArea2`/
  `projectToSegment`). The one ℝ² point type — `topology`'s developed net, the
  harmonic layout, the modulus τ, certificates all use it.
- `vec3.ts` — `Vec3` + 3D ops (sub/add/scale/dot/cross/len/normalize), mirroring
  `vec2`. The one ℝ³ point type — normals/poses/centers in `mesh/`, the canonical
  pose in `configuration/gauge`, the reference coords in `sampling/reference`.

The simplex kernels — properties of one point/segment/triangle, allocation-free
scalar coordinates in (the caller reads corners out of its buffer):

- `triangle.ts` — single-triangle math: `cornerAngle`(+`cornerAngleGrad`, the
  discrete-DG corner-angle gradient behind `conditions/flat`), `triangleNormal`,
  `triangleArea`, `triangleSignedArea2`, `signedVolume6`, `planeCutRatio`.
- `distance.ts` — allocation-free squared-distance kernels between points, segments,
  and filled triangles (Ericson closest-point routines).
- `intersectionChord.ts` — `triTriChord`: the segment two triangles share, from six
  vertex offsets into a shared `positions` buffer.
- `triangleIntersect.ts` — boolean interior-intersection predicates (Möller–Trumbore
  segment–triangle, and triangle–triangle as 6 of those) behind `isEmbedded`.

And the plane-curve primitive (used by figures/demos):

- `curve.ts` — `PlaneCurve`: parametric plane curves with an arclength table
  (point-at-arclength, uniform resample, nearest-point projection).

### Two tiers, by allocation cost (the deliberate calling-convention split)

- **Tuple ops** (`vec2`/`vec3` — `Vec2`/`Vec3` in, out) are for COLD code: setup,
  the canonical pose, normals, the developed net. Ergonomic; they allocate.
- **Scalar/buffer kernels** (`distance`, the intersection predicates, and the inlined
  cross/dot in hot Jacobians like `conditions/flat`) take raw scalar components or a
  `positions` buffer and **never allocate** — they run in the inner search loops.

So a hot loop stays on scalars on purpose; reach for the tuple ops everywhere else.
(`distance` speaks raw scalars, `triTriChord` speaks `positions`+offsets,
`triangleIntersect` speaks `positions`+vertex-indices — three dialects, one per
kernel's callers; a future pass may unify them.)
