# Security Policy

This is a disclose.io project. Welcoming security research isn't just what this extension measures — it's how this repository operates.

## Reporting a vulnerability

Please use **[GitHub private vulnerability reporting](https://github.com/disclose/chrome-extension-v2/security/advisories/new)** — the "Report a vulnerability" button on this repository's Security tab. It's private, tracked, and goes straight to the maintainers.

Not sure whether your finding belongs here (the extension) or in a hosted disclose.io service ([directory.disclose.io](https://directory.disclose.io), [lookup.disclose.io](https://lookup.disclose.io))? Report it here anyway and we'll route it.

## Scope

In scope for this repository:

- The extension code (`src/`), build pipeline (`scripts/`), and the packaged artifact shipped in releases
- The store packaging and assets (`store/`)

The hosted disclose.io services the extension talks to are separate systems; reports about them are still welcome through the same channel and will be routed to the right place.

## Safe harbor

We support safe harbor for good-faith security research, in the spirit of the [disclose.io Core Terms](https://github.com/disclose/dioterms) — the canonical safe-harbor language this project maintains:

- This policy authorizes good-faith research on **this repository's code and your own local installation of the extension**. It does **not** authorize testing the hosted disclose.io services (directory.disclose.io, lookup.disclose.io) or any third-party site — those have their own policies.
- If you make a good-faith effort to avoid privacy violations, data destruction, and interruption of service, we will consider your research authorized under this policy and will not pursue or support legal action against you for it.
- We speak only for this project; we cannot bind third parties.

## What to expect

- Acknowledgment within **7 days**
- Updates as we triage and fix
- Credit in the release notes, if you'd like it
