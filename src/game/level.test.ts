import { describe, expect, it } from 'vitest'
import { DOOR_X, LANE_MAX, LANE_MIN, START, hitsSolid } from './level'

describe('level', () => {
  it('có đường đi từ điểm xuất phát tới cửa WC (BFS trên lưới 3px)', () => {
    const step = 3
    const xs: number[] = []
    for (let x = 30; x <= DOOR_X; x += step) xs.push(x)
    const ys: number[] = []
    for (let y = LANE_MIN; y <= LANE_MAX; y += step) ys.push(y)
    const key = (i: number, j: number) => i * 1000 + j
    const startI = Math.round((START.x - 30) / step)
    const startJ = Math.round((START.y - LANE_MIN) / step)
    expect(hitsSolid(xs[startI], ys[startJ])).toBe(false)
    const seen = new Set<number>([key(startI, startJ)])
    const q: [number, number][] = [[startI, startJ]]
    let reached = false
    while (q.length) {
      const [i, j] = q.shift()!
      if (xs[i] >= DOOR_X - 40) {
        reached = true
        break
      }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di
        const nj = j + dj
        if (ni < 0 || nj < 0 || ni >= xs.length || nj >= ys.length) continue
        const k = key(ni, nj)
        if (seen.has(k) || hitsSolid(xs[ni], ys[nj])) continue
        seen.add(k)
        q.push([ni, nj])
      }
    }
    expect(reached).toBe(true)
  })

  it('đường đi đủ rộng: mọi lát cắt dọc đều có ít nhất một khe trống', () => {
    for (let x = 30; x <= DOOR_X; x += 2) {
      let free = false
      for (let y = LANE_MIN; y <= LANE_MAX; y += 1) if (!hitsSolid(x, y)) free = true
      expect(free).toBe(true)
    }
  })
})
