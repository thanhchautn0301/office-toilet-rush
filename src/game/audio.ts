/** Âm thanh tổng hợp bằng WebAudio (không cần file âm thanh). */
const MUTE_KEY = 'office-toilet-rush:mute'

let ctx: AudioContext | null = null
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
})()
const listeners = new Set<() => void>()

export const isMuted = () => muted
export function setMuted(v: boolean) {
  muted = v
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0')
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}
export function subscribeMute(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function ac(): AudioContext | null {
  if (muted) return null
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as any).webkitAudioContext
      if (!C) return null
      ctx = new C()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

interface ToneOpts {
  type?: OscillatorType
  vol?: number
  to?: number
  delay?: number
}

function tone(freq: number, dur: number, o: ToneOpts = {}) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + (o.delay ?? 0)
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(freq, t0)
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + dur)
  const v = o.vol ?? 0.18
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

function noise(dur: number, f0: number, f1: number, vol = 0.18, delay = 0) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + delay
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filt = c.createBiquadFilter()
  filt.type = 'bandpass'
  filt.frequency.setValueAtTime(f0, t0)
  filt.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.15)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(filt).connect(g).connect(c.destination)
  src.start(t0)
}

export const sfx = {
  /** Gọi trong sự kiện click đầu tiên để mở khoá AudioContext. */
  unlock() {
    ac()
  },
  step() {
    tone(180 + Math.random() * 40, 0.05, { type: 'triangle', vol: 0.05, to: 90 })
  },
  gulp() {
    tone(420, 0.12, { type: 'sine', to: 220, vol: 0.2 })
    tone(380, 0.14, { type: 'sine', to: 180, vol: 0.2, delay: 0.17 })
    tone(340, 0.16, { type: 'sine', to: 150, vol: 0.2, delay: 0.36 })
  },
  rumble() {
    tone(70, 0.9, { type: 'sawtooth', to: 38, vol: 0.2 })
    tone(52, 0.9, { type: 'square', to: 34, vol: 0.08, delay: 0.1 })
    noise(0.8, 220, 90, 0.12)
  },
  oops() {
    tone(520, 0.18, { type: 'square', to: 380, vol: 0.1 })
    tone(420, 0.3, { type: 'square', to: 200, vol: 0.1, delay: 0.2 })
  },
  bump() {
    tone(160, 0.14, { type: 'square', to: 70, vol: 0.14 })
    tone(900, 0.08, { type: 'triangle', to: 500, vol: 0.06, delay: 0.02 })
  },
  door() {
    tone(220, 0.35, { type: 'sawtooth', to: 340, vol: 0.07 })
    tone(380, 0.25, { type: 'sawtooth', to: 260, vol: 0.06, delay: 0.3 })
    tone(660, 0.08, { type: 'triangle', vol: 0.12, delay: 0.55 })
  },
  ding() {
    tone(880, 0.25, { vol: 0.14 })
    tone(1320, 0.4, { vol: 0.12, delay: 0.14 })
  },
  plop() {
    tone(500, 0.12, { to: 120, vol: 0.22 })
    noise(0.1, 600, 200, 0.06)
  },
  drip() {
    tone(1500, 0.07, { to: 900, vol: 0.1 })
  },
  boing() {
    tone(260, 0.35, { type: 'triangle', to: 600, vol: 0.18 })
  },
  flush() {
    noise(2.2, 2400, 260, 0.2)
    tone(140, 1.8, { type: 'sine', to: 60, vol: 0.06 })
  },
  cheer() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.16, delay: i * 0.11 }))
    tone(1047, 0.6, { type: 'triangle', vol: 0.14, delay: 0.5 })
  },
  click() {
    tone(660, 0.06, { type: 'triangle', vol: 0.1 })
  },
}
