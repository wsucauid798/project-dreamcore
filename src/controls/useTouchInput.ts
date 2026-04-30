import { useEffect, useRef } from 'react'

export type Vec2 = { x: number; y: number }

// Two on-screen joysticks for mobile. Refs avoid React re-renders.
export function useTouchInput() {
  const leftStick = useRef<Vec2>({ x: 0, y: 0 })
  const rightStick = useRef<Vec2>({ x: 0, y: 0 })
  const leftEl = useRef<HTMLDivElement>(null)
  const rightEl = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tracked = new Map<number, { side: 'left' | 'right'; cx: number; cy: number; r: number }>()

    const onStart = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      const stick = target.closest('[data-stick]') as HTMLElement | null
      if (!stick) return
      const side = stick.dataset.stick as 'left' | 'right'
      const rect = stick.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const r = rect.width / 2
      tracked.set(e.pointerId, { side, cx, cy, r })
      try { stick.setPointerCapture(e.pointerId) } catch { /* ignore */ }
      e.preventDefault()
    }

    const onMove = (e: PointerEvent) => {
      const t = tracked.get(e.pointerId)
      if (!t) return
      let dx = (e.clientX - t.cx) / t.r
      let dy = (e.clientY - t.cy) / t.r
      const mag = Math.hypot(dx, dy)
      if (mag > 1) { dx /= mag; dy /= mag }
      if (t.side === 'left') leftStick.current = { x: dx, y: dy }
      else rightStick.current = { x: dx, y: dy }
    }

    const onEnd = (e: PointerEvent) => {
      const t = tracked.get(e.pointerId)
      if (!t) return
      tracked.delete(e.pointerId)
      if (t.side === 'left') leftStick.current = { x: 0, y: 0 }
      else rightStick.current = { x: 0, y: 0 }
    }

    window.addEventListener('pointerdown', onStart, { passive: false })
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointerdown', onStart)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [])

  return { leftStick, rightStick, leftEl, rightEl }
}
