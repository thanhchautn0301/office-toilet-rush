import { useSyncExternalStore } from 'react'
import { isMuted, sfx, setMuted, subscribeMute } from '../game/audio'

export default function SoundToggle({ className = '' }: { className?: string }) {
  const muted = useSyncExternalStore(subscribeMute, isMuted)
  return (
    <button
      type="button"
      aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
      aria-pressed={!muted}
      className={`btn btn-ghost !min-h-12 !px-4 !py-2 !text-xl ${className}`}
      onClick={() => {
        setMuted(!muted)
        if (muted) {
          sfx.unlock()
          sfx.click()
        }
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
