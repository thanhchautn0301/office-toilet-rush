import { useEffect, useRef } from 'react'
import { HERO, drawPerson, type PoseState } from '../game/draw'

/** Canvas nhỏ hiển thị nhân vật với một trạng thái animation. */
export default function Person({ state, size = 220 }: { state: PoseState; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!
    const c = cv.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = size * dpr
    cv.height = size * dpr
    let raf = 0
    const t0 = performance.now()
    const loop = (now: number) => {
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      c.clearRect(0, 0, size, size)
      drawPerson(c, { x: size / 2, y: size * 0.92, state, t: (now - t0) / 1000, facing: 1, look: HERO, scale: size / 130 })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [state, size])
  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />
}
