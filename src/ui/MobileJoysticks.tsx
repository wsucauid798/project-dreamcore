import type { RefObject } from 'react'

// Two on-screen sticks for touch devices: left = move, right = look.
type Props = {
  leftRef: RefObject<HTMLDivElement | null>
  rightRef: RefObject<HTMLDivElement | null>
}

export function MobileJoysticks({ leftRef, rightRef }: Props) {
  return (
    <>
      <Stick refEl={leftRef} side="left" label="Move" />
      <Stick refEl={rightRef} side="right" label="Look" />
    </>
  )
}

// Single on-screen stick disc (anchored bottom-left or bottom-right).
function Stick({ refEl, side, label }: { refEl: RefObject<HTMLDivElement | null>; side: 'left' | 'right'; label: string }) {
  return (
    <div
      ref={refEl}
      data-stick={side}
      className={
        'pointer-events-auto absolute bottom-24 z-10 h-32 w-32 touch-none rounded-full border border-line/60 bg-ink/40 backdrop-blur-md ' +
        (side === 'left' ? 'left-4' : 'right-4')
      }
      aria-label={`${label} stick`}
    >
      <div className="absolute inset-3 rounded-full border border-line/40 bg-ink-2/40" />
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.32em] text-text-soft">
        {label}
      </span>
    </div>
  )
}
