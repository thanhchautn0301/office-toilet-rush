import { useEffect, useRef, useState } from 'react'
import { drawBathroomScene, HERO } from '../game/draw'
import { sfx } from '../game/audio'
import SoundToggle from '../components/SoundToggle'
import { formatClock, formatTime } from '../lib/format'
import { subscribe, getActive, type ActiveSession } from '../lib/storage'
import { titleFor } from '../lib/titles'
import { useElapsed } from '../lib/useElapsed'

const MESSAGES = [
  '😬 Sếp đang tìm bạn...',
  '👀 Đồng nghiệp hỏi bạn đâu rồi!',
  '📧 Bạn có một email mới!',
  '📅 Cuộc họp 08:30 đang chờ bạn!',
  '☕ Ly cà phê của bạn đã nguội ngắt.',
  '💬 Nhóm chat công ty: “Ai thấy anh ấy đâu không?”',
  '🧾 Kế toán nhắc: hạn nộp báo cáo là hôm nay.',
  '🕵️ Có người vừa đi ngang bàn bạn và thấy ghế trống.',
  '📱 Bạn đã lướt điện thoại được một lúc rồi đấy.',
  '🎂 Phòng bên đang có tiệc sinh nhật. Bánh sắp hết!',
]
const LATE: [number, string][] = [
  [10, '🏅 Bạn đã vào hàng ngũ chuyên gia thư giãn.'],
  [20, '👔 Trưởng phòng WC: mời lên nhận quyết định bổ nhiệm.'],
  [30, '👑 Giám đốc chi nhánh đã chính thức nhậm chức.'],
]

interface Toast { id: number; text: string }

export default function BathroomScreen({ session, onFinish }: { session: ActiveSession; onFinish: () => void }) {
  const elapsed = useElapsed(session.startedAt)
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lateShown = useRef<Set<number>>(new Set())
  const [flushing, setFlushing] = useState(false)

  const push = (text: string) => {
    const id = ++idRef.current
    setToasts((t) => [...t.slice(-2), { id, text }])
    sfx.ding()
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6500)
  }

  // Thông báo hài hước ngẫu nhiên (chỉ là hiệu ứng – không bao giờ kết thúc phiên).
  useEffect(() => {
    let timer = 0
    let last = -1
    const next = () => {
      timer = window.setTimeout(() => {
        let i = Math.floor(Math.random() * MESSAGES.length)
        if (i === last) i = (i + 1) % MESSAGES.length
        last = i
        push(MESSAGES[i])
        next()
      }, 12000 + Math.random() * 12000)
    }
    timer = window.setTimeout(() => {
      push(MESSAGES[3])
      next()
    }, 6000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mốc danh hiệu (dựa trên đồng hồ thật, nên vẫn đúng sau khi reload)
  useEffect(() => {
    const min = elapsed / 60000
    for (const [m, text] of LATE) {
      if (min >= m && min < m + 1 && !lateShown.current.has(m)) {
        lateShown.current.add(m)
        push(text)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed])

  // Phiên bị kết thúc ở tab khác → thoát ra.
  useEffect(() => subscribe(() => { if (!getActive()) onFinish() }), [onFinish])

  // Cảnh nhà vệ sinh
  useEffect(() => {
    const cv = canvasRef.current!
    const c = cv.getContext('2d')!
    const W = 560
    const H = 520
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = W * dpr
    cv.height = H * dpr
    let raf = 0
    const t0 = performance.now()
    const loop = (now: number) => {
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawBathroomScene(c, W, H, (now - t0) / 1000, HERO)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Tiếng nước nhỏ giọt ngẫu nhiên (tùy chọn qua nút âm thanh)
  useEffect(() => {
    const id = window.setInterval(() => {
      if (Math.random() < 0.5) sfx.drip()
    }, 7000)
    return () => window.clearInterval(id)
  }, [])

  const t = titleFor(elapsed)

  return (
    <main className="mx-auto flex h-full max-w-xl flex-col gap-3 px-4 py-3">
      <header className="flex items-center justify-between">
        <span className="rounded-full bg-white/85 px-4 py-1.5 text-sm font-bold text-mint">🚽 Đang trong WC · từ {formatTime(session.startedAt)}</span>
        <SoundToggle />
      </header>

      <section className="card pop px-4 py-3 text-center" aria-live="off">
        <div
          data-testid="timer"
          className="text-[clamp(3.5rem,16vw,6.5rem)] font-extrabold leading-none tabular-nums tracking-tight text-ink"
        >
          {formatClock(elapsed)}
        </div>
        <div className="mt-1 text-base font-bold text-rose" data-testid="live-title">
          {t.emoji} Hạng tạm thời: {t.title}
        </div>
      </section>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <canvas ref={canvasRef} className="card max-h-full w-full max-w-[520px] !rounded-3xl object-contain" style={{ aspectRatio: '560 / 520' }} aria-label="Nhân viên đang ngồi trong nhà vệ sinh lướt điện thoại" />
        <div className="pointer-events-none absolute inset-x-0 top-1 flex flex-col items-center gap-2 px-3" role="status">
          {toasts.map((x) => (
            <div key={x.id} className="toast-in rounded-2xl border-[3px] border-white bg-white/95 px-4 py-2 text-center text-base font-bold shadow-lg">
              {x.text}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-3">
        <button
          className="btn btn-sky !min-h-14 !px-5"
          disabled={flushing}
          onClick={() => {
            sfx.unlock()
            sfx.flush()
            setFlushing(true)
            window.setTimeout(() => setFlushing(false), 2400)
          }}
          aria-label="Xả nước (chỉ là hiệu ứng, không kết thúc phiên)"
        >
          💧 Xả
        </button>
        <button
          className="btn btn-big btn-mint"
          onClick={() => {
            sfx.unlock()
            onFinish()
          }}
        >
          ĐÃ VỆ SINH XONG
        </button>
      </div>
    </main>
  )
}
