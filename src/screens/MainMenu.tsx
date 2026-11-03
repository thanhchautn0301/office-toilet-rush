import Person from '../components/Person'
import SoundToggle from '../components/SoundToggle'
import { sfx } from '../game/audio'

interface Props {
  active: boolean
  onPlay: () => void
  onResume: () => void
  onStats: () => void
  onLeaderboard: () => void
}

export default function MainMenu({ active, onPlay, onResume, onStats, onLeaderboard }: Props) {
  return (
    <main className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center gap-5 px-5 py-6 text-center">
      <div className="absolute right-4 top-4">
        <SoundToggle />
      </div>

      <div className="pop">
        <p className="mb-1 inline-block rounded-full bg-white/80 px-4 py-1 text-sm font-bold text-rose">08:00 · Sáng thứ Hai</p>
        <h1 className="text-5xl font-extrabold leading-none tracking-tight text-ink sm:text-7xl">
          Office <span className="text-rose">Toilet</span> Rush
        </h1>
        <p className="mx-auto mt-3 max-w-md text-lg font-medium opacity-80">
          Một ly cà phê, một cái bụng biểu tình và cánh cửa WC.
        </p>
      </div>

      <div className="floaty -my-2">
        <Person state={active ? 'bathroom' : 'urgent'} size={210} />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        {active ? (
          <>
            <button className="btn btn-big btn-mint pulse" onClick={() => { sfx.unlock(); sfx.click(); onResume() }}>
              🚽 Quay lại phiên đang chạy
            </button>
            <p className="-mt-1 text-sm font-medium opacity-70">Bạn đang có một phiên chưa hoàn thành. Hãy kết thúc nó trước khi chơi tiếp.</p>
          </>
        ) : (
          <button className="btn btn-big" onClick={() => { sfx.unlock(); sfx.click(); onPlay() }}>
            ☕ Bắt đầu
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button className="btn btn-sky whitespace-nowrap !px-3 !text-lg" onClick={() => { sfx.click(); onStats() }}>📊 Thống kê</button>
          <button className="btn btn-ghost whitespace-nowrap !px-3 !text-lg" onClick={() => { sfx.click(); onLeaderboard() }}>🏆 Xếp hạng</button>
        </div>
      </div>

      <p className="max-w-md text-sm font-medium opacity-70">
        Điều khiển: <b>↑ ↓ ← → / WASD</b> để di chuyển · <b>E / Space</b> để tương tác · trên điện thoại dùng nút trên màn hình.
        <br />
        Đồng hồ chỉ dừng khi bạn bấm <b>“ĐÃ VỆ SINH XONG”</b>.
      </p>
    </main>
  )
}
