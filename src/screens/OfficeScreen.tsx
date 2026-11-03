import { useEffect, useRef } from 'react'
import { OfficeGame } from '../game/office'
import { VIEW_H, VIEW_W } from '../game/level'
import TouchControls from '../components/TouchControls'
import SoundToggle from '../components/SoundToggle'

export default function OfficeScreen({ onEnter, onExit }: { onEnter: () => void; onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<OfficeGame | null>(null)
  const enterRef = useRef(onEnter)
  enterRef.current = onEnter

  useEffect(() => {
    const cv = canvasRef.current!
    let game: OfficeGame | null = null
    let ro: ResizeObserver | null = null
    let cancelled = false
    // đợi font để chữ trong canvas hiển thị đúng
    const start = () => {
      if (cancelled) return
      game = new OfficeGame(cv, { onEnterToilet: () => enterRef.current() })
      gameRef.current = game
      if (new URLSearchParams(location.search).has('debug')) (window as any).__otr = game
      ro = new ResizeObserver(() => game?.resize())
      ro.observe(cv)
    }
    Promise.race([
      Promise.all([document.fonts.load('700 18px "Baloo 2"'), document.fonts.load('800 18px "Baloo 2"')]),
      new Promise((r) => setTimeout(r, 800)),
    ]).then(start, start)
    return () => {
      cancelled = true
      ro?.disconnect()
      game?.destroy()
      gameRef.current = null
    }
  }, [])

  return (
    <main className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-3">
        <button className="btn btn-ghost !min-h-12 !px-5 !py-2 !text-lg" onClick={onExit}>← Menu</button>
        <p className="hidden text-center text-sm font-bold opacity-70 sm:block">
          ← ↑ ↓ → / WASD: di chuyển · E hoặc Space: tương tác · Shift: đi nhanh
        </p>
        <SoundToggle />
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        <div className="card w-full overflow-hidden !rounded-3xl p-0" style={{ maxWidth: `min(100%, calc((100dvh - 8rem) * ${VIEW_W / VIEW_H}))` }}>
          <canvas ref={canvasRef} className="block w-full" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }} />
        </div>
      </div>
      <TouchControls gameRef={gameRef} />
    </main>
  )
}
