# Contributing

Thanks for helping make disclosure posture visible to everyone. This is a small, focused codebase — plain TypeScript, no frameworks — and contributions are welcome.

## Dev setup

```sh
bun install          # also installs the Playwright Chromium the tests use
bun run build        # esbuild bundle + icon rendering → dist/
bun run test         # mocked Playwright suite + axe-core a11y scan
```

Load `dist/` via `chrome://extensions` → **Developer mode** → **Load unpacked**.

Useful extras:

```sh
bun run iterate      # build + test in one go
SMOKE=1 bun run test # also hits production directory.disclose.io as a sanity check
bun run demo         # records the walkthrough demo GIF
```

## Before you open a PR

- `bunx tsc --noEmit` is clean
- `bun run build` succeeds
- `bun run test` passes — this includes the **axe-core accessibility gate** (0 serious/critical violations). Accessibility regressions don't merge.
- UI changes include a popup screenshot and follow the disclose.io design tokens (`src/popup/popup.css` `:root`, brand `#673AB6`)

## What goes where

- **Extension bugs and features** → issues and PRs here.
- **"The badge is wrong for site X"** → that's directory data, not extension code. The disclose.io directory is the system of record: https://directory.disclose.io
- **Security issues** → see [SECURITY.md](SECURITY.md) — please don't open a public issue.

## Releases

Maintainers cut releases; the version in `manifest.json` is the source of truth.
