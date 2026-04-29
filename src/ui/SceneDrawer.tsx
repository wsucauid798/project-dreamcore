import clsx from 'clsx'
import { useStore } from '../state/store'

export function SceneDrawer() {
  const open = useStore((s) => s.showSceneDrawer)
  const toggle = useStore((s) => s.toggleSceneDrawer)
  const index = useStore((s) => s.index)
  const currentSceneId = useStore((s) => s.currentSceneId)
  const switchScene = useStore((s) => s.switchScene)

  return (
    <>
      <div
        aria-hidden={!open}
        className={clsx(
          'pointer-events-auto fixed inset-0 z-30 bg-veil/70 backdrop-blur-md transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => toggle(false)}
      />
      <aside
        className={clsx(
          'pointer-events-auto fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l border-line bg-ink-2/90 backdrop-blur-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!open}
      >
        <header className="flex items-start justify-between border-b border-line px-6 py-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-text-soft">Project Dreamcore</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text">Choose a scene</h2>
          </div>
          <button
            type="button"
            onClick={() => toggle(false)}
            className="rounded-full border border-line/80 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-text-soft hover:border-accent hover:text-accent"
          >
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {!index ? (
            <p className="text-text-soft">No scenes loaded.</p>
          ) : (
            <ul className="space-y-3">
              {index.scenes.map((s) => {
                const active = s.id === currentSceneId
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => switchScene(s.id)}
                      className={clsx(
                        'group block w-full rounded-2xl border p-4 text-left transition',
                        active
                          ? 'border-accent/70 bg-accent/10 shadow-glow'
                          : 'border-line/60 bg-ink/40 hover:border-accent hover:bg-accent/5',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium tracking-tight text-text">{s.displayName}</h3>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-text-soft">
                          {s.kind === 'lod-blocks' ? 'LOD blocks' : 'Single'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-text-soft">
                        {active ? 'Currently active' : 'Tap to teleport'}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <footer className="border-t border-line px-6 py-4 text-[11px] uppercase tracking-[0.18em] text-text-soft">
          Tab · toggle · Esc · exit
        </footer>
      </aside>
    </>
  )
}
