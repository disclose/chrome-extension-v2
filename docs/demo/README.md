# Extension demos

## Directory and maturity lookup

The current focused demo uses captures from the built v0.2.0 extension running
against the live `directory.disclose.io` and `lookup.disclose.io` APIs in a
disposable Chrome for Testing profile. Its main story is the directory record:
membership, maturity score, policy, safe harbor, bounty, and security.txt.

| File | Notes |
|------|-------|
| `lookup-demo.mp4` | 1280×720, 19s, H.264/yuv420p, muted — linked from the top-level README |
| `lookup-demo-poster.png` | README poster from the disclosure-maturity score scene |

It keeps the official disclose.io logo in the corner, gives directory maturity
most of the runtime, and treats the optional first-party route lookup as a short
supporting beat. The reproducible Remotion composition and verified source captures live in
[`video/lookup-demo`](../../video/lookup-demo/).

## Historical popup walkthrough

A short screen recording of the popup, driven against the **built** extension
(`dist/`) using the same mocked `directory.disclose.io` / `lookup.disclose.io`
backend the test suite uses — so it's the real UI, not a mockup.

| File | Notes |
|------|-------|
| `disclose-popup-demo.mp4` | 752×1280, ~16.5s, H.264 — best for sharing |
| `disclose-popup-demo.gif` | 376px, 12fps — inline preview (embedded in the top-level README) |

### What it shows

1. **Level 5** — celebrate gradient, `✦` hero chip, "In directory · L5" pill, maturity 95, four attribute chips
2. **Safe harbor** — "Welcomes security reports — researcher-safe", maturity 65
3. **VDP-only** — "Has a way to report", "No safe harbor ✕", maturity 40
4. **Not listed** — neutral pill, `⚠` chip, "Look this up"
5. **Live lookup** — clicks the button, contact cards render (confidence badge + monospace value), then **Copy → "Copied ✓"**
6. **Retaliation** — the red "Researchers have reported retaliation here" banner

Each state opens with the natural "Checking…" spinner before it resolves.

### Regenerating

```sh
bun run build          # ensure dist/ is current
bun run demo           # writes demo-out/<popup-page>.webm (gitignored) + prints RAW_VIDEO=<path>
```

Then re-encode the largest `demo-out/*.webm` (the popup page) with ffmpeg:

```sh
RAW=demo-out/<popup-page>.webm
ffmpeg -y -i "$RAW" -vf "scale=752:1280:flags=lanczos" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an docs/demo/disclose-popup-demo.mp4
ffmpeg -y -i "$RAW" -vf "fps=12,scale=376:-1:flags=lanczos,palettegen=stats_mode=diff" /tmp/pal.png
ffmpeg -y -i "$RAW" -i /tmp/pal.png -lavfi "fps=12,scale=376:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer" docs/demo/disclose-popup-demo.gif
```

The recorder (`scripts/demo.ts`) is not part of the build or the shipped extension.
