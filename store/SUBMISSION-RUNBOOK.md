# Chrome Web Store submission runbook

Submit **disclose.io v0.2.2** under **casey@disclose.io**. Use the dashboard's actual
status to decide whether this is a new listing or an update.

## 1. Prepare the tested package

```sh
git clone https://github.com/disclose/chrome-extension-v2
cd chrome-extension-v2
bun install --frozen-lockfile
bun run verify
bun run test
bun run test:live
bun run package
bun store/make-assets.ts
```

Upload `artifacts/disclose-extension-v0.2.2.zip`. Its integrity digest is in
`artifacts/SHA256SUMS`. Images and listing copy are in `store/`.

The opt-in `test:live` check uses a disposable Chromium profile and real APIs to
verify a directory match, rendered lookup contacts, an ETag-based HTTP 304 repeat
response, and API requests without cookies or authorization credentials. Review
the screenshots and JSON evidence in `release-evidence/` before submission.

## 2. Check the account and existing items

Open **https://chrome.google.com/webstore/devconsole/** and verify the signed-in
account is **casey@disclose.io**. Check for an existing disclose.io item before
creating one. Complete any account verification or registration required by
Google. The dashboard displays any current fee and publisher item limit.

Extension-based browser automation can be restricted on Web Store pages. Native
computer use can operate the dashboard. Authentication, payment or legal terms
may require the account owner's interaction.

## 3. Upload the package

For an existing item, open its Package page and upload a new version. For a new
item, choose **New item** and upload the ZIP. Wait for package validation and
resolve all errors before continuing. Confirm that the dashboard shows **0.2.2**.

## 4. Complete the listing

Use `store/LISTING.md` for:

- Product name, summary, detailed description and category.
- Single purpose, every permission justification and the remote-code answer.
- Data-use disclosures and reviewer test instructions.

Use the current public policy after merging the release changes:
**https://github.com/disclose/chrome-extension-v2/blob/main/store/PRIVACY.md**.
Check that its live text matches this release. The older Cloudflare privacy page
still serves the July 2026 draft and must not be used for version 0.2.2.

Upload:

- `store/screenshots/01-level5.png`
- `store/screenshots/02-safe-harbor.png`
- `store/screenshots/03-none.png`
- `store/promo-tile-440x280.png`

The ZIP contains the 128px icon identified by the manifest. Confirm the dashboard
preview, distribution settings and all required fields before submitting.

## 5. Submit and verify

Save the listing and choose **Submit for review**. Select automatic publication
after approval when the requested release should go live as soon as Google
approves it. Follow any final dashboard requirements, then verify the displayed
submission status. Record the item ID, version, listing URL and status. Do not
claim that the listing is in review or published without this confirmation.

Google's review can take time; uploading or submitting does not make the listing
public immediately.

## Later updates

Bump `manifest.json` and `package.json` together, test and package, and upload the
new ZIP to the existing item. An authorized Chrome Web Store API integration can
handle future package uploads and publication; listing text and images are
managed in the developer dashboard.
