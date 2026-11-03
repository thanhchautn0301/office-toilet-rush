/** Danh hiệu theo thời gian trong WC. Ranh giới: [min, max) tính theo phút. */
export interface TitleInfo {
  title: string
  emoji: string
  hint: string
}

const MIN = 60_000

export function titleFor(durationMs: number): TitleInfo {
  const m = durationMs / MIN
  if (m < 3) return { title: 'Tốc chiến', emoji: '⚡', hint: 'Vào như gió, ra như bão!' }
  if (m < 10) return { title: 'Nhân viên bình thường', emoji: '🙂', hint: 'Chuẩn mực công sở.' }
  if (m < 20) return { title: 'Chuyên gia thư giãn', emoji: '😌', hint: 'Nghệ thuật của sự thong thả.' }
  if (m < 30) return { title: 'Trưởng phòng WC', emoji: '👔', hint: 'Họp giao ban ngay tại chỗ.' }
  return { title: 'Giám đốc chi nhánh', emoji: '👑', hint: 'Ngai vàng đã có chủ.' }
}

export const ALL_TITLES: { range: string; title: string }[] = [
  { range: 'Dưới 3 phút', title: 'Tốc chiến' },
  { range: '3–10 phút', title: 'Nhân viên bình thường' },
  { range: '10–20 phút', title: 'Chuyên gia thư giãn' },
  { range: '20–30 phút', title: 'Trưởng phòng WC' },
  { range: 'Trên 30 phút', title: 'Giám đốc chi nhánh' },
]
