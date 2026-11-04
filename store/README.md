# Chrome Web Store release materials

Release package for **disclose.io v0.2.2**, owned by **casey@disclose.io**.
Submission status must be checked in the
[Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole/).
Repository documentation alone is not evidence that an item is in review.

## Files

- `LISTING.md`: listing copy, permission explanations, privacy declarations and reviewer instructions.
- `PRIVACY.md` / `privacy.html`: matching current privacy policies.
- `screenshots/*.png`: 1280×800 screenshots of the current popup on a branded background.
- `promo-tile-440x280.png`: small promotional tile.
- `make-assets.ts`: regenerates the images from `dist/`.
- `SUBMISSION-RUNBOOK.md`: upload and submission steps.

## Build and verify

```sh
bun install --frozen-lockfile
bun run verify
bun run test
bun run test:live
bun run package
bun store/make-assets.ts
```

The versioned ZIP and `SHA256SUMS` appear in `artifacts/`. Test the same source and
package that will be uploaded. Inspect the screenshots after regeneration.

`test:live` loads the built extension into an isolated Chromium profile and uses
the real directory and lookup APIs. It checks a directory match, displayed
contacts, ETag revalidation with HTTP 304, and the absence of cookie/authorization
credentials on API requests. Screenshots and a JSON result are saved in
`release-evidence/`.

## Before submission

1. Confirm the dashboard is signed in as **casey@disclose.io**, and reuse an
   existing disclose.io listing if one exists.
2. Complete any required developer registration, account verification or terms
   acceptance. Any fee and current item limit are shown in the dashboard.
3. Use the public policy at
   **https://github.com/disclose/chrome-extension-v2/blob/main/store/PRIVACY.md**
   after the release changes are merged. Verify the live policy before submission.
   The older Cloudflare privacy page still serves the July 2026 draft.
4. Upload `artifacts/disclose-extension-v0.2.2.zip`, enter the listing from
   `LISTING.md`, and upload the assets.
5. Verify the privacy declarations against the package, save, and submit for review.

Browser extension automation may be blocked on Chrome Web Store pages. Native
computer use can still operate the dashboard; a browser API restriction does not
mean the submission must be manual. The dashboard may require account-owner
interaction for authentication, payment or legal terms.

After submission, record the item ID, status and listing URL from the dashboard.
Google's review is a separate step before the public listing becomes available.
