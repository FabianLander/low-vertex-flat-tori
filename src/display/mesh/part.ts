/**
 * Part — one shared contract for the three things a `TorusView` is built from, which
 * are really ONE thing at three cell-dimensions: the k-cells of the triangulation
 * realized in ℝ³.
 *
 *   vertices → 0-cells (count V) → spheres
 *   edges    → 1-cells (count E) → tubes
 *   faces    → 2-cells (count F) → the surface
 *
 * A `Part` carries WHICH cell-dimension it lives on (`domain`) and how many cells
 * there are (`cellCount`), so coloring is one operation parameterized by k: take a
 * scalar field on the k-cells (e.g. cone deficit on vertices, embedded margin on
 * faces), map each value through a palette, tint that cell's geometry. `draw` streams
 * a realization (bare positions, length 3V); `setColors` is the orthogonal color
 * channel (length `cellCount`·3 rgb, or null to reset to the part's base).
 *
 * Impure render boundary (three.js).
 */

import * as THREE from 'three';
import type { Vec3 } from '@core/geometry/vec3.ts';

/** A cell-dimension of the triangulation: 0/1/2-cells. */
export type CellDomain = 'vertex' | 'edge' | 'face';

export interface Part {
  readonly object: THREE.Object3D;
  /** Which k-cells this part realizes. */
  readonly domain: CellDomain;
  /** Number of those cells (V, E, or F). */
  readonly cellCount: number;
  /** Stream a realization: rewrite geometry in place. `center` (the shared frame
   *  origin, e.g. the bbox center) is subtracted if given. */
  draw(positions: ArrayLike<number>, center?: Vec3 | null): void;
  /** Per-cell colors (cellCount·3 floats) or null to reset to base. Orthogonal to draw. */
  setColors(rgb: Float32Array | null): void;
  dispose(): void;
}
