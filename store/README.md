# Chrome Web Store — publish runbook

Artifacts + steps to get the disclose.io extension live. Sourced against the
current (July 2026) Chrome Web Store rules.

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
2. **Owning account** — publish under a **disclose.io-owned Google account**,
   ideally a **Group Publisher** so ownership isn't tied to one person.
   Decision needed: which Google account?
3. **Developer registration** — one-time **$5** fee, covers up to 20 extensions.
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
