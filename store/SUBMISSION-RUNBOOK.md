# Chrome Web Store — submission runbook (run from any machine)

Everything needed to submit **disclose.io** (this extension) to the Chrome Web Store.

> ⚠️ **The CWS dev console cannot be driven by Claude in-chrome / computer-use.** Chrome
> refuses extension-based automation on the Web Store domain (*"The extensions gallery
> cannot be scripted"*). The submission is **human-only** — you do the clicks. Claude can
> help you read the page, find fields, and copy text, but it **cannot** upload the zip or
> hit Submit for you. Budget ~5–10 minutes of manual work.

## 0. Get the files onto this machine

Everything except the zip is committed to the repo; the zip is on the GitHub release.

```bash
# assets (listing text, screenshots, promo tile, privacy policy):
git clone https://github.com/disclose/chrome-extension-v2
cd chrome-extension-v2

# the package itself — download the prebuilt zip from the release:
gh release download v0.1.0 --repo disclose/chrome-extension-v2 --pattern 'disclose-extension.zip'
#   …or, if gh isn't set up, grab it from:
#   https://github.com/disclose/chrome-extension-v2/releases/tag/v0.1.0
#   …or build it fresh (no Playwright needed):  bun install --ignore-scripts && bun run package
```

After this you have, in the repo root / `store/`:
- `disclose-extension.zip` — the MV3 package to upload (v0.1.0)
- `store/LISTING.md` — every text field, ready to paste
- `store/screenshots/*.png` — 3 store screenshots (1280×800)
- `store/promo-tile-440x280.png` — small promo tile
- privacy policy is already hosted (see step 3)

## 1. Prerequisites (one-time)
- Sign in to the dev console as **casey@disclose.io** (the publisher account).
- Pay the one-time **$5** Chrome Web Store developer registration fee if not already done (covers up to 20 extensions).

## 2. Create the item
1. Go to **https://chrome.google.com/webstore/devconsole/**.
2. **New item** → upload **`disclose-extension.zip`** → wait for it to process.

## 3. Fill the listing (paste from `store/LISTING.md`)
- **Name:** `disclose.io` (lowercase — brand style)
- **Summary** (≤132 chars), **Description**, **Category** (Developer Tools) — all in `LISTING.md`.
- **Single purpose** field — in `LISTING.md`.
- **Permission justifications** (`tabs`, `storage`, host permissions) — reviewers read these; in `LISTING.md`.
- **Privacy policy URL:** `https://disclose-extension-privacy.pages.dev/`
- **Data use disclosures** — answers are in `LISTING.md` (only the site's domain is sent; no PII, no tracking, no sale of data).

## 4. Assets
- **Screenshots:** upload `store/screenshots/01-level5.png`, `02-safe-harbor.png`, `03-none.png` (1280×800).
- **Small promo tile:** `store/promo-tile-440x280.png`.
- **Icon:** the 128px icon ships inside the zip (`icons/*-128.png`); the dashboard pulls it from the manifest.

## 5. Submit
- Review everything, then **Submit for review**. First-review turnaround is typically a few days.

## After it's published — automate future updates
Once the item exists, *version updates* CAN skip the dashboard via the **Chrome Web Store API**
(package → `PUT` upload → `POST` publish) with an OAuth client + refresh token. Set that up once
and future releases are one command — only this first listing is dashboard-only.

## Notes
- Optional: move the privacy page to a `disclose.io/extension-privacy` path and swap the URL before submitting.
- Optional: after first publish, convert the listing to a disclose.io **Group Publisher** so ownership isn't tied to one person.
