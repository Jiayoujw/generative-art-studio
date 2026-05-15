import { useEffect, useRef } from 'react'
import type { Renderer } from '../engine/Renderer'
import type { WebGPURendererEngine } from '../engine/WebGPURendererEngine'

interface CanvasProps {
  renderer: Renderer | WebGPURendererEngine
}

export function Canvas({ renderer }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el || mountedRef.current) return

    mountedRef.current = true

    // WebGPU renderer needs async init
    const doMount = async () => {
      if ('init' in renderer && typeof renderer.init === 'function') {
        await renderer.init()
      }
      renderer.mount(el)
    }

    doMount()

    const ro = new ResizeObserver(() => {
      renderer.resize()
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      renderer.unmount()
      mountedRef.current = false
    }
  }, [renderer])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ width: '100%', height: '100%' }}
    />
  )
}
