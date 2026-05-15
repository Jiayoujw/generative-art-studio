import * as THREE from 'three'
import type { Generator } from '../Generator'
import { getFractalControls } from './controls'
import fullscreenVert from './shaders/fullscreen.vert.glsl'
import mandelbulbFrag from './shaders/mandelbulb.frag.glsl'

export class FractalGenerator implements Generator {
  id = 'fractal'
  name = '分形几何'
  isWebGPU = false

  private scene = new THREE.Scene()
  private camera = new THREE.Camera()
  private mesh: THREE.Mesh | null = null
  private material: THREE.ShaderMaterial | null = null
  private params: Record<string, unknown> = {}

  init(renderer: THREE.WebGLRenderer) {
    const w = renderer.domElement.clientWidth || window.innerWidth
    const h = renderer.domElement.clientHeight || window.innerHeight

    this.material = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: mandelbulbFrag,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(w, h) },
        uPower: { value: 8.0 },
        uIterations: { value: 10 },
        uBailout: { value: 2.0 },
        uCameraDistance: { value: 3.5 },
        uRotation: { value: new THREE.Vector2(0, 0) },
        uColorA: { value: new THREE.Color('#ff0055') },
        uColorB: { value: new THREE.Color('#00aaff') },
        uGlow: { value: 0.5 },
        uColorPalette: { value: 0 },
      },
    })

    const geometry = new THREE.PlaneGeometry(2, 2)
    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.scene.add(this.mesh)

    this.updateMaterial()
  }

  private updateMaterial() {
    if (!this.material) return

    const m = this.material
    const p = this.params

    if (typeof p.power === 'number') m.uniforms.uPower.value = p.power
    if (typeof p.iterations === 'number') m.uniforms.uIterations.value = Math.round(p.iterations)
    if (typeof p.bailout === 'number') m.uniforms.uBailout.value = p.bailout
    if (typeof p.cameraDistance === 'number') m.uniforms.uCameraDistance.value = p.cameraDistance
    if (typeof p.rotationX === 'number' && typeof p.rotationY === 'number') {
      m.uniforms.uRotation.value.set(p.rotationX, p.rotationY)
    }
    if (typeof p.glow === 'number') m.uniforms.uGlow.value = p.glow
    if (typeof p.colorPalette === 'number') m.uniforms.uColorPalette.value = Math.round(p.colorPalette)
    if (typeof p.colorA === 'string') m.uniforms.uColorA.value.set(p.colorA)
    if (typeof p.colorB === 'string') m.uniforms.uColorB.value.set(p.colorB)
  }

  update(time: number, _delta: number) {
    if (this.material) {
      this.material.uniforms.uTime.value = time
    }
  }

  setParams(params: Record<string, unknown>) {
    this.params = params
    this.updateMaterial()
  }

  getControlsSchema() {
    return getFractalControls()
  }

  getScene() {
    return this.scene
  }

  getCamera() {
    return this.camera
  }

  resize(width: number, height: number) {
    if (this.material) {
      this.material.uniforms.uResolution.value.set(width, height)
    }
  }

  dispose() {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (obj.material instanceof THREE.ShaderMaterial) {
          obj.material.dispose()
        }
      }
    })
    this.scene.clear()
    this.mesh = null
    this.material = null
  }
}
