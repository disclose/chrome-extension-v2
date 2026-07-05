# Chrome Web Store listing — disclose.io

Everything the dashboard asks for, drafted and ready to paste. Keep disclose.io
lowercase per the brand style guide.

## Product name
disclose.io

## Summary (≤132 chars)
See if a website welcomes security researchers — VDP, safe harbor, and disclosure maturity at a glance, from the disclose.io directory.

## Category
Developer Tools (alt: Productivity)

## Detailed description
disclose.io tells you, at a glance, whether the website you're on has a safe,
clear way to report security problems.

The moment you land on a site, the toolbar icon shows its vulnerability-
disclosure posture — pulled live from the disclose.io directory:

• Best-practice (Level 5) — a clear, researcher-safe disclosure program
• Welcomes reports with safe harbor — protects good-faith research
• Has a report channel — a security contact, without full safe harbor
• Not listed — no published way to report security problems

Open the popup for the details: safe harbor, bug bounty, published policy, and
security.txt, plus the site's disclosure-maturity score. One click runs a deeper
security-contact lookup via lookup.disclose.io.

Privacy-first by design: the extension only ever sends the current site's
**domain** to disclose.io — never your URL, your page contents, or anything that
identifies you. No account, no tracking, no ads.

disclose.io is a vendor-agnostic, nonprofit project driving the adoption of
vulnerability-disclosure best practice — bilateral safe harbor, plain-language
terms, and a recognizable mark of good faith between hackers and organizations.

Open source: github.com/disclose/chrome-extension-v2

## Single purpose (required field)
Show the visited site's vulnerability-disclosure posture — VDP, safe harbor, and
disclosure maturity — using data from the disclose.io directory.

## Permission justifications (reviewers read these)
- **tabs** — to read the active tab's URL so the extension can derive the site's
  domain and update the badge as you move between tabs. Only the domain is used;
  URL/path/content are never stored or sent.
- **storage** — cache directory results locally to avoid repeat network requests.
- **alarms** — schedule periodic cache refresh/expiry so results stay current
  without polling.
- **host_permissions: directory.disclose.io, lookup.disclose.io** — the only two
  hosts the extension contacts, to look up disclosure status and run lookups.

> ⚠️ Review-risk note: `tabs` is a broad permission and is the field most likely
> to draw a reviewer question. It is genuinely required for the badge-on-tab-
> switch behavior (which observes all tabs, not just the active one). If we ever
> want to de-risk, dropping the auto-badge and using `activeTab` + host
> permissions instead would remove `tabs` — a product tradeoff, not a bug.

## Data-use disclosure (dashboard "Privacy practices" tab)
Declare truthfully — the 2026 rules (enforced Aug 1 2026) require this:
- **Data collected:** *Web history* — the extension reads the domain of the site
  you're viewing to check it against the directory. (No authentication info, no
  personal communications, no financial/health/location data, no personal IDs.)
- **Purpose:** app functionality only (the disclosure-status check).
- **Not sold to third parties:** ✅ affirm.
- **Not used or transferred for purposes unrelated to the single purpose:** ✅ affirm.
- **Not used for creditworthiness / lending:** ✅ affirm.
- **Privacy policy URL:** **https://disclose-extension-privacy.pages.dev/** (LIVE
  — deployed from `store/privacy.html`). Optional: move to a disclose.io path
  (e.g. `disclose.io/extension-privacy`) before submission and swap this URL.

## Assets checklist
- [x] Store icon 128×128 — `dist/icons/level5-128.png` (or a neutral brand mark)
- [x] Screenshots 1280×800 — `store/screenshots/*.png`
- [x] Small promo tile 440×280 — `store/promo-tile-440x280.png`
- [x] Privacy policy hosted — https://disclose-extension-privacy.pages.dev/
