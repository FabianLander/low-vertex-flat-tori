/**
 * Small, optional stage building blocks for render demos. Each returns a
 * configured object you add to the scene yourself — compose what you want, skip
 * the rest. Deliberately not a framework: the stage stays build-your-own.
 */

import * as THREE from 'three';
import { GradientEquirectTexture, PhysicalSpotLight } from 'three-gpu-pathtracer';

export interface SkyOptions {
  top?: number;
  bottom?: number;
  intensity?: number;
  background?: number;
}

/** Gradient-sky image-based lighting; sets scene.environment (+ optional background). */
export function skyEnvironment(scene: THREE.Scene, opts: SkyOptions = {}): GradientEquirectTexture {
  const env = new GradientEquirectTexture();
  env.topColor.set(opts.top ?? 0x9fb8d6);
  env.bottomColor.set(opts.bottom ?? 0xe9e4da);
  env.update();
  scene.environment = env;
  scene.environmentIntensity = opts.intensity ?? 0.7;
  if (opts.background !== undefined) scene.background = new THREE.Color(opts.background);
  return env;
}

export interface SpotOptions {
  intensity?: number;
  angle?: number;
  penumbra?: number;
  radius?: number;
}

/** A soft, shadow-casting spotlight (the area-light radius gives soft path-traced shadows). */
export function softSpot(opts: SpotOptions = {}): PhysicalSpotLight {
  const spot = new PhysicalSpotLight(0xffffff);
  spot.angle = opts.angle ?? Math.PI / 4;
  spot.penumbra = opts.penumbra ?? 0.8;
  spot.decay = 0;
  spot.distance = 0;
  spot.intensity = opts.intensity ?? 6;
  spot.radius = opts.radius ?? 0.5;
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.camera.near = 0.5;
  spot.shadow.camera.far = 30;
  spot.shadow.radius = 8;
  spot.shadow.bias = -0.0001;
  return spot;
}

/** A vertical backdrop plane (faces +Z toward the camera), set to receive shadows. */
export function backWall(opts: { color?: THREE.ColorRepresentation; width?: number; height?: number; roughness?: number } = {}): THREE.Mesh {
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(opts.width ?? 40, opts.height ?? 28),
    new THREE.MeshStandardMaterial({ color: opts.color ?? 0xced3da, roughness: opts.roughness ?? 0.8, metalness: 0 }),
  );
  wall.receiveShadow = true;
  return wall;
}
