# Deviations from the "Refined" handoff as shipped

The three drop-in files (`popup.html`, `popup.css`, `popup.ts`) from this handoff were
integrated into `src/popup/` **as authored**, with exactly **one intentional change**.
This file records it so anyone diffing the provenance against the shipped source knows the
divergence is deliberate, not a mistake.

## 1. Neutral state-pill contrast (WCAG AA fix) — `popup.css`

**What changed**

```diff
- .pill--neutral { background: var(--neutral-hero); color: var(--fg-faint); }
+ .pill--neutral { background: var(--neutral-hero); color: var(--fg-muted); }
```

**Why**

The "Not listed" pill in the `none` state used `--fg-faint` (`#6b7280`) on
`--neutral-hero` (`#f3f4f6`). Measured contrast: **4.39:1** — below the WCAG 2.1 AA
floor of **4.5:1** for the pill's 11px text. The repo's own test suite
(`scripts/test.ts`) runs `axe-core` on every state and fails on any serious/critical
violation; the authored handoff tripped `color-contrast` on the `none` state.

Switching the pill text to `--fg-muted` (`#4b5563`) raises it to **6.87:1** (light) and
**9.61:1** (dark, `#c3cde0` on `#1a2437`) — both clear AA — while keeping the pill a muted
neutral gray, so the design intent is preserved. It is one step darker than the authored
value and visually near-identical.

**Verification:** with the fix, `bun run test` reports `axe-core a11y: 0 serious/critical
violations` on all five states (was 1 on `none`).

## Feedback for the design source

The authored drop-in was **below WCAG AA** on the `none`-state neutral pill. This is worth
feeding back to the designer: it's a defect in the handoff tokens, not just a repo edit. The
other four states passed axe as authored. No other deviations were made.

## Everything else is the authored handoff, unchanged

- `popup.html` — as authored (376px width, new `#status-pill` / `#hero-icon` / `#chips` /
  `#maturity` nodes, spinner, `.hero__row`).
- `popup.ts` — as authored (`HERO_GLYPH` / `STATUS_PILL` maps; `renderHeroIcon` /
  `renderStatusPill` / `renderScore` / `renderChips`; rewritten `renderLookupContacts`
  with copy buttons). Verified byte-for-byte non-divergent from the repo commit the
  designer read before drop-in.
- Background worker, message protocol (`getEvaluation` / `runLookup`), and data model
  (`types.ts`, `lib/*`) — untouched, as the handoff requires.
