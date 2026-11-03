import {
  BUMP_LINES, COFFEE_X, DOOR_X, LANE_MAX, LANE_MIN, PLAYER_HALF_D, PLAYER_HALF_W, SOLIDS, START, VIEW_H, VIEW_W,
  WALKERS, WALL_H, WORLD_W, hitsSolid, type WalkerDef,
} from './level'
import {
  FONT, HERO, LOOKS, bubble, drawBox, drawCart, drawChair, drawCoffeeMachine, drawDesk, drawPerson, drawPlant,
  drawPoster, drawTable, drawWallClock, drawWaterCooler, drawWcDoor, drawWhiteboard, drawWindow, ell, rr, text,
  type Ctx, type PoseState,
} from './draw'
import { sfx } from './audio'

export type Phase = 'morning' | 'drinking' | 'rush' | 'entering'

export interface OfficeCallbacks {
  /** Gọi khi người chơi đã mở cửa WC và đi vào (sau hiệu ứng chuyển cảnh). */
  onEnterToilet: () => void
}

interface Walker {
  def: WalkerDef
  x: number
  y: number
  dir: 1 | -1
  talk: number
  talkText: string
  t0: number
}

interface Puff {
  x: number
  y: number
  life: number
  max: number
  vx: number
  vy: number
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export class OfficeGame {
  private ctx: Ctx
  private raf = 0
  private last = 0
  private t = 0
  private alive = true

  readonly keys = new Set<string>()
  readonly touch = { left: false, right: false, up: false, down: false }
  private actionQueued = false

  phase: Phase = 'morning'
  private p = { x: START.x, y: START.y, vx: 0, vy: 0, facing: 1 as 1 | -1, stun: 0, state: 'idle' as PoseState }
  private camX = 0
  private walkers: Walker[]
  private puffs: Puff[] = []
  private phaseT = 0 // thời gian từ khi vào phase hiện tại
  private bannerT = -1
  private stepT = 0
  private gameClock = 0 // giây "trong game" kể từ 08:00
  private fade = 0 // 0..1 (đen dần khi vào WC)
  private doorOpen = 0
  private isTouch: boolean
  private bumps = 0

  constructor(
    private canvas: HTMLCanvasElement,
    private cb: OfficeCallbacks,
  ) {
    this.ctx = canvas.getContext('2d')!
    this.isTouch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
    this.walkers = WALKERS.map((def, i) => ({
      def,
      x: def.axis === 'h' ? lerp(def.a, def.b, def.phase ?? 0) : def.fixed,
      y: def.axis === 'v' ? lerp(def.a, def.b, def.phase ?? 0) : def.fixed,
      dir: i % 2 ? -1 : 1,
      talk: 0,
      talkText: '',
      t0: i * 1.3,
    }))
    this.camX = 0
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    this.resize()
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  // ----- vòng đời -----
  destroy() {
    this.alive = false
    cancelAnimationFrame(this.raf)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(320, Math.round(r.width * dpr))
    const h = Math.round((w * VIEW_H) / VIEW_W)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  // ----- input -----
  private onBlur = () => this.keys.clear()
  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault()
    if (e.repeat) return
    if (k === 'e' || k === ' ' || k === 'enter') this.actionQueued = true
    this.keys.add(k)
  }
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase())

  /** Nút tương tác (E / nút trên màn hình cảm ứng). */
  interact() {
    this.actionQueued = true
  }

  /** Dùng cho kiểm thử/debug: dịch chuyển nhân vật. */
  debugTeleport(x: number, y: number) {
    this.p.x = x
    this.p.y = y
  }
  debugState() {
    return { phase: this.phase, x: this.p.x, y: this.p.y, bumps: this.bumps }
  }

  // ----- logic -----
  private loop = (now: number) => {
    if (!this.alive) return
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    this.t += dt
    this.update(dt)
    this.draw()
    this.raf = requestAnimationFrame(this.loop)
  }

  private near(x: number, r = 70) {
    return Math.abs(this.p.x - x) < r
  }

  private setPhase(p: Phase) {
    this.phase = p
    this.phaseT = 0
  }

  private update(dt: number) {
    this.phaseT += dt
    const p = this.p

    // đồng hồ trong game: đứng yên ở 08:00 tới khi uống cà phê, sau đó 1 giây thật = 1 phút game
    if (this.phase === 'rush' || this.phase === 'entering') this.gameClock += dt / 1

    // hành động
    if (this.actionQueued) {
      this.actionQueued = false
      this.doAction()
    }

    // phase drinking → rush
    if (this.phase === 'drinking') {
      if (this.phaseT > 1.5 && this.bannerT < 0) {
        this.bannerT = 0
        sfx.oops()
        sfx.rumble()
      }
      if (this.bannerT >= 0) this.bannerT += dt
      if (this.phaseT > 2.6) {
        this.setPhase('rush')
      }
    } else if (this.bannerT >= 0) {
      this.bannerT += dt
      if (this.bannerT > 2.6) this.bannerT = -1
    }

    // di chuyển
    const canMove = this.phase === 'morning' || this.phase === 'rush'
    let ix = 0
    let iy = 0
    if (canMove && p.stun <= 0) {
      const K = this.keys
      if (K.has('arrowleft') || K.has('a') || this.touch.left) ix -= 1
      if (K.has('arrowright') || K.has('d') || this.touch.right) ix += 1
      if (K.has('arrowup') || K.has('w') || this.touch.up) iy -= 1
      if (K.has('arrowdown') || K.has('s') || this.touch.down) iy += 1
    }
    const urgent = this.phase === 'rush'
    const sprint = K_SHIFT(this.keys)
    const speed = urgent ? 205 : sprint ? 170 : 120
    const len = Math.hypot(ix, iy) || 1
    if (p.stun > 0) {
      p.stun -= dt
      p.vx *= Math.pow(0.002, dt)
    } else {
      p.vx = (ix / len) * speed
    }
    p.vy = p.stun > 0 ? 0 : (iy / len) * speed * 0.7
    this.moveWithCollision(p.vx * dt, p.vy * dt)
    if (ix !== 0 && p.stun <= 0) p.facing = ix > 0 ? 1 : -1

    // trạng thái hoạt hình
    const moving = ix !== 0 || iy !== 0
    if (this.phase === 'drinking') p.state = this.phaseT < 1.5 ? 'drinking' : 'urgent'
    else if (this.phase === 'entering') p.state = 'running'
    else if (p.stun > 0) p.state = 'stunned'
    else if (this.phase === 'rush') p.state = moving ? 'running' : 'urgent'
    else p.state = moving ? (sprint ? 'running' : 'walking') : 'idle'

    // tiếng bước chân + bụi
    if (moving && p.stun <= 0 && canMove) {
      this.stepT -= dt
      if (this.stepT <= 0) {
        this.stepT = urgent ? 0.16 : 0.3
        sfx.step()
        if (urgent) this.puffs.push({ x: p.x - p.facing * 10, y: p.y - 2, life: 0, max: 0.5, vx: -p.facing * 20, vy: -14 })
      }
    }

    // đồng nghiệp đi lại + va chạm
    for (const w of this.walkers) this.updateWalker(w, dt)

    // camera
    const target = clamp(p.x - VIEW_W / 2 + p.facing * 60, 0, WORLD_W - VIEW_W)
    this.camX = lerp(this.camX, target, 1 - Math.pow(0.0005, dt))

    // chuyển cảnh vào WC
    if (this.phase === 'entering') {
      this.doorOpen = Math.min(1, this.doorOpen + dt * 3)
      p.x = lerp(p.x, DOOR_X, 1 - Math.pow(0.001, dt))
      p.y = lerp(p.y, 405, 1 - Math.pow(0.01, dt))
      if (this.phaseT > 0.45) this.fade = Math.min(1, this.fade + dt * 2.6)
      if (this.fade >= 1 && this.alive) {
        this.alive = false
        cancelAnimationFrame(this.raf)
        this.cb.onEnterToilet()
        return
      }
    }

    for (const q of this.puffs) {
      q.life += dt
      q.x += q.vx * dt
      q.y += q.vy * dt
    }
    this.puffs = this.puffs.filter((q) => q.life < q.max)
  }

  private doAction() {
    if (this.phase === 'morning' && this.near(COFFEE_X, 80)) {
      this.setPhase('drinking')
      this.p.facing = 1
      this.p.x = COFFEE_X - 50
      this.p.y = clamp(this.p.y, 372, 400)
      sfx.unlock()
      sfx.gulp()
    } else if (this.phase === 'rush' && this.near(DOOR_X, 75)) {
      this.setPhase('entering')
      this.doorOpen = 0
      this.p.facing = 1
      sfx.door()
    }
  }

  private moveWithCollision(dx: number, dy: number) {
    const p = this.p
    const nx = clamp(p.x + dx, 34, WORLD_W - 34)
    if (!hitsSolid(nx, p.y)) p.x = nx
    else if (p.stun > 0) p.vx = 0
    const ny = clamp(p.y + dy, LANE_MIN, LANE_MAX)
    if (!hitsSolid(p.x, ny)) p.y = ny
  }

  private updateWalker(w: Walker, dt: number) {
    const d = w.def
    const stopped = w.talk > 0
    if (w.talk > 0) w.talk -= dt
    if (!stopped) {
      const v = d.speed * dt * w.dir
      if (d.axis === 'h') {
        w.x += v
        if (w.x > d.b) { w.x = d.b; w.dir = -1 }
        if (w.x < d.a) { w.x = d.a; w.dir = 1 }
      } else {
        w.y += v
        if (w.y > d.b) { w.y = d.b; w.dir = -1 }
        if (w.y < d.a) { w.y = d.a; w.dir = 1 }
      }
    }
    // va chạm với người chơi
    const p = this.p
    if (p.stun <= 0 && this.phase !== 'entering' && Math.abs(p.x - w.x) < PLAYER_HALF_W + 9 && Math.abs(p.y - w.y) < PLAYER_HALF_D + 6) {
      this.bumps++
      const side = p.x < w.x ? -1 : 1
      p.stun = 0.55
      p.vx = side * 230
      p.facing = (-side) as 1 | -1
      w.talk = 1.4
      w.talkText = BUMP_LINES[Math.floor(Math.random() * BUMP_LINES.length)]
      sfx.bump()
    }
  }

  // ----- vẽ -----
  private draw() {
    const c = this.ctx
    const s = this.canvas.width / VIEW_W
    c.setTransform(s, 0, 0, s, 0, 0)
    c.clearRect(0, 0, VIEW_W, VIEW_H)
    const cam = Math.round(this.camX)
    const t = this.t

    // nền tường / sàn
    this.drawBackdrop(c, cam)

    c.save()
    c.translate(-cam, 0)
    this.drawWallItems(c, t)

    // vật thể đứng trên sàn + người, sắp xếp theo độ sâu (y chân)
    type Item = { y: number; draw: () => void }
    const items: Item[] = []
    for (const o of SOLIDS) {
      const base = o.y + o.h / 2
      items.push({
        y: base,
        draw: () => {
          if (o.kind === 'chair') drawChair(c, o.x, base, o.color ?? '#ff9aa2', Math.sin(t * 0.8 + o.x) * 0.02)
          else if (o.kind === 'plant') drawPlant(c, o.x, base, t)
          else if (o.kind === 'box') drawBox(c, o.x, base)
          else if (o.kind === 'cart') drawCart(c, o.x, base)
          else drawTable(c, o.x, base, o.w, t)
        },
      })
    }
    for (const w of this.walkers) {
      items.push({
        y: w.y,
        draw: () => {
          drawPerson(c, { x: w.x, y: w.y, state: w.talk > 0 ? 'stunned' : 'walking', t: t + w.t0, facing: w.dir, look: LOOKS[w.def.look], scale: 0.98 })
          if (w.talk > 0) bubble(c, w.talkText, w.x, w.y - 98, 14)
        },
      })
    }
    const p = this.p
    items.push({
      y: p.y,
      draw: () => {
        for (const q of this.puffs) {
          const k = q.life / q.max
          c.globalAlpha = 0.5 * (1 - k)
          ell(c, q.x, q.y, 4 + k * 7, 3 + k * 4, '#ffffff')
        }
        c.globalAlpha = 1
        drawPerson(c, { x: p.x, y: p.y, state: p.state, t, facing: p.facing, look: HERO, scale: 1 })
        if (this.phase === 'rush' && p.state === 'urgent') bubble(c, 'ục… ục…', p.x + 6, p.y - 108, 13, '#fff7d6')
        // gợi ý tương tác
        const hint = this.hint()
        if (hint) {
          const bounce = Math.sin(t * 6) * 3
          bubble(c, hint, p.x, p.y - 100 + bounce, 15, '#fff7d6')
        }
      },
    })
    items.sort((a, b) => a.y - b.y).forEach((i) => i.draw())
    c.restore()

    this.drawHud(c)

    // banner
    if (this.bannerT >= 0) {
      const k = clamp(this.bannerT / 0.25, 0, 1)
      const out = clamp((2.6 - this.bannerT) / 0.4, 0, 1)
      const sc = (0.6 + 0.4 * k + Math.sin(this.bannerT * 30) * 0.015) * (0.9 + 0.1 * out)
      c.save()
      c.globalAlpha = Math.min(k, out)
      c.translate(VIEW_W / 2 + Math.sin(this.bannerT * 45) * 2, 118)
      c.scale(sc, sc)
      c.shadowColor = 'rgba(120,40,70,.3)'
      c.shadowBlur = 16
      c.shadowOffsetY = 6
      rr(c, -250, -34, 500, 68, 34, '#ff7b8a', '#ffffff', 5)
      c.shadowColor = 'transparent'
      text(c, 'Ôi không! Không phải lúc này!', 0, 2, 33, '#ffffff', 'center', 800)
      c.restore()
    }

    if (this.fade > 0) {
      c.fillStyle = `rgba(255,243,232,${this.fade})`
      c.fillRect(0, 0, VIEW_W, VIEW_H)
    }
  }

  private hint(): string | null {
    const key = this.isTouch ? 'Chạm nút ●' : 'Nhấn E'
    if (this.phase === 'morning' && this.near(COFFEE_X, 80)) return `${key}: uống cà phê`
    if (this.phase === 'rush' && this.near(DOOR_X, 75)) return `${key}: vào WC!`
    return null
  }

  private drawBackdrop(c: Ctx, cam: number) {
    // tường
    const g = c.createLinearGradient(0, 0, 0, WALL_H)
    g.addColorStop(0, '#fff1e0')
    g.addColorStop(1, '#ffe3cf')
    c.fillStyle = g
    c.fillRect(0, 0, VIEW_W, WALL_H)
    // đoạn tường khu WC
    const wcStart = 1480 - cam
    if (wcStart < VIEW_W) {
      c.fillStyle = '#dff4ec'
      c.fillRect(Math.max(0, wcStart), 0, VIEW_W, WALL_H)
      c.strokeStyle = 'rgba(255,255,255,.7)'
      c.lineWidth = 2
      for (let x = wcStart; x < VIEW_W + 40; x += 40) {
        c.beginPath()
        c.moveTo(x, 0)
        c.lineTo(x, WALL_H)
        c.stroke()
      }
    }
    // len tường
    c.fillStyle = '#cdeee0'
    c.fillRect(0, WALL_H - 38, VIEW_W, 38)
    c.fillStyle = '#b9e2d2'
    c.fillRect(0, WALL_H - 38, VIEW_W, 5)
    if (wcStart < VIEW_W) {
      c.fillStyle = '#bfe5f7'
      c.fillRect(Math.max(0, wcStart), WALL_H - 38, VIEW_W, 38)
    }
    // sàn gỗ
    const fg = c.createLinearGradient(0, WALL_H, 0, VIEW_H)
    fg.addColorStop(0, '#f2d9b4')
    fg.addColorStop(1, '#f8e6c8')
    c.fillStyle = fg
    c.fillRect(0, WALL_H, VIEW_W, VIEW_H - WALL_H)
    c.strokeStyle = 'rgba(160,110,70,.14)'
    c.lineWidth = 1.5
    for (let y = WALL_H + 22; y < VIEW_H; y += 26) {
      c.beginPath()
      c.moveTo(0, y)
      c.lineTo(VIEW_W, y)
      c.stroke()
    }
    const off = cam % 120
    for (let r = 0, y = WALL_H; y < VIEW_H; y += 26, r++) {
      for (let x = -off - (r % 2) * 60; x < VIEW_W; x += 120) {
        c.beginPath()
        c.moveTo(x, y)
        c.lineTo(x, y + 26)
        c.stroke()
      }
    }
    // thảm lối đi
    c.save()
    c.translate(-cam, 0)
    rr(c, 80, 352, WORLD_W - 260, 74, 14, 'rgba(216,208,245,.45)')
    c.restore()
  }

  private drawWallItems(c: Ctx, t: number) {
    // cửa sổ
    for (const x of [60, 330, 760, 1010, 1260]) drawWindow(c, x, 54, 100, 92, t)
    // đồ treo tường
    const mins = 8 * 60 + Math.floor(this.gameClock)
    drawWallClock(c, 235, 74, Math.floor(mins / 60), mins % 60)
    drawPoster(c, 520, 56, 0)
    drawPoster(c, 880, 62, 1)
    drawWhiteboard(c, 1130, 66)
    drawPoster(c, 1410, 60, 2)
    // bàn làm việc sát tường
    drawDesk(c, 130, 334, { mug: '#ffb3c1' })
    drawChair(c, 130, 352, '#ffb3c1')
    drawDesk(c, 300, 334, { mug: '#bde0fe', screen: '#e4ffe8' })
    drawChair(c, 300, 352, '#9ad0f5')
    drawDesk(c, 990, 322, { mug: '#caffbf', screen: '#fff1c9' })
    drawPlant(c, 40, 336, t, true)
    drawWaterCooler(c, 440, 334, t)
    drawCoffeeMachine(c, COFFEE_X, 334, t, this.phase === 'morning')
    drawPlant(c, 1450, 336, t, true)
    drawPlant(c, 1250, 332, t)
    // cửa WC
    drawWcDoor(c, DOOR_X, 322, this.doorOpen, t)
    // mũi tên dưới sàn dẫn tới WC
    if (this.phase === 'rush') {
      for (let i = 0; i < 4; i++) {
        const x = 1440 + i * 34 + ((t * 30) % 34)
        c.globalAlpha = 0.5
        text(c, '›', x, 436, 26, '#ff7b8a', 'center', 800)
      }
      c.globalAlpha = 1
    }
  }

  private drawHud(c: Ctx) {
    // đồng hồ 08:xx
    const mins = 8 * 60 + Math.floor(this.gameClock)
    const hh = String(Math.floor(mins / 60)).padStart(2, '0')
    const mm = String(mins % 60).padStart(2, '0')
    rr(c, 12, 12, 104, 38, 19, 'rgba(255,255,255,.9)', 'rgba(255,154,162,.9)', 3)
    text(c, `${hh}:${mm}`, 64, 32, 24, '#4a3552', 'center', 800)

    // mục tiêu
    const goal =
      this.phase === 'morning' ? 'Đến quầy pha chế và uống ly cà phê'
        : this.phase === 'drinking' ? 'Ực ực ực…'
          : this.phase === 'rush' ? 'CHẠY TỚI NHÀ VỆ SINH!'
            : 'Vào WC…'
    c.font = `700 17px ${FONT}`
    const w = c.measureText(goal).width + 34
    rr(c, VIEW_W / 2 - w / 2 + 20, 12, w, 38, 19, this.phase === 'rush' ? '#ff7b8a' : 'rgba(255,255,255,.9)', this.phase === 'rush' ? '#ffffff' : 'rgba(150,120,170,.4)', 3)
    text(c, goal, VIEW_W / 2 + 20, 32, 17, this.phase === 'rush' ? '#ffffff' : '#4a3552')

    // thanh tiến độ tới WC
    const bx = 130
    const bw = VIEW_W - 130 - 150
    const by = 66
    rr(c, bx - 10, by - 8, bw + 58, 24, 12, 'rgba(255,255,255,.7)')
    rr(c, bx, by, bw, 8, 4, 'rgba(200,180,210,.6)')
    const pr = clamp((this.p.x - START.x) / (DOOR_X - START.x), 0, 1)
    rr(c, bx, by, Math.max(8, bw * pr), 8, 4, '#ff9aa2')
    ell(c, bx + bw * pr, by + 4, 7, 7, '#ffffff', '#ff7b8a', 2.5)
    text(c, 'WC', bx + bw + 16, by + 4, 12, '#4a8f7c', 'left', 800)
  }
}

function K_SHIFT(keys: Set<string>) {
  return keys.has('shift')
}
