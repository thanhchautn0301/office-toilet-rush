/** Toàn bộ đồ họa được vẽ bằng code (Canvas 2D) – nhân vật & bối cảnh gốc, không dùng tài nguyên bên ngoài. */
export type Ctx = CanvasRenderingContext2D

export const FONT = `"Baloo 2", system-ui, -apple-system, "Segoe UI", sans-serif`

// ---------- helpers ----------
export function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lw = 2) {
  c.beginPath()
  c.roundRect(x, y, w, h, r)
  if (fill) {
    c.fillStyle = fill
    c.fill()
  }
  if (stroke) {
    c.strokeStyle = stroke
    c.lineWidth = lw
    c.stroke()
  }
}

export function ell(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke?: string, lw = 2) {
  c.beginPath()
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  c.fillStyle = fill
  c.fill()
  if (stroke) {
    c.strokeStyle = stroke
    c.lineWidth = lw
    c.stroke()
  }
}

function line(c: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, w: number) {
  c.beginPath()
  c.moveTo(x1, y1)
  c.lineTo(x2, y2)
  c.strokeStyle = color
  c.lineWidth = w
  c.lineCap = 'round'
  c.stroke()
}

export function text(c: Ctx, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center', weight = 700) {
  c.font = `${weight} ${size}px ${FONT}`
  c.textAlign = align
  c.textBaseline = 'middle'
  c.fillStyle = color
  c.fillText(s, x, y)
}

export function bubble(c: Ctx, s: string, x: number, y: number, size = 15, bg = '#ffffff', fg = '#4a3552') {
  c.font = `700 ${size}px ${FONT}`
  const w = c.measureText(s).width + 22
  const h = size + 14
  c.save()
  c.shadowColor = 'rgba(80,50,90,.18)'
  c.shadowBlur = 8
  c.shadowOffsetY = 3
  rr(c, x - w / 2, y - h, w, h, h / 2, bg)
  c.restore()
  c.beginPath()
  c.moveTo(x - 6, y - 1)
  c.lineTo(x, y + 7)
  c.lineTo(x + 6, y - 1)
  c.fillStyle = bg
  c.fill()
  text(c, s, x, y - h / 2 + 1, size, fg)
}

// ---------- người ----------
export type PoseState = 'idle' | 'walking' | 'running' | 'urgent' | 'bathroom' | 'happy' | 'drinking' | 'stunned'

export interface Look {
  skin: string
  hair: string
  shirt: string
  pants: string
  shoes: string
  tie?: string
  hairStyle: 'short' | 'bun' | 'long' | 'curly'
  badge?: boolean
}

export const HERO: Look = {
  skin: '#ffd9bd',
  hair: '#5a3d37',
  shirt: '#fdfdff',
  pants: '#6f7fa8',
  shoes: '#7b5a4b',
  tie: '#ff8fa3',
  hairStyle: 'short',
  badge: true,
}

export const LOOKS: Look[] = [
  { skin: '#f6c9a8', hair: '#2f2a3a', shirt: '#b5e2d4', pants: '#8c8fa8', shoes: '#5c4a5a', hairStyle: 'long' },
  { skin: '#e8b48f', hair: '#d9a066', shirt: '#ffd6a5', pants: '#6a7a8e', shoes: '#4d4050', tie: '#7aa7ff', hairStyle: 'curly' },
  { skin: '#ffdcc4', hair: '#8a4b3a', shirt: '#cdb4f6', pants: '#556080', shoes: '#4a3a44', hairStyle: 'bun' },
]

export interface PersonOpts {
  x: number
  y: number
  state: PoseState
  t: number
  facing: 1 | -1
  look: Look
  scale?: number
}

const INK = '#3b2a3a'

