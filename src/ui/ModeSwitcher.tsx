import clsx from 'clsx'
import { useStore } from '../state/store'

export function ModeSwitcher() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)

  return (
    <div className="pointer-events-auto absolute right-3 top-20 z-10 flex flex-col gap-2 sm:right-6 sm:top-24">
      <ModeButton
        active={mode === 'fly'}
        onClick={() => setMode('fly')}
        label="Fly"
        sub="WASD"
      />
      <ModeButton
        active={mode === 'orbit'}
        onClick={() => setMode('orbit')}
        label="Orbit"
        sub="Drag"
      />
    </div>
  )
}

function ModeButton({ active, onClick, label, sub }: { active: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-20 flex-col items-center rounded-2xl border bg-ink/60 px-3 py-2 backdrop-blur-md transition',
        active
          ? 'border-accent/70 text-accent shadow-glow'
          : 'border-line/70 text-text-soft hover:border-accent hover:text-text',
      )}
    >
      <span className="text-sm font-semibold tracking-wide">{label}</span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-text-soft">{sub}</span>
    </button>
  )
}
