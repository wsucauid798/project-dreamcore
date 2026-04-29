import { useStore } from '../state/store'

export function PauseVeil() {
  const togglePause = useStore((s) => s.togglePause)
  const toggleHelp = useStore((s) => s.toggleHelp)

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-veil/55 backdrop-blur-md animate-fade-in">
      <div className="flex w-[min(28rem,90vw)] flex-col items-center rounded-3xl border border-line/80 bg-ink-2/85 px-8 py-10 text-center shadow-veil">
        <p className="text-[11px] uppercase tracking-[0.32em] text-text-soft">Project Dreamcore</p>
        <h2 className="mt-2 text-4xl font-semibold tracking-tight">Paused</h2>
        <p className="mt-3 max-w-xs text-sm text-text-soft">
          The world is on hold. Take a breath, then dive back in.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={togglePause}
            className="rounded-full bg-accent/20 px-6 py-3 text-sm font-medium uppercase tracking-[0.18em] text-accent hover:bg-accent/30 shadow-glow"
          >
            ▶ Resume (P)
          </button>
          <button
            type="button"
            onClick={toggleHelp}
            className="rounded-full border border-line/70 px-6 py-3 text-sm uppercase tracking-[0.18em] text-text-soft hover:border-accent hover:text-text"
          >
            ? Controls
          </button>
        </div>
      </div>
    </div>
  )
}
