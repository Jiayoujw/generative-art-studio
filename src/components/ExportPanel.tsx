import { useExport } from '../hooks/useExport'
import type { ExportManager } from '../engine/ExportManager'
import { useStudioStore } from '../store/studioStore'
import { canRecordWebM } from '../lib/recorder'

interface ExportPanelProps {
  exportManager: ExportManager | null
}

export function ExportPanel({ exportManager }: ExportPanelProps) {
  const { exportPNG, exportWebM, exportGIF } = useExport(exportManager)
  const exportState = useStudioStore((s) => s.exportState)

  const isExporting = exportState.isExporting
  const progress = Math.round(exportState.progress * 100)
  const webmSupported = canRecordWebM()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {isExporting && (
        <div className="w-48 bg-white/10 rounded overflow-hidden border border-white/10">
          <div
            className="h-1 bg-white/60 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          <p className="px-2 py-1 text-[10px] text-white/60 text-center">
            正在导出 {exportState.format?.toUpperCase()}... {progress}%
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 p-2 bg-black/70 backdrop-blur-sm rounded-lg border border-white/10">
        <button
          className="px-3 py-1.5 text-xs bg-white/10 text-white/80 rounded hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={exportPNG}
          disabled={isExporting}
        >
          导出 PNG
        </button>

        <button
          className="px-3 py-1.5 text-xs bg-white/10 text-white/80 rounded hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => exportGIF(3)}
          disabled={isExporting}
        >
          导出 GIF
        </button>

        <button
          className="px-3 py-1.5 text-xs bg-white/10 text-white/80 rounded hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => exportWebM(5)}
          disabled={isExporting || !webmSupported}
          title={webmSupported ? '' : '当前浏览器不支持 WebM 录制'}
        >
          导出 WebM
        </button>
      </div>
    </div>
  )
}
