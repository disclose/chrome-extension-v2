# Privacy Policy — disclose.io browser extension

**Effective date:** 5 July 2026
**Applies to:** the "disclose.io" Chrome extension (`disclose/chrome-extension-v2`)

## Single purpose

The extension has one purpose: to show you, for the site you're currently on,
whether it has a way to report security problems — a vulnerability disclosure
program (VDP), safe harbor for researchers, and its disclosure-maturity level —
using data from the disclose.io directory.

## What the extension accesses, and what it sends

**It reads:** the **registrable domain** of your active tab — e.g. `example.com`
— derived from the tab's URL.

**It never reads or sends:** the full URL, the path or query string, the page
contents, your browsing history beyond the current tab's domain, your identity,
or any account information. The extension has no login and no user account.

**It sends the domain to two disclose.io services:**

| When | Where | Method | What is sent |
|------|-------|--------|--------------|
| Automatically, when you switch to or navigate a tab | directory.disclose.io's widget API | `GET` | the registrable domain, to look up its disclosure status |
| Only when you click **"Look this up"** | `lookup.disclose.io/api/lookup` | `POST` | the registrable domain and a random browser-session token, to run a deeper security-contact lookup and apply fair-use limits |

Both requests carry no cookies, credentials, or account identity. The lookup
token is random, opaque, and stored only in Chrome's session storage: it is
cleared when the browser closes and is not a cookie, account ID, or cross-browser
identifier. Both endpoints are operated by **the disclose.io Project**, a
nonprofit vulnerability-disclosure standardization effort. The domain is **not**
sent to any other party, advertiser, or analytics service.

## Data storage

Results and the random lookup token are cached **locally for the current browser
session** using Chrome's `storage.session` API, to avoid repeat network requests.
This cache is not transmitted to disclose.io or anyone else and is cleared when
the browser closes or you remove the extension.

## Logging by the receiving services

To operate and protect the directory and lookup services, disclose.io may log
requests (including the queried domain and timestamp) per its own operational
policy at [disclose.io](https://disclose.io). These logs are used for service
reliability and abuse prevention, not for advertising or profiling, and are not
sold.

## What we do NOT do

- We do **not** sell or rent your data.
- We do **not** use your data for advertising, creditworthiness, or lending.
- We do **not** track you across sites beyond the single domain check the
  feature requires.
- We do **not** collect personally identifiable information.

## Your choices

The automatic directory check runs only while the extension is installed; remove
the extension to stop it entirely. The deeper lookup only ever runs when you
explicitly click "Look this up."

## Contact

Questions about this policy: **security@disclose.io** · source and issues:
[github.com/disclose/chrome-extension-v2](https://github.com/disclose/chrome-extension-v2).

## Changes

We'll update this page and its effective date if the extension's data practices
change.
