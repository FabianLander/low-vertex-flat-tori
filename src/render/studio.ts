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
  /** Letterbox the canvas to this width/height aspect ratio inside the window
   *  (e.g. 16/9, 1, 4/5) so it's framed precisely. Omit to fill the window. */
  aspect?: number;
}

export class Studio {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: PhysicalCamera;
  readonly controls: OrbitControls;

  private pathTracer?: WebGLPathTracer;
  private mode: RenderMode;
  private _bounces: number;
  private readonly pathTraceScale: number;
  private readonly basePixelRatio: number;
  private _aspect?: number;
  private readonly onModeChange?: (mode: RenderMode) => void;

  // Auto-sync tracking (mirrors RenderManager).
  private lastEnvironment: THREE.Texture | null = null;
  private materialsDirty = false;

  // Autosave-every-N-spp.
  private _autosaveEvery = 0;
  private _autosaveNext = 0;
  private _autosaveName = 'render';

  private running = false;

  constructor(opts: StudioOptions = {}) {
    const container = opts.container ?? document.body;
    this._bounces = opts.bounces ?? 5;
    this.mode = opts.mode ?? 'webgl';
    this.onModeChange = opts.onModeChange;

    const pixelRatio = opts.pixelRatio ?? Math.min(window.devicePixelRatio, 2);
    this.basePixelRatio = pixelRatio;
    this.pathTraceScale = opts.pathTraceScale ?? 1 / pixelRatio;
    this._aspect = opts.aspect;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
    this.applyAspectStyle();

    this.scene = new THREE.Scene();

    this.camera = new PhysicalCamera(45, 1, 0.01, 100);
    this.camera.position.set(2.6, 1.8, 3.0);
    this.camera.fStop = 1e5;   // DOF off until the caller dials it in
    this.applySize();

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
      if (this._autosaveEvery > 0 && this.pathTracer.samples >= this._autosaveNext) {
        const spp = Math.floor(this.pathTracer.samples);
        this._autosaveNext += this._autosaveEvery;
        this.screenshot(`${this._autosaveName}-${spp}spp.png`);
      }
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** Samples accumulated by the path tracer (0 in preview). */
  get samples(): number {
    return this.mode === 'pathtracing' && this.pathTracer ? this.pathTracer.samples : 0;
  }

  /** Max light bounces (path-trace quality/GI). */
  get bounces(): number { return this._bounces; }
  setBounces(n: number): void {
    this._bounces = Math.max(1, Math.round(n));
    if (this.pathTracer) { this.pathTracer.bounces = this._bounces; this.resetAccumulation(); }
  }

  /** Letterbox aspect ratio (w/h), or undefined to fill the window. */
  get aspect(): number | undefined { return this._aspect; }
  setAspect(ratio: number | null): void {
    this._aspect = ratio && ratio > 0 ? ratio : undefined;
    this.applyAspectStyle();
    this.applySize();
    if (this.mode === 'pathtracing') this.pathTracer?.updateCamera();
  }

  /** Center + dark-surround the canvas when letterboxed; fill the window otherwise. */
  private applyAspectStyle(): void {
    const el = this.renderer.domElement;
    if (this._aspect) {
      el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%)';
      document.body.style.background = '#1a1a1a';
    } else {
      el.style.cssText = '';
      document.body.style.background = '';
    }
  }

  /** Canvas size in CSS px: full window, or the largest `aspect` rect that fits. */
  private viewportSize(): { w: number; h: number } {
    const W = window.innerWidth, H = window.innerHeight;
    if (!this._aspect) return { w: W, h: H };
    let w = W, h = Math.round(W / this._aspect);
    if (h > H) { h = H; w = Math.round(H * this._aspect); }
    return { w, h };
  }

