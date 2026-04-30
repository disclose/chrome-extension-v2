# disclose.io Chrome Extension

See, at a glance, whether the website you're visiting welcomes security researchers — and where to report a vulnerability if you find one.

The extension polls [directory.disclose.io](https://directory.disclose.io) for the current site's eTLD+1 and turns the toolbar icon purple based on whether the site has a vulnerability disclosure policy (VDP) and whether it offers researchers safe harbor. When the site isn't in the directory, you can run a deeper lookup against [lookup.disclose.io](https://lookup.disclose.io) on demand.

## Two audiences, one icon

- **Security researchers** — find a contact channel for the vuln you just discovered, in flight, without leaving the page.
- **Everyone else** — recognize companies that take their users' security seriously, and clearly distinguish those that don't publish a way to report security problems at all.

## Icon states

| Icon | When | Verdict |
| --- | --- | --- |
| gray dot | Page is being evaluated | "Checking…" |
| gray "?" | Site is not in the disclose.io directory | "No published way to report security problems" |
| light purple | Site has a security-report channel | "Has a way to report security issues" |
| purple | Site has full safe harbor | "Welcomes security reports — researcher-safe" |
| deep purple ✨ | Maturity Level 5 / score ≥ 80 | "Best-practice security disclosure" |

## How it works

- On every top-frame navigation, the background service worker takes the active tab's eTLD+1 and queries `directory.disclose.io/?q=<name>` for matching programs (mirroring the proven query strategy used in `lookup-disclose-io/src/steps/diodb.ts`).
- Matched programs are filtered with the same hosting-domain filter and entity-match logic that the `lookup.disclose.io` server uses, so a Bugcrowd-hosted policy doesn't make `bugcrowd.com` match every program.
- Results are cached in `chrome.storage.session` for 1 hour per domain.
- When you click the icon and the site has no match, the popup runs `POST https://lookup.disclose.io/api/lookup` for a richer answer (security.txt, /security page probe, retaliation history overlay).

The extension never sends your URLs or page contents anywhere. It only sends the current site's eTLD+1.

No new infrastructure: this extension consumes the existing `directory.disclose.io` and `lookup.disclose.io` endpoints.

## Development

```sh
bun install
bun run build       # produces dist/
bun run test        # mocked Playwright suite + axe-core a11y scan
SMOKE=1 bun run test  # also hits production directory.disclose.io for a regression sanity check
bun run package     # produces disclose-extension.zip for Web Store upload
```

### Loading the extension

1. `bun run build`
2. Open `chrome://extensions` → enable **Developer mode**
3. Click **Load unpacked** and pick `dist/`

### Project layout

```
src/
  background.ts       # MV3 service worker, tab listeners, debounce, dedupe
  popup/              # popup HTML, TypeScript, CSS
  lib/
    directory.ts      # live directory.disclose.io poll (HTML → ProgramSnapshot)
    match.ts          # eTLD+1, hosting-domain filter, entity matching
    maturity.ts       # icon-state derivation + verdict copy
    lookup.ts         # POST lookup.disclose.io/api/lookup
    icon.ts           # chrome.action setIcon/setTitle
    cache.ts          # chrome.storage.session helpers, in-flight dedupe
scripts/
  build.ts            # esbuild bundle + sharp icon rendering
  test.ts             # unattended Playwright runner with mocked endpoints
test/
  fixtures/           # canned directory + lookup HTML/JSON responses
docs/screenshots/     # archive of the 5 popup states
```

### Re-syncing the parser

The HTML structure of `directory.disclose.io` evolves. When a parse drifts:

1. Compare `src/lib/directory.ts` against `lookup-disclose-io/src/steps/diodb.ts` (the canonical implementation).
2. Update the regexes in `parseSearchRows`, `extractDetailField`, `extractDetailHref`, `extractBonusFlag`.
3. Run `SMOKE=1 bun run test` — the live smoke check exercises real production HTML against well-known programs (Google, Cloudflare, Shopify) and a known-absent domain.

## Privacy

- Only the current tab's eTLD+1 is sent — never the URL, query string, or page contents.
- The directory query happens automatically; the lookup query (`lookup.disclose.io`) only happens when you click the action button.
- All caches are scoped to `chrome.storage.session` and are cleared when the browser restarts. There is no persistent storage of your browsing history or per-site lookup logs.
- The extension declares `host_permissions` only for `directory.disclose.io` and `lookup.disclose.io` — it can't read or fetch from any other origin.

## License

Open-source under the disclose.io umbrella. See LICENSE (TBD).
