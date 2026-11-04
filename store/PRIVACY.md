# Privacy Policy — disclose.io browser extension

**Effective date:** 4 November 2026

**Applies to:** the "disclose.io" Chrome extension (`disclose/chrome-extension-v2`)

## Single purpose

The extension shows the current site's vulnerability-disclosure posture, safe
harbor and maturity using the disclose.io directory. It also offers an optional
live security-contact lookup.

## What the extension accesses and sends

The extension reads the active tab's URL locally to derive its registrable domain
(for example, `example.com`). It uses the domain to update the toolbar badge and
popup when you navigate, activate a tab or open the popup. It does not read page
contents or use Chrome's browsing-history API.

The full tab URL, path, query string, page contents and account information are
never sent to the directory or lookup APIs. There is no extension login or user
account.

| When | Destination | What is sent |
|------|-------------|--------------|
| Automatically for the active tab's disclosure check | The directory's public API at `https://api.disclosebot.io/v1/p/directories/adf701` | The registrable domain, domain-derived search text and requested directory program identifiers |
| When you click the live-lookup button | `https://lookup.disclose.io/api/lookup` | The registrable domain and a random browser-session fair-use token; a cached-response identifier may be sent to revalidate a result |

Both services support the disclose.io Project's disclosure tools. Requests omit
cookies and account credentials. As with any HTTPS request, the receiving
services and their hosting providers receive normal connection metadata, such as
the IP address and request headers. The extension sends no page content,
authentication data or advertising identifiers.

The live-lookup token is random, opaque and held only in Chrome's session
storage. It is cleared when the browser session ends and is not an account ID or
cross-browser identifier. The directory requests use a fixed directory Origin
header so the public directory API can accept them.

## Local storage

Directory and lookup results are cached by domain in `chrome.storage.session`
to avoid repeated requests. This includes domains checked during the browser
session; the extension does not keep a chronological navigation log. Directory
cache entries expire after one hour. Lookup results and the random token remain
for the browser session. Session storage is cleared when the browser session ends
or the extension is removed, and is not synced across devices.

## Service logs and use

The receiving services may log queried domains, timestamps, IP addresses, request
headers and the live-lookup fair-use token to provide the lookup, maintain
reliability and prevent abuse. These requests are handled by the services and
their infrastructure providers. They are not used for advertising or unrelated
profiling, and are not sold.

## Limited use

The extension's use and transfer of information follows the Chrome Web Store
User Data Policy, including its Limited Use requirements. Information is used
only to provide and maintain the extension's single purpose and protect its
services. It is not sold, used for advertising or used to determine
creditworthiness or lending eligibility. Human access is limited to the
exceptions allowed by that policy, such as investigating abuse or complying with
law.

## Your choices

Automatic directory checks run while the extension is enabled. Disable or remove
the extension to stop them. The deeper live lookup runs only when you click its
button. End the browser session or remove the extension to clear local session
storage. Contact us with questions about service-held data; the extension has no
account or server-side user profile to manage.

## Contact

Privacy questions: **security@disclose.io**. Source and issues:
[github.com/disclose/chrome-extension-v2](https://github.com/disclose/chrome-extension-v2).

## Changes

We will update this policy and its effective date when the extension's data
practices change.
