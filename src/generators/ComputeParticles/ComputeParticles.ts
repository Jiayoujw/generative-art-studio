import {
  PointsNodeMaterial,
  BufferGeometry,
  BufferAttribute,
  Points,
  Scene,
  PerspectiveCamera,
  AdditiveBlending,
} from 'three/webgpu'
import {
  Fn,
  uniform,
  vec3,
  float,
  instanceIndex,
  attributeArray,
  color,
  fract,
  sin,
  length,
  normalize,
  mix,
  clamp,
  abs,
  positionView,
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

  private positionBuffer: any = null
  private originBuffer: any = null
  private seedBuffer: any = null

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
    this.positionBuffer = attributeArray(count, 'vec3')
    this.originBuffer = attributeArray(count, 'vec3')
    this.seedBuffer = attributeArray(count, 'vec2')

    const posArray = this.positionBuffer.value.array as Float32Array
    const originArray = this.originBuffer.value.array as Float32Array
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

      seedArray[i * 2] = Math.random()
      seedArray[i * 2 + 1] = 0.3 + Math.random() * 0.7
    }

    this.positionBuffer.value.needsUpdate = true
    this.originBuffer.value.needsUpdate = true
    this.seedBuffer.value.needsUpdate = true
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

      const hash = (p: any) => fract(sin(p.mul(127.1).add(seed.mul(311.7))).mul(43758.5453))

      const t = uTime.mul(uSpeed)
      const scale = float(0.15).mul(uNoiseScale)

      const h1 = hash(index.add(t.mul(300)))
      const h2 = hash(index.add(t.mul(400)).add(100))
      const h3 = hash(index.add(t.mul(500)).add(200))

      const targetX = origin.x.add(h1.sub(0.5).mul(scale).mul(10))
      const targetY = origin.y.add(h2.sub(0.5).mul(scale).mul(10))
      const targetZ = origin.z.add(h3.sub(0.5).mul(scale).mul(10))

      pos.x.assign(mix(pos.x, targetX, float(0.02)))
      pos.y.assign(mix(pos.y, targetY, float(0.02)))
      pos.z.assign(mix(pos.z, targetZ, float(0.02)))

      const toMouse = uMousePos.sub(pos)
      const dist = length(toMouse)
      const influence = clamp(uMouseInfluence.div(dist.add(0.1)), float(0), float(5))
      const withinRadius = clamp(uMouseRadius.sub(dist), float(0), float(1))

      const force = normalize(toMouse).mul(influence.mul(0.05)).mul(withinRadius)
      pos.addAssign(force)

    })().compute(count)

    this.computeNode = computeUpdate
  }

  private createMaterial(count: number) {
    const uPointSize = this.uPointSize
    const uColorA = this.uColorA
    const uColorB = this.uColorB

    // Convert storage buffers to attribute nodes for vertex shader access
    const pos = this.positionBuffer.toAttribute()
    const seedSize = this.seedBuffer.toAttribute()

    const sizeNode = seedSize.y.mul(uPointSize).mul(
      float(200).div(abs(positionView.z).add(0.01))
    )

    const colorNode = mix(
      uColorA,
      uColorB,
      clamp(pos.x.mul(0.1).add(0.5), 0, 1)
    )

    this.material = new PointsNodeMaterial({
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })

    this.material.colorNode = colorNode
    this.material.sizeNode = sizeNode
    this.material.positionNode = pos

    // Geometry just needs to have the right vertex count
    const geometry = new BufferGeometry()
    const positions = new Float32Array(count * 3)
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setDrawRange(0, count)

    this.points = new Points(geometry, this.material)
    this.points.frustumCulled = false
    this.scene.add(this.points)
  }

  private setupMouseInteraction() {
    this.mouseHandler = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = -(e.clientY / window.innerHeight) * 2 + 1
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
    this.seedBuffer = null
  }
}
