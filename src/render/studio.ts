/**
 * Studio — a small render harness with runtime-switchable backends:
 *
 *   • webgl       — fast interactive preview (default)
 *   • pathtracing — accumulating GPU path trace (three-gpu-pathtracer)
 *
 * One WebGLRenderer, one PhysicalCamera (so depth-of-field is available in PT and
 * the preview still renders it — PhysicalCamera extends PerspectiveCamera), one
 * scene the Studio owns. The whole webgl↔PT switch lives behind `render()`, which
 * dispatches on `mode`; the RAF loop never knows which backend is active.
 *
 * Accumulation reset is centralized into the few signals that matter:
 *   - camera move / resize  → handled automatically
 *   - environment changed   → auto-detected each frame
 *   - materials changed mid-trace → notifyMaterialsChanged()
 *   - geometry added/removed → notifySceneChanged()  (rebuilds the BVH)
 *
 * Deliberately NOT a framework: no UI, no lights, no floor. The stage is built
 * per-render by mutating `studio.scene`.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WebGLPathTracer, PhysicalCamera } from 'three-gpu-pathtracer';

export type RenderMode = 'webgl' | 'pathtracing';

export interface StudioOptions {
  container?: HTMLElement;
  pixelRatio?: number;
  bounces?: number;
  /** Path-trace internal resolution scale. The path tracer renders the drawing
   *  buffer (which already includes pixelRatio), so at DPR 2 a scale of 1 means
   *  4× the rays. Defaults to 1/pixelRatio ⟹ trace at ~logical resolution. */
  pathTraceScale?: number;
  /** Initial backend. Default 'webgl'. */
  mode?: RenderMode;
  /** Called whenever the backend switches (e.g. to swap preview ↔ studio lights). */
  onModeChange?: (mode: RenderMode) => void;
}

export class Studio {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: PhysicalCamera;
  readonly controls: OrbitControls;

  private pathTracer?: WebGLPathTracer;
  private mode: RenderMode;
  private readonly bounces: number;
  private readonly pathTraceScale: number;
  private readonly onModeChange?: (mode: RenderMode) => void;

  // Auto-sync tracking (mirrors RenderManager).
  private lastEnvironment: THREE.Texture | null = null;
  private materialsDirty = false;

  private running = false;

  constructor(opts: StudioOptions = {}) {
    const container = opts.container ?? document.body;
    this.bounces = opts.bounces ?? 5;
    this.mode = opts.mode ?? 'webgl';
    this.onModeChange = opts.onModeChange;

    const pixelRatio = opts.pixelRatio ?? Math.min(window.devicePixelRatio, 2);
    this.pathTraceScale = opts.pathTraceScale ?? 1 / pixelRatio;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new PhysicalCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
    this.camera.position.set(2.6, 1.8, 3.0);
    // DOF effectively off until the caller dials it in (PhysicalCamera defaults to a wide f/1.4).
    this.camera.fStop = 1e5;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.addEventListener('change', () => {
      if (this.mode === 'pathtracing') this.pathTracer?.updateCamera(); // resets accumulation
    });

    window.addEventListener('resize', this.onResize);
  }

  // ---- scene plumbing ----------------------------------------------------

  /** Add an object and (if tracing) rebuild the BVH. */
  add(obj: THREE.Object3D): void {
    this.scene.add(obj);
    this.notifySceneChanged();
  }

  /** Point the camera at an object: orbit its bounding-sphere center, back off to fit.
   *  `direction` (camera→ relative to target) sets the viewing angle, e.g.
   *  (0,0,1) for front-on; defaults to the current view direction. */
  frame(obj: THREE.Object3D, opts: { distance?: number; direction?: THREE.Vector3 } = {}): void {
    const box = new THREE.Box3().setFromObject(obj);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const r = sphere.radius || 1;
    const fov = (this.camera.fov * Math.PI) / 180;
    const dist = opts.distance ?? (r / Math.sin(fov / 2)) * 1.1;
    const dir = (opts.direction
      ? opts.direction.clone()
      : new THREE.Vector3().subVectors(this.camera.position, this.controls.target)
    ).normalize();
    this.controls.target.copy(sphere.center);
    this.camera.position.copy(sphere.center).addScaledVector(dir, dist);
    this.camera.updateProjectionMatrix();
    this.controls.update();
    if (this.mode === 'pathtracing') this.pathTracer?.updateCamera();
  }

  // ---- the loop + the one dispatch seam ----------------------------------

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = (): void => {
      if (!this.running) return;
      this.controls.update();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  stop(): void { this.running = false; }

  render(): void {
    if (this.mode === 'pathtracing' && this.pathTracer) {
      if (this.lastEnvironment !== this.scene.environment) {
        this.pathTracer.updateEnvironment();
        this.lastEnvironment = this.scene.environment;
        this.resetAccumulation();
      }
      if (this.materialsDirty) {
        this.pathTracer.updateMaterials();
        this.materialsDirty = false;
        this.resetAccumulation();
      }
      this.pathTracer.renderSample();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** Samples accumulated by the path tracer (0 in preview). */
  get samples(): number {
    return this.mode === 'pathtracing' && this.pathTracer ? this.pathTracer.samples : 0;
  }

  /** Save the current frame as a PNG download — pixel-perfect at the render
   *  resolution (= window size × pixelRatio). Needs preserveDrawingBuffer (on). */
  screenshot(filename = 'render.png'): void {
    this.renderer.domElement.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  // ---- mode switching ----------------------------------------------------

  enablePathTracing(): void {
    if (!this.pathTracer) {
      this.pathTracer = new WebGLPathTracer(this.renderer);
      this.pathTracer.bounces = this.bounces;
      this.pathTracer.renderScale = this.pathTraceScale;     // trace at logical res, not 4× for retina
    }
    this.mode = 'pathtracing';
    this.pathTracer.setScene(this.scene, this.camera);     // builds the BVH
    this.pathTracer.updateMaterials();
    if (this.scene.environment) this.pathTracer.updateEnvironment();
    this.lastEnvironment = this.scene.environment;
    this.onModeChange?.('pathtracing');
  }

  enableWebGL(): void {
    this.mode = 'webgl';
    this.onModeChange?.('webgl');
  }

  toggleMode(): RenderMode {
    if (this.mode === 'pathtracing') this.enableWebGL();
    else this.enablePathTracing();
    return this.mode;
  }

  isPathTracing(): boolean { return this.mode === 'pathtracing'; }

  // ---- the reset / sync contract -----------------------------------------

  resetAccumulation(): void { this.pathTracer?.reset(); }

  /** Materials changed while tracing — re-sync on the next frame. */
  notifyMaterialsChanged(): void { this.materialsDirty = true; }

  /** Geometry added/removed — rebuild the BVH (only matters while tracing). */
  notifySceneChanged(): void {
    if (this.mode === 'pathtracing' && this.pathTracer) {
      this.pathTracer.setScene(this.scene, this.camera);
      this.pathTracer.updateMaterials();
      if (this.scene.environment) this.pathTracer.updateEnvironment();
    }
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.mode === 'pathtracing') this.pathTracer?.updateCamera();
  };

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.pathTracer?.dispose();
    this.renderer.dispose();
  }
}
