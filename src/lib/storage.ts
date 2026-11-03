import { dayKey } from './format'
import { titleFor } from './titles'

/**
 * Lưu trữ phiên chơi trong LocalStorage.
 *
 * Quy tắc cốt lõi:
 *  - Thời gian chỉ dựa trên Date.now() lúc bắt đầu / kết thúc (timestamp), không đếm tick.
 *  - Phiên đang chạy ("active") được ghi ngay khi bắt đầu → reload / đóng tab vẫn khôi phục được.
 *  - Luôn đọc lại từ LocalStorage (nguồn sự thật duy nhất) → nhiều tab không lệch nhau.
 *  - Không thể tạo phiên mới khi phiên cũ chưa hoàn thành.
 *  - Không có timeout tự kết thúc.
 */

export interface ActiveSession {
  id: string
  startedAt: number
}

export interface SessionRecord {
  id: string
  date: string // YYYY-MM-DD (giờ địa phương, theo lúc bắt đầu)
  startedAt: number
  endedAt: number
  durationMs: number
  title: string
}

interface Store {
  version: 1
  active: ActiveSession | null
  history: SessionRecord[]
}

export const STORAGE_KEY = 'office-toilet-rush:v1'

const emptyStore = (): Store => ({ version: 1, active: null, history: [] })

// Dự phòng khi LocalStorage bị chặn (chế độ riêng tư...): vẫn chơi được trong phiên trình duyệt.
let memoryFallback: string | null = null

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return memoryFallback
  }
}

function writeRaw(raw: string) {
  try {
    localStorage.setItem(STORAGE_KEY, raw)
  } catch {
    memoryFallback = raw
  }
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function load(): Store {
  const raw = readRaw()
  if (!raw) return emptyStore()
  try {
    const p = JSON.parse(raw)
    const active =
      p?.active && typeof p.active.id === 'string' && isNum(p.active.startedAt)
        ? { id: p.active.id as string, startedAt: p.active.startedAt as number }
        : null
    const history: SessionRecord[] = Array.isArray(p?.history)
      ? p.history.filter(
          (r: SessionRecord) =>
            r && typeof r.id === 'string' && isNum(r.startedAt) && isNum(r.endedAt) && isNum(r.durationMs),
        )
      : []
    return { version: 1, active, history }
  } catch {
    return emptyStore()
  }
}

const save = (s: Store) => writeRaw(JSON.stringify(s))

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  } catch {
    /* ignore */
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function getActive(): ActiveSession | null {
  return load().active
}

export function getHistory(): SessionRecord[] {
  return load().history
}

/** Bắt đầu phiên. Nếu đã có phiên đang chạy thì trả về phiên đó (không tạo phiên mới). */
export function startSession(now: number = Date.now()): ActiveSession {
  const s = load()
  if (s.active) return s.active
  s.active = { id: newId(), startedAt: now }
  save(s)
  return s.active
}

/** Kết thúc phiên đang chạy. Trả về null nếu không có phiên nào (vd. tab khác đã kết thúc). */
export function finishSession(now: number = Date.now()): SessionRecord | null {
  const s = load()
  if (!s.active) return null
  const { id, startedAt } = s.active
  const endedAt = Math.max(now, startedAt)
  const durationMs = endedAt - startedAt
  const record: SessionRecord = {
    id,
    date: dayKey(startedAt),
    startedAt,
    endedAt,
    durationMs,
    title: titleFor(durationMs).title,
  }
  s.history.push(record)
  s.active = null
  save(s)
  return record
}

export function clearHistory() {
  const s = load()
  s.history = []
  save(s)
}

export interface Stats {
  count: number
  totalMs: number
  avgMs: number
  longest: SessionRecord | null
  shortest: SessionRecord | null
}

export function computeStats(history: SessionRecord[]): Stats {
  if (history.length === 0) return { count: 0, totalMs: 0, avgMs: 0, longest: null, shortest: null }
  const totalMs = history.reduce((a, r) => a + r.durationMs, 0)
  let longest = history[0]
  let shortest = history[0]
  for (const r of history) {
    if (r.durationMs > longest.durationMs) longest = r
    if (r.durationMs < shortest.durationMs) shortest = r
  }
  return { count: history.length, totalMs, avgMs: totalMs / history.length, longest, shortest }
}

export interface DayGroup {
  date: string
  sessions: SessionRecord[]
  totalMs: number
}

export function groupByDay(history: SessionRecord[]): DayGroup[] {
  const map = new Map<string, DayGroup>()
  for (const r of history) {
    const g = map.get(r.date) ?? { date: r.date, sessions: [], totalMs: 0 }
    g.sessions.push(r)
    g.totalMs += r.durationMs
    map.set(r.date, g)
  }
  const groups = [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
  for (const g of groups) g.sessions.sort((a, b) => b.startedAt - a.startedAt)
  return groups
}

/** Đăng ký nghe thay đổi từ tab khác. */
export function subscribe(cb: () => void): () => void {
  const h = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) cb()
  }
  window.addEventListener('storage', h)
  return () => window.removeEventListener('storage', h)
}