export function drawPerson(c: Ctx, o: PersonOpts) {
  const { state, t, facing, look } = o
  const s = o.scale ?? 1
  const moving = state === 'walking' || state === 'running'
  const running = state === 'running'
  const ph = moving ? t * (running ? 15 : 9.5) : 0
  const amp = running ? 9 : 6
  const bob = moving ? Math.abs(Math.sin(ph)) * (running ? 3.6 : 2) : state === 'idle' ? Math.sin(t * 2.2) * 0.9 : 0
  const hop = state === 'happy' ? -Math.abs(Math.sin(t * 6)) * 11 : 0
  const shake = state === 'urgent' ? Math.sin(t * 40) * 1.4 : state === 'stunned' ? Math.sin(t * 30) * 2 : 0

  c.save()
  c.translate(o.x, o.y)
  c.scale(s, s)
  ell(c, 0, 0, 18 - (hop / 11) * 4, 5, 'rgba(70,45,90,.16)')
  c.translate(shake, hop)
  c.lineCap = 'round'
  c.lineJoin = 'round'

  const seated = state === 'bathroom'

  // chân
  for (const i of [-1, 1]) {
    if (seated) {
      // ngồi: đùi ra phía trước (nhìn từ trước → ngắn), cẳng chân thả xuống
      line(c, i * 8, -26, i * 11, -15, look.pants, 10)
      line(c, i * 11, -15, i * 11, -5, look.pants, 9)
      ell(c, i * 11 + 1, -2.5, 8, 4.5, look.shoes)
      continue
    }
    const lp = ph + (i > 0 ? 0 : Math.PI)
    let sw = moving ? Math.sin(lp) * amp : 0
    const lift = moving ? Math.max(0, Math.cos(lp)) * (running ? 5.5 : 3) : 0
    let base = i * 5.5
    if (state === 'urgent') {
      base = i * 3.2
      sw = Math.sin(t * 22 + (i > 0 ? 0 : 2)) * 1.6
    }
    const fx = base + sw * facing * 0.9
    line(c, i * 5, -24, fx, -5 - lift, look.pants, 9.5)
    ell(c, fx + facing * 2.5, -2.5 - lift, 8, 4.6, look.shoes)
  }

  // thân (xoay quanh hông)
  c.save()
  c.translate(0, seated ? -4 : 0)
  const lean = running ? 0.2 * facing : state === 'urgent' ? 0.13 * facing : state === 'stunned' ? -0.12 * facing : 0
  c.translate(0, -24 - bob)
  c.rotate(lean)
  c.translate(0, 24)

  // thân áo
  rr(c, -14, -52, 28, 30, 10, look.shirt, 'rgba(70,45,90,.14)', 1.5)
  rr(c, -14.5, -27, 29, 5, 2, 'rgba(60,50,80,.35)') // thắt lưng
  // cổ áo + cà vạt
  c.beginPath()
  c.moveTo(-6, -52)
  c.lineTo(0, -45)
  c.lineTo(6, -52)
  c.closePath()
  c.fillStyle = '#ffffff'
  c.fill()
  c.strokeStyle = 'rgba(70,45,90,.2)'
  c.lineWidth = 1
  c.stroke()
  if (look.tie) {
    c.beginPath()
    c.moveTo(-2.5, -46)
    c.lineTo(2.5, -46)
    c.lineTo(3.5, -33)
    c.lineTo(0, -29)
    c.lineTo(-3.5, -33)
    c.closePath()
    c.fillStyle = look.tie
    c.fill()
  }
  if (look.badge) {
    line(c, -5, -52, -1, -38, '#ff7b8a', 1.8)
    line(c, 5, -52, 1, -38, '#ff7b8a', 1.8)
    rr(c, -5.5, -38, 11, 13, 2.5, '#ffffff', '#6b8fd6', 1.4)
    rr(c, -5.5, -38, 11, 4, 2, '#6b8fd6')
    ell(c, 0, -30, 2.2, 2.2, '#ffc9a8')
  }

  // tay
  const armCol = look.shirt
  const arm = (i: number, hx: number, hy: number) => {
    const sx = i * 14
    const sy = -47
    line(c, sx, sy, hx, hy, 'rgba(70,45,90,.14)', 9.6)
    line(c, sx, sy, hx, hy, armCol, 8)
    ell(c, hx, hy, 4.6, 4.6, look.skin)
  }
  for (const i of [-1, 1]) {
    const ap = ph + (i > 0 ? Math.PI : 0)
    if (state === 'urgent') arm(i, i * 5, -34 + Math.sin(t * 25) * 0.6)
    else if (state === 'happy') arm(i, i * 20, -66 - Math.sin(t * 9 + i) * 4)
    else if (state === 'stunned') arm(i, i * 24, -56 + Math.sin(t * 20 + i) * 4)
    else if (seated) arm(i, i * 7, -37)
    else if (state === 'drinking' && i === facing) arm(i, facing * 9, -62 + Math.sin(t * 5) * 1.2)
    else if (running) arm(i, i * 12 + Math.sin(ap) * 7 * facing, -37 + Math.cos(ap) * 4)
    else {
      const sw = moving ? Math.sin(ap) * 8 * facing : Math.sin(t * 2.2 + i) * 0.8
      arm(i, i * 17 + sw * 0.2, -31 - Math.abs(sw) * 0.2 + (i === facing ? sw * 0 : 0))
    }
  }
  if (seated) {
    // điện thoại phát sáng
    rr(c, -6, -48, 12, 18, 3, '#4a4a6a')
    rr(c, -4.6, -46.6, 9.2, 14.8, 2, '#bfe9ff')
    line(c, -3, -43, 3, -43, '#ffffff', 1.4)
    line(c, -3, -39.5, 2, -39.5, '#ffffff', 1.4)
    ell(c, -6.5, -36.5, 4, 4, look.skin)
    ell(c, 6.5, -36.5, 4, 4, look.skin)
  }
  if (state === 'drinking') {
    const cx = facing * 12
    const cy = -66 + Math.sin(t * 5) * 1.2
    rr(c, cx - 5, cy - 6, 10, 11, 2.5, '#ffffff', '#c98f6b', 1.5)
    rr(c, cx - 4, cy - 5, 8, 4, 1.5, '#8a5a3c')
    c.beginPath()
    c.arc(cx + facing * 6, cy - 1, 3.2, -1.2, 1.2)
    c.strokeStyle = '#c98f6b'
    c.lineWidth = 1.6
    c.stroke()
  }

  // đầu
  c.save()
  c.translate(0, -73 + (state === 'urgent' ? 2 : 0))
  if (state === 'urgent') c.rotate(Math.sin(t * 9) * 0.04)
  drawHead(c, o)
  c.restore()

  c.restore()
  c.restore()
}

