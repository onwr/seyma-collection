/** Admin panel: mağaza cirosu arttığında kısa “kassa / trink” geri bildirimi (Web Audio). */

let sharedCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }
  const AC = w.AudioContext || w.webkitAudioContext
  if (!AC) return null
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AC()
  }
  return sharedCtx
}

function tone(
  ctx: AudioContext,
  freq: number,
  startSec: number,
  durSec: number,
  peak: number,
  type: OscillatorType = "sine"
) {
  const t0 = ctx.currentTime + startSec
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durSec)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + durSec + 0.03)
}

/** İki kısa “zil” + hafif düşen ton (para / kasa hissi). */
export function playAdminRetailCashSound() {
  const ctx = getAudioContext()
  if (!ctx) return
  void ctx.resume().catch(() => {})
  tone(ctx, 1568, 0, 0.07, 0.11)
  tone(ctx, 2093, 0.06, 0.08, 0.09)
  tone(ctx, 523.25, 0.16, 0.14, 0.07, "triangle")
}
