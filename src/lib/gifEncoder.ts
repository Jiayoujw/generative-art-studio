import { GIFEncoder, quantize, applyPalette } from 'gifenc'

export interface GifFrame {
  data: Uint8ClampedArray
  width: number
  height: number
  delay: number
}

export function createGifEncoder() {
  const encoder = GIFEncoder()

  return {
    addFrame(frame: GifFrame) {
      const { data, width, height, delay } = frame
      const palette = quantize(data, 256)
      const index = applyPalette(data, palette)
      encoder.writeFrame(index, width, height, {
        palette,
        delay,
      })
    },

    finish(): Uint8Array {
      encoder.finish()
      return encoder.bytes()
    },
  }
}
