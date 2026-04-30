import { useEffect, useState } from 'react'
import { loadIndex, useStore } from '../state/store'
import heroImg from '../assets/images/hero-image.jpg'

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

          <DreamcoreHero src={heroImg} />
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

function DreamcoreHero({ src }: { src: string }) {
  return (
    <div className="relative w-full animate-fade-in">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-md sm:max-w-lg">
        {/* halo glow */}
        <div className="absolute inset-0 -z-20 rounded-[2.5rem] bg-accent/25 blur-[80px]" />
        <div className="absolute -inset-6 -z-20 bg-[radial-gradient(ellipse_at_center,rgba(192,132,252,0.3),transparent_60%)] blur-2xl" />
        {/* orbits */}
        <div className="pointer-events-none absolute -inset-8 -z-10 rounded-full border border-line/50 animate-orbit" />
        <div
          className="pointer-events-none absolute -inset-16 -z-10 rounded-full border border-line/25 animate-orbit"
          style={{ animationDuration: '60s', animationDirection: 'reverse' }}
        />
        {/* corner brackets */}
        <Bracket className="-top-3 -left-3" />
        <Bracket className="-top-3 -right-3 rotate-90" />
        <Bracket className="-bottom-3 -right-3 rotate-180" />
        <Bracket className="-bottom-3 -left-3 -rotate-90" />

        {/* the framed image */}
        <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-line/60 bg-ink-3 shadow-[0_30px_80px_-15px_oklch(0_0_0/0.7),0_0_60px_oklch(0.78_0.18_305/0.25)]">
          {/* base image */}
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full select-none object-cover saturate-[0.85] contrast-[1.05]"
            draggable={false}
          />
          {/* duotone violet wash */}
          <div className="absolute inset-0 mix-blend-color bg-[linear-gradient(135deg,oklch(0.45_0.15_305)_0%,oklch(0.55_0.18_280)_50%,oklch(0.5_0.12_240)_100%)] opacity-[0.55]" />
          {/* highlight from upper-left */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(192,132,252,0.25),transparent_60%)] mix-blend-screen" />
          {/* deep vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,oklch(0.04_0.012_286)_100%)]" />
          {/* scanlines + grain */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)',
            }}
          />
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-30 mix-blend-soft-light"
          >
            <filter id="dreamcore-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#dreamcore-grain)" />
          </svg>
          {/* metadata strip */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-4 text-[10px] uppercase tracking-[0.28em] text-text-soft">
            <div className="flex flex-col">
              <span className="text-accent">Capture · 24.37°N 118.04°E</span>
              <span className="mt-1">Multi-block 3DGS · ENU</span>
            </div>
            <div className="flex h-2 w-2 items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_12px_oklch(0.78_0.18_305/0.8)] animate-pulse-slow" />
            </div>
          </div>
          {/* top-left tag */}
          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-line/60 bg-ink/60 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-text-soft backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-good" />
            Live capture
          </div>
        </div>
      </div>
    </div>
  )
}

function Bracket({ className = '' }: { className?: string }) {
  return (
    <span
      className={'pointer-events-none absolute z-10 h-6 w-6 ' + className}
      aria-hidden="true"
    >
      <span className="absolute inset-y-0 left-0 w-px bg-accent/70" />
      <span className="absolute inset-x-0 top-0 h-px bg-accent/70" />
    </span>
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
