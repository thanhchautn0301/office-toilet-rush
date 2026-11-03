import { useCallback, useEffect, useState } from 'react'
import { finishSession, getActive, startSession, subscribe, type ActiveSession, type SessionRecord } from './lib/storage'
import MainMenu from './screens/MainMenu'
import OfficeScreen from './screens/OfficeScreen'
import BathroomScreen from './screens/BathroomScreen'
import CompleteScreen from './screens/CompleteScreen'
import StatsScreen from './screens/StatsScreen'
import LeaderboardScreen from './screens/LeaderboardScreen'

type Screen = 'menu' | 'office' | 'bathroom' | 'complete' | 'stats' | 'leaderboard'

export default function App() {
  // Nếu mở lại game khi còn phiên chưa kết thúc → vào thẳng phòng vệ sinh (khôi phục trạng thái).
  const [active, setActive] = useState<ActiveSession | null>(() => getActive())
  const [screen, setScreen] = useState<Screen>(() => (getActive() ? 'bathroom' : 'menu'))
  const [result, setResult] = useState<SessionRecord | null>(null)

  // Đồng bộ nếu tab khác bắt đầu/kết thúc phiên.
  useEffect(
    () =>
      subscribe(() => {
        const a = getActive()
        setActive(a)
        setScreen((s) => (a && s !== 'bathroom' ? 'bathroom' : !a && s === 'bathroom' ? 'menu' : s))
      }),
    [],
  )

  const enterToilet = useCallback(() => {
    // startSession không tạo phiên mới nếu phiên cũ chưa hoàn thành.
    setActive(startSession())
    setScreen('bathroom')
  }, [])

  const finish = useCallback(() => {
    const rec = finishSession()
    setActive(null)
    if (rec) {
      setResult(rec)
      setScreen('complete')
    } else {
      setScreen('menu')
    }
  }, [])

  return (
    <div key={screen} className="screen-in h-full">
      {screen === 'menu' && (
        <MainMenu
          active={!!active}
          onPlay={() => setScreen('office')}
          onResume={() => setScreen('bathroom')}
          onStats={() => setScreen('stats')}
          onLeaderboard={() => setScreen('leaderboard')}
        />
      )}
      {screen === 'office' && <OfficeScreen onEnter={enterToilet} onExit={() => setScreen('menu')} />}
      {screen === 'bathroom' && active && <BathroomScreen session={active} onFinish={finish} />}
      {screen === 'complete' && result && (
        <CompleteScreen record={result} onAgain={() => setScreen('office')} onStats={() => setScreen('stats')} onMenu={() => setScreen('menu')} />
      )}
      {screen === 'stats' && <StatsScreen onBack={() => setScreen('menu')} />}
      {screen === 'leaderboard' && <LeaderboardScreen onBack={() => setScreen('menu')} />}
    </div>
  )
}
