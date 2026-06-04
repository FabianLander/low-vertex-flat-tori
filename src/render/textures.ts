/**
 * Texture assets, kept out of the demo folders. Drop image files in
 * `assets/textures/` (repo root) and load them by name from any render demo.
 *
 * Vite needs a static, file-relative glob — from src/render/ the assets dir is
 * `../../assets/textures`. (Demos under renders/<name>/ are also two levels deep,
 * but loading goes through this module so the path lives in exactly one place.)
 */

import * as THREE from 'three';

const ASSET_URLS = import.meta.glob('../../assets/textures/*.{png,jpg,jpeg,webp}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** URL for an asset by filename (e.g. 'paper-normal.jpg'), or undefined if absent. */
export function textureUrl(filename: string): string | undefined {
  return ASSET_URLS[`../../assets/textures/${filename}`];
}

/** Names of all available texture assets (for listing / fallbacks). */
export function textureNames(): string[] {
  return Object.keys(ASSET_URLS).map((p) => p.split('/').pop()!);
}

export interface NormalMapOptions {
  /** Times the map tiles per axis. */
  repeat?: number;
}

/**
 * Load a tileable normal map from assets/textures by filename. Returns the
 * Texture immediately (it fills in once decoded); `onLoad` fires after — use it
 * to e.g. notify the path tracer. Set up correctly for normal maps: RepeatWrapping
 * + linear color space (NOT sRGB). Returns null + warns if the file is missing.
 */
export function loadNormalMap(
  filename: string,
  opts: NormalMapOptions = {},
  onLoad?: (tex: THREE.Texture) => void,
): THREE.Texture | null {
  const url = textureUrl(filename);
  if (!url) {
    console.warn(`[textures] no asset "assets/textures/${filename}" (have: ${textureNames().join(', ')})`);
    return null;
  }
  const repeat = opts.repeat ?? 1;
  const tex = new THREE.TextureLoader().load(url, (t) => { t.needsUpdate = true; onLoad?.(t); });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}
