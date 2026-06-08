/**
 * TorusMesh — a THREE.Group bundling a PaperTorus as faces + edges + vertices,
 * all built from REAL triangle geometry (merged tubes / spheres), so it renders
 * identically in the WebGL preview and the path tracer (no LineSegments /
 * InstancedMesh, which the BVH can't see).
 *
 * This is the render-oriented "subject", the heavy counterpart to the
 * interactive viewer/TorusView. Appearance is injected: pass your own materials
 * (e.g. a fundamental-domain grid material from render/grid) or take the
 * defaults. Geometry options (uv, radii) live here; lighting/material taste does
 * not.
 */

import * as THREE from 'three';
import type { PaperTorus } from '../math/embedding';
import { facesGeometry } from './faces';
import { edgesGeometry } from './edges';
import { verticesGeometry } from './vertices';

export interface TorusMeshOptions {
  faces?: boolean;       // default true
  edges?: boolean;       // default true
  vertices?: boolean;    // default true
  /** Attach intrinsic lattice UVs to the faces (for a fundamental-domain texture). */
  uv?: boolean;          // default false
  uvRepeat?: number;     // cells per fundamental domain
  /** Solidify the faces into a slab of this thickness (0 = zero-thickness sheet). */
  thickness?: number;
  /** Offset the geometry so the group's local origin = the torus's center, making
   *  group.position/rotation behave as place-the-center / rotate-about-center. Default true. */
  center?: boolean;
  edgeRadius?: number;
  /** Outward push of edge tubes along the surface normal; default = edgeRadius. Use 0 to center on the crease. */
  edgeOffset?: number;
  vertexRadius?: number;
  faceMaterial?: THREE.Material;
  edgeMaterial?: THREE.Material;
  vertexMaterial?: THREE.Material;
}

export class TorusMesh extends THREE.Group {
  readonly faces?: THREE.Mesh;
  readonly edges?: THREE.Mesh;
  readonly vertices?: THREE.Mesh;

  private readonly paper: PaperTorus;
  private readonly faceGeomOpts: { uv?: boolean; uvRepeat?: number; thickness?: number };
  private readonly edgeOffset?: number;
  private readonly ownedMaterials: THREE.Material[] = [];

  constructor(paper: PaperTorus, opts: TorusMeshOptions = {}) {
    super();
    this.paper = paper;
    this.faceGeomOpts = { uv: opts.uv, uvRepeat: opts.uvRepeat, thickness: opts.thickness };
    this.edgeOffset = opts.edgeOffset;
    const showFaces = opts.faces ?? true;
    const showEdges = opts.edges ?? true;
    const showVertices = opts.vertices ?? true;
    // Offset children so the group's local origin sits at the torus center.
    const recenter = (opts.center ?? true) ? negCenter(paper.positions) : null;

    if (showFaces) {
      const mat = opts.faceMaterial ?? this.own(new THREE.MeshStandardMaterial({
        color: 0xe0a94a, roughness: 0.4, metalness: 0.0,
        flatShading: true, side: THREE.DoubleSide,
      }));
      this.faces = new THREE.Mesh(facesGeometry(paper, this.faceGeomOpts), mat);
      if (recenter) this.faces.position.copy(recenter);
      this.add(this.faces);
    }

    if (showEdges) {
      const mat = opts.edgeMaterial ?? this.own(new THREE.MeshStandardMaterial({
        color: 0x1a1a1f, roughness: 0.5, metalness: 0.0,
      }));
      this.edges = new THREE.Mesh(edgesGeometry(paper, { radius: opts.edgeRadius, offset: opts.edgeOffset }), mat);
      if (recenter) this.edges.position.copy(recenter);
      this.add(this.edges);
    }

    if (showVertices) {
      const mat = opts.vertexMaterial ?? this.own(new THREE.MeshStandardMaterial({
        color: 0xe8e8ec, roughness: 0.4, metalness: 0.0,
      }));
      this.vertices = new THREE.Mesh(verticesGeometry(paper, { radius: opts.vertexRadius }), mat);
      if (recenter) this.vertices.position.copy(recenter);
      this.add(this.vertices);
    }
  }

  private own<T extends THREE.Material>(mat: T): T {
    this.ownedMaterials.push(mat);
    return mat;
  }

  /** Rebuild the face geometry at a new slab thickness (0 = zero-thickness sheet). */
  setThickness(thickness: number): void {
    if (!this.faces) return;
    this.faceGeomOpts.thickness = Math.max(0, thickness);
    const old = this.faces.geometry;
    this.faces.geometry = facesGeometry(this.paper, this.faceGeomOpts);
    old.dispose();
  }

  /** Rebuild the edge tubes at a new radius (0 ⟹ zero-radius ⟹ effectively invisible). */
  setEdgeRadius(radius: number): void {
    if (!this.edges) return;
    const old = this.edges.geometry;
    this.edges.geometry = edgesGeometry(this.paper, { radius, offset: this.edgeOffset });
    old.dispose();
  }

  setFacesVisible(v: boolean): void { if (this.faces) this.faces.visible = v; }
  setEdgesVisible(v: boolean): void { if (this.edges) this.edges.visible = v; }
  setVerticesVisible(v: boolean): void { if (this.vertices) this.vertices.visible = v; }

  dispose(): void {
    for (const mesh of [this.faces, this.edges, this.vertices]) {
      if (mesh) mesh.geometry.dispose();
    }
    this.ownedMaterials.forEach((m) => m.dispose());
  }
}

/** −(bounding-box center) of the vertex positions, as a Vector3. */
function negCenter(pos: Float64Array): THREE.Vector3 {
  let lox = Infinity, loy = Infinity, loz = Infinity;
  let hix = -Infinity, hiy = -Infinity, hiz = -Infinity;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2];
    if (x < lox) lox = x; if (x > hix) hix = x;
    if (y < loy) loy = y; if (y > hiy) hiy = y;
    if (z < loz) loz = z; if (z > hiz) hiz = z;
  }
  return new THREE.Vector3(-(lox + hix) / 2, -(loy + hiy) / 2, -(loz + hiz) / 2);
}
