import { beforeEach, describe, expect, it, vi } from 'vitest'

class MemStorage {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}

async function fresh() {
  vi.resetModules() // mô phỏng "reload trang": module state bị xoá, chỉ còn LocalStorage
  return await import('./storage')
}

describe('storage / session', () => {
  beforeEach(() => {
    ;(globalThis as any).localStorage = new MemStorage()
  })

  it('bắt đầu phiên và khôi phục sau reload với đúng startedAt', async () => {
    let s = await fresh()
    const a = s.startSession(1_000_000)
    s = await fresh()
    expect(s.getActive()).toEqual(a)
  })

  it('không tạo phiên mới khi phiên cũ chưa hoàn thành', async () => {
    const s = await fresh()
    const a = s.startSession(1_000)
    const b = s.startSession(999_999)
    expect(b.id).toBe(a.id)
    expect(b.startedAt).toBe(1_000)
  })

  it('tổng thời gian = end - start, kể cả khi "tab ngủ" 45 phút (không phụ thuộc tick)', async () => {
    let s = await fresh()
    s.startSession(10_000)
    s = await fresh()
    const r = s.finishSession(10_000 + 45 * 60_000 + 7_000)!
    expect(r.durationMs).toBe(45 * 60_000 + 7_000)
    expect(r.title).toBe('Giám đốc chi nhánh')
    expect(s.getActive()).toBeNull()
    expect(s.getHistory()).toHaveLength(1)
  })

  it('finish hai lần chỉ ghi một bản ghi (idempotent)', async () => {
    const s = await fresh()
    s.startSession(0)
    expect(s.finishSession(5_000)).not.toBeNull()
    expect(s.finishSession(9_000)).toBeNull()
    expect(s.getHistory()).toHaveLength(1)
  })

  it('đồng hồ hệ thống chạy lùi không tạo thời gian âm', async () => {
    const s = await fresh()
    s.startSession(50_000)
    expect(s.finishSession(10_000)!.durationMs).toBe(0)
  })

  it('dữ liệu hỏng không làm sập game', async () => {
    localStorage.setItem('office-toilet-rush:v1', '{oops')
    const s = await fresh()
    expect(s.getActive()).toBeNull()
    expect(s.getHistory()).toEqual([])
  })

  it('thống kê & nhóm theo ngày', async () => {
    const s = await fresh()
    for (const [a, d] of [[0, 60_000], [100_000, 180_000], [200_000, 600_000]]) {
      s.startSession(a)
      s.finishSession(a + d)
    }
    const st = s.computeStats(s.getHistory())
    expect(st.count).toBe(3)
    expect(st.totalMs).toBe(840_000)
    expect(st.longest!.durationMs).toBe(600_000)
    expect(st.shortest!.durationMs).toBe(60_000)
    expect(s.groupByDay(s.getHistory()).length).toBeGreaterThanOrEqual(1)
  })
})

describe('titles / format', () => {
  it('ranh giới danh hiệu', async () => {
    const { titleFor } = await import('./titles')
    const m = 60_000
    expect(titleFor(2 * m + 59_000).title).toBe('Tốc chiến')
    expect(titleFor(3 * m).title).toBe('Nhân viên bình thường')
    expect(titleFor(10 * m).title).toBe('Chuyên gia thư giãn')
    expect(titleFor(20 * m).title).toBe('Trưởng phòng WC')
    expect(titleFor(30 * m).title).toBe('Giám đốc chi nhánh')
  })
  it('định dạng thời gian', async () => {
    const { formatDuration, formatClock } = await import('./format')
    expect(formatDuration(12 * 60_000 + 35_000)).toBe('12 phút 35 giây')
    expect(formatDuration(5_000)).toBe('5 giây')
    expect(formatClock(65_000)).toBe('01:05')
    expect(formatClock(3_725_000)).toBe('1:02:05')
  })
})
