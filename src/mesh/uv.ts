/**
 * Intrinsic lattice UVs — the flat torus's own flat coordinate, as a texture map.
 *
 * A flat torus is ℝ²/Λ. `developNet` unfolds the triangulation into ℝ²
 * isometrically: `net.corners[t]` are the planar positions of triangle t's three
 * corners, in `torus.triangles[t]` order — i.e. exactly the splat order of the
 * face geometry. Those planar points ARE a UV map, with two properties we want:
 *
 *   • distortion-free: the unfolding is an isometry, so a grid laid in these
 *     coordinates has zero metric stretch — every cell is congruent.
 *   • seamless across the cut: we express the UVs in LATTICE coordinates, i.e.
 *     uv = M⁻¹·P where M = [v1 v2] is the holonomy basis (`modulus`). Then the
 *     lattice Λ maps to ℤ², so the holonomy jump across a cut edge is an INTEGER
 *     vector. With RepeatWrapping (sample frac(uv)), both sides of the cut sample
 *     the identical texel — the seam vanishes. A square texture buffer therefore
 *     tiles as the true parallelogram fundamental domain of THIS modulus.
 *
 * `repeat` subdivides each fundamental domain into repeat×repeat cells (still
 * seamless, since 1/repeat divides the period). Per-corner, length = F*3*2.
 */

import type { Torus } from '../tori/defineTorus';
import { developNet, modulus } from '../math/develop';

export function latticeUV(
  torus: Torus,
  positions: ArrayLike<number>,
  opts: { repeat?: number } = {},
): Float32Array {
  const repeat = opts.repeat ?? 1;
  const net = developNet(torus, positions);
  const { v1, v2 } = modulus(torus, positions);

  // Invert M = [v1 v2] (columns) so uv = M⁻¹·P gives lattice coordinates.
  const det = v1[0] * v2[1] - v1[1] * v2[0];
  if (Math.abs(det) < 1e-12) throw new Error('latticeUV: degenerate lattice basis');
  const inv = 1 / det;
  // M⁻¹ = (1/det) [[ v2y, -v2x ], [ -v1y, v1x ]]
  const m00 =  v2[1] * inv, m01 = -v2[0] * inv;
  const m10 = -v1[1] * inv, m11 =  v1[0] * inv;

  const F = torus.triangles.length;
  const out = new Float32Array(F * 3 * 2);
  for (let t = 0; t < F; t++) {
    const corners = net.corners[t];
    for (let k = 0; k < 3; k++) {
      const [px, py] = corners[k];
      const u = (m00 * px + m01 * py) * repeat;
      const v = (m10 * px + m11 * py) * repeat;
      const o = (t * 3 + k) * 2;
      out[o] = u;
      out[o + 1] = v;
    }
  }
  return out;
}