function drawHead(c: Ctx, o: PersonOpts) {
  const { state, t, facing, look } = o
  const { hair, skin } = look
  const hs = look.hairStyle

  // tóc phía sau
  c.fillStyle = hair
  if (hs === 'long') {
    rr(c, -22, -6, 44, 30, 14, hair)
  }
  if (hs === 'bun') ell(c, 0, -22, 8, 8, hair)
  if (hs === 'curly') {
    for (const [x, y, r] of [[-17, -8, 8], [17, -8, 8], [-9, -19, 9], [9, -19, 9], [0, -22, 9]]) ell(c, x, y, r, r, hair)
  }
  // tai
  ell(c, -19.5, 3, 4.5, 4.8, skin)
  ell(c, 19.5, 3, 4.5, 4.8, skin)
  // mặt
  ell(c, 0, 0, 20.5, 19.5, skin, 'rgba(120,70,70,.18)', 1.5)

  // tóc mái
  c.beginPath()
  c.arc(0, -1, 21.5, Math.PI, Math.PI * 2)
  c.quadraticCurveTo(facing * 7, -15, -21.5, -1)
  c.closePath()
  c.fillStyle = hair
  c.fill()
  // highlight tóc
  c.beginPath()
  c.arc(-facing * 4, -13, 11, Math.PI * 1.15, Math.PI * 1.55)
  c.strokeStyle = 'rgba(255,255,255,.28)'
  c.lineWidth = 3
  c.lineCap = 'round'
  c.stroke()

  // má hồng
  ell(c, -12.5, 8, 4.2, 2.8, 'rgba(255,130,150,.45)')
  ell(c, 12.5, 8, 4.2, 2.8, 'rgba(255,130,150,.45)')

  // mắt
  const ex = facing * 2
  const blink = state !== 'urgent' && state !== 'happy' && state !== 'stunned' && (t % 3.4) > 3.28
  const eye = (x: number) => {
    if (state === 'urgent') {
      // > <  (mắt nhăn)
      const d = x < 0 ? 1 : -1
      c.beginPath()
      c.moveTo(x - 4 * d, 0)
      c.lineTo(x + 3.5 * d, 3.5)
      c.moveTo(x - 4 * d, 7)
      c.lineTo(x + 3.5 * d, 3.5)
      c.strokeStyle = INK
      c.lineWidth = 2.2
      c.lineCap = 'round'
      c.stroke()
    } else if (state === 'happy') {
      c.beginPath()
      c.arc(x, 4.5, 4, Math.PI * 1.08, Math.PI * 1.92)
      c.strokeStyle = INK
      c.lineWidth = 2.4
      c.lineCap = 'round'
      c.stroke()
    } else if (state === 'stunned') {
      c.beginPath()
      for (let a = 0; a < 12; a += 0.4) c.lineTo(x + Math.cos(a + t * 6) * a * 0.45, 3 + Math.sin(a + t * 6) * a * 0.45)
      c.strokeStyle = INK
      c.lineWidth = 1.5
      c.stroke()
    } else if (state === 'bathroom') {
      // mắt nhìn xuống màn hình điện thoại, mí hơi sụp
      ell(c, x, 4.5, 3, 3, INK)
      ell(c, x + 0.8, 3.6, 1, 1, '#fff')
      c.beginPath()
      c.moveTo(x - 4.2, 3)
      c.lineTo(x + 4.2, 1.2)
      c.strokeStyle = skin
      c.lineWidth = 3.6
      c.stroke()
      c.beginPath()
      c.moveTo(x - 4, 2.1)
      c.lineTo(x + 4, 2.1)
      c.strokeStyle = 'rgba(70,40,60,.55)'
      c.lineWidth = 1.2
      c.stroke()
    } else if (blink) {
      line(c, x - 3.5, 4.5, x + 3.5, 4.5, INK, 2)
    } else {
      ell(c, x, 4.5, 3, 4.2, INK)
      ell(c, x + 1, 3, 1.15, 1.35, '#fff')
    }
  }
  eye(-7.5 + ex)
  eye(7.5 + ex)

  // lông mày
  const brow = (x: number, d: number) => {
    c.beginPath()
    if (state === 'urgent' || state === 'stunned' || state === 'running') {
      c.moveTo(x - 4 * d, -3)
      c.lineTo(x + 4 * d, -6.5)
    } else if (state === 'happy') {
      c.moveTo(x - 4, -6)
      c.quadraticCurveTo(x, -8.5, x + 4, -6)
    } else {
      c.moveTo(x - 4, -5)
      c.lineTo(x + 4, -5.4)
    }
    c.strokeStyle = hair
    c.lineWidth = 1.9
    c.lineCap = 'round'
    c.stroke()
  }
  brow(-7.5 + ex, 1)
  brow(7.5 + ex, -1)

  // miệng
  const mx = facing * 1.5
  c.strokeStyle = INK
  c.lineWidth = 2
  c.lineCap = 'round'
  if (state === 'happy') {
    c.beginPath()
    c.moveTo(mx - 6, 10)
    c.quadraticCurveTo(mx, 21, mx + 6, 10)
    c.closePath()
    c.fillStyle = '#7a2e45'
    c.fill()
    ell(c, mx, 15.5, 3.2, 1.8, '#ff9aa8')
  } else if (state === 'urgent') {
    c.beginPath()
    c.moveTo(mx - 6, 13)
    for (let i = 0; i <= 6; i++) c.lineTo(mx - 6 + i * 2, 13 + (i % 2 ? -2 : 1.6))
    c.stroke()
  } else if (state === 'running' || state === 'stunned') {
    ell(c, mx, 13, 3.2, 3.8, '#7a2e45')
  } else if (state === 'drinking') {
    ell(c, mx + facing * 3, 12.5, 2.2, 2.6, '#7a2e45')
  } else if (state === 'bathroom') {
    c.beginPath()
    c.moveTo(mx - 3, 12.5)
    c.quadraticCurveTo(mx, 14.5, mx + 3, 12.5)
    c.stroke()
  } else {
    c.beginPath()
    c.arc(mx, 9.5, 4.2, Math.PI * 0.15, Math.PI * 0.85)
    c.stroke()
  }

  // giọt mồ hôi
  if (state === 'urgent' || state === 'running') {
    const k = (t * 2.2) % 1
    const sx = 22 * facing
    const sy = -8 + k * 12
    c.save()
    c.globalAlpha = 1 - k * 0.6
    c.beginPath()
    c.moveTo(sx, sy - 5)
    c.quadraticCurveTo(sx + 4.5, sy + 1, sx, sy + 4)
    c.quadraticCurveTo(sx - 4.5, sy + 1, sx, sy - 5)
    c.fillStyle = '#8fd3ff'
    c.fill()
    c.restore()
  }
}

