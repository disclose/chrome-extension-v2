# Chrome Web Store — publish runbook

Artifacts + steps to get the disclose.io extension live. Sourced against the
current (July 2026) Chrome Web Store rules.

## ⏸ STATUS — paused 2026-07-05 (RESUME HERE)

**Done & shipped:** disclose.io brand alignment + this store package are merged
to `main` (PR #2). Privacy policy is **LIVE** at
https://disclose-extension-privacy.pages.dev/. `bun run package` →
`disclose-extension.zip` builds green from `main`. Publisher account =
**casey@disclose.io**.

**Blocked on:** the manual dashboard submission. Chrome forbids extension-based
automation on the Web Store domain (*"The extensions gallery cannot be scripted"*),
so computer-use CANNOT drive it — the first submission is human-only.

**Resume:** sign into https://chrome.google.com/webstore/devconsole/ as
casey@disclose.io and follow "Publish steps" below — upload `disclose-extension.zip`,
paste from `LISTING.md`, add `screenshots/*.png` + `promo-tile-440x280.png`, set
the privacy URL, submit.

**Automation for later:** once the item exists + OAuth is set up, *version updates*
can go via the Chrome Web Store API (package → upload → publish), no dashboard.
The first listing (metadata + screenshots) is dashboard-only regardless.

## In this folder
- `PRIVACY.md` / `privacy.html` — the privacy policy (host the HTML at a public URL)
- `LISTING.md` — name, description, single-purpose, permission justifications,
  data-use disclosure answers (paste into the dashboard)
- `make-assets.ts` — regenerates the store screenshots + promo tile
- `screenshots/*.png` — 1280×800 store screenshots
- `promo-tile-440x280.png` — small promo tile
- the package itself: `bun run package` at repo root → `disclose-extension.zip`

## Prerequisites (the human parts)
1. **Merge PR #1** and build from `main` (finalized brand build).
2. ✅ **Owning account** — **casey@disclose.io** (dev account created 2026-07-05).
   Later option for org continuity: convert/transfer to a disclose.io **Group
   Publisher** so ownership isn't tied to one person (can be done after the
   item's first publish).
3. **Developer registration** — one-time **$5** fee, covers up to 20 extensions
   (pay once on `casey@disclose.io` if not already done).
4. ✅ **Privacy policy hosted** — LIVE at
   **https://disclose-extension-privacy.pages.dev/** (Cloudflare Pages project
   `disclose-extension-privacy`, deployed from `privacy.html`). Already in
   `LISTING.md`. Optional: move to a `disclose.io/extension-privacy` path and
   swap the URL before submitting.

## Publish steps
1. `bun run package` → `disclose-extension.zip`.
2. developer.chrome.com → Web Store dashboard → **New item** → upload the zip.
3. Fill the listing from `LISTING.md` (name, summary, description, category,
   single purpose).
4. Upload assets: 128 icon, `screenshots/*.png`, `promo-tile-440x280.png`.
5. **Privacy practices** tab: enter the hosted privacy URL, paste the permission
   justifications, and tick the data-use disclosures per `LISTING.md`.
6. Submit for review. Typical window: **2–5 business days**. Top rejection
   causes: over-broad permissions, missing privacy policy, description mismatch —
   all pre-addressed here (watch the `tabs` justification).

## After approval
- Future updates: bump `manifest.json` version, `bun run package`, upload a new
  package (updates can be automated later via the CWS API; first publish is
  dashboard-only).
