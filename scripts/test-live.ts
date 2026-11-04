#!/usr/bin/env bun
// Opt-in production integration test. No user's browser profile is opened.
import assert from 'node:assert/strict';
import { chromium, type Request } from 'playwright';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { LookupReport, TabEvaluation } from '../src/types';
import { eligibleDomainForUrl } from '../src/lib/match';

const ROOT = path.resolve(import.meta.dir, '..');
const EXTENSION = path.resolve(process.env.EXTENSION_DIR ?? path.join(ROOT, 'dist'));
const EVIDENCE = path.resolve(process.env.LIVE_EVIDENCE_DIR ?? path.join(ROOT, 'release-evidence'));
const DOMAIN = process.env.LIVE_DOMAIN ?? 'google.com';
const TARGET_URL = `https://www.${DOMAIN}/`;
assert.equal(eligibleDomainForUrl(TARGET_URL), DOMAIN, 'LIVE_DOMAIN must be an eligible public registrable domain');
const LABEL = DOMAIN.replace(/\.[^.]+$/, '');
const API_HOSTS = new Set(['api.disclosebot.io', 'widgets.disclosebot.io', 'lookup.disclose.io']);

interface NetworkResult {
  url: string;
  status: number;
  method: string;
  client?: string;
  conditional: boolean;
  credentialHeaders: string[];
}