// ---------- bối cảnh văn phòng ----------
export function drawWindow(c: Ctx, x: number, y: number, w: number, h: number, t: number) {
  rr(c, x - 4, y - 4, w + 8, h + 8, 10, '#ffffff', 'rgba(120,90,140,.2)', 1.5)
  const g = c.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, '#bfe6ff')
  g.addColorStop(1, '#e8f7ff')
  c.beginPath()
  c.roundRect(x, y, w, h, 7)
  c.fillStyle = g
  c.fill()
  c.save()
  c.beginPath()
  c.roundRect(x, y, w, h, 7)
  c.clip()
  const drift = (t * 4 + x) % (w + 60)
  for (const [ox, oy, s] of [[0, 18, 1], [w * 0.55, 42, 0.75]] as const) {
    const cx = x + ((ox + drift) % (w + 60)) - 30
    ell(c, cx, y + oy, 20 * s, 8 * s, 'rgba(255,255,255,.95)')
    ell(c, cx + 12 * s, y + oy - 5 * s, 12 * s, 8 * s, 'rgba(255,255,255,.95)')
  }
  // sun
  ell(c, x + w - 18, y + 20, 11, 11, '#ffe9a8')
  c.restore()
  line(c, x + w / 2, y, x + w / 2, y + h, '#ffffff', 4)
  line(c, x, y + h / 2, x + w, y + h / 2, '#ffffff', 4)
  rr(c, x - 6, y + h + 2, w + 12, 7, 3, '#f1e3d3')
}

