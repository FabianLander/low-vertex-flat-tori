/**
 * instanceGroup — the shared scaffolding behind `edges` (tubes) and `vertices`
 * (spheres): a `THREE.Group` of ONE shared geometry cloned into `count` meshes, each
 * owning its material so it can be tinted independently. Owns the per-cell color
 * channel (`setColors`), disposal, and the Model A material ownership — "if you
 * injected a material I clone it and free the clones but keep your proto; if I built
 * the default proto I free that too." The part supplies only its geometry + a
 * per-instance transform (its `children` are placed in the part's `draw`).
 *
 * Impure render boundary (three.js).
 */

import * as THREE from 'three';

export interface InstanceGroup {
  readonly group: THREE.Group;
  /** The per-cell meshes, in order — the part transforms these in its `draw`. */
  readonly children: THREE.Mesh[];
  /** Per-cell colors (count·3 floats) or null to reset to base. */
  setColors(rgb: Float32Array | null): void;
  dispose(): void;
}

export interface InstanceGroupOptions {
  /** Shared geometry for every instance; disposed once on `dispose`. */
  geometry: THREE.BufferGeometry;
  count: number;
  /** Caller-owned proto to clone per cell (kept on dispose); else `makeDefault` builds + owns one. */
  material?: THREE.Material;
  makeDefault: () => THREE.Material;
  /** Base tint when unpainted. Default: the injected material's color, else `fallbackColor`. */
  baseColor?: THREE.ColorRepresentation;
  fallbackColor: THREE.ColorRepresentation;
}

export function instanceGroup(opts: InstanceGroupOptions): InstanceGroup {
  const proto = opts.material ?? opts.makeDefault();
  // base = explicit baseColor, else the INJECTED material's color, else the fallback.
  const base = opts.baseColor !== undefined
    ? new THREE.Color(opts.baseColor)
    : (opts.material as THREE.MeshStandardMaterial | undefined)?.color?.clone() ?? new THREE.Color(opts.fallbackColor);

  const group = new THREE.Group();
  const children: THREE.Mesh[] = [];
  const materials: THREE.Material[] = [];
  for (let i = 0; i < opts.count; i++) {
    const mat = proto.clone();
    (mat as THREE.MeshStandardMaterial).color?.copy(base);
    materials.push(mat);
    const mesh = new THREE.Mesh(opts.geometry, mat);
    children.push(mesh);
    group.add(mesh);
  }
  if (!opts.material) proto.dispose();   // the default proto was ours; clones live on

  function setColors(rgb: Float32Array | null): void {
    for (let i = 0; i < opts.count; i++) {
      const c = (materials[i] as THREE.MeshStandardMaterial).color;
      if (!c) continue;
      if (rgb === null) c.copy(base);
      else c.setRGB(rgb[3 * i], rgb[3 * i + 1], rgb[3 * i + 2]);
    }
  }

  function dispose(): void {
    opts.geometry.dispose();
    materials.forEach((m) => m.dispose());
  }

  return { group, children, setColors, dispose };
}
