export interface RecorderOptions {
  canvas: HTMLCanvasElement
  fps?: number
  duration?: number
  mimeType?: string
  videoBitsPerSecond?: number
}

export function canRecordWebM(): boolean {
  if (typeof MediaRecorder === 'undefined') return false
  return MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
}

export function startRecording(options: RecorderOptions): {
  stop: () => Promise<Blob>
} {
  const {
    canvas,
    fps = 60,
    mimeType = 'video/webm;codecs=vp9',
    videoBitsPerSecond = 10000000,
  } = options

  const stream = canvas.captureStream(fps)
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond,
  })

  const chunks: Blob[] = []

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  recorder.start()

  return {
    stop(): Promise<Blob> {
      return new Promise((resolve) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop())
          resolve(new Blob(chunks, { type: mimeType }))
        }
        recorder.stop()
      })
    },
  }
}
