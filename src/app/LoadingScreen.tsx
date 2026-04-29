import { useStore } from '../state/store'

export function LoadingScreen() {
  const sceneId = useStore((s) => s.currentSceneId)
  const error = useStore((s) => s.loadError)
  const goToStart = useStore((s) => s.goToStart)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-veil text-text">
      <div className="w-[min(36rem,90vw)] text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-text-soft">
          Project Dreamcore
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {error ? 'We hit a snag' : 'Materialising the scene…'}
        </h2>
        {!error && (
          <p className="mt-3 text-sm text-text-soft">
            Streaming gaussian splats for <span className="text-accent">{sceneId}</span>.
            First load takes a moment — you'll be inside in a beat.
          </p>
        )}
        {error && (
          <div className="mt-6 rounded-2xl border border-warn/60 bg-warn/10 p-4 text-left">
            <p className="text-sm text-warn">{error}</p>
            <button
              type="button"
              onClick={goToStart}
              className="mt-3 rounded-full border border-line/70 px-4 py-2 text-xs uppercase tracking-[0.18em] text-text-soft hover:border-accent hover:text-accent"
            >
              Back to start
            </button>
          </div>
        )}
        {!error && (
          <div className="mt-8">
            <div className="mx-auto h-1 w-64 overflow-hidden rounded-full bg-line/50">
              <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-transparent via-accent to-transparent bg-[length:200%_100%]" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
