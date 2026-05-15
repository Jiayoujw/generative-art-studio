import {
  PointsNodeMaterial,
  BufferGeometry,
  BufferAttribute,
  Points,
  Scene,
  PerspectiveCamera,
} from 'three/webgpu'
import {
  Fn,
  uniform,
  vec3,
  float,
  instanceIndex,
  instancedArray,
  color,
  fract,
  sin,
  length,
  normalize,
  mix,
  clamp,
  abs,
  positionView,
  If,
} from 'three/tsl'
import type { Generator } from '../Generator'
import { getComputeParticleControls } from './controls'

export class ComputeParticles implements Generator {
  id = 'compute-particles'
  name = '百万粒子 (WebGPU)'
  isWebGPU = true

  private scene = new Scene()
  private camera = new PerspectiveCamera(60, 1, 0.1, 100)
  private points: Points | null = null
  private material: PointsNodeMaterial | null = null
  private computeNode: any = null
  private params: Record<string, unknown> = {}

  // Storage buffers
  private positionBuffer: any = null
  private originBuffer: any = null
  private colorBuffer: any = null
  private seedBuffer: any = null

  // Uniforms
  private uTime = uniform(0)
  private uSpeed = uniform(1.0)
  private uNoiseScale = uniform(0.5)
  private uPointSize = uniform(1.5)
  private uMousePos = uniform(vec3(0, 0, 0))
  private uMouseInfluence = uniform(2.0)
  private uMouseRadius = uniform(5.0)
  private uColorA = uniform(color('#ff0055'))
  private uColorB = uniform(color('#00aaff'))
  private uColorC = uniform(color('#ffaa00'))

  private rendererRef: any = null
  private mouseHandler: ((e: MouseEvent) => void) | null = null

  constructor() {
    this.camera.position.z = 15
  }

  init(renderer: unknown) {
    this.rendererRef = renderer
    const count = (this.params.count as number) || 500000

    this.createBuffers(count)
    this.createComputeShader(count)
    this.createMaterial(count)
    this.setupMouseInteraction()
  }

