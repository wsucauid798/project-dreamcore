import { useStore } from '../state/store'

// Keybinding cheatsheet shown by H / ? / pause menu.
const KEYS: Array<{ keys: string[]; label: string }> = [
  { keys: ['W', 'A', 'S', 'D'], label: 'Move along the camera direction' },
  { keys: ['↑', '↓', '←', '→'], label: 'Same as WASD' },
  { keys: ['Space'], label: 'Jump — brief upward hop' },
  { keys: ['Mouse'], label: 'Drag the canvas to look around' },
  { keys: ['Wheel'], label: 'Dolly forward / back (mouse or trackpad)' },
  { keys: ['Shift'], label: 'Boost — 3× speed while held' },
  { keys: ['PgUp', 'PgDn'], label: 'Cinematic speed up / slow down' },
  { keys: ['P'], label: 'Pause / resume' },
  { keys: ['M'], label: 'Toggle Fly / Orbit mode' },
  { keys: ['U'], label: 'Flip up/down (if scene loads inverted)' },
  { keys: ['Tab'], label: 'Open scene drawer' },
  { keys: ['H', '?'], label: 'Toggle this help overlay' },
  { keys: ['Esc'], label: 'Exit to start screen' },
]

export function HelpOverlay() {
  const toggleHelp = useStore((s) => s.toggleHelp)
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-veil/70 backdrop-blur-md animate-fade-in"
      onClick={toggleHelp}
    >
      <div
        className="w-[min(46rem,92vw)] max-h-[85vh] overflow-y-auto rounded-3xl border border-line/80 bg-ink-2/90 p-6 sm:p-10 shadow-veil"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-text-soft">Controls</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">How to fly</h2>
          </div>
          <button
            type="button"
            onClick={toggleHelp}
            className="rounded-full border border-line/70 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-text-soft hover:border-accent hover:text-accent"
          >
            Close
          </button>
        </div>
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {KEYS.map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-4 rounded-2xl border border-line/40 bg-ink/50 px-4 py-3">
              <span className="text-sm text-text-soft">{row.label}</span>
              <span className="flex flex-wrap items-center gap-1">
                {row.keys.map((k) => (
                  <kbd key={k} className="rounded-md border border-line/80 bg-ink-3 px-2 py-1 font-mono text-[11px] tracking-wide text-text">
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Tip title="Pitch up + W" body="Movement follows the camera. Look up and press W to ascend, look down and press W to descend." />
          <Tip title="Touch" body="Left thumbstick moves, right thumbstick looks. Two-finger pinch zooms in orbit mode." />
        </div>
      </div>
    </div>
  )
}

// Small accent-coloured tip card at the bottom of the overlay.
function Tip({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line/40 bg-ink/40 p-4">
      <p className="text-[10px] uppercase tracking-[0.32em] text-accent">{title}</p>
      <p className="mt-2 text-sm text-text-soft">{body}</p>
    </div>
  )
}