export function drawPlant(c: Ctx, x: number, baseY: number, t: number, big = false) {
  const k = big ? 1.25 : 1
  c.save()
  c.translate(x, baseY)
  c.scale(k, k)
  ell(c, 0, 0, 15, 4.5, 'rgba(70,45,90,.14)')
  const sway = Math.sin(t * 1.5 + x) * 1.5
  for (const [a, h, col] of [[-0.5, 30, '#8ed1a0'], [0.5, 32, '#79c590'], [0, 40, '#9adbb0'], [-0.9, 22, '#79c590'], [0.9, 24, '#8ed1a0']] as const) {
    c.save()
    c.translate(0, -16)
    c.rotate(a + sway * 0.02)
    ell(c, 0, -h / 2, 6.5, h / 2, col)
    line(c, 0, 0, 0, -h + 4, 'rgba(255,255,255,.35)', 1.3)
    c.restore()
  }
  c.beginPath()
  c.moveTo(-11, -17)
  c.lineTo(11, -17)
  c.lineTo(8.5, 0)
  c.lineTo(-8.5, 0)
  c.closePath()
  c.fillStyle = '#f4a582'
  c.fill()
  rr(c, -12.5, -20, 25, 5, 2.5, '#f7b698')
  c.restore()
}

export function drawChair(c: Ctx, x: number, baseY: number, color: string, tilt = 0) {
  c.save()
  c.translate(x, baseY)
  ell(c, 0, 0, 16, 4.5, 'rgba(70,45,90,.14)')
  line(c, 0, -3, 0, -12, '#8a8fa6', 3)
  for (const dx of [-10, 0, 10]) {
    line(c, 0, -3, dx, 0, '#8a8fa6', 2.4)
    ell(c, dx, 0.8, 2, 2, '#59607a')
  }
  rr(c, -13, -19, 26, 8, 4, color)
  c.save()
  c.translate(0, -19)
  c.rotate(tilt)
  rr(c, -11, -22, 22, 20, 7, color, 'rgba(70,45,90,.12)', 1.2)
  rr(c, -8, -19, 16, 6, 3, 'rgba(255,255,255,.3)')
  c.restore()
  c.restore()
}

export function drawBox(c: Ctx, x: number, baseY: number) {
  c.save()
  c.translate(x, baseY)
  ell(c, 0, 0, 20, 5, 'rgba(70,45,90,.14)')
  rr(c, -16, -22, 32, 22, 3, '#e8c49a', 'rgba(120,80,50,.25)', 1.5)
  rr(c, -4, -22, 8, 22, 0, 'rgba(255,255,255,.4)')
  rr(c, -16, -22, 32, 5, 2, '#f1d3ae')
  text(c, '↑', 0, -8, 11, '#9a6b3f')
  c.restore()
}

export function drawCart(c: Ctx, x: number, baseY: number) {
  c.save()
  c.translate(x, baseY)
  ell(c, 0, 0, 26, 5, 'rgba(70,45,90,.14)')
  for (const dx of [-17, 17]) ell(c, dx, -3, 3.5, 3.5, '#59607a')
  rr(c, -24, -30, 48, 5, 2.5, '#cfd6ea')
  rr(c, -24, -16, 48, 5, 2.5, '#cfd6ea')
  line(c, -22, -30, -22, -5, '#a9b2cf', 3)
  line(c, 22, -30, 22, -5, '#a9b2cf', 3)
  // cốc / giấy trên xe
  for (const [dx, col] of [[-14, '#ffd6a5'], [-4, '#ffffff'], [8, '#ffb3c1']] as const) {
    rr(c, dx - 4, -41, 8, 11, 2, col, 'rgba(120,80,50,.3)', 1)
  }
  rr(c, 14, -37, 12, 6, 1.5, '#ffffff', 'rgba(120,80,50,.25)', 1)
  rr(c, -20, -26, 40, 10, 2, '#fff4de')
  c.restore()
}

