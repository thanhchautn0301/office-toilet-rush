import { useEffect, useMemo } from 'react'
import Person from '../components/Person'
import { sfx } from '../game/audio'
import { formatDuration, formatTime } from '../lib/format'
import { computeStats, getHistory, type SessionRecord } from '../lib/storage'
import { titleFor } from '../lib/titles'

interface Props {
  record: SessionRecord
  onAgain: () => void
  onStats: () => void
  onMenu: () => void
}

const COLORS = ['#ff7b8a', '#ffc94d', '#6fa8ff', '#5fbfa3', '#c9b3f5', '#ffb3c1']

export default function CompleteScreen({ record, onAgain, onStats, onMenu }: Props) {
  const t = titleFor(record.durationMs)
  useEffect(() => {
    sfx.cheer()
  }, [])
  const confetti = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 2.4 + Math.random() * 2.2,
        color: COLORS[i % COLORS.length],
      })),
    [],
  )
  const stats = computeStats(getHistory())
  const compare =
    stats.count > 1
      ? record.durationMs <= stats.avgMs
        ? `Nhanh hơn trung bình của bạn (${formatDuration(stats.avgMs)}).`
        : `Lâu hơn trung bình của bạn (${formatDuration(stats.avgMs)}).`
      : 'Đây là phiên đầu tiên của bạn. Chào mừng đến câu lạc bộ!'

  return (
    <main className="mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-4 px-5 py-6 text-center">
      {confetti.map((c, i) => (
        <span key={i} className="confetti" style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }} />
      ))}
      <h1 className="pop text-5xl font-extrabold text-rose sm:text-6xl">CHÚC MỪNG!</h1>
      <div className="floaty -my-3">
        <Person state="happy" size={190} />
      </div>
      <section className="card w-full px-5 py-5">
        <p className="text-lg font-bold opacity-80">Bạn đã hoàn thành nhiệm vụ.</p>
        <p className="mt-2 text-sm font-bold uppercase tracking-wide opacity-60">Thời gian trong WC</p>
        <p data-testid="result-duration" className="text-4xl font-extrabold text-ink sm:text-5xl">{formatDuration(record.durationMs)}</p>
        <p className="mt-3 text-sm font-bold uppercase tracking-wide opacity-60">Danh hiệu</p>
        <p data-testid="result-title" className="text-3xl font-extrabold text-rose">{t.emoji} {t.title}</p>
        <p className="mt-1 text-base font-medium opacity-80">{t.hint}</p>
        <p className="mt-3 text-sm font-medium opacity-70">
          {formatTime(record.startedAt)} → {formatTime(record.endedAt)} · {compare}
        </p>
      </section>
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <button className="btn btn-big flex-1" onClick={onAgain}>☕ Chơi lại</button>
        <button className="btn btn-sky flex-1" onClick={onStats}>📊 Thống kê</button>
      </div>
      <button className="btn btn-ghost !min-h-12" onClick={onMenu}>Về menu</button>
    </main>
  )
}
