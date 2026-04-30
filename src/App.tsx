import { useEffect } from 'react'
import { useStore } from './state/store'
import { StartScreen } from './app/StartScreen'
import { Experience } from './app/Experience'
import { LoadingScreen } from './app/LoadingScreen'

// Top-level phase router: start → loading → experience.
export default function App() {
  const phase = useStore((s) => s.phase)
  const setMobile = useStore((s) => s.setMobile)

  useEffect(() => {
    const update = () => setMobile(window.matchMedia('(pointer: coarse)').matches)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [setMobile])

  return (
    <>
      {phase === 'start' && <StartScreen />}
      {phase === 'loading' && <LoadingScreen />}
      {phase === 'experience' && <Experience />}
    </>
  )
}
