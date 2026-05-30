/**
 * Cone-angle sums at each vertex of the 8-vertex flat torus.
 *
 * Pure functions on a flat positions array (length VERTEX_COUNT * 3,
 * layout [x0,y0,z0, x1,y1,z1, ...]; accepts Float64Array or Float32Array
 * since both satisfy ArrayLike<number>).
 *
 * The Newton solver consumes `coneAngleDeficits` as its 8-component residual
 * function. The viewer/demos consume the same functions for per-vertex
 * coloring. One implementation, two callers.
 */

import { VERTEX_COUNT, VERTEX_LINKS } from './topology';

const TWO_PI = Math.PI * 2;

export function coneAngleAt(positions: ArrayLike<number>, i: number): number {
  const link = VERTEX_LINKS[i];
  const oi = 3 * i;
  const xi = positions[oi];
  const yi = positions[oi + 1];
  const zi = positions[oi + 2];
  let total = 0;
  for (let k = 0; k < link.length; k++) {
    const j = link[k];
    const l = link[(k + 1) % link.length];
    const oj = 3 * j;
    const ol = 3 * l;
    const ex = positions[oj] - xi;
    const ey = positions[oj + 1] - yi;
    const ez = positions[oj + 2] - zi;
    const fx = positions[ol] - xi;
    const fy = positions[ol + 1] - yi;
    const fz = positions[ol + 2] - zi;
    const dot = ex * fx + ey * fy + ez * fz;
    const me = Math.hypot(ex, ey, ez);
    const mf = Math.hypot(fx, fy, fz);
    let cos = dot / (me * mf);
    if (cos > 1) cos = 1;
    else if (cos < -1) cos = -1;
    total += Math.acos(cos);
  }
  return total;
}

export function coneAngles(
  positions: ArrayLike<number>,
  out?: Float64Array,
): Float64Array {
  const r = out ?? new Float64Array(VERTEX_COUNT);
  for (let i = 0; i < VERTEX_COUNT; i++) r[i] = coneAngleAt(positions, i);
  return r;
}

/**
 * Per-vertex residual: 2π − coneAngle(i). Zero at every vertex iff the
 * embedding is flat. This is the Newton solver's R(x).
 */
export function coneAngleDeficits(
  positions: ArrayLike<number>,
  out?: Float64Array,
): Float64Array {
  const r = out ?? new Float64Array(VERTEX_COUNT);
  for (let i = 0; i < VERTEX_COUNT; i++) r[i] = TWO_PI - coneAngleAt(positions, i);
  return r;
}

export function maxConeDeficit(positions: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < VERTEX_COUNT; i++) {
    const d = Math.abs(TWO_PI - coneAngleAt(positions, i));
    if (d > m) m = d;
  }
  return m;
}