  /** Resize the renderer + camera to the current viewport (window or letterbox). */
  private applySize(): void {
    const { w, h } = this.viewportSize();
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Auto-tile the path trace: ~1 tile per ~1.2 MP, so a small render stays a
   *  single fast tile and a big one is split into enough pieces to keep each GPU
   *  draw short (no watchdog freeze). Same total work, just chunked when needed. */
  private applyTiles(): void {
    if (!this.pathTracer) return;
    const v = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(v);
    const n = Math.max(1, Math.ceil(Math.sqrt((v.x * v.y) / 1.2e6)));
    this.pathTracer.tiles.set(n, n);
  }

  /** Multiply the render + screenshot resolution: 1 = screen, 2 = 2× per axis
   *  (4× the pixels), etc. The canvas still displays at its on-screen size; the
   *  path tracer re-targets to the bigger buffer on the next reset. Clamped to
   *  the GPU's limits. */
  setResolutionScale(mult: number): void {
    const safe = this.clampMult(mult);
    if (safe < mult) {
      const s = this.predictRenderSize(mult);
      console.warn(`[studio] ${mult}× exceeds GPU limits; rendering at ${safe}× (${s.width}×${s.height}) instead.`);
    }
    // Full resize (mirrors onResize) so the drawing buffer, viewport, camera and
    // the path-tracer target stay in sync — otherwise the render fills only part
    // of the enlarged buffer and a save shows blank margins.
    this.renderer.setPixelRatio(this.basePixelRatio * safe);
    this.applySize();
    if (this.mode === 'pathtracing') { this.pathTracer?.updateCamera(); this.applyTiles(); } // resize target + retile
  }

  /** Largest safe integer multiplier: limited by the GPU's max texture / viewport
   *  size AND a total-pixel cap (the path tracer holds several float targets, so
   *  an over-large buffer renders only partially or fails). */
  private clampMult(mult: number): number {
    const gl = this.renderer.getContext();
    const vp = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array | null;
    const dimLimit = Math.min(
      this.renderer.capabilities.maxTextureSize || 8192,
      vp ? Math.min(vp[0], vp[1]) : Infinity,
    );
    const { w, h } = this.viewportSize();
    const longest = Math.max(w, h) * this.basePixelRatio;
    const byDim = Math.floor(dimLimit / longest);

    const MAX_PIXELS = 100e6; // ~100 MP cap — big exports while keeping the float targets within memory
    const baseArea = w * h * this.basePixelRatio * this.basePixelRatio;
    const byArea = Math.floor(Math.sqrt(MAX_PIXELS / baseArea));

    return Math.max(1, Math.min(mult, byDim, byArea));
  }

  /** Current render-target size in device pixels (= the size a screenshot will be). */
  renderSize(): { width: number; height: number } {
    const v = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(v);
    return { width: Math.round(v.x), height: Math.round(v.y) };
  }

  /** Predicted output size for a given multiplier (clamped to the GPU limit). */
  predictRenderSize(mult: number): { width: number; height: number } {
    const m = this.clampMult(mult);
    const { w, h } = this.viewportSize();
    return {
      width: Math.round(w * this.basePixelRatio * m),
      height: Math.round(h * this.basePixelRatio * m),
    };
  }

  /** Save the current frame as a PNG download — pixel-perfect at the render
   *  resolution (= window size × pixelRatio × resolution-scale). */
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
      this.pathTracer.bounces = this._bounces;
      this.pathTracer.renderScale = this.pathTraceScale;     // trace at logical res, not 4× for retina
    }
    this.mode = 'pathtracing';
    this.pathTracer.setScene(this.scene, this.camera);     // builds the BVH
    this.applyTiles();
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

  resetAccumulation(): void { this.pathTracer?.reset(); this._autosaveNext = this._autosaveEvery; }

  /** Auto-download a PNG every `everySpp` accumulated samples (0 = off). Filenames
   *  get the spp count, e.g. flat-tori-grid-1000spp.png — handy for long renders. */
  setAutosave(everySpp: number, baseName = 'render'): void {
    this._autosaveEvery = Math.max(0, Math.floor(everySpp));
    this._autosaveName = baseName.replace(/\.png$/i, '');
    this._autosaveNext = this._autosaveEvery;
  }

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
    this.applySize();
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
