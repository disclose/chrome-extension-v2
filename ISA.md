---
task: "Release reconciled disclose Chrome extension"
slug: 20260811-071845_lookup-api-reconciliation
project: chrome-extension-v2
effort: E4
effort_source: auto
phase: execute
progress: 16/20
mode: iterate
started: 2026-08-11T07:18:45Z
updated: 2026-08-11T08:28:23Z
iteration: 2
principal_stated_goal: "get this tested and finished, package it up, push to the repo with a version update and a compiled version that people can easily download and use"
principal_stated_goal_source: explicit-revision
principal_stated_goal_signal: 4
principal_stated_goal_locked: 2026-08-11T08:17:35Z
context_sufficient: true
interview_invoked: false
current_state: "The popup consumes a flat legacy contact list, and its directory status check scrapes server-rendered HTML instead of the supported widget API."
ideal_state: "Version 0.2.0 is merged to main, tagged, and published with a checksum-verifiable extension archive that a person can download, unpack, and load directly in Chrome."
capabilities_invoked:
  - ISA
  - Interceptor
---

## Problem

`lookup.disclose.io` now returns route-aware reporting results: owner channels, authorized managed agents, responsible operators, related parties, inferred leads, and coordinator backstops are distinct. The extension only models a flat contact list, so it cannot explain who a channel reaches or use the API's validator and session contract.

Its automatic directory check also parses the public SSR page. The directory's supported data source is the DiscloseBot widget JSON API, which has different search semantics and an origin gate that must be exercised from the actual extension context.

## Vision

A person opening the extension can immediately tell whether a live lookup found an owner route, an authorized disclosure agent, or only a fallback. Re-running the same lookup is privacy-preserving and validator-aware; the automatic badge uses the directory's structured API rather than page markup; and both results render in Chrome.

## Out of Scope

- No change to `lookup.disclose.io`'s existing in-progress branch or experimental `/api/evidence` endpoint.
- No persistent cross-browser identifier, account, analytics, or page-URL transmission.
- No redesign of directory-derived maturity verdicts or toolbar icon semantics.
- No fallback to undocumented directory HTML parsing after the API integration lands.
- No Chrome Web Store submission or signing; the release archive remains an unpacked developer-mode install until the existing store review completes.

## Principles

- Route provenance is more important than presenting a longer flat contact list.
- Additive API fields must be accepted without breaking legacy responses that omit them.
- The extension sends only the registrable domain and a random browser-session token required for fair-use accounting.
- Structured directory data is preferred over brittle page parsing, but browser-origin compatibility must be proven rather than assumed.

## Constraints

- Keep the MV3 extension in TypeScript and add only the narrowly scoped permission required to satisfy the directory API's origin gate.
- Preserve `contacts` compatibility while preferring ordered `contactGroups` when supplied.
- Cache responses only in `chrome.storage.session`; reuse no result after a browser restart.
- Browser-facing claims close only with real Chrome verification through Interceptor.
- Directory API access uses `widgets.disclosebot.io/directory/adf701` and its documented tenant response, never a guessed endpoint.

## Dependencies

requires: lookup-disclose-io — checked-in `openapi.yaml` is the contract for `POST /api/lookup`; experimental `/api/evidence` remains excluded.
requires: directory-disclose-io — `widgets.disclosebot.io/directory/adf701(.json)` is the current public directory widget API for the disclose.io tenant.

## Goal

"get this tested and finished, package it up, push to the repo with a version update and a compiled version that people can easily download and use" Version 0.2.0 must contain the reconciled lookup and directory integrations, pass contract, type, build, CI, and real-Chrome verification, land on the repository's main branch, and be published as a GitHub release with a directly installable zip plus checksum.

## Criteria

