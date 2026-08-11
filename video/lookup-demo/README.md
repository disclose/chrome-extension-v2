# Live lookup demo source

This Remotion composition generates the focused lookup video embedded in the
repository README. Its capture assets came from the current unpacked extension
running against the live `directory.disclose.io` and `lookup.disclose.io` APIs
in a disposable Chrome for Testing profile.

## Render

```sh
cd video/lookup-demo
bun install
mkdir -p out
bun run render
bun run poster
```

Copy the results to `docs/demo/lookup-demo.mp4` and
`docs/demo/lookup-demo-poster.png`. The committed MP4 uses H.264/yuv420p at
1280×720 and contains no audio track.

The `public/*.png` images intentionally retain Chrome for Testing UI so the
demo remains recognizable as real browser output while exposing no personal
profile state.
