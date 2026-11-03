import { useEffect, useMemo, useState } from 'react'
import { formatClock, formatDay, formatDuration, formatTime, dayKey } from '../lib/format'
import { clearHistory, computeStats, getHistory, groupByDay, subscribe } from '../lib/storage'
import { ALL_TITLES, titleFor } from '../lib/titles'

function Stat({ label, value, sub, emoji }: { label: string; value: string; sub?: string; emoji: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-sm font-bold opacity-60">{emoji} {label}</div>
      <div className="text-2xl font-extrabold leading-tight">{value}</div>
      {sub && <div className="text-xs font-medium opacity-60">{sub}</div>}
    </div>
  )
}

export default function StatsScreen({ onBack }: { onBack: () => void }) {
  const [history, setHistory] = useState(() => getHistory())
  useEffect(() => subscribe(() => setHistory(getHistory())), [])
  const stats = useMemo(() => computeStats(history), [history])
  const groups = useMemo(() => groupByDay(history), [history])

  // 7 ngày gần nhất
  const week = useMemo(() => {
    const out: { key: string; label: string; ms: number; n: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = dayKey(d.getTime())
      const g = groups.find((x) => x.date === key)
      out.push({ key, label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, ms: g?.totalMs ?? 0, n: g?.sessions.length ?? 0 })
    }
    return out
  }, [groups])
  const maxMs = Math.max(1, ...week.map((w) => w.ms))

  return (
    <main className="mx-auto h-full max-w-2xl overflow-y-auto px-4 py-4">
      <header className="mb-4 flex items-center justify-between gap-3">
        <button className="btn btn-ghost !min-h-12 !px-5 !py-2 !text-lg" onClick={onBack}>← Menu</button>
        <h1 className="text-3xl font-extrabold">Thống kê cá nhân</h1>
        <span className="w-20" />
      </header>

      {history.length === 0 ? (
        <div className="card pop px-6 py-10 text-center">
          <p className="text-5xl">🧻</p>
          <p className="mt-2 text-xl font-bold">Chưa có phiên nào.</p>
          <p className="opacity-70">Hãy uống một ly cà phê và quay lại nhé!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat emoji="🚽" label="Tổng số lần đi WC" value={String(stats.count)} />
            <Stat emoji="⏱️" label="Tổng thời gian" value={formatDuration(stats.totalMs)} />
            <Stat emoji="📐" label="Trung bình" value={formatDuration(stats.avgMs)} sub={titleFor(stats.avgMs).title} />
            <Stat emoji="🐢" label="Phiên lâu nhất" value={formatClock(stats.longest!.durationMs)} sub={formatDay(stats.longest!.date)} />
            <Stat emoji="⚡" label="Phiên ngắn nhất" value={formatClock(stats.shortest!.durationMs)} sub={formatDay(stats.shortest!.date)} />
          </div>

          <section className="card mt-4 px-4 py-4">
            <h2 className="mb-3 text-lg font-extrabold">7 ngày gần nhất</h2>
            <div className="flex h-32 items-end gap-2" role="img" aria-label="Biểu đồ tổng thời gian trong WC 7 ngày gần nhất">
              {week.map((w) => (
                <div key={w.key} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] font-bold opacity-60">{w.ms ? formatClock(w.ms) : ''}</span>
                  <div className="w-full rounded-t-xl bg-gradient-to-t from-rose to-[#ffb3c1]" style={{ height: `${Math.max(w.ms ? 8 : 3, (w.ms / maxMs) * 80)}px`, opacity: w.ms ? 1 : 0.25 }} />
                  <span className="text-[11px] font-bold opacity-70">{w.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-4">
            <h2 className="mb-2 text-lg font-extrabold">Lịch sử theo ngày</h2>
            <div className="flex flex-col gap-3">
              {groups.map((g) => (
                <div key={g.date} className="card px-4 py-3">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="font-extrabold">{formatDay(g.date)}</span>
                    <span className="text-sm font-bold opacity-60">{g.sessions.length} lần · {formatDuration(g.totalMs)}</span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {g.sessions.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-1.5 text-sm">
                        <span className="font-medium opacity-70">{formatTime(s.startedAt)} → {formatTime(s.endedAt)}</span>
                        <span className="text-right font-bold">{formatClock(s.durationMs)} <span className="text-rose">· {s.title}</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="card mt-4 px-4 py-3 text-sm">
        <h2 className="mb-1 font-extrabold">Bảng danh hiệu</h2>
        <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          {ALL_TITLES.map((t) => (
            <li key={t.title} className="flex justify-between gap-2"><span className="opacity-70">{t.range}</span><b>{t.title}</b></li>
          ))}
        </ul>
      </section>

      {history.length > 0 && (
        <div className="my-5 text-center">
          <button
            className="btn btn-ghost !min-h-11 !text-base"
            onClick={() => {
              if (window.confirm('Xóa toàn bộ lịch sử? Hành động này không thể hoàn tác.')) {
                clearHistory()
                setHistory(getHistory())
              }
            }}
          >
            🗑️ Xóa lịch sử
          </button>
        </div>
      )}
    </main>
  )
}
