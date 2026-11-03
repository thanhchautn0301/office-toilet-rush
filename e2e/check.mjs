// Kiểm thử end-to-end bằng Playwright.  Chạy: node e2e/check.mjs [url] [thư mục ảnh]
import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
// Cần: npm i -D playwright && npx playwright install chromium   (hoặc playwright cài global)
let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  ;({ chromium } = createRequire(execSync('npm root -g').toString().trim() + '/')('playwright'))
}

const URL = process.argv[2] ?? 'http://localhost:4173'
const OUT = process.argv[3] ?? '.'
const KEY = 'office-toilet-rush:v1'
const log = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) process.exitCode = 1 }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

await page.goto(URL + '/?debug=1')
await page.screenshot({ path: `${OUT}/1-menu.png` })
await page.getByText('Bắt đầu').click()
await page.waitForFunction(() => window.__otr)
await sleep(600)
await page.screenshot({ path: `${OUT}/2-office.png` })

// Phase 1: đi tới máy pha cà phê và uống
await page.evaluate(() => window.__otr.debugTeleport(560, 395))
await sleep(300)
await page.screenshot({ path: `${OUT}/3-near-coffee.png` })
await page.keyboard.press('e')
await sleep(1900)
await page.screenshot({ path: `${OUT}/4-urgent.png` })
const rushed = await page.waitForFunction(() => window.__otr.debugState().phase === 'rush', null, { timeout: 8000 }).then(() => true, () => false)
log(rushed, 'sau khi uống cà phê → phase rush')

// Phase 2: chạy thật bằng phím mũi tên một đoạn, kiểm tra di chuyển
const x0 = await page.evaluate(() => window.__otr.debugState().x)
await page.keyboard.down('ArrowRight')
await sleep(700)
await page.keyboard.up('ArrowRight')
const x1 = await page.evaluate(() => window.__otr.debugState().x)
log(x1 > x0 + 40, `di chuyển bằng phím (x ${Math.round(x0)} → ${Math.round(x1)})`)
await page.screenshot({ path: `${OUT}/5-rush.png` })

// Va chạm đồng nghiệp: đặt ngay trên một walker
await page.evaluate(() => window.__otr.debugTeleport(850, 380))
let bumped = false
for (let i = 0; i < 40 && !bumped; i++) {
  await sleep(250)
  bumped = (await page.evaluate(() => window.__otr.debugState().bumps)) >= 1
}
await sleep(150)
await page.screenshot({ path: `${OUT}/6-bump.png` })
log(bumped, 'va chạm đồng nghiệp được ghi nhận (đứng trên lối đi của đồng nghiệp)')

// Không vào WC khi còn xa cửa
await page.evaluate(() => window.__otr.debugTeleport(900, 400))
await page.keyboard.press('e')
await sleep(300)
log((await page.evaluate(() => window.__otr.debugState().phase)) === 'rush', 'xa cửa WC bấm E không vào được')
log((await page.evaluate((k) => localStorage.getItem(k), KEY)) === null, 'chưa có phiên nào trước khi vào WC')

// Tới cửa → vào WC
await page.evaluate(() => window.__otr.debugTeleport(1570, 400))
await sleep(300)
await page.screenshot({ path: `${OUT}/7-door.png` })
await page.keyboard.press('e')
await page.waitForSelector('[data-testid=timer]', { timeout: 5000 })
const t0 = Date.now()
const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY)
log(!!stored?.active?.startedAt && Math.abs(stored.active.startedAt - t0) < 3000, 'phiên được lưu ngay khi vào WC (startedAt = Date.now())')
await sleep(2200)
await page.screenshot({ path: `${OUT}/8-bathroom.png` })

// Reload → phải khôi phục đúng phiên, đồng hồ không reset
const before = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).active, KEY)
await page.reload()
await page.waitForSelector('[data-testid=timer]')
const after = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).active, KEY)
log(before.id === after.id && before.startedAt === after.startedAt, 'reload: khôi phục đúng phiên (cùng id & startedAt)')
const shown = await page.textContent('[data-testid=timer]')
log(shown !== '00:00' && shown !== '00:01', `reload: đồng hồ tiếp tục (hiển thị ${shown}), không về 00:00`)

// Giả lập "ngủ" 12 phút 35 giây (tab nền/khóa màn hình): lùi startedAt rồi phát visibilitychange
await page.evaluate(([k, ms]) => {
  const s = JSON.parse(localStorage.getItem(k))
  s.active.startedAt -= ms
  localStorage.setItem(k, JSON.stringify(s))
}, [KEY, 12 * 60_000 + 35_000])
await page.reload()
await page.waitForSelector('[data-testid=timer]')
await sleep(400)
const big = await page.textContent('[data-testid=timer]')
log(/^12:3[5-9]$/.test(big), `đồng hồ sau 12m35s "ngủ": ${big}`)
log((await page.textContent('[data-testid=live-title]')).includes('Chuyên gia thư giãn'), 'danh hiệu tạm thời đúng theo thời gian thực')

