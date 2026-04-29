import clsx from 'clsx'
import { speedSteps, useStore } from '../state/store'

export function Speedometer() {
  const speed = useStore((s) => s.speed)
  const setSpeed = useStore((s) => s.setSpeed)
  const mode = useStore((s) => s.mode)

  return (
    <div className="pointer-events-auto absolute bottom-6 left-1/2 z-10 -translate-x-1/2 sm:bottom-8">
      <div className="flex items-center gap-1 rounded-full border border-line bg-ink/60 p-1 backdrop-blur-md shadow-veil">
        {speedSteps.map((s) => {
          const active = speed === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={clsx(
                'min-w-[3.25rem] rounded-full px-3 py-1.5 text-xs font-medium tabular-nums transition sm:min-w-[3.75rem] sm:text-sm',
                active
                  ? 'bg-accent/20 text-accent shadow-glow'
                  : 'text-text-soft hover:text-text',
              )}
              aria-pressed={active}
            >
              {s}×
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-[10px] uppercase tracking-[0.32em] text-text-soft">
        {mode === 'fly' ? 'Flight speed' : 'Orbit speed'} · PgUp / PgDn
      </p>
    </div>
  )
}
