# Project Dreamcore

![Project Dreamcore start screen](src/assets/images/artwork/start-screen.png)

A cinematic, game-like walk-through of our school campus, reconstructed
from 3D Gaussian Splat captures. Fly, orbit and pause inside every
floor of the building, the library, and the open campus.

## Quick start

```bash
# 1. Install
npm install

# 2. Convert source 3DGS .ply files → web-optimised .splat + manifest
#    (Reads src/assets/scenes/, writes public/assets/scenes/)
npm run scenes

# 3. Dev server
npm run dev

# 4. Production build
npm run build
```

`src/assets/scenes/` and `public/assets/scenes/` are git-ignored — the
former because the source `.ply` files are huge, the latter because the
optimised output is regenerable from source.

## Scene inputs

The converter accepts two layouts:

```
src/assets/scenes/
  1floor.ply              ← single-block 3DGS scene
  2floor.ply
  …
  library.ply
  external/               ← pre-tiled LOD pyramid
    geo_desc.json         (optional: declares LOCAL_ENU_CS up-axis)
    metadata.xml          (optional: same purpose)
    Block000/
      LOD0/point_cloud.ply
      LOD1/point_cloud.ply
      …
    Block001/…
```

Both produce per-scene `manifest.json` files that record the bounding
box, PCA-derived up axis, suggested camera entry pose, and LOD ladder.

## Controls

| | |
|---|---|
| `W A S D` / arrows | Move along camera direction |
| Mouse drag | Look around |
| Mouse / trackpad wheel | Dolly forward / back |
| `Space` | Jump (gamer-standard upward hop) |
| `Shift` | Boost — 3× speed while held |
| `PgUp` / `PgDn` (also `[ ]`) | Cinematic speed up / slow down |
| `P` | Pause / resume |
| `M` | Toggle Fly / Orbit mode |
| `U` | Flip up-axis (if a scene loads inverted) |
| `Tab` | Open scene drawer |
| `H` / `?` | Help overlay |
| `Esc` | Exit to start screen |
| Touch | Two on-screen joysticks (mobile auto-detected) |

## Architecture

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

## Notes

- The `.splat` format is the 32-byte/record antimatter15 / drei-compatible
  layout. Anything that reads splats reads ours.
- For the pre-tiled `external/` pyramid we ship `LOD3 / LOD4 / LOD5` only —
  `LOD0`-`LOD2` are 100s of MB each and unsuitable for web.
- Scene orientation is auto-detected via PCA on a 50k-position sample;
  the smallest-variance axis becomes "up", and the scene is translated
  so its detected floor sits at world y=0.
