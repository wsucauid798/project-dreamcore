# Scenes

## Inputs

The converter accepts two layouts in `src/assets/scenes/`:

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

Both produce per-scene `manifest.json` files in `public/assets/scenes/<id>/`
that record the bounding box, PCA-derived up axis, suggested camera entry
pose, and LOD ladder.

Run `npm run scenes` to convert (or `npm run scenes:force` to rebuild even
if outputs are up-to-date).

## Notes

- The `.splat` format is the 32-byte/record antimatter15 / drei-compatible
  layout. Anything that reads splats reads ours.
- For the pre-tiled `external/` pyramid we ship `LOD3 / LOD4 / LOD5` only —
  `LOD0`-`LOD2` are 100s of MB each and unsuitable for web.
- Scene orientation is auto-detected via PCA on a 50k-position sample;
  the smallest-variance axis becomes "up", and the scene is translated
  so its detected floor sits at world y=0. PCA can't disambiguate the
  sign of the up axis — press `U` in-experience if a scene loads inverted.
