/** Dữ liệu bố cục văn phòng (thuần dữ liệu, dễ test). Toạ độ "world" tính theo pixel logic. */
export const VIEW_W = 800
export const VIEW_H = 450
export const WORLD_W = 1700

export const WALL_H = 268 // đường chân tường / bắt đầu sàn
export const LANE_MIN = 345 // giới hạn trên của vùng đi lại (toạ độ chân)
export const LANE_MAX = 432

export const START = { x: 130, y: 398 }
export const COFFEE_X = 600
export const DOOR_X = 1596
export const PLAYER_HALF_W = 11
export const PLAYER_HALF_D = 5

export type SolidKind = 'chair' | 'plant' | 'box' | 'table' | 'cart'

/** Vật cản: (x, y) là tâm "dấu chân" trên sàn, w/h là kích thước dấu chân. */
export interface Solid {
  kind: SolidKind
  x: number
  y: number
  w: number
  h: number
  color?: string
}

export const SOLIDS: Solid[] = [
  { kind: 'chair', x: 700, y: 392, w: 30, h: 14, color: '#ff9aa2' },
  { kind: 'plant', x: 790, y: 424, w: 26, h: 14 },
  { kind: 'chair', x: 850, y: 362, w: 30, h: 14, color: '#9ad0f5' },
  { kind: 'box', x: 905, y: 420, w: 34, h: 16 },
  { kind: 'table', x: 1030, y: 374, w: 150, h: 28 },
  { kind: 'chair', x: 1030, y: 408, w: 30, h: 14, color: '#b8e0a8' },
  { kind: 'chair', x: 1170, y: 396, w: 30, h: 14, color: '#ffd27f' },
  { kind: 'cart', x: 1340, y: 372, w: 44, h: 16 },
  { kind: 'chair', x: 1340, y: 420, w: 30, h: 14, color: '#c9b3f5' },
  { kind: 'plant', x: 1470, y: 428, w: 26, h: 14 },
]

export type WalkerAxis = 'h' | 'v'
export interface WalkerDef {
  axis: WalkerAxis
  /** Với 'h': x chạy từ a tới b tại y cố định (fixed). Với 'v': y chạy từ a tới b tại x cố định. */
  a: number
  b: number
  fixed: number
  speed: number
  look: number // chỉ số trong LOOKS
  phase?: number
}

export const WALKERS: WalkerDef[] = [
  { axis: 'h', a: 740, b: 960, fixed: 380, speed: 42, look: 0 },
  { axis: 'v', a: 352, b: 428, fixed: 1255, speed: 38, look: 1, phase: 0.4 },
  { axis: 'h', a: 1390, b: 1520, fixed: 394, speed: 52, look: 2, phase: 0.2 },
]

export const BUMP_LINES = ['Ối!', 'Đi đâu gấp thế?', 'Từ từ thôi!', 'Cà phê của tôi!', 'Á!', 'Có việc gì gấp vậy?']

/** Kiểm tra chân người chơi tại (px, py) có va vào vật cản cố định nào không. */
export function hitsSolid(px: number, py: number, solids: Solid[] = SOLIDS): boolean {
  for (const s of solids) {
    if (
      Math.abs(px - s.x) < PLAYER_HALF_W + s.w / 2 &&
      Math.abs(py - s.y) < PLAYER_HALF_D + s.h / 2
    ) {
      return true
    }
  }
  return false
}
