# Handoff: disclose.io extension popup — "Refined" redesign

## Overview
A polished visual + interaction pass on the browser-extension popup for the
disclose.io project (repo `disclose/chrome-extension-v2`; backend
`lookup.disclose.io`). The popup tells a user, for the current site, whether it
has a way to report security problems and whether researchers are protected —
across five directory states — and lets them run a live lookup.

This redesign **keeps the existing architecture untouched**: the background
worker, message protocol (`getEvaluation` / `runLookup`), and data model
(`IconState`, `ProgramSnapshot`, `TabEvaluation`, `LookupReport`) are unchanged.
Only the popup's presentation layer (`src/popup/`) is updated. No new data is
required from the worker — every new UI element reads fields that already exist.

## ⚡ TL;DR for Claude Code
This bundle contains **production-ready drop-in files**, not just references:

```
src/popup/popup.html   → replace src/popup/popup.html
src/popup/popup.css    → replace src/popup/popup.css
src/popup/popup.ts     → replace src/popup/popup.ts
```

Then:
```bash
bun install        # if needed
bun run build      # or your existing build script
# load unpacked from the build output dir; open the popup on a few test tabs
```

The three files are written against `popup.ts` **as it existed at the commit
read during design** (imports `verdictFor`, `safeHarborLabel` from
`../lib/maturity`; imports types from `../types`). If your `popup.ts` has since
diverged, do **not** blind-overwrite — instead apply the additions marked with
`// NEW` comments (see "What changed in popup.ts" below). Everything else in the
file is byte-for-byte the original logic.

> Note: the files under `reference/` are HTML/design-component prototypes built
> outside the extension's stack. They are **visual references only** — do not
> ship them. The drop-in code lives under `src/popup/`.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, and interactions.
Recreate pixel-for-pixel. The extension already uses plain HTML/CSS/TS, so the
provided files _are_ the implementation — no framework translation needed.

---

## What changed vs. the current popup

Added, all inside the existing vertical stack:
1. **State pill** in the brand bar (`#status-pill`) — e.g. "In directory · L5".
2. **Hero icon chip** (`#hero-icon`) — a state glyph in a rounded square.
3. **Checking spinner** — a spinner shows while `data-state="unknown"`.
4. **Attribute chips** (`#chips`) — Safe harbor / Bounty / Policy / security.txt
   with ✓/✕ marks.
5. **Maturity score row** (`#maturity`) inside the hero — level pill + numeric
   score, shown only when `program.maturityScore` is a number.
6. **Richer live-lookup cards** — confidence badge + monospace value + Copy
   button per contact.
7. **CSS-variable theming + OS dark mode** via `prefers-color-scheme` (no runtime
   toggle — see "Dark mode" note).

Unchanged: message flow, retaliation detection (`source === 'research-threats'`),
"Why this matters", "Disclosure details" grid, submit CTA, privacy footer,
directory link relabel, and the `?testTabId=` test override.

---

## Screens / Views

Single popup, **376px** wide (was 360px — the extra 16px gives the chips room;
change `body { width }` in `popup.css` back to 360 if you prefer).

### State: `unknown` (Checking…)
- Neutral hero, animated spinner in the icon slot, headline "Checking…", detail
  "Looking this site up in the disclose.io directory." No pill, chips, or score.

### State: `level5`
- Hero background: `--celebrate` gradient, purple border. Glyph `✦` (warn/amber).
- Pill: "In directory · L5" (solid purple). Score row visible.
- Chips: Safe harbor ✓, Bug bounty ✓, Policy ✓, security.txt ✓.
- Headline "✨ Best-practice security disclosure".

### State: `safe-harbor`
- Hero background: `--purple-soft`, purple border. Glyph `✓` (purple).
- Pill: "In directory". Chips reflect program fields.
- Headline "✓ Welcomes security reports — researcher-safe".

### State: `vdp`
- Hero background: `--purple-softer`, neutral border. Glyph `✓`.
- Chips typically show "No safe harbor" ✕.
- Headline "✓ Has a way to report security issues".

### State: `none`
- Hero background: `--neutral-hero`. Glyph `⚠` (warn). Pill: "Not listed".
- No chips / score / details section. Button reads "Look this up".
- Headline "⚠ No published way to report security problems".

### Live lookup + retaliation (after pressing the button)
- Button → "Looking up…" (disabled, inline spinner) → "Re-run live lookup".
- Status line under the button.
- If any contact has `source === 'research-threats'`, the red retaliation banner
  appears above the results.
- Results: one card per non-threat contact (max 8) with label, confidence badge,
  `type · source` meta, monospace value, and a Copy button. Empty → "No published
  security contact found for this site."

