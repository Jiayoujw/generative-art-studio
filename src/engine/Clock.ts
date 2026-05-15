export class Clock {
  private realTime = 0
  private isReal = true
  private exportTime = 0
  private exportDelta = 1 / 30

  startReal() {
    this.isReal = true
  }

  startExport(fps: number) {
    this.isReal = false
    this.exportTime = 0
    this.exportDelta = 1 / fps
  }

  tickReal(delta: number): number {
    this.realTime += delta
    return this.realTime
  }

  tickExport(): number {
    this.exportTime += this.exportDelta
    return this.exportTime
  }

  getTime(): number {
    return this.isReal ? this.realTime : this.exportTime
  }

  getDelta(): number {
    return this.isReal ? 0 : this.exportDelta
  }

  get mode() {
    return this.isReal ? ('real' as const) : ('export' as const)
  }
}
