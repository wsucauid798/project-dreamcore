import { useEffect, useRef } from 'react'

export type KeyState = {
  forward: boolean
  back: boolean
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  boost: boolean
}

/**
 * Returns a stable ref into the current key state, plus binds global handlers
 * for one-shot bindings (pause, speed up/down, mode toggle, etc.).
 */
export function useKeyboard(opts: {
  onPauseToggle?: () => void
  onSpeedUp?: () => void
  onSpeedDown?: () => void
  onModeToggle?: () => void
  onHelp?: () => void
  onSceneDrawer?: () => void
  onEscape?: () => void
  onJump?: () => void
}) {
  const ref = useRef<KeyState>({
    forward: false, back: false, left: false, right: false,
    up: false, down: false, boost: false,
  })

  useEffect(() => {
    const setKey = (e: KeyboardEvent, val: boolean) => {
      if (e.repeat) return
      const k = e.key.toLowerCase()
      switch (k) {
        case 'w': case 'arrowup': ref.current.forward = val; break
        case 's': case 'arrowdown': ref.current.back = val; break
        case 'a': case 'arrowleft': ref.current.left = val; break
        case 'd': case 'arrowright': ref.current.right = val; break
        case 'shift': ref.current.boost = val; break
      }
      // Movement is fully camera-facing — pitch up + W ascends naturally.
      // No dedicated Space/Ctrl ascend bindings (per gamer convention).
    }
    const onDown = (e: KeyboardEvent) => {
      // One-shots only fire on keydown
      if (!e.repeat) {
        const k = e.key.toLowerCase()
        const code = e.code
        if (k === 'p') opts.onPauseToggle?.()
        else if (k === ' ') { e.preventDefault(); opts.onJump?.() }
        else if (k === 'h' || k === '?') opts.onHelp?.()
        else if (k === 'tab') { e.preventDefault(); opts.onSceneDrawer?.() }
        else if (k === 'm') opts.onModeToggle?.()
        else if (k === ']' || k === '+' || k === '=' || code === 'PageUp') {
          e.preventDefault()
          opts.onSpeedUp?.()
        } else if (k === '[' || k === '-' || code === 'PageDown') {
          e.preventDefault()
          opts.onSpeedDown?.()
        } else if (k === 'escape') opts.onEscape?.()
      }
      setKey(e, true)
    }
    const onUp = (e: KeyboardEvent) => setKey(e, false)
    const onBlur = () => {
      ref.current = { forward: false, back: false, left: false, right: false, up: false, down: false, boost: false }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [opts])

  return ref
}
