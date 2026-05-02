import { useStore } from '../state/store'
import clsx from 'clsx'

// Persistent volume fader on the right rail, sitting under the ModeSwitcher.
//   • Always-visible vertical slider (mixer-style fader).
//   • Speaker icon at top doubles as mute toggle.
//   • Percentage label at bottom for at-a-glance read.
//   • Width matches the mode buttons so the right column reads cohesively.
//
// Vertical orientation uses `writing-mode: vertical-lr` + `direction: rtl`
// per the WHATWG/CSSWG approach — supported in Chrome 110+, Firefox 104+,
// Safari 17+. The `direction: rtl` flip ensures dragging UP increases
// volume (otherwise the writing-mode would put max at the bottom).
export function VolumeControl() {
  const volume = useStore((s) => s.volume)
  const muted = useStore((s) => s.muted)
  const setVolume = useStore((s) => s.setVolume)
  const toggleMuted = useStore((s) => s.toggleMuted)

  const effectiveLevel = muted ? 0 : volume
  const percentLabel = `${Math.round(effectiveLevel * 100)}%`

  return (
    <div className="pointer-events-auto absolute right-3 top-[14.5rem] z-10 flex w-20 flex-col items-center gap-3 rounded-2xl border border-line/70 bg-ink/60 px-2 py-3 backdrop-blur-md sm:right-6 sm:top-[15.5rem]">
      <span className="text-[10px] uppercase tracking-[0.18em] text-text-soft tabular-nums">{percentLabel}</span>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        aria-label="Volume"
        aria-orientation="vertical"
        onChange={(e) => setVolume(Number(e.target.value))}
        className="h-32 w-1 cursor-pointer appearance-none rounded-full bg-line/60 accent-accent [direction:rtl] [writing-mode:vertical-lr]"
      />

      <button
        type="button"
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
        onClick={toggleMuted}
        className={clsx(
          'flex h-7 w-7 items-center justify-center rounded-full transition',
          muted ? 'text-warn hover:text-warn' : 'text-text-soft hover:text-accent',
        )}
        title={muted ? 'Unmute' : 'Mute'}
      >
        <SpeakerIcon level={effectiveLevel} />
      </button>
    </div>
  )
}

// Three-state speaker glyph: muted / low / high.
function SpeakerIcon({ level }: { level: number }) {
  if (level === 0) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <line x1="22" y1="9" x2="16" y2="15" />
        <line x1="16" y1="9" x2="22" y2="15" />
      </svg>
    )
  }
  if (level < 0.5) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  )
}
