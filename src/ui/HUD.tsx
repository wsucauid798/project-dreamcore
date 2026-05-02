import type { RefObject } from 'react'
import { useStore } from '../state/store'
import { Speedometer } from './Speedometer'
import { ModeSwitcher } from './ModeSwitcher'
import { SceneDrawer } from './SceneDrawer'
import { PauseVeil } from './PauseVeil'
import { HelpOverlay } from './HelpOverlay'
import { TopBar } from './TopBar'
import { MobileJoysticks } from './MobileJoysticks'
import { VolumeControl } from './VolumeControl'

// Composes all the in-experience overlays on top of the canvas.
type Props = {
  leftRef: RefObject<HTMLDivElement | null>
  rightRef: RefObject<HTMLDivElement | null>
  lodIndex: number
  lodCount: number
  onLodChange: (i: number) => void
}

export function HUD({ leftRef, rightRef, lodIndex, lodCount, onLodChange }: Props) {
  const isMobile = useStore((s) => s.isMobile)
  const showHelp = useStore((s) => s.showHelp)
  const paused = useStore((s) => s.paused)

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none text-text">
      <TopBar lodIndex={lodIndex} lodCount={lodCount} onLodChange={onLodChange} />
      <SceneDrawer />
      <Speedometer />
      <ModeSwitcher />
      <VolumeControl />
      {isMobile && <MobileJoysticks leftRef={leftRef} rightRef={rightRef} />}
      {paused && <PauseVeil />}
      {showHelp && <HelpOverlay />}
    </div>
  )
}
