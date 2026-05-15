import { folder } from 'leva'
import type { LevaSchema } from '../../types/leva'

export const fractalDefaultParams = {
  power: 8.0,
  iterations: 10,
  bailout: 2.0,
  cameraDistance: 3.5,
  rotationX: 0,
  rotationY: 0,
  glow: 0.5,
  colorPalette: 0,
  colorA: '#ff0055',
  colorB: '#00aaff',
}

export function getFractalControls(): LevaSchema {
  return {
    'Fractal Shape': folder({
      power: {
        value: fractalDefaultParams.power,
        min: 2,
        max: 16,
        step: 0.5,
      },
      iterations: {
        value: fractalDefaultParams.iterations,
        min: 4,
        max: 20,
        step: 1,
      },
      bailout: {
        value: fractalDefaultParams.bailout,
        min: 1.5,
        max: 5.0,
        step: 0.1,
      },
    }),
    Camera: folder({
      cameraDistance: {
        value: fractalDefaultParams.cameraDistance,
        min: 1.5,
        max: 10.0,
        step: 0.1,
      },
      rotationX: {
        value: fractalDefaultParams.rotationX,
        min: -3.14,
        max: 3.14,
        step: 0.05,
      },
      rotationY: {
        value: fractalDefaultParams.rotationY,
        min: -3.14,
        max: 3.14,
        step: 0.05,
      },
    }),
    'Color & Glow': folder({
      glow: {
        value: fractalDefaultParams.glow,
        min: 0,
        max: 2.0,
        step: 0.1,
      },
      colorPalette: {
        value: fractalDefaultParams.colorPalette,
        options: {
          'Cosmic': 0,
          'Fire': 1,
          'Ocean': 2,
          'Custom': 3,
        },
      },
      colorA: fractalDefaultParams.colorA,
      colorB: fractalDefaultParams.colorB,
    }),
  }
}
