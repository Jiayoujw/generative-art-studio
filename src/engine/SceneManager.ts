import type { Renderer } from './Renderer'
import type { WebGPURendererEngine } from './WebGPURendererEngine'
import type { Generator } from '../generators/Generator'

export class SceneManager {
  private renderer: Renderer | WebGPURendererEngine
  private currentGenerator: Generator | null = null

  constructor(renderer: Renderer | WebGPURendererEngine) {
    this.renderer = renderer
    this.renderer.onRender = (time, delta) => {
      this.currentGenerator?.update(time, delta)
      const scene = this.currentGenerator?.getScene()
      const camera = this.currentGenerator?.getCamera()
      if (scene && camera) {
        this.renderer.render(scene as any, camera as any)
      }
    }
  }

  setGenerator(generator: Generator) {
    this.currentGenerator?.dispose()
    this.currentGenerator = generator
    const r = this.renderer.getRenderer()
    generator.init(r)
  }

  getCurrentGenerator(): Generator | null {
    return this.currentGenerator
  }

  dispose() {
    this.currentGenerator?.dispose()
    this.currentGenerator = null
  }
}
