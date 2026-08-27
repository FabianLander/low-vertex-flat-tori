/**
 * The two folded bases of Lander, "The two most symmetric flat tori are vertex-minimal
 * paper tori" (draft, Aug 2026) — a SEED source, sibling of `doyleSchwartz.ts`.
 *
 * Each base is a configuration folded FLAT into the plane: eight planar vertices whose
 * sixteen triangles are nondegenerate but eight of which are folded over, so the sheet
 * overlaps itself. Folded flat it is already an exact flat torus — every cone angle is
 * exactly 2π — of modulus exactly τ̂ = i on the valence-regular triangulation T = `v8-7`
 * (Rich's, coordinates in ℚ) and exactly τ̂ = ρ = e^{iπ/3} on T′ = `v8-3` (degrees
 * (4,6,6,6,6,6,7,7), coordinates in ℚ(√3)). It is of course not embedded.
 *
 * The paper's construction lifts the fold out of the plane along one fixed rational
 * direction ζ ∈ ℚ^V, putting vertex v at (Q_v, t·ζ_v). That direction is chosen so the
 * overlapping sheets pull apart: every one of the 120 face pairs meets exactly in its
 * shared simplex, for EVERY t > 0 (Lander, Prop. 2 — the lift scales how far apart two
 * sheets are but not whether they meet). So `liftedPositions(base, t)` is embedded for
 * all t > 0, and flat only in the limit t → 0.
 *
 * The lift alone is NOT flat: raising the vertices changes the squared edge lengths by
 * t²(ζ_a − ζ_b)², so the cone deficits open up as O(t²). The paper closes them again by
 * an implicit-function-theorem correction that moves nine of the sixteen planar
 * coordinates; that correction is not explicit and is NOT reproduced here. What this file
 * gives is the base, the direction, and their lift — an exactly embedded, almost-flat
 * torus of almost exactly the target modulus, and an exactly flat non-embedded one at t = 0.
 *
 * Returns bare positions (24 floats, [x0,y0,z0, …, x7,y7,z7]). Pure: no three.js, no DOM.
 */

import type { Triangulation } from '@core/topology/triangulation.ts';
import type { Vec2 } from '@core/geometry/vec2.ts';
import { byId } from '@core/triangulations/index.ts';

export interface FoldedBase {
  /** The triangulation the base lives on — its labeling is what the coordinates mean. */
  readonly triang: Triangulation;
  /** The eight planar vertices of the fold (Lander, Table 1), in vertex order. */
  readonly planar: readonly Vec2[];
  /** The lift direction ζ (Lander, Prop. 2): one height per vertex, in vertex order. */
  readonly lift: readonly number[];
  /** The nine planar coordinates the correction is free to move (Lander, §6), as flat
   *  coordinate indices 3v+a. The other seven planar coordinates and all eight heights
   *  stay frozen, making the correction a square 9×9 system. */
  readonly free: readonly number[];
  /** The exact reduced modulus of the fold: i for the square base, ρ for the hexagonal. */
  readonly tauHat: Vec2;
  readonly label: string;
}

const SQRT3 = Math.sqrt(3);

/** The square base Q⁰ on T = `v8-7`, exact in ℚ (Lander, Table 1, left column). */
const SQUARE_PLANAR: readonly Vec2[] = [
  [0, 0],
  [73 / 60, 11 / 10],
  [1 / 2, 0],
  [-15977 / 50320, 42471 / 50320],
  [1, 0],
  [35937 / 25160, 27357 / 25160],
  [0, 33 / 20],
  [1, 33 / 20],
];

/** The hexagonal base P⁰ on T′ = `v8-3`, exact in ℚ(√3) (Lander, Table 1, right column). */
const HEXAGONAL_PLANAR: readonly Vec2[] = [
  [0, 0],
  [(896842303 + 729553300 * SQRT3) / 8073677900, (1029317275 + 568256878 * SQRT3) / 8073677900],
  [(-2625 + 7310 * SQRT3) / 47100, (8925 - 24854 * SQRT3) / 47100],
  [3789 / 10525, (595 - 4713 * SQRT3) / 10525],
  [1, 0],
  [(64 + 25 * SQRT3) / 200, (75 - 136 * SQRT3) / 200],
  [(-36 + 25 * SQRT3) / 200, (75 - 36 * SQRT3) / 200],
  [(279568 - 117825 * SQRT3) / 109900, (264900 - 143557 * SQRT3) / 109900],
];

export const SQUARE_FOLD: FoldedBase = {
  triang: byId('v8-7'),
  planar: SQUARE_PLANAR,
  lift: [3 / 13, -3 / 8, -3 / 7, 12 / 13, 1, -1, 1, 0],
  // Q0x, Q0y, Q1x, Q1y, Q2y, Q3x, Q4x, Q4y, Q5x
  free: [0, 1, 3, 4, 7, 9, 12, 13, 15],
  tauHat: [0, 1],
  label: 'square fold (τ̂ = i, T = v8-7)',
};

export const HEXAGONAL_FOLD: FoldedBase = {
  triang: byId('v8-3'),
  planar: HEXAGONAL_PLANAR,
  lift: [1 / 2, -1, 6 / 17, -7 / 34, -33 / 47, -1, 19 / 41, 1],
  // P0x, P0y, P1x, P1y, P2x, P2y, P3x, P3y, P4x
  free: [0, 1, 3, 4, 6, 7, 9, 10, 12],
  tauHat: [1 / 2, SQRT3 / 2],
  label: 'hexagonal fold (τ̂ = ρ, T′ = v8-3)',
};

export const FOLDED_BASES: readonly FoldedBase[] = [SQUARE_FOLD, HEXAGONAL_FOLD];

/**
 * The lift of a folded base at height parameter t: vertex v goes to (Q_v, t·ζ_v).
 * Embedded for every t > 0; exactly flat only at t = 0, where it is the fold itself.
 */
export function liftedPositions(base: FoldedBase, t: number): Float64Array {
  const n = base.planar.length;
  const p = new Float64Array(3 * n);
  for (let v = 0; v < n; v++) {
    p[3 * v] = base.planar[v][0];
    p[3 * v + 1] = base.planar[v][1];
    p[3 * v + 2] = t * base.lift[v];
  }
  return p;
}
