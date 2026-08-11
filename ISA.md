---
task: "Create live lookup demo video and README reference"
slug: 20260811-071845_lookup-api-reconciliation
project: chrome-extension-v2
effort: E4
effort_source: auto
phase: verify
progress: 34/36
mode: iterate
started: 2026-08-11T07:18:45Z
updated: 2026-08-11T18:19:23Z
iteration: 4
principal_stated_goal: "ok, please redo this with the disclose.io logo in the corner, and focus on the directory/maturity side of things more than the researcher side"
principal_stated_goal_source: explicit-revision
principal_stated_goal_signal: 4
principal_stated_goal_locked: 2026-08-11T17:30:05Z
context_sufficient: true
interview_invoked: false
current_state: "Version 0.2.0 is released, but the README's existing walkthrough predates the route-aware live lookup and does not demonstrate the current owner-versus-coordinator result."
ideal_state: "A concise, polished video in the repository leads with disclosure-directory membership and maturity signals, keeps the official disclose.io logo visible in the corner, and treats the deeper live lookup as supporting context."
capabilities_invoked:
  - ISA
  - Interceptor
  - Remotion
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

Version 0.2.0 is already released and verified. This iteration replaces the demo with a compact, muted-first cut whose dominant story is Cloudflare's directory membership, maturity score, and four disclosure signals. The official disclose.io logo remains visible in the corner, the deeper live lookup is a brief supporting beat, and the repository README continues to present a poster linked to the MP4 plus a direct playback link.

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
- [x] ISC-17: GitHub CI passes for the release commit.
- [x] ISC-18: Release tag v0.2.0 resolves to the merged main commit.
- [x] ISC-19: GitHub release exposes the zip and SHA256SUMS assets.
- [x] ISC-20: Bridge: downloaded release archive completes both popup API flows in Chrome.
- [x] ISC-21: Antecedent: the story visibly progresses from directory signal to routed result.
- [x] ISC-22: The demo MP4 is H.264 yuv420p at 1280×720.
- [x] ISC-23: The demo lasts between 12 and 24 seconds.
- [x] ISC-24: The committed demo MP4 is no larger than 5 MB.
- [x] ISC-25: The README poster links to the committed demo MP4.
- [x] ISC-26: The README includes a plainly labeled direct video link.
- [x] ISC-27: Anti: no personal browser state appears in any demo frame.
- [x] ISC-28: Demo source frames come from the current extension using both live APIs.
- [x] ISC-29: Frame scrub contains no blank, clipped, or unreadable scene.
- [x] ISC-30: GitHub contains the video, poster, README reference, and regeneration source.
- [x] ISC-31: Antecedent: the official disclose.io handshake-and-wordmark logo stays visible in a corner throughout the video.
- [x] ISC-32: Directory membership, maturity score, and disclosure signals occupy at least 70% of the story frames.
- [x] ISC-33: The intro, main headings, and outro frame the extension around directory and maturity rather than researcher reporting.
- [x] ISC-34: Anti: coordinator-fallback explanation is not a standalone scene in the revised cut.
- [ ] ISC-35: The README poster and supporting copy describe the directory-and-maturity-first narrative.
- [ ] ISC-36: The replacement media and source are pushed to the existing demo PR without changing the stable playback paths.

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
| ISC-21 | derived: coherent demo experience | frame-scrub | directory state, click, first-party result, and fallback explanation appear in narrative order | all four beats in order | ffmpeg contact sheet + viewed frames |
| ISC-22 | derived: broadly playable repository video | media-metadata | codec, pixel format, and dimensions | H.264, yuv420p, 1280×720 | ffprobe |
| ISC-23 | derived: concise demo | media-metadata | MP4 duration | 12–24 seconds | ffprobe |
| ISC-24 | derived: repository-friendly artifact | filesystem | committed MP4 size | ≤ 5,000,000 bytes | stat |
| ISC-25 | literal | markdown-browser | README poster target | links to docs/demo/lookup-demo.mp4?raw=1 | Interceptor browser |
| ISC-26 | literal | markdown-read | direct playback label and href | both present | rg README.md |
| ISC-27 | derived: privacy-safe public artifact | frame-scrub | every sampled frame | isolated Chrome only; no accounts, cookies, or unrelated tabs | ffmpeg contact sheet + viewed frames |
| ISC-28 | literal | browser-live | directory status and live route-aware lookup source captures | both current live API flows rendered | Interceptor + Apple Events DOM read |
| ISC-29 | derived: polished visual output | frame-scrub | sampled frames across full duration | zero blank, clipped, or unreadable scene | ffmpeg contact sheet + viewed image |
| ISC-30 | literal | git-diff | intended demo source and documentation artifacts | scoped video, poster, README, and source tree in pushed branch/PR | git diff + GitHub PR |
| ISC-31 | literal | frame-scrub | official logo position across sampled frames | visible in top-left corner in every non-black frame | ffmpeg contact sheet + viewed image |
| ISC-32 | literal | timeline-inspection | directory/maturity story-frame duration divided by total duration | at least 70% | Remotion sequence boundaries + source read |
| ISC-33 | literal | copy-audit | intro, scene headings, and outro | directory/maturity framing; no researcher-led title | rg + source read |
| ISC-34 | derived: narrative focus | timeline-inspection | standalone coordinator/fallback scene | absent | rg + source read |
| ISC-35 | literal | markdown-browser | poster and demo description | directory/maturity wording visible and poster rendered | Interceptor + README read |
| ISC-36 | literal | remote-artifact | stable paths on existing branch/PR | remote bytes match local and PR checks pass | git/GitHub APIs + SHA-256 |

