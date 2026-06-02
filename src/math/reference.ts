/**
 * Rich Schwartz's canonical 8-vertex flat-torus embedding in R³ — the reference
 * realization of torus #7 (`RICH`). The coordinates and the Z/2 symmetry pairing
 * live on the torus spec (`src/tori/torus7.ts`); here we just materialize them
 * as a `PaperTorus` and provide the symmetry projection.
 *
 * The construction has a manifest Z/2 symmetry: 180° rotation about the z-axis
 * pairs vertices (0,7), (1,6), (2,5), (3,4) (x,y negated; z fixed).
 */

import { RICH } from '../tori';
import { PaperTorus } from './embedding';
import type { Torus } from '../tori/defineTorus';

if (!RICH.referenceCoords) {
  throw new Error('RICH torus is missing its reference embedding coordinates');
}

export const RICH_REFERENCE: PaperTorus = PaperTorus.fromVec3s(RICH, RICH.referenceCoords);

/**
 * Project a torus onto its Z/2-symmetric subspace in place by averaging each
 * paired vertex against R_z(π) of its partner. After this call, the embedding
 * is exactly Z/2-invariant. Requires `torus.symmetryPairing`.
 */
export function applyZ2(torus: Torus, t: PaperTorus): void {
  if (!torus.symmetryPairing) {
    throw new Error(`applyZ2: torus #${torus.id} has no symmetry pairing`);
  }
  for (const [a, b] of torus.symmetryPairing) {
    const oa = 3 * a;
    const ob = 3 * b;
    const ax = t.positions[oa], ay = t.positions[oa + 1], az = t.positions[oa + 2];
    const bx = t.positions[ob], by = t.positions[ob + 1], bz = t.positions[ob + 2];
    const nax = 0.5 * (ax - bx);
    const nay = 0.5 * (ay - by);
    const naz = 0.5 * (az + bz);
    t.positions[oa] = nax;
    t.positions[oa + 1] = nay;
    t.positions[oa + 2] = naz;
    t.positions[ob] = -nax;
    t.positions[ob + 1] = -nay;
    t.positions[ob + 2] = naz;
  }
}
