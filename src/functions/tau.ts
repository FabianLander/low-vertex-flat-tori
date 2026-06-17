/**
 * tau — the Teichmüller modulus τ(c) = (Re τ, Im τ) ∈ ℍ of the flat torus
 * realized by c, read off the developing map's holonomy. dim 2.
 *
 * τ is smooth in the edge lengths (hence in the coordinates), but there is no
 * closed-form Jacobian yet, so it is finite-differenced via `fdFn`. The modulus
 * submanifolds post-compose *exact* outer maps (the frozen Möbius, take-Re) onto
 * this — see `submanifolds/modulus` — so the only finite-difference in that whole
 * chain is this one map. An analytic τ is a future drop-in behind this same `Fn`.
 *
 * NB τ is meaningful only on (near-)flat configs: off the flat locus the holonomy
 * is not a pure translation. Callers project onto `flat` first.
 *
 * Pure: no three.js, no DOM.
 */

import type { Triangulation } from '../topology/triangulation.ts';
import { modulus } from '../topology/develop.ts';
import { fdFn } from './compose.ts';
import type { Fn } from './types.ts';

export function tau(torus: Triangulation): Fn {
  return fdFn('tau', 2, (c, out) => {
    const t = modulus(torus, c).tau;
    out[0] = t[0];
    out[1] = t[1];
  });
}