- [x] ISC-1: Lookup TypeScript models current route-aware response fields.
- [x] ISC-2: Lookup requests include a valid session header.
- [x] ISC-3: Revalidation returns a cached report after HTTP 304.
- [x] ISC-4: API errors expose the server's actionable message.
- [x] ISC-5: Popup renders the route-summary headline when present.
- [x] ISC-6: Popup groups channels by their reported contact entity.
- [x] ISC-7: Managed delivery agents remain attributed to the target owner.
- [x] ISC-8: Legacy flat-contact responses retain their prior popup rendering.
- [x] ISC-9: Anti: popup never labels fallback routes as first-party.
- [x] ISC-10: Directory matching reads the tenant widget JSON API.
- [x] ISC-11: Anti: directory status logic contains no HTML parser.

## Bridge Criteria

- [x] ISC-12: Bridge: unpacked Chrome completes directory and lookup API flows.
- [x] ISC-13: Package and manifest versions both equal 0.2.0.
- [x] ISC-14: Packaging emits one flat load-unpacked extension archive.
- [x] ISC-15: Release archive contains every manifest-referenced runtime asset.
- [x] ISC-16: Anti: release archive contains no source maps or secrets.
- [ ] ISC-17: GitHub CI passes for the release commit.
- [ ] ISC-18: Release tag v0.2.0 resolves to the merged main commit.
- [ ] ISC-19: GitHub release exposes the zip and SHA256SUMS assets.
- [ ] ISC-20: Bridge: downloaded release archive completes both popup API flows in Chrome.

## Test Strategy

| isc | anchors_to | type | check | threshold | tool |
| --- | --- | --- | --- | --- | --- |
| ISC-1 | literal | bun-test | API fixture with routeSummary and contactGroups parses | pass | `bun test test/lookup-contract.test.ts` |
| ISC-2 | literal | bun-test | background supplies a 20+ character opaque session ID | pass | `bun test test/lookup-contract.test.ts` |
| ISC-3 | literal | bun-test | 304 uses exactly the cached report | pass | `bun test test/lookup-contract.test.ts` |
| ISC-4 | derived: actionable errors | bun-test | ErrorEnvelope message and request ID reach caller | pass | `bun test test/lookup-contract.test.ts` |
| ISC-5 | literal | bun-test | route headline is in the rendered lookup summary | pass | `bun test test/lookup-contract.test.ts` |
| ISC-6 | literal | bun-test | contact entities form ordered rendered groups | pass | `bun test test/lookup-contract.test.ts` |
| ISC-7 | literal | bun-test | delivery-agent label names the managed service without changing entity | pass | `bun test test/lookup-contract.test.ts` |
| ISC-8 | derived: backward compatibility | bun-test | flat fixture renders the same contact value and label | pass | `bun test test/lookup-contract.test.ts` |
| ISC-9 | derived: provenance honesty | bun-test | coordinator and inferred fixtures never receive owner wording | pass | `bun test test/lookup-contract.test.ts` |
| ISC-10 | literal | bun-test | widget list and detail fixtures become ProgramSnapshot data | pass | `bun test test/directory-api.test.ts` |
| ISC-11 | derived: parser removal | bash | directory client contains no HTML regular-expression parser | no parser symbols | `rg 'parseSearchRows|parseProgramDetail' src/lib/directory.ts` exits 1 |
| ISC-12 | cross: lookup-disclose-io | screenshot | real unpacked Chrome popup displays directory status and a live lookup result | rendered result and network request | Interceptor browser + macOS |
| ISC-13 | literal | bash | package.json and manifest.json versions are identical | exactly 0.2.0 | `bun scripts/package.ts --check` |
| ISC-14 | literal | bash | zip expands with manifest.json at archive root | one archive, flat root | `unzip -Z1 artifacts/disclose-extension-v0.2.0.zip` |
| ISC-15 | derived: usable compiled download | bash | every manifest-referenced icon, popup, worker, and rule exists in archive | zero missing paths | `bun test test/package-contract.test.ts` |
| ISC-16 | derived: safe public artifact | bash | archive listing has no map, env, git, test, source, or secret file | zero forbidden paths | `bun test test/package-contract.test.ts` |
| ISC-17 | literal | bash | GitHub checks for merged release commit conclude success | zero failed checks | GitHub workflow runs API |
| ISC-18 | derived: versioned repository state | bash | tag target SHA equals origin/main SHA | exact equality | GitHub refs and commits APIs |
| ISC-19 | literal | bash | release has versioned zip and SHA256SUMS | two uploaded assets | GitHub releases API |
| ISC-20 | literal | screenshot | archive downloaded from GitHub loads and renders live directory plus lookup results | both rendered flows | Interceptor browser + viewed screenshot |

