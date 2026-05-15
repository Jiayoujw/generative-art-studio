import { useState, useCallback, useRef } from 'react'
import { useStudioStore } from '../store/studioStore'
import { particleDefaultParams } from '../generators/ParticleSystem/controls'
import { fractalDefaultParams } from '../generators/Fractal/controls'
import { computeParticleDefaultParams } from '../generators/ComputeParticles/controls'

interface TopBarProps {
  params: Record<string, unknown>
  setParams: (params: Record<string, unknown>) => void
}

export function TopBar({ params, setParams }: TopBarProps) {
  const generatorId = useStudioStore((s) => s.generatorId)
  const setGeneratorId = useStudioStore((s) => s.setGeneratorId)
  const generator = useStudioStore((s) => s.generator)
  const presets = useStudioStore((s) => s.presets)
  const addPreset = useStudioStore((s) => s.addPreset)
  const isWebGPUAvailable = useStudioStore((s) => s.isWebGPUAvailable)

  const [presetName, setPresetName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)

  const setParamsRef = useRef(setParams)
  setParamsRef.current = setParams

  const switchGenerator = useCallback(
    (id: string) => {
      if (id === generatorId) return
      setGeneratorId(id)
    },
    [generatorId, setGeneratorId],
  )

  const getGeneratorLabel = useCallback((id: string) => {
    if (id === 'particles') return '粒子'
    if (id === 'fractal') return '分形'
    if (id === 'compute-particles') return '百万粒子'
    return id
  }, [])

  const handleSave = useCallback(() => {
    if (!presetName.trim() || !generator) return
    addPreset({
      id: crypto.randomUUID(),
      name: presetName.trim(),
      generatorId: generator.id,
      params: { ...params },
      createdAt: Date.now(),
    })
    setPresetName('')
    setShowSaveInput(false)
  }, [presetName, generator, addPreset, params])

  const handleLoad = useCallback(
    (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId)
      if (!preset) return
      if (preset.generatorId !== generatorId) {
        setGeneratorId(preset.generatorId)
        setTimeout(() => {
          setParamsRef.current(preset.params)
        }, 100)
      } else {
        setParamsRef.current(preset.params)
      }
    },
    [presets, generatorId, setGeneratorId],
  )

  const handleReset = useCallback(() => {
    const defaults =
      generatorId === 'particles'
        ? particleDefaultParams
        : generatorId === 'fractal'
          ? fractalDefaultParams
          : computeParticleDefaultParams
    setParamsRef.current(defaults)
  }, [generatorId])

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-4 px-4 py-2 bg-black/70 backdrop-blur-sm border-b border-white/10">
      <h1 className="text-sm font-medium text-white/90 whitespace-nowrap">生成艺术工作室</h1>

      <div className="flex items-center gap-2">
        <button
          className={`px-3 py-1 text-xs rounded transition-colors ${
            generatorId === 'particles'
              ? 'bg-white/20 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
          onClick={() => switchGenerator('particles')}
        >
          粒子系统
        </button>
        <button
          className={`px-3 py-1 text-xs rounded transition-colors ${
            generatorId === 'fractal'
              ? 'bg-white/20 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
          onClick={() => switchGenerator('fractal')}
        >
          分形几何
        </button>
        <button
          className={`px-3 py-1 text-xs rounded transition-colors ${
            generatorId === 'compute-particles'
              ? 'bg-white/20 text-white'
              : isWebGPUAvailable
                ? 'bg-white/5 text-white/60 hover:bg-white/10'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
          onClick={() => isWebGPUAvailable && switchGenerator('compute-particles')}
          title={isWebGPUAvailable ? '百万级 GPU Compute 粒子' : '需要 WebGPU 支持'}
        >
          百万粒子
          {!isWebGPUAvailable && (
            <span className="ml-1 text-[9px] opacity-50">(WebGPU)</span>
          )}
        </button>
      </div>

      <div className="flex-1" />

      {isWebGPUAvailable && (
        <span className="px-2 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded border border-green-500/30">
          WebGPU 已启用
        </span>
      )}

      {showSaveInput ? (
        <div className="flex items-center gap-2">
          <input
            className="px-2 py-1 text-xs bg-white/10 rounded text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/30"
            placeholder="预设名称"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <button
            className="px-2 py-1 text-xs bg-white/20 text-white rounded hover:bg-white/30"
            onClick={handleSave}
          >
            保存
          </button>
          <button
            className="px-2 py-1 text-xs bg-white/5 text-white/60 rounded hover:bg-white/10"
            onClick={() => setShowSaveInput(false)}
          >
            取消
          </button>
        </div>
      ) : (
        <button
          className="px-3 py-1 text-xs bg-white/10 text-white/80 rounded hover:bg-white/20 transition-colors"
          onClick={() => setShowSaveInput(true)}
        >
          保存预设
        </button>
      )}

      {presets.length > 0 && (
        <select
          className="px-2 py-1 text-xs bg-white/10 text-white/80 rounded border border-white/10 focus:outline-none focus:border-white/30"
          value=""
          onChange={(e) => handleLoad(e.target.value)}
        >
          <option value="">加载预设...</option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({getGeneratorLabel(p.generatorId)})
            </option>
          ))}
        </select>
      )}

      <button
        className="px-3 py-1 text-xs bg-white/5 text-white/60 rounded hover:bg-white/10 transition-colors"
        onClick={handleReset}
      >
        重置
      </button>
    </div>
  )
}
