import type { LevaSchema } from '../types/leva'

export interface Generator {
  id: string
  name: string
  isWebGPU: boolean
  init(renderer: unknown): void
  update(time: number, delta: number): void
  setParams(params: Record<string, unknown>): void
  dispose(): void
  getControlsSchema(): LevaSchema
  getScene(): object
  getCamera(): object
}
