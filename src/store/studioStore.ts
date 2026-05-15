import { create } from 'zustand'
import type { Generator } from '../generators/Generator'

export type ExportFormat = 'png' | 'gif' | 'webm'

interface Preset {
  id: string
  name: string
  generatorId: string
  params: Record<string, unknown>
  createdAt: number
}

interface ExportState {
  format: ExportFormat | null
  isExporting: boolean
  progress: number
}

interface StudioState {
  generator: Generator | null
  generatorId: string
  exportState: ExportState
  presets: Preset[]
  isWebGPUAvailable: boolean

  setGenerator: (generator: Generator) => void
  setGeneratorId: (id: string) => void
  setExportState: (state: ExportState) => void
  addPreset: (preset: Preset) => void
  deletePreset: (id: string) => void
  loadPresets: () => void
  setWebGPUAvailable: (available: boolean) => void
}

const STORAGE_KEY = 'gas:presets'

function loadFromStorage(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const useStudioStore = create<StudioState>((set) => ({
  generator: null,
  generatorId: 'particles',
  exportState: {
    format: null,
    isExporting: false,
    progress: 0,
  },
  presets: loadFromStorage(),
  isWebGPUAvailable: false,

  setGenerator: (generator) =>
    set({ generator, generatorId: generator.id }),

  setGeneratorId: (id) => set({ generatorId: id }),

  setExportState: (exportState) => set({ exportState }),

  addPreset: (preset) =>
    set((state) => {
      const next = [...state.presets, preset]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return { presets: next }
    }),

  deletePreset: (id) =>
    set((state) => {
      const next = state.presets.filter((p) => p.id !== id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return { presets: next }
    }),

  loadPresets: () => set({ presets: loadFromStorage() }),

  setWebGPUAvailable: (available) => set({ isWebGPUAvailable: available }),
}))
