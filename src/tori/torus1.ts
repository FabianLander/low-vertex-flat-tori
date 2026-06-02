/**
 * Torus #1 — combinatorial type 1 of the 8-vertex flat torus (TORUS_8V[0]).
 *
 * developOrder + generatorLoops are AUTO-DERIVED placeholders (BFS dual tree /
 * tree–cotree H₁ basis). They are valid but not "nice" — replace them with
 * hand-authored values after inspecting the Tutte diagram:
 *     npm run dev tutte-gallery        (then ↑/↓ to torus 1)
 */

import { TORUS_8V } from '../../tori';
import { defineTorus, autoDevelopOrder, homologyGenerators } from './defineTorus';

const triangles = TORUS_8V[0];

export const torus1 = defineTorus({
  id: 1,
  name: 'type1',
  triangles,
  developOrder: autoDevelopOrder(triangles), // AUTO — hand-author for a nicer net
  generatorLoops: homologyGenerators(triangles), // AUTO — hand-author the marking
});