  private createBuffers(count: number) {
    // Create storage buffers via TSL
    this.positionBuffer = instancedArray(count, 'vec3')
    this.originBuffer = instancedArray(count, 'vec3')
    this.colorBuffer = instancedArray(count, 'vec3')
    this.seedBuffer = instancedArray(count, 'vec2') // seed, size

    // Initialize CPU-side data
    const posArray = this.positionBuffer.value.array as Float32Array
    const originArray = this.originBuffer.value.array as Float32Array
    const colArray = this.colorBuffer.value.array as Float32Array
    const seedArray = this.seedBuffer.value.array as Float32Array

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.cbrt(Math.random()) * 8

      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      posArray[i * 3] = x
      posArray[i * 3 + 1] = y
      posArray[i * 3 + 2] = z

      originArray[i * 3] = x
      originArray[i * 3 + 1] = y
      originArray[i * 3 + 2] = z

      colArray[i * 3] = Math.random()
      colArray[i * 3 + 1] = Math.random()
      colArray[i * 3 + 2] = Math.random()

      seedArray[i * 2] = Math.random()
      seedArray[i * 2 + 1] = 0.3 + Math.random() * 0.7
    }
  }

  private createComputeShader(count: number) {
    const positionBuffer = this.positionBuffer
    const originBuffer = this.originBuffer
    const seedBuffer = this.seedBuffer

    const uTime = this.uTime
    const uSpeed = this.uSpeed
    const uNoiseScale = this.uNoiseScale
    const uMousePos = this.uMousePos
    const uMouseInfluence = this.uMouseInfluence
    const uMouseRadius = this.uMouseRadius

    const computeUpdate = Fn(() => {
      const index = instanceIndex
      const pos = positionBuffer.element(index)
      const origin = originBuffer.element(index)
      const seed = seedBuffer.element(index).x

      // Hash-based pseudo-random
      const hash = (p: any) => fract(sin(p.mul(127.1).add(seed.mul(311.7))).mul(43758.5453))

      // Time-based noise displacement
      const t = uTime.mul(uSpeed)
      const scale = float(0.15).mul(uNoiseScale)

      const h1 = hash(index.add(t.mul(0.3).mul(1000)))
      const h2 = hash(index.add(t.mul(0.4).mul(1000)).add(100))
      const h3 = hash(index.add(t.mul(0.5).mul(1000)).add(200))

      // Displace from origin
      const targetX = origin.x.add(h1.sub(0.5).mul(scale).mul(10))
      const targetY = origin.y.add(h2.sub(0.5).mul(scale).mul(10))
      const targetZ = origin.z.add(h3.sub(0.5).mul(scale).mul(10))

      // Smooth follow toward target (creates flowing motion)
      pos.x.assign(mix(pos.x, targetX, float(0.02)))
      pos.y.assign(mix(pos.y, targetY, float(0.02)))
      pos.z.assign(mix(pos.z, targetZ, float(0.02)))

      // Mouse attraction/repulsion
      const toMouse = uMousePos.sub(pos)
      const dist = length(toMouse)
      const radius = uMouseRadius
      const influence = clamp(uMouseInfluence.div(dist.add(0.1)), float(0), float(5))

      // Only affect particles within radius
      const withinRadius = dist.lessThan(radius)

      If(withinRadius, () => {
        const force = normalize(toMouse).mul(influence.mul(0.05))
        pos.addAssign(force)
      })

    })().compute(count)

    this.computeNode = computeUpdate
  }

  private createMaterial(count: number) {
    const uPointSize = this.uPointSize
    const uColorA = this.uColorA
    const uColorB = this.uColorB
    const uColorC = this.uColorC

    // Size attenuation based on depth
    const sizeNode = this.seedBuffer.toAttribute().y.mul(uPointSize).mul(
      float(200).div(abs(positionView.z))
    )

    // Color based on position and depth
    const posAttr = this.positionBuffer.toAttribute()
    const depthFactor = clamp(abs(positionView.z).div(20), 0, 1)

    const colorNode = mix(
      mix(uColorA, uColorB, clamp(posAttr.x.mul(0.1).add(0.5), 0, 1)),
      uColorC,
      depthFactor
    )

    this.material = new PointsNodeMaterial({
      colorNode: colorNode,
      sizeNode: sizeNode,
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false,
    })

    this.material.positionNode = this.positionBuffer.toAttribute()

    // Create geometry with dummy positions (actual positions come from storage buffer)
    const geometry = new BufferGeometry()
    const positions = new Float32Array(count * 3)
    geometry.setAttribute('position', new BufferAttribute(positions, 3))

    this.points = new Points(geometry, this.material)
    this.scene.add(this.points)
  }

  private setupMouseInteraction() {
    this.mouseHandler = (e: MouseEvent) => {
      // Convert screen mouse to approximate world space
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = -(e.clientY / window.innerHeight) * 2 + 1
      // Approximate world position at z=0 plane
      this.uMousePos.value.set(nx * 10, ny * 10, 0)
    }
    window.addEventListener('mousemove', this.mouseHandler)
  }

  update(time: number, _delta: number) {
    this.uTime.value = time

    if (this.rendererRef && this.computeNode) {
      this.rendererRef.compute(this.computeNode)
    }
  }

  setParams(params: Record<string, unknown>) {
    const oldCount = (this.params.count as number) || 500000
    this.params = params

    if (typeof params.count === 'number' && params.count !== oldCount) {
      // Recreate everything with new count
      this.dispose()
      this.init(this.rendererRef)
    } else {
      if (typeof params.speed === 'number') this.uSpeed.value = params.speed
      if (typeof params.noiseScale === 'number') this.uNoiseScale.value = params.noiseScale
      if (typeof params.pointSize === 'number') this.uPointSize.value = params.pointSize
      if (typeof params.mouseInfluence === 'number') this.uMouseInfluence.value = params.mouseInfluence
      if (typeof params.mouseRadius === 'number') this.uMouseRadius.value = params.mouseRadius
      if (typeof params.colorA === 'string') this.uColorA.value.set(params.colorA)
      if (typeof params.colorB === 'string') this.uColorB.value.set(params.colorB)
      if (typeof params.colorC === 'string') this.uColorC.value.set(params.colorC)
    }
  }

  getControlsSchema() {
    return getComputeParticleControls()
  }

  getScene() {
    return this.scene
  }

  getCamera() {
    return this.camera
  }

  dispose() {
    if (this.mouseHandler) {
      window.removeEventListener('mousemove', this.mouseHandler)
      this.mouseHandler = null
    }

    this.scene.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) obj.material.dispose()
    })
    this.scene.clear()

    this.points = null
    this.material = null
    this.computeNode = null
    this.positionBuffer = null
    this.originBuffer = null
    this.colorBuffer = null
    this.seedBuffer = null
  }
}
