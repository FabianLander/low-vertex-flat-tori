/**
 * PaperTorus — 8 vertex positions in R³ on the fixed topology in `topology.ts`.
 * Thin wrapper around a Float64Array of length 24 so it can back a three.js
 * BufferAttribute directly.
 */

import { VERTEX_COUNT, TRIANGLES } from './topology';
import { coneAngleAt, maxConeDeficit as maxDef } from './angles';

const TWO_PI = Math.PI * 2;

export type Vec3 = [number, number, number];

export class PaperTorus {
  readonly positions: Float64Array;

  constructor(positions?: Float64Array | readonly number[]) {
    this.positions = new Float64Array(VERTEX_COUNT * 3);
    if (positions) {
      if (positions.length !== VERTEX_COUNT * 3) {
        throw new Error(
          `PaperTorus expects ${VERTEX_COUNT * 3} floats, got ${positions.length}`,
        );
      }
      this.positions.set(positions);
    }
  }

  static fromVec3s(verts: readonly Vec3[]): PaperTorus {
    if (verts.length !== VERTEX_COUNT) {
      throw new Error(`expected ${VERTEX_COUNT} vertices, got ${verts.length}`);
    }
    const t = new PaperTorus();
    for (let i = 0; i < VERTEX_COUNT; i++) {
      const [x, y, z] = verts[i];
      t.positions[3 * i] = x;
      t.positions[3 * i + 1] = y;
      t.positions[3 * i + 2] = z;
    }
    return t;
  }

  clone(): PaperTorus {
    return new PaperTorus(this.positions);
  }

  getVertex(i: number, out?: Vec3): Vec3 {
    const o = 3 * i;
    const r = out ?? ([0, 0, 0] as Vec3);
    r[0] = this.positions[o];
    r[1] = this.positions[o + 1];
    r[2] = this.positions[o + 2];
    return r;
  }

  setVertex(i: number, x: number, y: number, z: number): void {
    const o = 3 * i;
    this.positions[o] = x;
    this.positions[o + 1] = y;
    this.positions[o + 2] = z;
  }

  edgeLength(i: number, j: number): number {
    const oi = 3 * i;
    const oj = 3 * j;
    const dx = this.positions[oj] - this.positions[oi];
    const dy = this.positions[oj + 1] - this.positions[oi + 1];
    const dz = this.positions[oj + 2] - this.positions[oi + 2];
    return Math.hypot(dx, dy, dz);
  }

  triangleArea(t: number): number {
    const [a, b, c] = TRIANGLES[t];
    const oa = 3 * a, ob = 3 * b, oc = 3 * c;
    const ax = this.positions[ob] - this.positions[oa];
    const ay = this.positions[ob + 1] - this.positions[oa + 1];
    const az = this.positions[ob + 2] - this.positions[oa + 2];
    const bx = this.positions[oc] - this.positions[oa];
    const by = this.positions[oc + 1] - this.positions[oa + 1];
    const bz = this.positions[oc + 2] - this.positions[oa + 2];
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    return 0.5 * Math.hypot(cx, cy, cz);
  }

  triangleNormal(t: number, out?: Vec3): Vec3 {
    const [a, b, c] = TRIANGLES[t];
    const oa = 3 * a, ob = 3 * b, oc = 3 * c;
    const ax = this.positions[ob] - this.positions[oa];
    const ay = this.positions[ob + 1] - this.positions[oa + 1];
    const az = this.positions[ob + 2] - this.positions[oa + 2];
    const bx = this.positions[oc] - this.positions[oa];
    const by = this.positions[oc + 1] - this.positions[oa + 1];
    const bz = this.positions[oc + 2] - this.positions[oa + 2];
    let nx = ay * bz - az * by;
    let ny = az * bx - ax * bz;
    let nz = ax * by - ay * bx;
    const m = Math.hypot(nx, ny, nz) || 1;
    nx /= m; ny /= m; nz /= m;
    const r = out ?? ([0, 0, 0] as Vec3);
    r[0] = nx; r[1] = ny; r[2] = nz;
    return r;
  }

  /** Sum of corner angles at vertex i. 2π exactly when the embedding is flat. */
  coneAngle(i: number): number {
    return coneAngleAt(this.positions, i);
  }

  coneAngleDeficit(i: number): number {
    return TWO_PI - coneAngleAt(this.positions, i);
  }

  maxConeDeficit(): number {
    return maxDef(this.positions);
  }
}
