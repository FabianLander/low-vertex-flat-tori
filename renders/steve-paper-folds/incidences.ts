/**
 * Lander's Figure 7 — the defining incidences of the two folded bases, as real geometry laid
 * over the fold itself.
 *
 * The bases were not guessed: a flow drove numerically-found tori toward planarity, and the
 * limits that arrived had their vertices in special position. Imposing those incidences as
 * exact equations is what produced the rational families the bases are corner members of. So
 * the incidences are the reason the coordinates in Table 1 look the way they do, and drawing
 * them is drawing the construction rather than decorating the picture.
 *
 *   square Q⁰    vertices 0, 2, 4 are COLLINEAR (the straight crease) and 0, 4, 7, 6 form a
 *                RECTANGLE — both green — whose circumscribed circle (purple) also passes
 *                through vertex 5. Note the collinearity is not separately visible: Q₀=(0,0),
 *                Q₂=(½,0), Q₄=(1,0) lie along the rectangle's own bottom edge 0→4, so the two
 *                green things coincide there (see `overhang`).
 *   hexagonal P⁰ three CIRCLES instead: through 0, 2, 4, 5, 6; through 0, 1, 3, 6; and
 *                through 3, 4, 5, 7.
 *
 * The paper gives no equations for these. It says each centre and radius is computed from the
 * printed coordinates and every vertex checked onto its circle before drawing, so that is what
 * happens here — and a circle whose named vertices do not land on it THROWS rather than being
 * drawn, because a figure asserting an incidence that does not hold is worse than no figure.
 * On the printed data they hold to machine zero.
 *
 * Everything is built in the same centred frame `viewer/TorusView` draws in (it offsets the
 * geometry by the configuration's bounding-box centre), so the overlay can be parented to the
 * view's group and will scale, turn and move with it.
 *
 * Impure render boundary (three.js).
 */

import * as THREE from 'three';
import type { FoldedBase } from '@core/sampling/foldedBases.ts';

export interface IncidenceOptions {
  /** Colour of the collinearity and the rectangle. */
  green: string;
  /** Colour of the circles. */
  purple: string;
  /** Tube radius, in the fold's own units. */
  tube: number;
  /**
   * Height to draw the overlay at. It must CLEAR the sheet, not merely avoid z-fighting with
   * it: these are solid tubes, so an overlay drawn level with the paper passes through it, and
   * geometry embedded in a zero-thickness double-sided surface is what a path tracer renders
   * as black. Pass the top of the sheet plus at least the tube radius.
   */
  lift: number;
  /**
   * How far past vertices 0 and 4 to extend the collinear line, as a fraction of its length.
   *
   * It needs saying why this exists. Q₀ = (0,0), Q₂ = (½,0), Q₄ = (1,0) are collinear along
   * the x-axis, and the rectangle 0-4-7-6's bottom edge is the segment 0→4 — the SAME
   * segment. So drawn to its true extent the collinearity is invisible, hidden under the
   * rectangle. Overhang makes it legible at the cost of drawing something past the data.
   * 0 (the default) draws only what is there.
   */
  overhang: number;
}

/** Which vertices are incident, per base. Read off Lander §7.1. */
const SQUARE = {
  collinear: [0, 2, 4],
  rectangle: [0, 4, 7, 6],
  /** the rectangle's circumcircle also passes through this one */
  alsoOnCircle: 5,
};
const HEXAGONAL = { circles: [[0, 2, 4, 5, 6], [0, 1, 3, 6], [3, 4, 5, 7]] };

/** Centre and radius of the circle through three points. */
function circumcircle(A: readonly number[], B: readonly number[], C: readonly number[]) {
  const d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
  if (Math.abs(d) < 1e-14) throw new Error('incidences: three collinear points have no circle');
  const a2 = A[0] * A[0] + A[1] * A[1];
  const b2 = B[0] * B[0] + B[1] * B[1];
  const c2 = C[0] * C[0] + C[1] * C[1];
  const cx = (a2 * (B[1] - C[1]) + b2 * (C[1] - A[1]) + c2 * (A[1] - B[1])) / d;
  const cy = (a2 * (C[0] - B[0]) + b2 * (A[0] - C[0]) + c2 * (B[0] - A[0])) / d;
  return { cx, cy, r: Math.hypot(A[0] - cx, A[1] - cy) };
}

