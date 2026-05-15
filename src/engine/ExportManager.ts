import { saveAs } from 'file-saver'
import type { Renderer } from './Renderer'
import type { WebGPURendererEngine } from './WebGPURendererEngine'
import type { SceneManager } from './SceneManager'
import { createGifEncoder } from '../lib/gifEncoder'
import { startRecording, canRecordWebM } from '../lib/recorder'

export interface ExportProgress {
  format: 'png' | 'gif' | 'webm'
  progress: number
  isExporting: boolean
}

export type ExportProgressCallback = (progress: ExportProgress) => void

export class ExportManager {
  renderer: Renderer | WebGPURendererEngine
  sceneManager: SceneManager

  constructor(
    renderer: Renderer | WebGPURendererEngine,
    sceneManager: SceneManager,
  ) {
    this.renderer = renderer
    this.sceneManager = sceneManager
  }

  async exportPNG(filename?: string): Promise<void> {
    const gen = this.sceneManager.getCurrentGenerator()
    if (!gen) return

    this.renderer.render(gen.getScene() as any, gen.getCamera() as any)
    const blob = await this.renderer.captureFrameBlob()
    if (blob) {
      const name = filename ?? `gas-export-${Date.now()}.png`
      saveAs(blob, name)
    }
  }

  async exportWebM(
    durationSec = 5,
    onProgress?: ExportProgressCallback,
  ): Promise<void> {
    if (!canRecordWebM()) {
      throw new Error('当前浏览器不支持 WebM 录制')
    }

    onProgress?.({ format: 'webm', progress: 0, isExporting: true })

    const canvas = this.renderer.getDomElement()
    const recorder = startRecording({ canvas, fps: 30 })

    const startTime = performance.now()
    const durationMs = durationSec * 1000

    return new Promise((resolve, reject) => {
      const progressInterval = setInterval(() => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / durationMs, 1)
        onProgress?.({ format: 'webm', progress, isExporting: true })
        if (elapsed >= durationMs) {
          clearInterval(progressInterval)
        }
      }, 100)

      setTimeout(() => {
        recorder
          .stop()
          .then((blob) => {
            const name = `gas-export-${Date.now()}.webm`
            saveAs(blob, name)
            onProgress?.({ format: 'webm', progress: 1, isExporting: false })
            clearInterval(progressInterval)
            resolve()
          })
          .catch((err) => {
            clearInterval(progressInterval)
            reject(err)
          })
      }, durationMs)
    })
  }

  async exportGIF(
    durationSec = 3,
    fps = 15,
    onProgress?: ExportProgressCallback,
  ): Promise<void> {
    onProgress?.({ format: 'gif', progress: 0, isExporting: true })

    const gen = this.sceneManager.getCurrentGenerator()
    if (!gen) return

    const totalFrames = Math.round(durationSec * fps)
    const delay = 1000 / fps
    const canvas = this.renderer.getDomElement()
    const w = Math.min(canvas.width, 480)
    const h = Math.min(canvas.height, 480)

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = w
    tempCanvas.height = h
    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('无法创建 canvas context')

    const encoder = createGifEncoder()
    const scene = gen.getScene()
    const camera = gen.getCamera()

    for (let i = 0; i < totalFrames; i++) {
      const t = (i / fps)
      gen.update(t, 1 / fps)
      this.renderer.render(scene as any, camera as any)

      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(canvas, 0, 0, w, h)

      const imageData = ctx.getImageData(0, 0, w, h)
      encoder.addFrame({
        data: imageData.data,
        width: w,
        height: h,
        delay,
      })

      const progress = (i + 1) / totalFrames
      onProgress?.({ format: 'gif', progress, isExporting: true })

      if (i % 3 === 0) {
        await new Promise((r) => requestAnimationFrame(r as FrameRequestCallback))
      }
    }

    const bytes = encoder.finish()
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' })
    const name = `gas-export-${Date.now()}.gif`
    saveAs(blob, name)

    onProgress?.({ format: 'gif', progress: 1, isExporting: false })
  }
}
