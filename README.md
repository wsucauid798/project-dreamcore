# Project Dreamcore

![Project Dreamcore start screen](src/assets/images/artwork/start-screen.png)

A cinematic, game-like walk-through of our school campus, reconstructed
from 3D Gaussian Splat captures. Fly, orbit and pause inside every
floor of the building, the library, and the open campus.

## Showcase mode (one click)

Double-click the launcher for your OS in [`scripts/launchers/`](scripts/launchers/):

- **`Launch-Dreamcore-Windows.bat`**
- **`Launch-Dreamcore-Mac.command`**

It installs deps if needed, builds, and serves the app — your browser opens automatically.

> First time on Mac: right-click the `.command` file → Open (to bypass Gatekeeper).

## Quick start (developer)

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

# 5. Serve the build (no deps; opens the browser)
npm start
```

`src/assets/scenes/` and `public/assets/scenes/` are git-ignored — the
former because the source `.ply` files are huge, the latter because the
optimised output is regenerable from source.

## Docs

- [Scenes](_docs/scenes.md) — input formats, conversion pipeline, technical notes
- [Controls](_docs/controls.md) — keyboard, mouse, touch
- [Architecture](_docs/architecture.md) — file layout
