import { useEffect, useState } from 'react'
import { loadIndex, useStore } from '../state/store'
import heroImg from '../assets/hero.png'

export function StartScreen() {
  const setIndex = useStore((s) => s.setIndex)
  const setIndexError = useStore((s) => s.setIndexError)
  const index = useStore((s) => s.index)
  const indexError = useStore((s) => s.indexError)
  const switchScene = useStore((s) => s.switchScene)
  const [hovered, setHovered] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    loadIndex().then((idx) => {
      if (!cancel) setIndex(idx)
    }).catch((e) => {
      if (!cancel) setIndexError((e as Error).message)
    })
    return () => { cancel = true }
  }, [setIndex, setIndexError])

  const firstScene = index?.scenes[0]?.id

  return (
    <div className="relative isolate flex min-h-svh w-full flex-col overflow-hidden bg-veil text-text">
      <BackdropOrbits />
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 sm:py-8">
        <div className="flex items-baseline gap-3">
          <span className="text-[11px] uppercase tracking-[0.4em] text-text-soft">Project</span>
          <span className="text-2xl font-semibold tracking-[0.32em] text-text">DREAMCORE</span>
        </div>
        <a
          href="#about"
          className="hidden text-[11px] uppercase tracking-[0.32em] text-text-soft hover:text-accent sm:block"
        >
          About
        </a>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-10">
        <div className="grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="space-y-8 text-center lg:text-left animate-fade-up">
            <p className="text-[11px] uppercase tracking-[0.4em] text-accent">A Cinematic Walk-Through</p>
            <h1 className="font-display text-5xl font-semibold leading-[0.95] tracking-tight text-text sm:text-6xl lg:text-[5.5rem]">
              Step inside our<br />campus, frozen
              <span className="bg-gradient-to-r from-accent via-accent to-accent/60 bg-clip-text text-transparent"> in light.</span>
            </h1>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-text-dim sm:text-lg lg:mx-0">
              Reconstructed from millions of Gaussian splats, every floor and corridor is now a place
              you can fly, drift, and pause inside. Five floors, the library, and the open campus —
              one cinematic experience.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <button
                type="button"
                disabled={!firstScene}
                onClick={() => firstScene && switchScene(firstScene)}
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-accent/60 bg-accent/15 px-7 py-4 text-sm font-medium uppercase tracking-[0.32em] text-text transition hover:border-accent hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="absolute inset-0 -z-10 animate-shimmer bg-[linear-gradient(110deg,transparent_25%,rgba(192,132,252,0.25)_50%,transparent_75%)] bg-[length:200%_100%]" />
                <span>▶</span>
                <span>Start experience</span>
              </button>
              <p className="text-[10px] uppercase tracking-[0.32em] text-text-soft">
                Best with mouse · keyboard · headphones
              </p>
            </div>

            {indexError && (
              <div className="rounded-2xl border border-warn/60 bg-warn/10 p-4 text-sm text-warn">
                <p className="font-medium uppercase tracking-[0.18em]">Scenes not built yet</p>
                <p className="mt-1 text-text-soft">{indexError}</p>
                <p className="mt-2 font-mono text-xs text-warn">
                  npm run scenes
                </p>
              </div>
            )}
          </div>

          <div className="relative w-full">
            <div className="relative mx-auto aspect-square w-full max-w-md animate-fade-in">
              <div className="absolute inset-0 -z-10 rounded-full bg-accent/20 blur-3xl" />
              <div className="absolute inset-4 -z-10 rounded-full border border-line/60 animate-orbit" />
              <div className="absolute inset-12 -z-10 rounded-full border border-line/30 animate-orbit" style={{ animationDuration: '60s', animationDirection: 'reverse' }} />
              <img
                src={heroImg}
                alt=""
                className="relative h-full w-full select-none object-contain drop-shadow-[0_20px_50px_oklch(0_0_0/0.6)]"
              />
            </div>
          </div>
        </div>

        <ScenePreviewRail
          onHover={setHovered}
          hoveredId={hovered}
          onPick={(id) => switchScene(id)}
        />
      </main>

      <footer className="relative z-10 px-6 pb-6 text-[10px] uppercase tracking-[0.32em] text-text-soft sm:px-10">
        Built with Three.js · Gaussian Splats · React
      </footer>
    </div>
  )
}

function ScenePreviewRail({ onHover, hoveredId, onPick }: {
  onHover: (id: string | null) => void
  hoveredId: string | null
  onPick: (id: string) => void
}) {
  const index = useStore((s) => s.index)
  if (!index) {
    return (
      <div className="mt-12 grid w-full max-w-7xl grid-cols-3 gap-3 sm:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse-slow rounded-2xl border border-line/40 bg-ink/30" />
        ))}
      </div>
    )
  }
  return (
    <div className="mt-12 grid w-full max-w-7xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {index.scenes.map((s) => {
        const active = s.id === hoveredId
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.id)}
            onMouseEnter={() => onHover(s.id)}
            onMouseLeave={() => onHover(null)}
            className={
              'group relative flex h-24 flex-col items-start justify-between overflow-hidden rounded-2xl border bg-ink/40 px-4 py-3 text-left backdrop-blur-md transition ' +
              (active
                ? 'border-accent/80 shadow-glow'
                : 'border-line/50 hover:border-accent/60')
            }
          >
            <span className="text-[10px] uppercase tracking-[0.32em] text-text-soft">
              {s.kind === 'lod-blocks' ? 'Outdoor' : 'Indoor'}
            </span>
            <span className="text-sm font-medium tracking-tight text-text">{s.displayName}</span>
            <span className="absolute -bottom-px left-0 h-px w-full bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-0 transition group-hover:opacity-100" />
          </button>
        )
      })}
    </div>
  )
}

function BackdropOrbits() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(192,132,252,0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_right,rgba(120,80,200,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute -bottom-32 left-1/2 -z-10 h-[900px] w-[1400px] -translate-x-1/2 rounded-full border border-accent/10 animate-pulse-slow" />
    </>
  )
}
