import { useEffect, useRef } from 'react'
import { useStore } from '../state/store'
import audioUrl from '../assets/audio/ICI_Sound_mixdown.mp3?url'

// Background loop for the experience. Hard rules, all instant:
//   • No scene (start screen / loading)   → silent
//   • Scene paused                        → silent
//   • fadeAlpha !== 0 (transitioning)     → silent
//   • Active scene + not paused + clear   → plays at slider volume
// Every state change is a hard cut.
//
// Lives at App level (not inside Experience) so the audio element survives
// the brief loading-phase hop when switching scenes — the `audible` flag
// below decides whether sound is actually emitted.
//
// LOUDNESS NOTE
// HTMLAudioElement.volume is hard-capped at 1.0. The mixdown file is fairly
// quiet, so we route through a Web Audio GainNode whose ceiling can exceed
// 1.0 — the slider 0..1 maps to gain 0..BOOST_GAIN.
// Long-term fix: normalize the source file once with ffmpeg and drop
// BOOST_GAIN back to 1.0:
//   ffmpeg -i ICI_Sound_mixdown.mp3 -af loudnorm=I=-14:TP=-1.5:LRA=11 \
//          -ar 44100 -b:a 192k ICI_Sound_mixdown_norm.mp3
const BOOST_GAIN = 2.0

export function SceneAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  const phase = useStore((s) => s.phase)
  const paused = useStore((s) => s.paused)
  const volume = useStore((s) => s.volume)
  const muted = useStore((s) => s.muted)
  const fadeAlpha = useStore((s) => s.fadeAlpha)

  // Single source of truth for "should sound be flowing right now".
  // Pure derivation — no timers, no delays. fadeAlpha is set to 0 the
  // moment a scene becomes the live scene; that's when audio comes on.
  // It flips to 1 the moment a transition starts; that's when audio cuts.
  const audible = phase === 'experience' && !paused && fadeAlpha === 0

  // Lazy-create the audio element + Web Audio graph the first time we
  // could plausibly want sound. Avoids loading 38MB on the start screen.
  useEffect(() => {
    if (phase !== 'experience') return
    if (audioRef.current) return
    const el = new Audio(audioUrl)
    el.loop = true
    el.preload = 'auto'
    el.crossOrigin = 'anonymous'

    // <audio> → MediaElementSource → GainNode → destination.
    // Once routed through a MediaElementSource, .volume on the element is
    // bypassed; output is governed by the GainNode, which can exceed 1.0.
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const src = ctx.createMediaElementSource(el)
    const gain = ctx.createGain()
    gain.gain.value = 0 // start silent; the gain effect fills in real value
    src.connect(gain).connect(ctx.destination)

    audioRef.current = el
    ctxRef.current = ctx
    gainRef.current = gain
  }, [phase])

  // Tear down on full unmount.
  useEffect(() => {
    return () => {
      const el = audioRef.current
      const ctx = ctxRef.current
      if (el) { el.pause(); el.src = '' }
      if (ctx) { void ctx.close().catch(() => { /* ignore */ }) }
      audioRef.current = null
      ctxRef.current = null
      gainRef.current = null
    }
  }, [])

  // Gain: instant, always. No ramps anywhere.
  //   audible && !muted → volume * BOOST_GAIN
  //   otherwise         → 0
  useEffect(() => {
    const gain = gainRef.current
    const ctx = ctxRef.current
    if (!gain || !ctx) return
    const target = audible && !muted ? volume * BOOST_GAIN : 0
    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.setValueAtTime(target, ctx.currentTime)
  }, [audible, volume, muted])

  // Element play/pause matches `audible` exactly. No reason to keep the
  // element decoding while it's silent — saves a bit of CPU.
  useEffect(() => {
    const el = audioRef.current
    const ctx = ctxRef.current
    if (!el || !ctx) return
    if (audible) {
      // AudioContext starts 'suspended' until a user gesture; the
      // Start-experience click satisfies that, so resume normally succeeds.
      if (ctx.state === 'suspended') void ctx.resume().catch(() => { /* ignore */ })
      void el.play().catch(() => { /* autoplay blocked; next state change retries */ })
    } else {
      el.pause()
    }
  }, [audible])

  // Pause on tab hide; on return, the audible effect will re-arm naturally
  // since fadeAlpha/phase haven't changed.
  useEffect(() => {
    const onVisibility = () => {
      const el = audioRef.current
      if (!el) return
      if (document.hidden) el.pause()
      else if (audible) void el.play().catch(() => { /* ignore */ })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [audible])

  return null
}