/** Bàn họp lớn (vật cản). baseY = mép dưới dấu chân. */
export function drawTable(c: Ctx, x: number, baseY: number, w: number, t: number) {
  c.save()
  c.translate(x, baseY)
  ell(c, 0, -2, w / 2 + 6, 8, 'rgba(70,45,90,.14)')
  for (const dx of [-w / 2 + 10, w / 2 - 10]) rr(c, dx - 4, -22, 8, 22, 2, '#cf9a6c')
  rr(c, -w / 2, -40, w, 18, 6, '#e8b98a', 'rgba(120,70,40,.25)', 1.5)
  rr(c, -w / 2, -40, w, 7, 5, '#f4cba0')
  // laptop + giấy + cốc
  rr(c, -50, -63, 26, 18, 3, '#6b7a99')
  rr(c, -48, -61, 22, 14, 2, '#d8f0ff')
  rr(c, -54, -47, 34, 5, 2, '#8c9ab8')
  rr(c, 8, -50, 20, 11, 1.5, '#ffffff', 'rgba(120,80,50,.25)', 1)
  line(c, 11, -46, 24, -46, '#b9c6e0', 1.2)
  line(c, 11, -43, 20, -43, '#b9c6e0', 1.2)
  rr(c, 40, -55, 9, 11, 2, '#ffb3c1')
  // bóng đèn cảm ứng nhấp nháy trên laptop
  ell(c, -37, -54, 3, 3, `rgba(120,200,255,${0.6 + Math.sin(t * 3) * 0.3})`)
  c.restore()
}

export function drawDesk(c: Ctx, x: number, baseY: number, opts: { mug?: string; screen?: string } = {}) {
  c.save()
  c.translate(x, baseY)
  rr(c, -56, -46, 112, 12, 5, '#f0c79c', 'rgba(120,70,40,.22)', 1.3)
  rr(c, -52, -34, 104, 34, 3, '#e3b183')
  rr(c, -46, -30, 40, 26, 3, '#d29c6e')
  rr(c, 4, -30, 44, 11, 3, '#d29c6e')
  rr(c, 4, -17, 44, 11, 3, '#d29c6e')
  for (const [sx, sy] of [[-26, -26], [26, -25], [26, -12]]) ell(c, sx, sy, 2, 2, '#f7e3c6')
  // màn hình
  rr(c, -22, -82, 44, 32, 5, '#5f6d92')
  rr(c, -19, -79, 38, 26, 3, opts.screen ?? '#d3f0ff')
  line(c, -14, -72, 8, -72, '#ffffff', 2)
  line(c, -14, -66, 14, -66, '#a9d9f5', 2)
  line(c, -14, -60, 2, -60, '#a9d9f5', 2)
  rr(c, -4, -50, 8, 5, 1, '#5f6d92')
  rr(c, -16, -48, 32, 4, 2, '#fdfdff', 'rgba(70,45,90,.18)', 1)
  if (opts.mug) {
    rr(c, 34, -58, 11, 12, 3, opts.mug)
    c.beginPath()
    c.arc(46, -52, 3.5, -1.3, 1.3)
    c.strokeStyle = opts.mug
    c.lineWidth = 1.8
    c.stroke()
  }
  c.restore()
}

export function drawWaterCooler(c: Ctx, x: number, baseY: number, t: number) {
  c.save()
  c.translate(x, baseY)
  ell(c, 0, 0, 17, 4.5, 'rgba(70,45,90,.14)')
  rr(c, -14, -46, 28, 46, 7, '#ffffff', 'rgba(70,45,90,.14)', 1.3)
  rr(c, -9, -92, 18, 48, 9, 'rgba(170,222,255,.85)', 'rgba(110,170,220,.6)', 1.5)
  ell(c, 0, -80, 3, 3, 'rgba(255,255,255,.8)')
  const by = -70 + Math.sin(t * 2) * 1.5
  ell(c, -3, by, 2, 2, 'rgba(255,255,255,.8)')
  ell(c, -6, -34, 3, 3, '#ff9aa2')
  ell(c, 6, -34, 3, 3, '#8fd3ff')
  rr(c, -9, -24, 18, 8, 3, '#dfe6f6')
  c.restore()
}

