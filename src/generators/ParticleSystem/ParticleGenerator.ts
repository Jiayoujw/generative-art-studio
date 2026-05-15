import * as THREE from 'three'
import type { Generator } from '../Generator'
import { getParticleControls } from './controls'
import particleVert from './shaders/particle.vert.glsl'
import particleFrag from './shaders/particle.frag.glsl'

export class ParticleGenerator implements Generator {
  id = 'particles'
  name = '粒子系统'
  isWebGPU = false

  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
  private points: THREE.Points | null = null
  private material: THREE.ShaderMaterial | null = null
  private params: Record<string, unknown> = {}

  constructor() {
    this.camera.position.z = 15
  }

  init(_renderer: THREE.WebGLRenderer) {
    this.createParticles(25000)
    this.updateMaterial()
  }

  private createParticles(count: number) {
    if (this.points) {
      this.scene.remove(this.points)
      this.points.geometry.dispose()
      if (this.material) this.material.dispose()
    }

    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Spherical distribution
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.cbrt(Math.random()) * 10

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      seeds[i] = Math.random()
      sizes[i] = 0.3 + Math.random() * 0.7
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

    this.material = new THREE.ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: 1.0 },
        uNoiseScale: { value: 0.5 },
        uPointSize: { value: 1.0 },
        uAlpha: { value: 0.85 },
        uColorA: { value: new THREE.Color('#ff0055') },
        uColorB: { value: new THREE.Color('#00aaff') },
      },
    })

    this.points = new THREE.Points(geometry, this.material)
    this.scene.add(this.points)
  }

  private updateMaterial() {
    if (!this.material) return

    const m = this.material
    const p = this.params

    if (typeof p.speed === 'number') m.uniforms.uSpeed.value = p.speed
    if (typeof p.noiseScale === 'number') m.uniforms.uNoiseScale.value = p.noiseScale
    if (typeof p.pointSize === 'number') m.uniforms.uPointSize.value = p.pointSize
    if (typeof p.alpha === 'number') m.uniforms.uAlpha.value = p.alpha
    if (typeof p.colorA === 'string') m.uniforms.uColorA.value.set(p.colorA)
    if (typeof p.colorB === 'string') m.uniforms.uColorB.value.set(p.colorB)
  }

  update(time: number, _delta: number) {
    if (this.material) {
      this.material.uniforms.uTime.value = time
    }
  }

  setParams(params: Record<string, unknown>) {
    const oldCount = (this.params.count as number) ?? 25000
    this.params = params

    if (typeof params.count === 'number' && params.count !== oldCount) {
      this.createParticles(params.count)
      this.updateMaterial()
    } else {
      this.updateMaterial()
    }
  }

  getControlsSchema() {
    return getParticleControls()
  }

  getScene() {
    return this.scene
  }

  getCamera() {
    return this.camera
  }

  dispose() {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Points) {
        obj.geometry.dispose()
        if (obj.material instanceof THREE.ShaderMaterial) {
          obj.material.dispose()
        }
      }
    })
    this.scene.clear()
    this.points = null
    this.material = null
  }
}
