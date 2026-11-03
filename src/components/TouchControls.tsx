import { useRef } from 'react'
import type { OfficeGame } from '../game/office'

type Dir = 'left' | 'right' | 'up' | 'down'

/** Điều khiển cảm ứng: D-pad + nút tương tác. Chỉ hiện trên thiết bị cảm ứng / màn hình nhỏ. */
export default function TouchControls({ gameRef }: { gameRef: React.RefObject<OfficeGame | null> }) {
  const set = (d: Dir, v: boolean) => {
    const g = gameRef.current
    if (g) g.touch[d] = v
  }
  const pad = (d: Dir, label: string, cls: string) => (
    <button
      type="button"
      aria-label={label}
      className={`btn btn-ghost !min-h-0 !p-0 h-16 w-16 !text-3xl absolute ${cls}`}
      onPointerDown={(e) => {
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        set(d, true)
      }}
      onPointerUp={() => set(d, false)}
      onPointerCancel={() => set(d, false)}
      onPointerLeave={() => set(d, false)}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'none' }}
    >
      {label}
    </button>
  )
  const held = useRef(false)
  return (
    <div className="flex items-end justify-between gap-4 px-4 pb-4 select-none [@media(hover:hover)_and_(pointer:fine)]:hidden" style={{ touchAction: 'none' }}>
      <div className="relative h-44 w-44 shrink-0">
        {pad('up', '▲', 'left-14 top-0')}
        {pad('left', '◀', 'left-0 top-14')}
        {pad('right', '▶', 'right-0 top-14')}
        {pad('down', '▼', 'left-14 bottom-0')}
      </div>
      <button
        type="button"
        aria-label="Tương tác"
        className="btn btn-big btn-butter pulse !h-28 !w-28 !rounded-full !p-0 !text-4xl"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          e.preventDefault()
          if (held.current) return
          held.current = true
          gameRef.current?.interact()
        }}
        onPointerUp={() => (held.current = false)}
        onPointerCancel={() => (held.current = false)}
      >
        ✋
      </button>
    </div>
  )
}
