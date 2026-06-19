/**
 * Scalar→color palettes + the helper that turns a scalar field (the value of a
 * condition, e.g. cone deficit per vertex) into per-cell RGB for the subject's
 * `paint*` methods. The subject is palette-agnostic; demos compose these.
 *
 * Impure render boundary (three.js Color).
 */

import * as THREE from 'three';

export type ScalarPalette = {
  color: (value: number, domain: [number, number]) => THREE.Color;
  domain?: [number, number];
};

const HIGHLIGHT_COLOR = new THREE.Color(0xffd34d);
const DEFAULT_VERTEX_COLOR = new THREE.Color(0xe8e8ec);
const FLAT_COLOR = new THREE.Color(0x4ade80);   // green
const BENT_COLOR = new THREE.Color(0xef4444);   // red

function clamp01(x: number): number { return x < 0 ? 0 : x > 1 ? 1 : x; }

function lerpColor(a: THREE.Color, b: THREE.Color, t: number, out: THREE.Color): THREE.Color {
  const u = clamp01(t);
  out.r = a.r + (b.r - a.r) * u;
  out.g = a.g + (b.g - a.g) * u;
  out.b = a.b + (b.b - a.b) * u;
  return out;
}

/** Cone-angle deficit: green at 0, lerping to red as |value| grows. Domain ~ the
 *  scale of small mismatches we want to see. */
export const DEFICIT_PALETTE: ScalarPalette = {
  domain: [0, 0.05],
  color: (value, domain) => {
    const span = Math.max(domain[1] - domain[0], 1e-12);
    const t = (Math.abs(value) - domain[0]) / span;
    return lerpColor(FLAT_COLOR, BENT_COLOR, t, new THREE.Color());
  },
};

/** Two-stop one-hot selection: above 0.5 → highlight, below → neutral. */
export const HIGHLIGHT_PALETTE: ScalarPalette = {
  domain: [0, 1],
  color: (value) => (value > 0.5 ? HIGHLIGHT_COLOR.clone() : DEFAULT_VERTEX_COLOR.clone()),
};

/** Per-cell RGB triples (length n·3) from n scalars through a palette — what the
 *  subject hands `setCellColors`. Domain is the palette's, else autoscaled to [min,max]. */
export function colorsFromScalars(values: ArrayLike<number>, palette: ScalarPalette): Float32Array {
  const n = values.length;
  const domain = palette.domain ?? autoDomain(values);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const c = palette.color(values[i], domain);
    out[3 * i] = c.r; out[3 * i + 1] = c.g; out[3 * i + 2] = c.b;
  }
  return out;
}

function autoDomain(values: ArrayLike<number>): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < values.length; i++) { const v = values[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  return isFinite(lo) && isFinite(hi) ? [lo, hi] : [0, 1];
}

export function oneHot(n: number, i: number | null): Float32Array {
  const out = new Float32Array(n);
  if (i !== null && i >= 0 && i < n) out[i] = 1;
  return out;
}
