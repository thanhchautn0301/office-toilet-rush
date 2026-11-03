import { useEffect, useState } from 'react'

/**
 * Thời gian đã trôi qua = Date.now() - startedAt.
 * setInterval / rAF CHỈ dùng để vẽ lại giao diện; giá trị luôn được tính lại từ timestamp thật,
 * nên chuyển tab (bị throttle), khóa màn hình hay reload đều không làm lệch đồng hồ.
 */
export function useElapsed(startedAt: number | null): number {
  const calc = () => (startedAt == null ? 0 : Math.max(0, Date.now() - startedAt))
  const [ms, setMs] = useState(calc)

  useEffect(() => {
    if (startedAt == null) return
    const tick = () => setMs(Math.max(0, Date.now() - startedAt))
    tick()
    const id = window.setInterval(tick, 250)
    const onVis = () => {
      if (!document.hidden) tick()
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', tick)
    window.addEventListener('pageshow', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [startedAt])

  return ms
}
