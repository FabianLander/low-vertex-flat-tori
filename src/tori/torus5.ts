/**
 * Torus #5 — combinatorial type 5 of the 8-vertex flat torus (TORUS_8V[4]).
 *
 * developOrder + generatorLoops are AUTO-DERIVED placeholders (BFS dual tree /
 * tree–cotree H₁ basis). They are valid but not "nice" — replace them with
 * hand-authored values after inspecting the Tutte diagram:
 *     npm run dev tutte-gallery        (then ↑/↓ to torus 5)
 */

import { TORUS_8V } from '../../tori';
import { defineTorus, autoDevelopOrder, homologyGenerators } from './defineTorus';

const triangles = TORUS_8V[4];

export const torus5 = defineTorus({
  id: 5,
  name: 'type5',
  triangles,
  developOrder: autoDevelopOrder(triangles), // AUTO — hand-author for a nicer net
  generatorLoops: homologyGenerators(triangles), // AUTO — hand-author the marking
});
