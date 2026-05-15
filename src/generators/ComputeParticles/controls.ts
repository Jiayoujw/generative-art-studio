import { folder } from 'leva'
import type { LevaSchema } from '../../types/leva'

export const computeParticleDefaultParams = {
  count: 500000,
  speed: 1.0,
  noiseScale: 0.5,
  pointSize: 1.5,
  mouseInfluence: 2.0,
  mouseRadius: 5.0,
  colorA: '#ff0055',
  colorB: '#00aaff',
  colorC: '#ffaa00',
}

export function getComputeParticleControls(): LevaSchema {
  return {
    'Compute Particles': folder({
      count: {
        value: computeParticleDefaultParams.count,
        min: 100000,
        max: 2000000,
        step: 100000,
      },
      speed: {
        value: computeParticleDefaultParams.speed,
        min: 0.1,
        max: 5.0,
        step: 0.1,
      },
      noiseScale: {
        value: computeParticleDefaultParams.noiseScale,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      pointSize: {
        value: computeParticleDefaultParams.pointSize,
        min: 0.1,
        max: 5.0,
        step: 0.1,
      },
    }),
    'Mouse Interaction': folder({
      mouseInfluence: {
        value: computeParticleDefaultParams.mouseInfluence,
        min: 0.0,
        max: 10.0,
        step: 0.5,
      },
      mouseRadius: {
        value: computeParticleDefaultParams.mouseRadius,
        min: 1.0,
        max: 20.0,
        step: 0.5,
      },
    }),
    Colors: folder({
      colorA: computeParticleDefaultParams.colorA,
      colorB: computeParticleDefaultParams.colorB,
      colorC: computeParticleDefaultParams.colorC,
    }),
  }
}
