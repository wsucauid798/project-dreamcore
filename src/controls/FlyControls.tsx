import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { useKeyboard } from './useKeyboard'
import type { Vec2 } from './useTouchInput'

type Props = {
  enabled: boolean
  baseSpeed: number // m/s at speed = 1
  yLimit?: { min: number; max: number }
  /** Live joystick refs (mobile). Pass {x:0,y:0} on desktop. */
  leftStick?: { current: Vec2 } | Vec2
  rightStick?: { current: Vec2 } | Vec2
  pointerLockTarget?: HTMLElement | null
}

const tmpForward = new THREE.Vector3()
const tmpRight = new THREE.Vector3()

/** Read a Vec2 reading from either a ref-shaped or plain value. */
function readStick(s?: { current: Vec2 } | Vec2): Vec2 {
  if (!s) return { x: 0, y: 0 }
  if ('current' in s) return s.current
  return s
}

export function FlyControls({ enabled, baseSpeed, yLimit, leftStick, rightStick, pointerLockTarget }: Props) {
  const { camera, gl } = useThree()
  const yawRef = useRef(0)
  const pitchRef = useRef(0)
  const initialised = useRef(false)
  const dragging = useRef(false)
  const lastPointer = useRef<{ x: number; y: number } | null>(null)
  const jumpVel = useRef(0)
  const wheelVel = useRef(0)
  const speed = useStore((s) => s.speed)
  const paused = useStore((s) => s.paused)
  const setMode = useStore((s) => s.setMode)
  const togglePause = useStore((s) => s.togglePause)
  const toggleHelp = useStore((s) => s.toggleHelp)
  const toggleSceneDrawer = useStore((s) => s.toggleSceneDrawer)
  const setSpeedAction = useStore((s) => s.setSpeed)
  const goToStart = useStore((s) => s.goToStart)
  const toggleUpFlip = useStore((s) => s.toggleUpFlip)

  // Keyboard
  const keys = useKeyboard({
    onPauseToggle: togglePause,
    onHelp: toggleHelp,
    onSceneDrawer: () => toggleSceneDrawer(),
    onModeToggle: () => setMode(useStore.getState().mode === 'fly' ? 'orbit' : 'fly'),
    onSpeedUp: () => setSpeedAction(stepSpeed(useStore.getState().speed, 1)),
    onSpeedDown: () => setSpeedAction(stepSpeed(useStore.getState().speed, -1)),
    onEscape: () => goToStart(),
    onJump: () => {
      // Only kick once per keypress — additional presses while in-air refresh velocity.
      const kick = baseSpeed * 1.4
      if (jumpVel.current < kick) jumpVel.current = kick
    },
    onFlipUp: () => {
      const sceneId = useStore.getState().currentSceneId
      if (sceneId) toggleUpFlip(sceneId)
    },
  })

  // Pointer-lock for mouse-look on desktop
  useEffect(() => {
    if (!enabled) return
    const target = pointerLockTarget ?? gl.domElement
    if (!target) return
    const lockState = () => document.pointerLockElement === target
    const onMouseMove = (e: MouseEvent) => {
      if (!lockState()) return
      const dx = e.movementX
      const dy = e.movementY
      yawRef.current -= dx * 0.0022
      pitchRef.current -= dy * 0.0022
      const HALF = Math.PI / 2 - 0.05
      pitchRef.current = Math.max(-HALF, Math.min(HALF, pitchRef.current))
    }
    const onClick = () => {
      if (!lockState()) target.requestPointerLock?.()
    }
    // Drag fallback (browsers without pointer lock or where user dismisses it)
    const onDown = (e: PointerEvent) => {
      if (lockState()) return
      if (e.pointerType === 'touch') return
      dragging.current = true
      lastPointer.current = { x: e.clientX, y: e.clientY }
      target.setPointerCapture(e.pointerId)
    }
    const onUp = (e: PointerEvent) => {
      dragging.current = false
      lastPointer.current = null
      try { target.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current || !lastPointer.current) return
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }
      yawRef.current -= dx * 0.005
      pitchRef.current -= dy * 0.005
      const HALF = Math.PI / 2 - 0.05
      pitchRef.current = Math.max(-HALF, Math.min(HALF, pitchRef.current))
    }
    // Mouse wheel + trackpad two-finger scroll → dolly forward/back.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      // deltaY positive = scroll down/away → move forward (typical "zoom in" feel)
      // Trackpad pinch sends ctrlKey + small deltaY; treat the same.
      const sign = -Math.sign(e.deltaY)
      const magnitude = Math.min(Math.abs(e.deltaY) / 100, 4)
      wheelVel.current += sign * magnitude
    }
    target.addEventListener('mousemove', onMouseMove as EventListener)
    target.addEventListener('click', onClick)
    target.addEventListener('pointerdown', onDown as EventListener)
    target.addEventListener('pointerup', onUp as EventListener)
    target.addEventListener('pointermove', onPointerMove as EventListener)
    target.addEventListener('wheel', onWheel as EventListener, { passive: false })
    return () => {
      target.removeEventListener('mousemove', onMouseMove as EventListener)
      target.removeEventListener('click', onClick)
      target.removeEventListener('pointerdown', onDown as EventListener)
      target.removeEventListener('pointerup', onUp as EventListener)
      target.removeEventListener('pointermove', onPointerMove as EventListener)
      target.removeEventListener('wheel', onWheel as EventListener)
      if (document.pointerLockElement === target) document.exitPointerLock()
    }
  }, [enabled, gl, pointerLockTarget])

  // Initialise yaw/pitch from current camera once
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
    yawRef.current = e.y
    pitchRef.current = e.x
  }, [camera])

  useFrame((_, dt) => {
    if (!enabled || paused) return
    const dtClamped = Math.min(0.05, dt)

    // Apply right-stick look on touch (rad/s)
    const rs = readStick(rightStick)
    if (rs.x || rs.y) {
      yawRef.current -= rs.x * 1.6 * dtClamped
      pitchRef.current -= rs.y * 1.4 * dtClamped
      const HALF = Math.PI / 2 - 0.05
      pitchRef.current = Math.max(-HALF, Math.min(HALF, pitchRef.current))
    }

    const eul = new THREE.Euler(pitchRef.current, yawRef.current, 0, 'YXZ')
    camera.quaternion.setFromEuler(eul)

    tmpForward.set(0, 0, -1).applyQuaternion(camera.quaternion)
    tmpRight.set(1, 0, 0).applyQuaternion(camera.quaternion)

    // Camera-facing fly: forward follows pitch (up = ascend, down = descend).
    const ls = readStick(leftStick)
    let mx = (keys.current.right ? 1 : 0) - (keys.current.left ? 1 : 0) + ls.x
    let mz = (keys.current.forward ? 1 : 0) - (keys.current.back ? 1 : 0) - ls.y
    const mag = Math.hypot(mx, mz)
    if (mag > 1) { mx /= mag; mz /= mag }

    const boost = keys.current.boost ? 3 : 1
    const v = baseSpeed * speed * boost * dtClamped

    camera.position.addScaledVector(tmpForward, mz * v)
    camera.position.addScaledVector(tmpRight, mx * v)

    // Wheel / trackpad dolly along camera-forward — decays smoothly.
    if (Math.abs(wheelVel.current) > 0.001) {
      camera.position.addScaledVector(tmpForward, wheelVel.current * baseSpeed * dtClamped * 1.5)
      wheelVel.current *= Math.max(0, 1 - dtClamped * 6)
    }

    // Jump: short upward impulse that decays. World-up axis (no fly cheating).
    if (jumpVel.current > 0.01) {
      camera.position.y += jumpVel.current * dtClamped
      jumpVel.current *= Math.max(0, 1 - dtClamped * 3.5) // half-life ~0.2s
    } else {
      jumpVel.current = 0
    }

    if (yLimit) {
      camera.position.y = Math.max(yLimit.min, Math.min(yLimit.max, camera.position.y))
    }
  })

  return null
}

function stepSpeed(s: number, dir: 1 | -1): number {
  const steps = [0.25, 0.5, 1, 2, 4, 8]
  let i = steps.findIndex((v) => v >= s)
  if (i < 0) i = steps.length - 1
  return steps[Math.max(0, Math.min(steps.length - 1, i + dir))]
}