## Features

| name | description | satisfies | depends_on | parallelizable |
| --- | --- | --- | --- | --- |
| APIContract | Extend typed result parsing, session identity, ETag revalidation, and API errors. | ISC-1, ISC-2, ISC-3, ISC-4 | [] | false |
| RoutePresentation | Render owner-aware summary and grouped reporting paths with safe legacy fallback. | ISC-5, ISC-6, ISC-7, ISC-8, ISC-9 | APIContract | false |
| DirectoryAPI | Replace directory HTML parsing with the supported tenant widget API and preserve match semantics. | ISC-10, ISC-11 | [] | false |
| BrowserProof | Build and validate a real unpacked extension against both service APIs. | ISC-12 | RoutePresentation, DirectoryAPI | false |
| ReleasePackage | Synchronize version metadata and emit a validated downloadable archive plus checksum. | ISC-13, ISC-14, ISC-15, ISC-16 | APIContract, RoutePresentation, DirectoryAPI | false |
| RepositoryRelease | Merge, tag, publish, download, and browser-verify the public release. | ISC-17, ISC-18, ISC-19, ISC-20 | ReleasePackage | false |

## Decisions

- 2026-08-11 07:18: Treat `openapi.yaml` in the local lookup worktree as the current integration contract because its route-aware additions are not represented in the extension's checked-out types.
- 2026-08-11 07:18: Use `chrome.storage.session` for the opaque `X-Lookup-Session` value so fair-use accounting survives MV3 worker suspension without becoming a durable tracking identifier.
- 2026-08-11 07:18: Do not call experimental `/api/evidence`; it is explicitly independent from `/api/lookup` and disabled by default in the service.
- 2026-08-11 07:18: Extend scope to use the directory widget JSON API after confirming the extension currently parses the rendered directory page.
- 2026-08-11 07:42: Add one static DNR request-header rule limited to `widgets.disclosebot.io/directory/adf701` because the widget API rejects extension-origin requests unless they carry the disclose.io tenant Origin.
- 2026-08-11 08:04: Use a disposable Google Chrome for Testing profile for the bridge proof because stable Chrome ignores command-line unpacked-extension flags; both Interceptor and the exact built `dist` were loaded into that isolated profile.
- 2026-08-11 08:17: refined: principal_stated_goal extended from API reconciliation to a finished public release; added ISC-13 through ISC-20 without renumbering the already verified integration criteria.
- 2026-08-11 08:17: Choose version 0.2.0 because the release adds user-visible API routing, directory transport, response caching, and presentation behavior while preserving compatibility.
- 2026-08-11 08:17: Publish a flat zip rather than a CRX because the repository's documented pre-store install path is Chrome's Load unpacked flow; unsigned CRX installation is not the supported path.
- 2026-08-11 08:21: ❌ DEAD END: Rejected a persistent tag-triggered workflow with repository-wide `contents: write`; publish this specific release through a one-off authenticated GitHub action instead of leaving standing release authority.
- 2026-08-11 08:28: Package validation scans archive paths and credential-shaped content, verifies every manifest-referenced runtime path, and writes a SHA-256 checksum before the artifact can be published.

## Changelog

- 2026-08-11 | conjectured: the flat `contacts` list was sufficient for the extension's live panel
  refuted by: the current OpenAPI contract adds `routeSummary`, `contactGroups`, `routeClass`, and `deliveryAgent` to distinguish ownership and report-routing meaning
  learned: confidence alone cannot communicate whether a reporting path belongs to the queried owner
  criterion now: ISC-5 through ISC-9 require route-aware rendering and a legacy fallback

