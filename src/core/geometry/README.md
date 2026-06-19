# geometry/ — the ℝ²/ℝ³ metric floor

Pure point/vector/triangle math in the plane and in space. **Torus-blind**: no
`Triangulation`, no configuration-space knowledge, and **coordinates-only** — every
routine takes raw coordinates (a `Vec2`/`Vec3` tuple, or loose scalar components), never
a `positions` buffer or a vertex index. So the triangle→vertex/buffer lookup lives in the
layer above (the embedding code that owns the cell-pair tables reads the corners out of
its buffer and passes the scalars; see `embedding/embedded.ts`'s `faceFace*`/`edgeFace*`
adapters).

This is the **single bottom of the whole codebase** — the one folder both halves rest on.
The extrinsic search stack builds up from here; the *intrinsic* side depends on it too
(`topology/`'s developing map lays its net out in `Vec2`). So `geometry/` imports nothing
from `src/`; everything else may import it.

The vector spaces (tuple algebra):

- `vec2.ts` — `Vec2` + 2D ops (sub/add/scale/dot/len/dist/dist2/lerp) and **`det2`** (the
  2×2 determinant `aₓbᵧ − aᵧbₓ` = signed parallelogram area, the "2D cross"). The one ℝ²
  point type — `topology`'s developed net, the harmonic layout, the modulus τ, certificates.
- `vec3.ts` — `Vec3` + 3D ops (sub/add/scale/dot/len/dist/normalize), **`cross`** (the
  vector cross product) and **`det3`** (the 3×3 determinant `a·(b×c)` = scalar triple
  product). The one ℝ³ point type — normals/poses/centers in `@display/mesh`, the canonical
  pose in `coordinates/normalized`, the reference coords in `sampling/reference`.

The kernels — measurements of one triangle, and relations between two — scalar coordinates
in, allocation-free (the hot tier):

- `triangle.ts` — one triangle: `cornerAngle` (+`cornerAngleGrad`, the discrete-DG
  corner-angle gradient behind `constraints/flat`), `triangleNormal`, `triangleArea`,
  `signedArea2` (the scalar form of `det2` on edge vectors). (Signed *volume* is no longer
  a named function — it is `vec3.det3`, summed over faces by `mesh/orient`.)
- `distance.ts` — squared-distance kernels among points, segments, and filled triangles
  (Ericson closest-point routines).
- `intersection.ts` — incidence between two triangles: `orient3d` (the sign-only
  orientation predicate = `sign(det3)` of edge vectors), the boolean
  `segmentTriangleIntersect`/`triangleTriangleIntersect` (behind `isEmbedded`), the
  `triTriChord` (where two triangles meet), and `planeCutRatio` (how much a plane divides a
  triangle, for the overlap energy).

(The `PlaneCurve` construct — parametric plane curves with an arclength table — is NOT here:
it is a constructed object, not a metric kernel, and is demo-only, so it lives in
`demos/shared/curve.ts`.)

### Two tiers, by allocation cost (the deliberate calling-convention split)

- **Tuple ops** (`vec2`/`vec3` — `Vec2`/`Vec3` in/out, including `det2`/`det3`) are for COLD
  code: setup, the canonical pose, normals, the developed net. Ergonomic; they allocate.
- **Scalar kernels** (`triangle`, `distance`, `intersection`, and the inlined cross/dot in
  hot Jacobians like `constraints/flat` and the inlined determinant in `orient3d`) take raw
  scalar components and **never allocate** — they run in the inner search loops.

Both tiers are coordinates-only; the difference is just tuples vs loose scalars. A hot loop
stays on scalars on purpose and reaches for the tuple ops everywhere else.