async function testExtension(temp: string): Promise<void> {
  // Copy the selected release so this test cannot add or mutate packaged files.
  const extensionDir = path.join(temp, 'extension');
  await cp(EXTENSION, extensionDir, { recursive: true });
  await mkdir(EVIDENCE, { recursive: true });
  const context = await chromium.launchPersistentContext(path.join(temp, 'profile'), {
    channel: 'chromium',
    headless: true,
    viewport: { width: 376, height: 640 },
    args: [
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });
  const requests: Array<Promise<NetworkResult>> = [];
  let directoryEvaluation: TabEvaluation | undefined;
  const networkFailures: Array<{ request: Request; error: string }> = [];
  const responseStatuses = new Map<Request, number>();
  context.on('response', (response) => {
    if (!API_HOSTS.has(new URL(response.url()).hostname)) return;
    responseStatuses.set(response.request(), response.status());
    requests.push((async () => {
      const request = response.request();
      const headers = await request.allHeaders();
      return {
        url: response.url(), status: response.status(), method: request.method(),
        client: headers['x-lookup-client'], conditional: Boolean(headers['if-none-match']),
        credentialHeaders: Object.keys(headers).filter((name) => ['cookie', 'authorization'].includes(name)),
      };
    })());
  });
  context.on('requestfailed', (request) => {
    if (API_HOSTS.has(new URL(request.url()).hostname)) {
      networkFailures.push({ request, error: request.failure()?.errorText ?? 'unknown failure' });
    }
  });

  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html?testTabId=-1`);
    // Worker attachment can precede top-level listener registration.
    await popup.waitForFunction(async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'getEvaluation', tabId: -1 });
        return response && 'evaluation' in response;
      } catch { return false; }
    }, undefined, { timeout: 10000 });
    await worker.evaluate(async () => { await chrome.storage.session.clear(); });

    // Use a local fixture at a public test domain; only disclose.io APIs are live.
    await context.route(`${TARGET_URL}**`, (route) => route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Release API test</title><h1>Public-domain fixture</h1>',
    }));
    const target = await context.newPage();
    await target.goto(TARGET_URL);
    const tabId = await worker.evaluate(async (url) => (await chrome.tabs.query({})).find((tab) => tab.url === url)?.id, TARGET_URL);
    assert.notEqual(tabId, undefined, 'public-domain fixture tab was not found');
    await popup.goto(`chrome-extension://${extensionId}/popup.html?testTabId=${tabId}`);
    await popup.waitForFunction(() => {
      const headline = document.getElementById('hero-headline')?.textContent;
      return headline && headline !== 'Checking…';
    }, undefined, { timeout: 25000 });
    await popup.screenshot({ path: path.join(EVIDENCE, `live-${LABEL}-directory.png`), fullPage: true });
    const session = await worker.evaluate(async () => await chrome.storage.session.get(null));
    const evaluation = session[`eval:${DOMAIN}`] as TabEvaluation | undefined;
    directoryEvaluation = evaluation;
    assert.equal(evaluation?.status, 'matched', `live directory failed: ${await popup.locator('#hero-headline').innerText()}`);
    assert.equal(evaluation.domain, DOMAIN);
    if (evaluation.program?.securityTxtUrl) {
      const securityTxtHost = new URL(evaluation.program.securityTxtUrl).hostname;
      assert.ok(securityTxtHost === DOMAIN || securityTxtHost.endsWith(`.${DOMAIN}`), 'security.txt link belongs to another domain');
    }
    if (process.env.LIVE_EXPECTED_ICON) {
      assert.equal(evaluation.iconState, process.env.LIVE_EXPECTED_ICON, 'directory maturity mapped to the wrong toolbar state');
    }

    await popup.locator('#lookup-btn').click();
    await popup.waitForFunction(() => !document.querySelector<HTMLButtonElement>('#lookup-btn')?.disabled, undefined, { timeout: 45000 });
    const lookupStatus = await popup.locator('#lookup-status').innerText();
    assert.match(lookupStatus, /^Done/, `live lookup failed: ${lookupStatus}`);
    assert.ok(await popup.locator('.contact').count() > 0, 'live lookup rendered no contacts');
    await popup.screenshot({ path: path.join(EVIDENCE, `live-${LABEL}-lookup.png`), fullPage: true });

    await popup.locator('#lookup-btn').click();
    await popup.waitForFunction(() => !document.querySelector<HTMLButtonElement>('#lookup-btn')?.disabled, undefined, { timeout: 45000 });
    const repeatStatus = await popup.locator('#lookup-status').innerText();
    assert.match(repeatStatus, /^Done/, `cached lookup failed: ${repeatStatus}`);
    const cached = await worker.evaluate(async (key) => (await chrome.storage.session.get(key))[key], `lookup:response:${DOMAIN}`) as { etag?: string; report?: LookupReport };
    assert.equal(cached.report?.input, DOMAIN);
    assert.ok(cached.report?.contacts.length, 'live lookup report contained no contacts');
    assert.ok(cached.etag, 'live lookup did not supply an ETag');

    const network = await Promise.all(requests);
    const lookups = network.filter((request) => request.url === 'https://lookup.disclose.io/api/lookup' && request.method === 'POST');
    assert.deepEqual(lookups.map((request) => request.status), [200, 304], 'lookup must revalidate its session-cached response');
    assert.equal(lookups[1]?.conditional, true, 'repeat lookup omitted its validator');
    const manifestVersion = await worker.evaluate(() => chrome.runtime.getManifest().version);
    assert.ok(lookups.every((request) => request.client === `chrome-extension/${manifestVersion}`), 'lookup client version differs from packaged manifest');
    assert.ok(network.every((request) => request.credentialHeaders.length === 0), 'an API request included cookie or authorization credentials');
    // Chromium reports a canceled body for a bodyless304. The status, validator,
    // and cached UI result above prove this completed revalidation successfully.
    const unexpectedFailures = networkFailures.filter(({ request, error }) =>
      !(error === 'net::ERR_ABORTED' && responseStatuses.get(request) === 304));
    assert.deepEqual(unexpectedFailures.map(({ request, error }) => `${request.url()}: ${error}`), [], 'production API request failed');
    const directoryRequests = network.filter((request) => new URL(request.url).hostname === 'api.disclosebot.io');
    assert.ok(directoryRequests.length > 0, 'no production directory API request was observed');
    assert.ok(directoryRequests.every((request) => request.status === 200), 'directory request did not succeed');
    const report = {
      status: 'passed', version: manifestVersion, checkedAt: new Date().toISOString(),
      directory: evaluation,
      lookup: { input: cached.report?.input, contacts: cached.report?.contacts.length, hasEtag: true, lookupStatus, repeatStatus },
      network, bodylessRevalidationAborts: networkFailures.length - unexpectedFailures.length,
    };
    await writeFile(path.join(EVIDENCE, `live-${LABEL}-api-result.json`), JSON.stringify(report, null, 2));
    await rm(path.join(EVIDENCE, `live-${LABEL}-api-failure.json`), { force: true });
    console.log(`✓ Live directory matched ${DOMAIN}`);
    console.log(`✓ Live lookup returned ${cached.report?.contacts.length} contacts; repeat response HTTP304`);
    console.log('✓ API requests omit cookies/authorization; client version matches manifest');
  } catch (error) {
    await writeFile(path.join(EVIDENCE, `live-${LABEL}-api-failure.json`), JSON.stringify({
      status: 'failed', checkedAt: new Date().toISOString(),
      directory: directoryEvaluation,
      error: error instanceof Error ? error.message : String(error), network: await Promise.all(requests),
      networkFailures: networkFailures.map(({ request, error }) => ({ url: request.url(), error, responseStatus: responseStatuses.get(request) })),
    }, null, 2));
    throw error;
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'disclose-live-'));
  try {
    await testExtension(temp);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

await main();