export function drawCoffeeMachine(c: Ctx, x: number, baseY: number, t: number, cup: boolean) {
  c.save()
  c.translate(x, baseY)
  // quầy
  rr(c, -50, -34, 100, 8, 3, '#f0c79c', 'rgba(120,70,40,.22)', 1.3)
  rr(c, -46, -26, 92, 26, 3, '#e3b183')
  // máy
  rr(c, -34, -88, 40, 54, 8, '#ff8fa3', 'rgba(120,40,70,.2)', 1.5)
  rr(c, -28, -80, 28, 14, 4, '#fff3f5')
  ell(c, -21, -73, 3, 3, '#7ad7a6')
  ell(c, -11, -73, 3, 3, '#ffd27f')
  rr(c, -26, -60, 24, 20, 4, '#c9506b')
  rr(c, -20, -52, 12, 8, 2, '#5d2a3a')
  // hơi nóng
  for (let i = 0; i < 2; i++) {
    const k = (t * 0.8 + i * 0.5) % 1
    c.beginPath()
    c.moveTo(-14 + i * 6, -90 - k * 14)
    c.quadraticCurveTo(-18 + i * 6, -96 - k * 14, -14 + i * 6, -102 - k * 14)
    c.strokeStyle = `rgba(255,255,255,${0.7 - k * 0.7})`
    c.lineWidth = 2
    c.stroke()
  }
  if (cup) {
    const bob = Math.sin(t * 3) * 1.5
    c.save()
    c.translate(26, -44 + bob)
    rr(c, -7, -14, 14, 15, 3.5, '#ffffff', '#c98f6b', 1.6)
    rr(c, -6, -13, 12, 5, 2, '#8a5a3c')
    c.beginPath()
    c.arc(8, -7, 4.5, -1.3, 1.3)
    c.strokeStyle = '#c98f6b'
    c.lineWidth = 2
    c.stroke()
    for (let i = 0; i < 2; i++) {
      const k = (t * 0.9 + i * 0.5) % 1
      c.beginPath()
      c.moveTo(-3 + i * 5, -17 - k * 8)
      c.quadraticCurveTo(-6 + i * 5, -21 - k * 8, -3 + i * 5, -25 - k * 8)
      c.strokeStyle = `rgba(150,110,90,${0.6 - k * 0.6})`
      c.lineWidth = 1.5
      c.stroke()
    }
    c.restore()
  }
  c.restore()
}

export function drawWallClock(c: Ctx, x: number, y: number, hh: number, mm: number) {
  ell(c, x, y, 21, 21, '#ffffff', '#ff9aa2', 4)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    line(c, x + Math.sin(a) * 15, y - Math.cos(a) * 15, x + Math.sin(a) * 17.5, y - Math.cos(a) * 17.5, '#b9a8c8', 1.6)
  }
  const ma = (mm / 60) * Math.PI * 2
  const ha = (((hh % 12) + mm / 60) / 12) * Math.PI * 2
  line(c, x, y, x + Math.sin(ha) * 9, y - Math.cos(ha) * 9, '#4a3552', 3)
  line(c, x, y, x + Math.sin(ma) * 14, y - Math.cos(ma) * 14, '#4a3552', 2)
  ell(c, x, y, 2, 2, '#ff7b8a')
}

export function drawPoster(c: Ctx, x: number, y: number, kind: number) {
  rr(c, x, y, 46, 58, 4, '#ffffff', 'rgba(120,90,140,.25)', 1.5)
  const cols = [['#ffd6a5', '#ff9aa2'], ['#bde0fe', '#a2d2ff'], ['#caffbf', '#9bf6a0']][kind % 3]
  rr(c, x + 5, y + 5, 36, 30, 3, cols[0])
  ell(c, x + 23, y + 20, 9, 9, cols[1])
  line(c, x + 7, y + 43, x + 39, y + 43, '#d9cde6', 3)
  line(c, x + 7, y + 50, x + 28, y + 50, '#d9cde6', 3)
}

export function drawWhiteboard(c: Ctx, x: number, y: number) {
  rr(c, x - 52, y, 104, 66, 6, '#ffffff', '#c9bfd6', 3)
  line(c, x - 40, y + 16, x - 8, y + 16, '#ff9aa2', 2.5)
  line(c, x - 40, y + 28, x + 20, y + 28, '#8fd3ff', 2.5)
  line(c, x - 40, y + 40, x + 4, y + 40, '#9adbb0', 2.5)
  c.beginPath()
  c.moveTo(x + 14, y + 52)
  c.lineTo(x + 24, y + 38)
  c.lineTo(x + 32, y + 48)
  c.lineTo(x + 42, y + 30)
  c.strokeStyle = '#ffb454'
  c.lineWidth = 2.5
  c.stroke()
  rr(c, x - 24, y + 66, 48, 4, 2, '#c9bfd6')
}

