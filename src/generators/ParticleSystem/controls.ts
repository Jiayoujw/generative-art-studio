import { folder } from 'leva'
import type { LevaSchema } from '../../types/leva'

export const particleDefaultParams = {
  count: 25000,
  speed: 1.0,
  noiseScale: 0.5,
  pointSize: 1.0,
  alpha: 0.85,
  colorA: '#ff0055',
  colorB: '#00aaff',
}

export function getParticleControls(): LevaSchema {
  return {
    'Particle System': folder({
      count: {
        value: particleDefaultParams.count,
        min: 1000,
        max: 100000,
        step: 1000,
      },
      speed: {
        value: particleDefaultParams.speed,
        min: 0.1,
        max: 5.0,
        step: 0.1,
      },
      noiseScale: {
        value: particleDefaultParams.noiseScale,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      pointSize: {
        value: particleDefaultParams.pointSize,
        min: 0.1,
        max: 5.0,
        step: 0.1,
      },
      alpha: {
        value: particleDefaultParams.alpha,
        min: 0.0,
        max: 1.0,
        step: 0.01,
      },
    }),
    Colors: folder({
      colorA: particleDefaultParams.colorA,
      colorB: particleDefaultParams.colorB,
    }),
  }
}
