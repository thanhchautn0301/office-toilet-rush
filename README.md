# Office Toilet Rush 🚽☕

Web game giải trí cho dân văn phòng (phong cách 2D cozy). 08:00 sáng, một ly cà phê, một cái bụng biểu tình —
chạy tới WC, rồi đồng hồ chỉ dừng khi bạn bấm **“ĐÃ VỆ SINH XONG”**. Đây là game, không phải ứng dụng giám sát.

## Cài đặt & chạy

Yêu cầu: Node.js ≥ 18.

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # build production vào dist/
npm run preview    # chạy thử bản build
npm test           # unit test (lưu trữ, đồng hồ, danh hiệu, level)
```

## Cách chơi

| Giai đoạn | Làm gì |
|---|---|
| 1. Morning at Office | Đi tới quầy pha chế, nhấn **E** / **Space** (hoặc nút ✋) để uống cà phê |
| 2. Toilet Rush | Chạy tới cửa WC ở cuối văn phòng, né ghế/bàn/đồng nghiệp, nhấn **E** để vào |
| 3. Bathroom Session | Đồng hồ lớn chạy theo thời gian thực. Chỉ kết thúc khi bạn bấm **ĐÃ VỆ SINH XONG** |
| 4. Mission Complete | Xem thời gian, danh hiệu; lịch sử được lưu; xem trang Thống kê |

Điều khiển: `←↑↓→` hoặc `WASD` di chuyển, `Shift` đi nhanh, `E`/`Space`/`Enter` tương tác. Trên điện thoại có D-pad và nút ✋.

Danh hiệu: <3 phút **Tốc chiến** · 3–10 **Nhân viên bình thường** · 10–20 **Chuyên gia thư giãn** · 20–30 **Trưởng phòng WC** · >30 **Giám đốc chi nhánh**.

## Đồng hồ & dữ liệu (yêu cầu kỹ thuật quan trọng)

- Thời gian = `Date.now()` lúc kết thúc − `Date.now()` lúc vào WC. `setInterval` chỉ dùng để **vẽ lại** số hiển thị
  (`src/lib/useElapsed.ts`), nên chuyển tab, khóa màn hình hay reload không làm lệch.
- Ngay khi vào WC, phiên `active {id, startedAt}` được ghi vào LocalStorage (`src/lib/storage.ts`).
  Mở lại game khi còn phiên chưa kết thúc → vào thẳng màn hình WC với đồng hồ đúng.
- Không thể tạo phiên mới khi phiên cũ chưa hoàn thành (`startSession` trả về phiên đang chạy, kể cả khi mở nhiều tab).
- Không có timeout tự kết thúc. Kết thúc phiên là idempotent (bấm hai lần / hai tab chỉ ghi một bản ghi).
- Mỗi phiên lưu: id, ngày, bắt đầu, kết thúc, tổng thời gian, danh hiệu. Key: `office-toilet-rush:v1`.

## Cấu trúc

```
src/
  App.tsx                 điều hướng màn hình + khôi phục phiên
  screens/                MainMenu, OfficeScreen (Phase 1–2), BathroomScreen (Phase 3),
                          CompleteScreen, StatsScreen, LeaderboardScreen (placeholder)
  components/             TouchControls, SoundToggle, Person
  game/
    level.ts              bố cục văn phòng, vật cản, đồng nghiệp (dữ liệu thuần)
    office.ts             engine gameplay Canvas 2D (di chuyển, va chạm, camera, phase)
    draw.ts               nhân vật (6 trạng thái animation) + bối cảnh, vẽ hoàn toàn bằng code
    audio.ts              âm thanh tổng hợp bằng WebAudio (có nút tắt/bật)
  lib/                    storage, useElapsed, titles, format (+ test)
e2e/check.mjs             kiểm thử end-to-end bằng Playwright
```

Quyết định kỹ thuật: dùng Canvas 2D tự viết thay vì Phaser vì gameplay đủ đơn giản (không over-engineering);
toàn bộ đồ họa là nhân vật/bối cảnh gốc, không dùng tài nguyên của game nào khác.

## Kiểm thử end-to-end

```bash
npm i -D playwright && npx playwright install chromium
npm run build && npm run preview &       # cổng 4173
node e2e/check.mjs http://localhost:4173 ./shots
```
Script kiểm tra: gameplay 4 phase, lưu phiên ngay khi vào WC, reload khôi phục đúng, "ngủ" 12 phút 35 giây,
chuyển tab, mở tab thứ hai, không tạo phiên trùng, kết thúc & lịch sử, thống kê, giao diện mobile, không có lỗi console.
(Dùng `?debug=1` để lộ `window.__otr` phục vụ test dịch chuyển nhân vật.)

## Hướng phát triển
Tùy chỉnh tóc/màu trang phục (đã tách `Look` trong `draw.ts`), bảng xếp hạng online, thêm màn/đồng nghiệp.
