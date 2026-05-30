/**
 * Scalar→color palettes and helpers. The viewer is palette-agnostic;
 * demos compose these and hand them to setVertexScalars / setFaceScalars.
 */

import * as THREE from 'three';

export type ScalarPalette = {
  color: (value: number, domain: [number, number]) => THREE.Color;
  domain?: [number, number];
};

export const DEFAULT_VERTEX_COLOR = new THREE.Color(0xe8e8ec);
export const DEFAULT_FACE_COLOR = new THREE.Color(0x6a8caf);
export const DEFAULT_EDGE_COLOR = new THREE.Color(0x1a1a1f);

const HIGHLIGHT_COLOR = new THREE.Color(0xffd34d);
const FLAT_COLOR = new THREE.Color(0x4ade80);   // green
const BENT_COLOR = new THREE.Color(0xef4444);   // red
const COOL_COLOR = new THREE.Color(0x3b82f6);   // blue
const NEUTRAL_COLOR = new THREE.Color(0xf3f4f6); // near-white

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function lerpColor(a: THREE.Color, b: THREE.Color, t: number, out: THREE.Color): THREE.Color {
  const u = clamp01(t);
  out.r = a.r + (b.r - a.r) * u;
  out.g = a.g + (b.g - a.g) * u;
  out.b = a.b + (b.b - a.b) * u;
  return out;
}

// Cone-angle deficit palette: green at 0, lerping to red as |value| grows.
// Default domain ~3° (the scale of small mismatches we want to see).
export const DEFICIT_PALETTE: ScalarPalette = {
  domain: [0, 0.05],
  color: (value, domain) => {
    const span = Math.max(domain[1] - domain[0], 1e-12);
    const t = (Math.abs(value) - domain[0]) / span;
    return lerpColor(FLAT_COLOR, BENT_COLOR, t, new THREE.Color());
  },
};

// Two-stop palette for one-hot selection: above 0.5 → highlight, below → default.
export const HIGHLIGHT_PALETTE: ScalarPalette = {
  domain: [0, 1],
  color: (value) => (value > 0.5 ? HIGHLIGHT_COLOR.clone() : DEFAULT_VERTEX_COLOR.clone()),
};

// Generic diverging blue→white→red, autoscaled (caller may pin domain).
export const STRAIN_PALETTE: ScalarPalette = {
  color: (value, domain) => {
    const lo = domain[0];
    const hi = domain[1];
    const mid = 0.5 * (lo + hi);
    const half = Math.max(hi - mid, 1e-12);
    const t = (value - mid) / half; // in [-1, 1] for in-domain values
    if (t < 0) {
      return lerpColor(NEUTRAL_COLOR, COOL_COLOR, -t, new THREE.Color());
    }
    return lerpColor(NEUTRAL_COLOR, BENT_COLOR, t, new THREE.Color());
  },
};

export function oneHot(n: number, i: number | null): Float32Array {
  const out = new Float32Array(n);
  if (i !== null && i >= 0 && i < n) out[i] = 1;
  return out;
}

export function constantScalars(n: number, v: number): Float32Array {
  const out = new Float32Array(n);
  out.fill(v);
  return out;
}
