import { useEffect, useRef, useState } from 'react'
import { Leva } from 'leva'
import * as THREE from 'three'
import { Renderer } from './engine/Renderer'
import { WebGPURendererEngine } from './engine/WebGPURendererEngine'
import { SceneManager } from './engine/SceneManager'
import { ExportManager } from './engine/ExportManager'
import { ParticleGenerator } from './generators/ParticleSystem/ParticleGenerator'
import { FractalGenerator } from './generators/Fractal/FractalGenerator'
import { ComputeParticles } from './generators/ComputeParticles/ComputeParticles'
import { useStudioStore } from './store/studioStore'
import { useGenerator } from './hooks/useGenerator'
import { Canvas } from './components/Canvas'
import { TopBar } from './components/TopBar'
import { ExportPanel } from './components/ExportPanel'
import WebGPU from 'three/examples/jsm/capabilities/WebGPU.js'

export default function App() {
  // Two renderer systems
  const webglRendererRef = useRef<Renderer>(new Renderer())
  const webgpuRendererRef = useRef<WebGPURendererEngine>(new WebGPURendererEngine())

  const webglSceneManagerRef = useRef<SceneManager>(
    new SceneManager(webglRendererRef.current),
  )
  const webgpuSceneManagerRef = useRef<SceneManager>(
    new SceneManager(webgpuRendererRef.current),
  )

  const webglExportManagerRef = useRef<ExportManager>(
    new ExportManager(webglRendererRef.current, webglSceneManagerRef.current),
  )
  const webgpuExportManagerRef = useRef<ExportManager>(
    new ExportManager(webgpuRendererRef.current, webgpuSceneManagerRef.current),
  )

  const [activeRendererType, setActiveRendererType] = useState<'webgl' | 'webgpu'>('webgl')

  const generatorId = useStudioStore((s) => s.generatorId)
  const setGenerator = useStudioStore((s) => s.setGenerator)
  const setGeneratorId = useStudioStore((s) => s.setGeneratorId)
  const setWebGPUAvailable = useStudioStore((s) => s.setWebGPUAvailable)
  const isWebGPUAvailable = useStudioStore((s) => s.isWebGPUAvailable)

  // Detect WebGPU availability
  useEffect(() => {
    const checkWebGPU = async () => {
      const available = WebGPU.isAvailable()
      setWebGPUAvailable(available)
      if (available) {
        await webgpuRendererRef.current.init()
      }
    }
    checkWebGPU()
  }, [setWebGPUAvailable])

  // Generator switching
  useEffect(() => {
    let generator
    let sceneManager: SceneManager
    let isWebGPU = false

    if (generatorId === 'compute-particles') {
      if (!isWebGPUAvailable) {
        // Fallback if WebGPU not available
        setGeneratorId('particles')
        return
      }
      generator = new ComputeParticles()
      isWebGPU = true
      sceneManager = webgpuSceneManagerRef.current
      setActiveRendererType('webgpu')
    } else if (generatorId === 'fractal') {
      generator = new FractalGenerator()
      sceneManager = webglSceneManagerRef.current
      setActiveRendererType('webgl')
    } else {
      generator = new ParticleGenerator()
      sceneManager = webglSceneManagerRef.current
      setActiveRendererType('webgl')
    }

    sceneManager.setGenerator(generator)
    setGenerator(generator)

    const handleResize = () => {
      const renderer = isWebGPU ? webgpuRendererRef.current : webglRendererRef.current
      const el = renderer.getDomElement().parentElement
      if (!el) return
      const { clientWidth, clientHeight } = el
      const aspect = clientWidth / clientHeight
      renderer.resize()

      const cam = generator.getCamera()
      if (cam instanceof THREE.PerspectiveCamera) {
        cam.aspect = aspect
        cam.updateProjectionMatrix()
      }

      if (generator instanceof FractalGenerator) {
        generator.resize(clientWidth, clientHeight)
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [generatorId, setGenerator, isWebGPUAvailable, setGeneratorId])

  const { params, setParams } = useGenerator()

  const activeRenderer = activeRendererType === 'webgpu'
    ? webgpuRendererRef.current
    : webglRendererRef.current

  const activeExportManager = activeRendererType === 'webgpu'
    ? webgpuExportManagerRef.current
    : webglExportManagerRef.current

  return (
    <div className="relative w-full h-full">
      <Canvas renderer={activeRenderer} />

      <TopBar params={params} setParams={setParams} />

      <ExportPanel exportManager={activeExportManager} />

      <Leva
        theme={{
          sizes: {
            controlWidth: '160px',
            numberInputMinWidth: '48px',
          },
          colors: {
            elevation1: 'rgba(0,0,0,0.7)',
            elevation2: 'rgba(0,0,0,0.5)',
            elevation3: 'rgba(0,0,0,0.3)',
            accent1: '#aa3bff',
            accent2: '#7c29cc',
            accent3: '#c084fc',
            highlight1: '#ffffff',
            highlight2: '#aaaaaa',
            highlight3: '#777777',
            vivid1: '#ff0055',
            toolTipBackground: '#0a0a0a',
            folderTextColor: '#e5e5e5',
          },
          fonts: {
            mono: 'ui-monospace, Consolas, monospace',
            sans: 'system-ui, -apple-system, sans-serif',
          },
        }}
        titleBar={{
          title: '参数面板',
          drag: true,
          filter: false,
        }}
        fill={false}
        flat={false}
        oneLineLabels={false}
        hideCopyButton
      />
    </div>
  )
}
