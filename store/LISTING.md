# Chrome Web Store listing: disclose.io

Listing text and reviewer declarations for version 0.2.2. Keep disclose.io lowercase.
The dashboard is the source of truth for submission status.

## Product name
disclose.io

## Summary (≤132 chars)
See a site's vulnerability disclosure policy, safe harbor, and maturity at a glance, with data from disclose.io.

## Category
Developer Tools

## Detailed description
disclose.io shows whether the website you're viewing is listed in the disclose.io
vulnerability disclosure directory, and how its published disclosure program is rated.

As you browse, the toolbar icon shows the current site's disclosure posture:

• Best-practice disclosure: the directory's highest maturity tier
• Full safe harbor: published protection for good-faith security research
• A report channel: a published security contact or policy
• Not listed: no matching program found in the directory

Open the popup for safe harbor, bug bounty, policy and security.txt details, plus
the program's disclosure-maturity score when available. Click to run a deeper
security-contact lookup via lookup.disclose.io. A missing directory entry does
not establish that a site has no disclosure policy; a live lookup may find one.

The extension reads the active tab's URL locally to derive its domain. Automatic
directory checks send the domain to the directory's public API at
api.disclosebot.io; they never send the full URL, path, query string or page
contents. An optional live lookup sends the domain and a random browser-session
token to lookup.disclose.io for fair-use limits. No account, advertising or
cross-browser tracking.

disclose.io is a vendor-agnostic, nonprofit project supporting vulnerability
disclosure best practice: bilateral safe harbor, plain-language terms and a
recognizable mark of good faith between researchers and organizations.

Directory data is a disclosure signal, not a security audit or authorization to
test a website. Check the program's current policy and scope before research.

Open source: https://github.com/disclose/chrome-extension-v2

## Single purpose (required field)
Show the current site's vulnerability-disclosure posture, safe harbor and maturity
using the disclose.io directory, with an optional live security-contact lookup.

## Permission justifications
- **tabs**: read the active tab's URL locally to derive its registrable domain,
  update its toolbar badge on navigation or activation, and show that domain's
  disclosure result in the popup. Full URLs, paths and query strings are not sent
  to the lookup services. The extension does not read page contents.
- **storage**: cache domain-keyed directory and lookup results, and a random
  lookup fair-use token, in `chrome.storage.session`. These are cleared when the
  browser session ends and are not synced across devices.
- **alarms**: periodically remove expired directory-cache entries from session
  storage. This alarm does not poll the visited site or run live lookups.
- **declarativeNetRequestWithHostAccess**: apply a packaged static rule that sets
  the Origin header to `https://directory.disclose.io` for requests to the
  disclose.io tenant's `/v1/p/directories/adf701` API path only. The service
  requires this Origin for its public JSON API. The rule does not access or modify visited sites.
- **host_permissions — `https://api.disclosebot.io/*`**: fetch program search
  results and program details from the disclose.io directory's public API.
- **host_permissions — `https://lookup.disclose.io/*`**: run the user's requested
  deeper security-contact lookup and revalidate cached responses.

## Remote code
**No.** All executable JavaScript and the static network rule ship in the ZIP.
The extension fetches JSON data from the two API hosts; it does not download or
execute remote code.

## Data-use disclosure (dashboard Privacy practices tab)
- **Data collected:** Web history, because the active site's domain is sent to
  the directory API for a user-facing disclosure check. The extension reads the
  tab URL locally but does not send the full URL, path, query string or page content.
- The optional live lookup also sends a random, session-only fair-use identifier.
  The receiving services receive normal connection metadata, such as the IP
  address and request headers, as described in the privacy policy.
- **Purpose:** app functionality and service reliability/abuse prevention only.
- **Not sold to third parties:** affirm.
- **Not used or transferred for purposes unrelated to the single purpose:** affirm.
- **Not used for creditworthiness / lending:** affirm.
- **Privacy policy URL:** `https://github.com/disclose/chrome-extension-v2/blob/main/store/PRIVACY.md`.
  This public repository policy is the launch policy. The older Cloudflare page
  still serves the July 2026 draft and must not be used for version 0.2.2.

## Reviewer test instructions
No login or credentials are required. Open a public HTTPS site, click the
extension icon and confirm the directory result or a clear unavailable state.
For a site without a directory match, click **Look this up** to run the optional
live lookup. Try a browser settings page to check the unsupported-page state.
API availability and directory records may change; an API failure should show an
error rather than claim a site has no disclosure program.

## Assets
- Store icon: `dist/icons/level5-128.png`, included in the release ZIP.
- Screenshots: `store/screenshots/*.png` (1280×800).
- Small promo tile: `store/promo-tile-440x280.png` (440×280).