## Features

| name | description | satisfies | depends_on | parallelizable |
| --- | --- | --- | --- | --- |
| APIContract | Extend typed result parsing, session identity, ETag revalidation, and API errors. | ISC-1, ISC-2, ISC-3, ISC-4 | [] | false |
| RoutePresentation | Render owner-aware summary and grouped reporting paths with safe legacy fallback. | ISC-5, ISC-6, ISC-7, ISC-8, ISC-9 | APIContract | false |
| DirectoryAPI | Replace directory HTML parsing with the supported tenant widget API and preserve match semantics. | ISC-10, ISC-11 | [] | false |
| BrowserProof | Build and validate a real unpacked extension against both service APIs. | ISC-12 | RoutePresentation, DirectoryAPI | false |
| ReleasePackage | Synchronize version metadata and emit a validated downloadable archive plus checksum. | ISC-13, ISC-14, ISC-15, ISC-16 | APIContract, RoutePresentation, DirectoryAPI | false |
| RepositoryRelease | Merge, tag, publish, download, and browser-verify the public release. | ISC-17, ISC-18, ISC-19, ISC-20 | ReleasePackage | false |
| LookupDemo | Capture the current live workflow, animate a directory-and-maturity-first video with persistent official branding, document playback, and publish the scoped repository change. | ISC-21, ISC-22, ISC-23, ISC-24, ISC-25, ISC-26, ISC-27, ISC-28, ISC-29, ISC-30, ISC-31, ISC-32, ISC-33, ISC-34, ISC-35, ISC-36 | RepositoryRelease | false |

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
- 2026-08-11 17:30: refined: The new explicit goal adds ISC-21 through ISC-30 without renumbering the completed release criteria.
- 2026-08-11 17:30: Use a 16:9, muted-first Remotion composition built from isolated live-Chrome captures; explanatory on-screen copy makes narration unnecessary and keeps the repository asset small.
- 2026-08-11 17:30: Keep the older multi-state walkthrough as historical breadth; add a distinct focused lookup demo rather than silently replacing it.
- 2026-08-11 17:47: Post-process the Remotion source encode to H.264/yuv420p with no audio and fast-start metadata; this removes an empty AAC track, stays broadly playable, and leaves a comfortable repository-size margin.
- 2026-08-11 18:13: refined: The explicit revision replaces the researcher-route emphasis with a directory-and-maturity-first narrative, adds ISC-31 through ISC-36 without renumbering prior criteria, and keeps the existing PR and stable media paths.
- 2026-08-11 18:13: Use the official public `disclose.io/uploads/logo-disclose-type.svg` lockup in a persistent top-left brand card; the prior extension-icon treatment is not the disclose.io wordmark.

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