export function drawWcDoor(c: Ctx, x: number, y: number, open: number, t: number) {
  // khung cửa; y là nền sàn của cửa
  rr(c, x - 38, y - 140, 76, 140, 8, '#7fc8b2')
  rr(c, x - 31, y - 133, 62, 133, 5, '#2f4a52')
  // cánh cửa mở dần (co theo chiều ngang)
  const w = 62 * (1 - open * 0.78)
  rr(c, x - 31, y - 133, w, 133, 4, '#a8e6cf', 'rgba(40,90,80,.25)', 1.5)
  rr(c, x - 24, y - 118, Math.max(0, w - 14), 44, 4, 'rgba(255,255,255,.28)')
  if (open < 0.5) ell(c, x + w - 38, y - 62, 3.2, 3.2, '#ffd27f')
  // biển WC
  const glow = 0.6 + Math.sin(t * 4) * 0.4
  c.save()
  c.shadowColor = `rgba(255,255,255,${glow})`
  c.shadowBlur = 14
  rr(c, x - 30, y - 176, 60, 30, 8, '#6aa8ff', '#ffffff', 3)
  c.restore()
  text(c, 'WC', x, y - 160, 22, '#ffffff', 'center', 800)
  // mũi tên chỉ dẫn nảy
  const bounce = Math.sin(t * 6) * 4
  text(c, '▶', x - 64 + bounce, y - 160, 18, '#ff7b8a')
}

// ---------- bối cảnh nhà vệ sinh ----------
export function drawBathroomScene(c: Ctx, w: number, h: number, t: number, look: Look) {
  // tường gạch
  c.fillStyle = '#d9f3ea'
  c.fillRect(0, 0, w, h)
  c.strokeStyle = 'rgba(255,255,255,.75)'
  c.lineWidth = 2
  for (let x = 0; x <= w; x += 50) line(c, x, 0, x, h * 0.72, 'rgba(255,255,255,.75)', 2)
  for (let y = 0; y <= h * 0.72; y += 50) line(c, 0, y, w, y, 'rgba(255,255,255,.75)', 2)
  // sàn caro
  const fy = h * 0.72
  for (let y = fy, r = 0; y < h; y += 34, r++) {
    for (let x = 0, i = 0; x < w; x += 34, i++) {
      c.fillStyle = (i + r) % 2 ? '#f5efe6' : '#e8dfd2'
      c.fillRect(x, y, 34, 34)
    }
  }
  c.fillStyle = 'rgba(255,255,255,.0)'
  // cửa sổ nhỏ
  drawWindow(c, w * 0.12, h * 0.1, 90, 76, t)
  // cuộn giấy
  rr(c, w * 0.8, h * 0.28, 30, 34, 8, '#ffffff', 'rgba(70,45,90,.15)', 1.5)
  ell(c, w * 0.8 + 15, h * 0.28 + 17, 6, 6, '#cfe7f5')
  rr(c, w * 0.8 + 20, h * 0.28 + 24, 11, 22 + Math.sin(t * 1.4) * 2, 2, '#ffffff', 'rgba(70,45,90,.12)', 1)
  // vách ngăn hai bên
  rr(c, -20, h * 0.04, w * 0.07 + 20, h * 0.9, 8, '#ffc9d4')
  rr(c, w * 0.93, h * 0.04, w * 0.07 + 20, h * 0.9, 8, '#ffc9d4')
  // bồn cầu
  const cx = w / 2
  const by = h * 0.86
  rr(c, cx - 38, by - 150, 76, 62, 14, '#ffffff', 'rgba(70,45,90,.18)', 2)
  rr(c, cx - 30, by - 142, 60, 12, 6, '#e7eef7')
  ell(c, cx, by - 22, 52, 14, 'rgba(70,45,90,.12)')
  rr(c, cx - 44, by - 62, 88, 26, 12, '#ffffff', 'rgba(70,45,90,.18)', 2)
  rr(c, cx - 22, by - 38, 44, 36, 8, '#f3f7fb', 'rgba(70,45,90,.12)', 1.5)
  // nhân vật ngồi
  drawPerson(c, { x: cx, y: by - 30, state: 'bathroom', t, facing: 1, look, scale: 2.1 })
  // vòng quanh: nốt nhạc / hơi nước bay lên
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.35 + i / 3) % 1
    c.save()
    c.globalAlpha = Math.sin(k * Math.PI)
    text(c, ['♪', '♫', '…'][i], cx + 70 + Math.sin(k * 6 + i) * 14 + i * 14, by - 150 - k * 70, 22, '#8d6fb3')
    c.restore()
  }
  // giọt nước
  const dk = (t * 0.7) % 1
  ell(c, w * 0.2, h * 0.72 + dk * 60, 2, 3.5, 'rgba(130,200,240,.8)')
}