- 2026-08-11 | conjectured: the directory's rendered page was an adequate integration surface
  refuted by: the current directory exposes a structured tenant widget API whose response contains organization and policy fields directly
  learned: parsing SSR markup creates an avoidable compatibility boundary and hides the browser-origin constraint
  criterion now: ISC-10 through ISC-12 require the widget API, parser removal, and real Chrome validation

- 2026-08-11 | conjectured: host permission alone would make the directory widget API callable from an extension service worker
  refuted by: the live tenant API varies on `Origin` and admits `https://directory.disclose.io`; extension-origin requests require a scoped request-header rule
  learned: the API contract includes an origin-gate deployment constraint in addition to its JSON schema
  criterion now: ISC-10 requires the exact API route plus a rule whose URL filter cannot affect other widget tenants or hosts

- 2026-08-11 | conjectured: unit fixtures were sufficient to close the route-presentation work
  refuted by: the bridge criterion required the actual unpacked build, live APIs, and rendered Chrome state
  learned: the extension presents the live `first_party` result correctly while preserving coordinator groups as fallbacks
  criterion now: ISC-12 is closed by the disposable real-Chrome run and live 200/304 API evidence

- 2026-08-11 | conjectured: the existing unversioned zip command was sufficient for a public release
  refuted by: it did not prove version synchronization, manifest asset completeness, archive-root shape, secret absence, or download integrity
  learned: a usable release is a validated artifact contract, not merely a successful compression command
  criterion now: ISC-13 through ISC-16 require a versioned archive, runtime-path audit, forbidden-content scan, and SHA256SUMS

## Verification

- `bun test test/lookup-contract.test.ts test/directory-api.test.ts`: 10 pass, 0 fail, 29 assertions.
- `bunx tsc --noEmit`: pass.
- `bun run build`: pass; the final `dist` contains the popup, service worker, manifest, icons, and directory-origin rule.
- Static parser check: `src/lib/directory.ts` contains no `parseSearchRows`, `parseProgramDetail`, `DOMParser`, or directory HTML-search path.
- Live directory API: exact-domain query returned 200 with zero candidates; the extension's brand fallback returned seven candidates headed by `Cloudflare`, and `/organization/cloudflare-ba9135.json` returned policy and `securityTxtUrl` detail. All responses were JSON with `Access-Control-Allow-Origin: https://directory.disclose.io`.
- Live lookup API: 200 response included `ETag: W/"2e938f7c9e5637cb"`, `X-Lookup-Cache: hit`, `requestId`, `hasErrors: false`, `routeSummary.routeClass: first_party`, and three ordered contact groups; revalidation with that ETag returned 304 with no response body.
- Real Chrome bridge: the unpacked final build in Google Chrome for Testing 151 rendered Cloudflare as `In directory`, `Basic`, score 47, policy and security.txt present. Invoking `Re-scan with full lookup` completed in 0.2s and rendered `First-party reporting path`, owner contacts (including HackerOne delivery-agent labels), CNA coordination, and CERT/CC fallback groups without presenting either coordinator as first-party.
- `bun scripts/package.ts --check --tag v0.2.0`: package and manifest versions match 0.2.0.
- `bun run package --tag v0.2.0`: built `artifacts/disclose-extension-v0.2.0.zip` and `SHA256SUMS`; internal validation found every manifest runtime path, no forbidden paths, and no credential-shaped content. SHA-256: `312198048e3d8ab29d1e5f847ffc6c8dfef39d40f36fa70b6c33097e7a1e16f8`.
- `unzip -t artifacts/disclose-extension-v0.2.0.zip`: every archive member passed CRC validation; `manifest.json` is at archive root. `shasum -a 256 -c SHA256SUMS`: OK.
- Exact local archive Chrome proof: a fresh extraction loaded in isolated Chrome for Testing 151. Directory UI rendered `In directory`, `Has a way to report security issues`, `Basic`, score 47, Policy, and security.txt. Live lookup completed in 0.1s and rendered `First-party reporting path` plus separately labeled Cloudflare CNA and CERT/CC coordinator fallbacks; the resulting popup screenshot was viewed before disposable-profile cleanup.
