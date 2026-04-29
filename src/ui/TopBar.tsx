import { useStore } from '../state/store'
import clsx from 'clsx'

type Props = {
  lodIndex: number
  lodCount: number
  onLodChange: (i: number) => void
}

export function TopBar({ lodIndex, lodCount, onLodChange }: Props) {
  const goToStart = useStore((s) => s.goToStart)
  const toggleSceneDrawer = useStore((s) => s.toggleSceneDrawer)
  const toggleHelp = useStore((s) => s.toggleHelp)
  const manifest = useStore((s) => s.currentManifest)
  const togglePause = useStore((s) => s.togglePause)
  const paused = useStore((s) => s.paused)
  const toggleUpFlip = useStore((s) => s.toggleUpFlip)
  const upFlipped = useStore((s) => manifest ? !!s.upFlips[manifest.id] : false)

  return (
    <div className="pointer-events-auto absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={goToStart}
          className="rounded-full border border-line/70 bg-ink/60 px-3 py-2 text-xs uppercase tracking-[0.18em] backdrop-blur-md transition hover:border-accent hover:text-accent sm:px-4 sm:text-sm"
        >
          ← Exit
        </button>
        <div className="hidden flex-col text-[11px] uppercase leading-tight tracking-[0.2em] text-text-soft sm:flex">
          <span>Project</span>
          <span className="text-text font-semibold tracking-[0.32em]">DREAMCORE</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center rounded-full border border-line bg-ink/60 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-text-dim backdrop-blur-md sm:flex">
          {manifest?.displayName ?? '—'}
        </div>
        <LodSwitch lodIndex={lodIndex} lodCount={lodCount} onLodChange={onLodChange} />
        <button
          type="button"
          aria-label="Flip up axis"
          onClick={() => manifest && toggleUpFlip(manifest.id)}
          className={clsx(
            'rounded-full border bg-ink/60 px-3 py-2 text-xs uppercase tracking-[0.18em] backdrop-blur-md transition sm:px-4 sm:text-sm',
            upFlipped
              ? 'border-accent/70 text-accent shadow-glow'
              : 'border-line/70 hover:border-accent hover:text-accent',
          )}
          title="Press U to flip up/down if scene appears inverted"
        >
          ↕
          <span className="ml-2 hidden sm:inline">Flip</span>
        </button>
        <button
          type="button"
          aria-label={paused ? 'Resume' : 'Pause'}
          onClick={togglePause}
          className={clsx(
            'rounded-full border bg-ink/60 px-3 py-2 text-xs uppercase tracking-[0.18em] backdrop-blur-md transition sm:px-4 sm:text-sm',
            paused
              ? 'border-warn text-warn hover:border-warn hover:text-warn'
              : 'border-line/70 hover:border-accent hover:text-accent',
          )}
        >
          {paused ? '▶' : '❘❘'}
          <span className="ml-2 hidden sm:inline">{paused ? 'Resume' : 'Pause'}</span>
        </button>
        <button
          type="button"
          onClick={() => toggleSceneDrawer()}
          className="rounded-full border border-line/70 bg-ink/60 px-3 py-2 text-xs uppercase tracking-[0.18em] backdrop-blur-md transition hover:border-accent hover:text-accent sm:px-4 sm:text-sm"
        >
          ◧ Scenes
        </button>
        <button
          type="button"
          onClick={toggleHelp}
          aria-label="Help"
          className="hidden h-9 w-9 items-center justify-center rounded-full border border-line/70 bg-ink/60 text-sm backdrop-blur-md transition hover:border-accent hover:text-accent sm:flex"
        >
          ?
        </button>
      </div>
    </div>
  )
}

function LodSwitch({ lodIndex, lodCount, onLodChange }: Props) {
  if (lodCount <= 1) return null
  const labels = ['Ultra', 'High', 'Med', 'Low', 'Mini']
  return (
    <div className="hidden items-center rounded-full border border-line bg-ink/60 p-0.5 text-[10px] uppercase tracking-[0.18em] backdrop-blur-md md:flex">
      {Array.from({ length: lodCount }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onLodChange(i)}
          className={clsx(
            'rounded-full px-2.5 py-1 transition',
            i === lodIndex
              ? 'bg-accent/20 text-accent'
              : 'text-text-soft hover:text-text',
          )}
        >
          {labels[i] ?? `LOD${i}`}
        </button>
      ))}
    </div>
  )
}