/** The centre `TorusView` subtracts when it draws, so the overlay lands in the same frame. */
function bboxCentre(p: ArrayLike<number>): [number, number, number] {
  let lox = Infinity, loy = Infinity, loz = Infinity;
  let hix = -Infinity, hiy = -Infinity, hiz = -Infinity;
  for (let i = 0; i < p.length; i += 3) {
    if (p[i] < lox) lox = p[i]; if (p[i] > hix) hix = p[i];
    if (p[i + 1] < loy) loy = p[i + 1]; if (p[i + 1] > hiy) hiy = p[i + 1];
    if (p[i + 2] < loz) loz = p[i + 2]; if (p[i + 2] > hiz) hiz = p[i + 2];
  }
  return [(lox + hix) / 2, (loy + hiy) / 2, (loz + hiz) / 2];
}

export function incidenceOverlay(
  base: FoldedBase,
  exact: Float64Array,
  opts: IncidenceOptions,
): THREE.Group {
  const group = new THREE.Group();
  const [ox, oy] = bboxCentre(exact);
  const Q = base.planar;
  const green = new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.green), roughness: 0.45, metalness: 0.1 });
  const purple = new THREE.MeshStandardMaterial({ color: new THREE.Color(opts.purple), roughness: 0.45, metalness: 0.1 });

  /** A straight tube between two planar points, in the centred frame. */
  const segment = (a: readonly number[], b: readonly number[], mat: THREE.Material): void => {
    const A = new THREE.Vector3(a[0] - ox, a[1] - oy, opts.lift);
    const B = new THREE.Vector3(b[0] - ox, b[1] - oy, opts.lift);
    const len = A.distanceTo(B);
    if (!(len > 0)) return;
    const geo = new THREE.CylinderGeometry(opts.tube, opts.tube, len, 16);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(A).add(B).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    group.add(mesh);
  };

  /** The circle through `through`, VERIFIED to pass through every vertex of `check`. */
  const circle = (through: number[], check: number[], mat: THREE.Material): void => {
    const { cx, cy, r } = circumcircle(Q[through[0]], Q[through[1]], Q[through[2]]);
    for (const v of check) {
      const off = Math.abs(Math.hypot(Q[v][0] - cx, Q[v][1] - cy) - r);
      if (off > 1e-9 * Math.max(1, r)) {
        throw new Error(
          `incidences: vertex ${v} is ${off.toExponential(2)} off the circle through `
          + `${through.join(',')} — refusing to draw an incidence that does not hold`,
        );
      }
    }
    const geo = new THREE.TorusGeometry(r, opts.tube, 12, 256);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx - ox, cy - oy, opts.lift);
    group.add(mesh);
  };

  if (base === undefined) return group;
  const isSquare = base.tauHat[0] === 0;

  if (isSquare) {
    // the straight crease, drawn a little past the outer two vertices so it reads as a line
    const [a, , c] = SQUARE.collinear;
    const A = Q[a], C = Q[c];
    const dx = C[0] - A[0], dy = C[1] - A[1];
    const len = Math.hypot(dx, dy) || 1;
    const pad = opts.overhang * len;
    segment([A[0] - (dx / len) * pad, A[1] - (dy / len) * pad],
      [C[0] + (dx / len) * pad, C[1] + (dy / len) * pad], green);
    // verify the collinearity itself rather than trusting it
    const B = Q[SQUARE.collinear[1]];
    const area2 = Math.abs((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]));
    if (area2 > 1e-9) throw new Error(`incidences: 0,2,4 are not collinear (2·area = ${area2.toExponential(2)})`);

    const R = SQUARE.rectangle;
    for (let i = 0; i < R.length; i++) segment(Q[R[i]], Q[R[(i + 1) % R.length]], green);
    circle([R[0], R[1], R[2]], [...R, SQUARE.alsoOnCircle], purple);
  } else {
    for (const ring of HEXAGONAL.circles) circle(ring.slice(0, 3), ring, purple);
  }
  return group;
}
