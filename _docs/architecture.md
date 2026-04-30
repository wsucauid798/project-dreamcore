# Architecture

```
scripts/
  convert-scenes.mjs     PLY 3DGS → 32B/splat .splat + manifest.json
  lib/
    ply.mjs              Streaming PLY header parser + body iterator
    splat.mjs            Splat encoder, importance metric for LOD
    orient.mjs           PCA / Jacobi eigendecomposition for up-axis
src/
  state/store.ts         zustand store (phase, scene, mode, speed, …)
  lib/
    capabilities.ts      WebGL2 + mobile + perf detection
    orient.ts            Three.js orientation matrix from manifest
  scene/
    SplatScene.tsx       Loads splats via drei <Splat>, applies frame
    SceneTransition.tsx  Fade-to-black overlay between scenes
  controls/
    FlyControls.tsx      WASD / mouse / wheel / touch / jump / boost
    OrbitMode.tsx        OrbitControls binding
    useKeyboard.ts       Key state ref + one-shot hotkeys
    useTouchInput.ts     Two thumbstick refs (no React re-renders)
  app/
    StartScreen.tsx      Hero, CTA into the first indoor scene
    LoadingScreen.tsx    Streaming-splats placeholder
    Experience.tsx       R3F canvas + scene + controls + HUD
  ui/
    HUD.tsx              Compositor for the in-experience overlays
    TopBar.tsx           Exit, scene, LOD, flip, pause, drawer, help
    Speedometer.tsx      Speed multiplier strip
    ModeSwitcher.tsx     Fly / Orbit toggle
    SceneDrawer.tsx      Right-side scene picker
    PauseVeil.tsx        Pause overlay
    HelpOverlay.tsx      Controls sheet
    MobileJoysticks.tsx  On-screen sticks (mobile)
```