// Tab nền bị throttle: mở tab khác, đợi, quay lại → đồng hồ vẫn khớp
const other = await ctx.newPage()
await other.goto('about:blank')
await other.bringToFront()
await sleep(2500)
await page.bringToFront()
await sleep(500)
const afterBg = await page.textContent('[data-testid=timer]')
log(/^12:(3[7-9]|4\d)$/.test(afterBg), `chuyển tab 2.5 giây: đồng hồ ${afterBg} (không mất giây)`)
await other.close()

// Mở tab thứ hai khi phiên đang chạy → vào thẳng phiên cũ, không tạo phiên mới
const p2 = await ctx.newPage()
await p2.goto(URL)
await p2.waitForSelector('[data-testid=timer]')
const ids = await p2.evaluate((k) => JSON.parse(localStorage.getItem(k)).active.id, KEY)
log(ids === after.id, 'tab thứ hai: dùng lại phiên đang chạy, không tạo phiên mới')
await p2.close()

// Không tự kết thúc: phiên vẫn còn sau vài giây
log((await page.evaluate((k) => !!JSON.parse(localStorage.getItem(k)).active, KEY)), 'phiên không tự kết thúc')
await page.screenshot({ path: `${OUT}/9-bathroom-12m.png` })

// Kết thúc
await page.getByText('ĐÃ VỆ SINH XONG').click()
await page.waitForSelector('[data-testid=result-duration]')
const dur = await page.textContent('[data-testid=result-duration]')
const ttl = await page.textContent('[data-testid=result-title]')
log(/^12 phút (3[5-9]|[45]\d) giây$/.test(dur), `màn kết quả: ${dur}`)
log(ttl.includes('Chuyên gia thư giãn'), `danh hiệu: ${ttl}`)
await sleep(600)
await page.screenshot({ path: `${OUT}/10-complete.png` })
const st = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY)
log(st.active === null && st.history.length === 1 && st.history[0].durationMs >= 755000, 'lịch sử đã lưu, phiên active đã xoá')

// Reload sau khi xong → về menu (không còn phiên)
await page.reload()
await page.getByText('Bắt đầu').waitFor()
log(true, 'reload sau khi hoàn thành → về menu')

// Seed thêm lịch sử rồi xem thống kê
await page.evaluate((k) => {
  const s = JSON.parse(localStorage.getItem(k))
  const now = Date.now(), D = 86400000
  const mk = (daysAgo, mins, i) => {
    const startedAt = now - daysAgo * D - i * 3600000
    const durationMs = mins * 60000
    const d = new Date(startedAt)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { id: 'seed' + daysAgo + i, date, startedAt, endedAt: startedAt + durationMs, durationMs, title: 'x' }
  }
  s.history.push(mk(1, 2, 0), mk(1, 8, 1), mk(2, 25, 0), mk(3, 35, 0), mk(5, 4, 0))
  localStorage.setItem(k, JSON.stringify(s))
}, KEY)
await page.reload()
await page.getByText('Thống kê').click()
await page.getByText('Thống kê cá nhân').waitFor()
await sleep(400)
await page.screenshot({ path: `${OUT}/11-stats.png` })
log((await page.textContent('body')).includes('Tổng số lần đi WC'), 'trang thống kê hiển thị')

// Mobile viewport
const m = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
const mp = await m.newPage()
await mp.goto(URL)
await mp.screenshot({ path: `${OUT}/12-mobile-menu.png` })
await mp.getByText('Bắt đầu').click()
await sleep(900)
await mp.screenshot({ path: `${OUT}/13-mobile-office.png` })
const hasPad = await mp.locator('button[aria-label="Tương tác"]').isVisible()
log(hasPad, 'mobile: hiện nút điều khiển cảm ứng')
await mp.evaluate(() => localStorage.setItem('office-toilet-rush:v1', JSON.stringify({ version: 1, history: [], active: { id: 'm1', startedAt: Date.now() - 125000 } })))
await mp.reload()
await mp.waitForSelector('[data-testid=timer]')
await sleep(300)
await mp.screenshot({ path: `${OUT}/14-mobile-bathroom.png` })

log(errors.length === 0, `không có lỗi console (${errors.length}) ${errors.slice(0, 3).join(' | ')}`)
await browser.close()
