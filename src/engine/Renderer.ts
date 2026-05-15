import * as THREE from 'three'

export class Renderer {
  private renderer: THREE.WebGLRenderer
  private rafId = 0
  private isRunning = false
  private lastTime = 0
  private clock: { elapsed: number; tick: (dt: number) => number }

  onRender?: (time: number, delta: number) => void

  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x0a0a0a)

    this.clock = {
      elapsed: 0,
      tick: (dt: number) => {
        this.clock.elapsed += dt
        return this.clock.elapsed
      },
    }
  }

  mount(container: HTMLElement) {
    container.appendChild(this.renderer.domElement)
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.renderer.domElement.style.display = 'block'
    this.resize()
    this.start()
  }

  unmount() {
    this.stop()
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement)
    }
  }

  setSize(width: number, height: number) {
    this.renderer.setSize(width, height, false)
  }

  resize() {
    const parent = this.renderer.domElement.parentElement
    if (!parent) return
    const { clientWidth, clientHeight } = parent
    this.setSize(clientWidth, clientHeight)
  }

  getDomElement() {
    return this.renderer.domElement
  }

  getRenderer() {
    return this.renderer
  }

  render(scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer.render(scene, camera)
  }

  private tick = (time: number) => {
    this.rafId = requestAnimationFrame(this.tick)
    const delta = Math.min((time - this.lastTime) / 1000, 0.1)
    this.lastTime = time

    if (this.onRender) {
      try {
        const elapsed = this.clock.tick(delta)
        this.onRender(elapsed, delta)
      } catch (err) {
        console.error('Renderer: frame error:', err)
      }
    }
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.tick)
  }

  stop() {
    this.isRunning = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
  }

  captureFrameBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      this.renderer.domElement.toBlob(
        (blob) => resolve(blob),
        'image/png',
        1.0,
      )
    })
  }

  dispose() {
    this.stop()
    this.renderer.dispose()
  }
}
