/**
 * wall — find flat embedded tori on a modulus wall |Re τ̂| = c (the rectangular
 * c = 0 and rhombic c = ½ symmetry loci).
 *
 *   seed → project([flat, modulusWall(seed, c)]) → flow([flat, wall], energy, embedded) → certify
 *
 * The same `flattenFlowEmbed` recipe as `discover`, with the wall added to `held`:
 * `flow` then descends the energy toward embeddedness *along the wall* (it holds
 * flat ∧ wall in the tangent projection), so it can reach an embedded on-wall torus
 * even from a seed that isn't embedded yet — what the old `sample-rect` (project +
 * gate, no flow) couldn't do.
 *
 * The modulus chart is FROZEN at the seed, so the wall constraint (and `flow`,
 * which holds it fixed) is valid in the seed's SL(2,ℤ) chamber — seeds should be
 * near the wall (a pool of on-wall tori, accepts fed back). Reaching a far wall is
 * `march`'s job. Acceptance independently re-checks ||Re τ̂| − c| (the frozen chart
 * could be a chamber off).
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import { flat } from '../conditions/flat.ts';
import { modulusWall } from '../conditions/modulus.ts';
import { flattenFlowEmbed, type FlowSearchOptions } from './recipe.ts';
import type { Certificate } from './certify.ts';

export interface WallOptions extends FlowSearchOptions {
  /** The wall: |Re τ̂| = c (0 = rectangular, ½ = rhombic). */
  c: number;
  /** Accept threshold on the flatness residual max|2π−θ|. Default 1e-10. */
  angleTol?: number;
  /** Accept threshold on ||Re τ̂| − c| (the independent wall re-check). Default 1e-9. */
  reTol?: number;
}

export function wallAttempt(
  triang: Triangulation,
  opts: WallOptions,
): (seed: Float64Array) => Certificate | null {
  const f = flat(triang);
  const { c } = opts;
  const angleTol = opts.angleTol ?? 1e-10;
  const reTol = opts.reTol ?? 1e-9;
  return flattenFlowEmbed(
    triang,
    (seed) => [f, modulusWall(triang, seed, c)],   // freeze the wall chart at the seed
    (cert) => cert.coneDeficit < angleTol && Math.abs(Math.abs(cert.tauHat[0]) - c) < reTol && cert.embedded,
    opts,
  );
}
