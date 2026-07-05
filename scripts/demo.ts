#!/usr/bin/env bun
/**
 * Records a short demo video of the popup by driving the REAL built extension
 * (dist/) with the same mocked directory/lookup backend the test suite uses.
 * One popup page is navigated through every state + a live lookup + copy +
 * retaliation, and Playwright records that page to webm. Not part of the build.
 */
import { chromium, type BrowserContext, type Route } from 'playwright';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  searchResponseFor,
  detailResponseFor,
  EMPTY_RESULTS_HTML,
} from '../test/fixtures/directory-mock';
import {
  happyLookupResponse,
  retaliationLookupResponse,
} from '../test/fixtures/lookup-mock';

const ROOT = path.resolve(import.meta.dir, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'demo-out');
const W = 376;
const H = 640;

let lookupVariant: 'happy' | 'retaliation' = 'happy';

async function fulfill(route: Route, body: string, contentType = 'text/html') {
  await route.fulfill({
    status: 200,
    contentType,
    body,
    headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
  });
}

async function setupRoutes(context: BrowserContext) {
  await context.route('https://directory.disclose.io/**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/' || url.pathname === '') {
      await fulfill(route, searchResponseFor(url.searchParams.get('q') ?? ''));
      return;
    }
    const slug = url.pathname.replace(/^\//, '').replace(/\/$/, '');
    await fulfill(route, slug.length === 0 ? EMPTY_RESULTS_HTML : detailResponseFor(slug));
  });
  await context.route('https://lookup.disclose.io/**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/lookup' && route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      const domain = body.input ?? '';
      const report =
        lookupVariant === 'retaliation'
          ? retaliationLookupResponse(domain)
          : happyLookupResponse(domain);
      await fulfill(route, JSON.stringify(report), 'application/json');
      return;
    }
    await route.fulfill({ status: 404, body: 'not mocked' });
  });
  await context.route('https://*.test/**/*', async (route) => {
    const url = new URL(route.request().url());
    await fulfill(route, `<!doctype html><title>${url.hostname}</title><h1>${url.hostname}</h1>`);
  });
}

async function getSW(context: BrowserContext) {
  const start = Date.now();
  for (;;) {
    const w = context.serviceWorkers();
    if (w.length > 0) return w[0]! as unknown as { url: () => string; evaluate: <T>(fn: (a: string) => T, a: string) => Promise<T> };
    if (Date.now() - start > 15000) throw new Error('no service worker');
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function waitCached(sw: any, domain: string) {
  const start = Date.now();
  let last: Record<string, unknown> = {};
  while (Date.now() - start < 20000) {
    last = await sw.evaluate(async () => await (globalThis as any).chrome.storage.session.get(null), '');
    if (`eval:${domain}` in last) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`eval never cached for ${domain}; session keys=${JSON.stringify(Object.keys(last))}`);
}

async function tabIdFor(sw: any, url: string): Promise<number> {
  const id = await sw.evaluate(async (target: string) => {
    const tabs = await (globalThis as any).chrome.tabs.query({});
    return tabs.find((t: any) => t.url === target)?.id ?? null;
  }, url);
  if (id === null) throw new Error(`no tab for ${url}`);
  return id;
}

async function main() {
  if (!existsSync(path.join(DIST, 'manifest.json'))) throw new Error('run `bun run build` first');
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'disclose-demo-'));

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    channel: 'chromium',
    viewport: { width: W, height: H },
    recordVideo: { dir: OUT, size: { width: W, height: H } },
    args: [
      `--disable-extensions-except=${DIST}`,
      `--load-extension=${DIST}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=Translate,DialMediaRouteProvider',
    ],
  });
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await setupRoutes(context);
    const sw = await getSW(context);
    const extId = sw.url().match(/^chrome-extension:\/\/([^/]+)\//)![1]!;

    // Establish tabs + background evaluations for each directory state.
    const domains = ['level5-example.test', 'safeharbor-example.test', 'vdp-only-example.test', 'unknown-example.test'];
    const tabIds: Record<string, number> = {};
    for (const d of domains) {
      const p = await context.newPage();
      await p.goto(`https://${d}/`, { waitUntil: 'load' });
      await p.bringToFront();
      await p.waitForTimeout(400);
      await waitCached(sw, d);
      tabIds[d] = await tabIdFor(sw, `https://${d}/`);
    }

    const popupUrl = (id: number) => `chrome-extension://${extId}/popup.html?testTabId=${id}`;
    const popup = await context.newPage();
    const settle = (ms: number) => popup.waitForTimeout(ms);

    // 1) Walk the four directory states (natural Checking… → resolved on each load).
    for (const d of ['level5-example.test', 'safeharbor-example.test', 'vdp-only-example.test', 'unknown-example.test']) {
      await popup.goto(popupUrl(tabIds[d]!));
      await popup.waitForSelector('#hero-headline');
      await settle(2200);
    }

    // 2) Live lookup on the safe-harbor site → contacts render → copy a contact.
    await popup.goto(popupUrl(tabIds['safeharbor-example.test']!));
    await popup.waitForSelector('#lookup-btn');
    await settle(600);
    await popup.click('#lookup-btn');
    await popup.waitForSelector('#lookup-results:not([hidden])', { timeout: 10000 });
    await settle(1600);
    const copyBtn = popup.locator('.contact__copy').first();
    if (await copyBtn.count()) {
      await copyBtn.click();
      await settle(1600); // shows "Copied ✓"
    }

    // 3) Retaliation warning — flip the mocked lookup, re-run on a fresh site.
    lookupVariant = 'retaliation';
    await popup.goto(popupUrl(tabIds['level5-example.test']!));
    await popup.waitForSelector('#lookup-btn');
    await settle(600);
    await popup.click('#lookup-btn');
    await popup.waitForSelector('#retaliation-banner:not([hidden])', { timeout: 10000 });
    await settle(3000);

    const videoPath = await popup.video()!.path();
    await popup.close();
    await context.close();
    console.log(`RAW_VIDEO=${videoPath}`);
  } catch (err) {
    await context.close().catch(() => {});
    throw err;
  }
}

await main();
