import { useCallback } from 'react'
import { useStudioStore } from '../store/studioStore'
import type { ExportManager } from '../engine/ExportManager'

export function useExport(exportManager: ExportManager | null) {
  const setExportState = useStudioStore((s) => s.setExportState)

  const exportPNG = useCallback(() => {
    if (!exportManager) return
    exportManager.exportPNG()
  }, [exportManager])

  const exportWebM = useCallback(
    async (duration = 5) => {
      if (!exportManager) return
      try {
        await exportManager.exportWebM(duration, (progress) => {
          setExportState(progress)
        })
      } catch (err) {
        console.error('WebM export failed:', err)
        setExportState({ format: 'webm', progress: 0, isExporting: false })
      }
    },
    [exportManager, setExportState],
  )

  const exportGIF = useCallback(
    async (duration = 3) => {
      if (!exportManager) return
      try {
        await exportManager.exportGIF(duration, 15, (progress) => {
          setExportState(progress)
        })
      } catch (err) {
        console.error('GIF export failed:', err)
        setExportState({ format: 'gif', progress: 0, isExporting: false })
      }
    },
    [exportManager, setExportState],
  )

  return { exportPNG, exportWebM, exportGIF }
}