- 2026-08-11 | conjectured: the existing mocked multi-state walkthrough was sufficient as the repository demo
  refuted by: it predates the route-aware API release and never shows the current first-party versus coordinator presentation
  learned: the README needs a focused live-lookup narrative in addition to broad historical state coverage
  criterion now: ISC-21 through ISC-30 require a current, privacy-safe, compact video and an obvious README playback path

- 2026-08-11 | conjectured: a first-party-route and fallback-led story best represented the extension's value
  refuted by: the principal explicitly asked for the directory and maturity side to dominate and for the disclose.io logo to stay in the corner
  learned: the deeper lookup is supporting detail; the distinctive product story is the at-a-glance maturity signal
  criterion now: ISC-31 through ISC-36 require persistent official branding, at least 70% directory/maturity story frames, and no standalone fallback scene

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
- ISC-17: PR #24 reported three successful checks: CI typecheck/build/test, CodeQL analysis, and Code scanning results.
- ISC-18: `git rev-parse origin/main 'v0.2.0^{}'` returned the same commit, `3acb2f6dd7db443ce90f8822d7bfafaa2f37ce5a`.
- ISC-19: GitHub's public releases API reported non-draft v0.2.0 with uploaded `disclose-extension-v0.2.0.zip` and `SHA256SUMS` assets.
- ISC-20: The independently downloaded public ZIP passed SHA-256 and CRC checks, then rendered both the directory badge and live route-aware Cloudflare lookup in isolated Chrome for Testing 151.
- ISC-21, ISC-27, ISC-28, ISC-29: isolated Chrome for Testing captured the current extension's live Cloudflare directory result and route-aware lookup result; the final encoded-video scrub shows the beats in order with readable, non-overlapping scene boundaries and no personal profile state. The named Interceptor capture group was closed and then listed as empty.
- ISC-22 through ISC-24: `ffprobe` reports one H.264/yuv420p 1280×720 stream at 30fps, 19.000 seconds, 2,625,960 bytes, with no audio stream; a full `ffmpeg` decode completed without errors.
- ISC-25 and ISC-26: `README.md` contains a poster image and separate `▶ Watch the 19-second live lookup demo (MP4)` label, both linked with GitHub's `?raw=1` playback path; both referenced files exist.
- Demo regression check: `bun run verify` passes 12 tests (36 assertions), strict TypeScript, and the production extension build after the documentation/media addition.
- ISC-30: branch `codex/lookup-demo-video` and draft PR #25 contain the video, 1280×720 poster, README playback links, and locked Remotion regeneration source. GitHub rendered the poster at its natural dimensions; the independently downloaded remote MP4 was 2,625,960 bytes and matched local SHA-256 `d1e75fb52720e75e1b008d75aa700b403302458be70ab8295495c7792f343b75` exactly.
- ISC-31: frame-scrub — the viewed 13-frame contact sheet shows the official handshake-and-wordmark lockup in the top-left white brand card across intro, directory, maturity, optional lookup, and outro scenes.
- ISC-32: timeline-inspection — intro 75 + directory 165 + maturity signals 165 + maturity outro 75 = 480 of 570 frames, or 84.2%, devoted to directory/maturity framing.
- ISC-33: copy-audit — composition headings read `THE DISCLOSE.IO DIRECTORY`, `DIRECTORY MEMBERSHIP`, `DISCLOSURE MATURITY`, and `DIRECTORY.DISCLOSE.IO`; neither `researcher` nor the prior reporting-led titles occur in the composition.
- ISC-34: timeline-inspection — `LookupDemo.tsx` contains no fallback scene or fallback heading; the only deeper-routing material is the 90-frame `OPTIONAL DEEPER LOOKUP` support scene.
- Replacement media check: `ffprobe` reports one H.264/yuv420p 1280×720 stream at 30fps, 19.000 seconds, 2,013,929 bytes, with no audio stream; full `ffmpeg` decode exits 0. MP4 SHA-256: `9d00afcd775d08ba77e44f3859c0c1f524b401b6910481722cd71af610d787de`.
- Replacement regression check: `bun run verify` passes 12 tests (36 assertions), strict TypeScript, and the production extension build.