Exact headline/detail copy is produced by `verdictFor()` in `src/lib/maturity.ts`
— unchanged, reused as-is.

---

## Interactions & Behavior
- **Expanders**: "Why this matters" and "Disclosure details" use native
  `<details>`/`<summary>` (work without JS). Caret rotates 90° on open (CSS).
- **Look this up**: sends `runLookup`; disables + spinner while pending; renders
  retaliation then contacts; writes elapsed-time status (special-cases >5s cold
  start, preserved from original).
- **Copy button**: `navigator.clipboard.writeText(contact.value)`, flips to
  "Copied ✓" for 1.4s.
- **Reduced motion**: all transitions/animations disabled under
  `prefers-reduced-motion: reduce`.

## State Management
No new app state. `renderHero(state, program)` now also calls
`renderHeroIcon`, `renderStatusPill`, `renderChips`, `renderScore`. Hero
background per state is pure CSS via `[data-state="…"]` on `#root`
(`root.dataset.state = state`, already set in the original `renderHero`).

## What changed in popup.ts (for manual merge)
If merging by hand instead of overwriting, add these — each is marked `// NEW`
in the provided file:
- `HERO_GLYPH`, `STATUS_PILL` lookup maps (keyed by `IconState`).
- `renderHeroIcon(state)`, `renderStatusPill(state)`, `renderScore(program)`,
  `renderChips(program)`.
- Four calls appended inside the existing `renderHero()`.
- `renderLookupContacts()` rewritten to emit `.contact__*` card markup + Copy
  button (same data, richer DOM).
Everything else is identical to the original.

## Dark mode
The popup follows the OS via `@media (prefers-color-scheme: dark)` — this matches
Chrome/Firefox extension conventions and needs no storage or toggle. The
prototype's ☾/☀ button and the "Demo" site switcher are **prototype-only** and are
intentionally **not** in the production files. If you want a manual, persisted
theme override, add a `chrome.storage.local` flag and set
`data-theme="dark"` on `<html>`, then duplicate the dark block under
`[data-theme="dark"]`.

## Design Tokens
Defined as CSS custom properties at the top of `popup.css` (light + dark).

Light:
- Purple `#6c2bd9`, deep `#4c1d95`, soft `#ede9fe`, softer `#f5f3ff`
- Celebrate gradient `linear-gradient(135deg,#ede9fe,#fce7f3)`
- fg `#111827`, muted `#4b5563`, faint `#6b7280`
- border `#e5e7eb`, border-strong `#d1d5db`
- alert `#b91c1c` / bg `#fef2f2`; warn `#b45309`; positive `#047857`
- chip `#f9fafb`; neutral-hero `#f3f4f6`
- Confidence badges: high `#dcfce7`/`#047857`, med `#ede9fe`/`#6c2bd9`, low `#fef2f2`/`#b45309`

Dark (see `@media` block): purple lightens to `#b39dfb`, bg `#0f172a`,
surface `#131c31`, borders `#243247`/`#3a4a63`, etc.

Scale: font 11 / 12 / 12.5 / 13 / 16px · radius 8 / 9 / 12 / 20px · gap 6–12px ·
popup padding 14–16px · hero padding 14px.

Typography: `system-ui, -apple-system, "Segoe UI", sans-serif`; monospace values
in `ui-monospace, SFMono-Regular, Menlo, monospace`. Headline 16/700/-0.01em.

## Alternate directions (optional)
The prototype shows three directions; **Refined** is shipped here.
- **Signal** — score-forward: a conic-gradient maturity gauge + a 5-segment
  meter replacing the chips row. Data: `maturityScore` (gauge = `score*3.6`deg)
  and level number parsed from `maturityLevel`. All present in `ProgramSnapshot`.
- **Compact** — dense/researcher: one-line status strip + an immediate
  copy-ready "report to" contact (`program.contactEmail ?? contactUrl`) above the
  fold. Uses the same data.
Both are fully built in `reference/DisclosePopup.dc.html` (switch the `variant`
prop). Ask if you want either promoted to production files.

## Assets
No image assets. The disclose.io mark is the `⌖` (U+2316) glyph. State glyphs are
Unicode: `✦ ✓ ⚠ ✕ ⚑ ✨`.

## Files
Drop-in (this bundle → your repo):
- `src/popup/popup.html`
- `src/popup/popup.css`
- `src/popup/popup.ts`

Reference only (do not ship):
- `reference/DisclosePopup.dc.html` — the interactive component (all 3 variants)
- `reference/Disclose Popup Prototype.dc.html` — the comparison canvas
- `reference/state-*.png` — current-build screenshots of each state
- `reference/compact-lookup-flow.png` — live lookup + retaliation
