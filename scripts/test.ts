#!/usr/bin/env bun
import { chromium, type BrowserContext, type Page, type Route } from 'playwright';
import { mkdir, rm, readFile, writeFile, mkdtemp, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  listResponseFor,
  detailResponseFor,
} from '../test/fixtures/directory-mock';
import {
  happyLookupResponse,
  retaliationLookupResponse,
} from '../test/fixtures/lookup-mock';

const ROOT = path.resolve(import.meta.dir, '..');
const DIST = path.join(ROOT, 'dist');
const SCREENSHOTS = path.join(ROOT, 'test/screenshots');

interface ScenarioExpectation {
  domain: string;
  pageUrl: string;
  expectedIconState: 'level5' | 'safe-harbor' | 'vdp' | 'none';
  expectedHeadlineMatch: RegExp;
  status: 'matched' | 'unmatched';
}

const SCENARIOS: ScenarioExpectation[] = [
  {
    domain: 'level5-example.test',
    pageUrl: 'https://level5-example.test/',
    expectedIconState: 'level5',
    expectedHeadlineMatch: /Best-practice/i,
    status: 'matched',
  },
  {
    domain: 'safeharbor-example.test',
    pageUrl: 'https://safeharbor-example.test/',
    expectedIconState: 'safe-harbor',
    expectedHeadlineMatch: /researcher-safe/i,
    status: 'matched',
  },
  {
    domain: 'vdp-only-example.test',
    pageUrl: 'https://vdp-only-example.test/',
    expectedIconState: 'vdp',
    expectedHeadlineMatch: /way to report/i,
    status: 'matched',
  },
  {
    domain: 'unknown-example.test',
    pageUrl: 'https://unknown-example.test/',
    expectedIconState: 'none',
    expectedHeadlineMatch: /Not found in the disclose.io directory/i,
    status: 'unmatched',
  },
];

interface Failure {
  scenario?: string;
  message: string;
}

const failures: Failure[] = [];

function recordFailure(scenario: string | undefined, message: string): void {
  failures.push({ scenario, message });
  console.error(`  ✗ ${scenario ?? '<global>'}: ${message}`);
}

function recordPass(scenario: string, message: string): void {
  console.log(`  ✓ ${scenario}: ${message}`);
}

function makeFixturePageHtml(domain: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${domain}</title></head>
<body><h1>${domain}</h1><p>Test fixture page.</p></body></html>`;
}

async function fulfillRoute(route: Route, body: string, contentType = 'text/html'): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType,
    body,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function setupRoutes(context: BrowserContext, lookupVariant: 'happy' | 'retaliation'): Promise<void> {
  // 1. directory.disclose.io's widget JSON API
  await context.route('https://api.disclosebot.io/v1/p/directories/adf701/organizations*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/v1/p/directories/adf701/organizations') {
      const q = url.searchParams.get('filter[name_cont]') ?? '';
      await fulfillRoute(route, listResponseFor(q), 'application/json');
      return;
    }
    const detailMatch = url.pathname.match(/^\/v1\/p\/directories\/adf701\/organizations\/([^/]+)$/);
    if (!detailMatch) {
      await route.fulfill({ status: 404, body: 'not mocked' });
      return;
    }
    await fulfillRoute(route, detailResponseFor(decodeURIComponent(detailMatch[1]!)), 'application/json');
  });

  // 2. lookup.disclose.io
  await context.route('https://lookup.disclose.io/**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/lookup' && route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}');
      const domain = body.input ?? '';
      const report =
        lookupVariant === 'retaliation'
          ? retaliationLookupResponse(domain)
          : happyLookupResponse(domain);
      await fulfillRoute(route, JSON.stringify(report), 'application/json');
      return;
    }
    await route.fulfill({ status: 404, body: 'not mocked' });
  });

  // 3. test domain pages — fulfill any HTTPS request to a *.test fixture host
  await context.route('https://*.test/**/*', async (route) => {
    const url = new URL(route.request().url());
    await fulfillRoute(route, makeFixturePageHtml(url.hostname));
  });
}

async function getServiceWorker(context: BrowserContext, timeoutMs = 15000): Promise<ServiceWorker> {
  const start = Date.now();
  for (;;) {
    const workers = context.serviceWorkers();
    if (workers.length > 0) return workers[0]! as unknown as ServiceWorker;
    if (Date.now() - start > timeoutMs) {
      throw new Error('extension service worker did not register within timeout');
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

// Playwright reports a ServiceWorker target as soon as Chrome attaches to it — which can
// be BEFORE background.ts's top-level module code (the chrome.tabs.onUpdated/onMessage
// addListener calls) has actually finished running. If the first scenario's page.goto()
// fires its 'complete' event in that window, chrome.tabs.onUpdated has no listener yet and
// the event is lost forever (Chrome doesn't replay it) — the test then waits out the full
// poll timeout and fails with "no cached evaluation appeared", even though nothing was ever
// slow. A round-tripped runtime message proves the top-level script (which registers
// onMessage in the same synchronous block as onUpdated) has fully executed.
async function waitForServiceWorkerReady(sw: ServiceWorker, timeoutMs = 10000): Promise<void> {
  const start = Date.now();
  for (;;) {
    try {
      const ok = await (
        sw as unknown as { evaluate: <T>(fn: () => Promise<T> | T) => Promise<T> }
      ).evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            chrome.runtime.sendMessage({ type: 'getEvaluation', tabId: -1 }, () => resolve(true));
          }),
      );
      if (ok) return;
    } catch {
      /* SW not ready to evaluate yet; retry */
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error('extension service worker did not become ready to receive messages in time');
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

interface SwEvalContext {
  storage: Record<string, unknown>;
}

async function readSession(sw: ServiceWorker): Promise<Record<string, unknown>> {
  return await (sw as unknown as { evaluate: <T>(fn: () => Promise<T> | T) => Promise<T> }).evaluate(
    async () => {
      return await (globalThis as { chrome: typeof chrome }).chrome.storage.session.get(null);
    },
  );
}

// lookupDirectory has two sequential network phases (search, then per-candidate detail
// fetch), each with its own 8s FETCH_TIMEOUT_MS — a genuinely slow directory widget API
// can legitimately take close to 16s end to end, on top of the 250ms scheduling debounce.
// 20s gives real headroom above that worst case instead of racing it.
async function findCachedEvaluation(
  sw: ServiceWorker,
  domain: string,
  timeoutMs = 20000,
): Promise<Record<string, unknown> | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const session = await readSession(sw);
    const key = `eval:${domain}`;
    if (key in session) return session[key] as Record<string, unknown>;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

interface AxeResults {
  violations: Array<{ id: string; impact: string | null; nodes: unknown[]; description: string }>;
}

async function runAxeScan(popup: Page, extId: string, scenarioLabel: string): Promise<void> {
  // MV3 CSP forbids inline scripts in extension pages; load axe-core as a
  // same-origin resource that we staged into dist/ at test setup.
  await popup.addScriptTag({ url: `chrome-extension://${extId}/axe.min.js` });
  const results = (await popup.evaluate(async () => {
    const w = window as unknown as { axe: { run: () => Promise<AxeResults> } };
    return await w.axe.run();
  })) as AxeResults;
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (serious.length > 0) {
    recordFailure(
      scenarioLabel,
      `axe-core reported ${serious.length} serious/critical violation(s): ${serious
        .map((v) => `${v.id} (${v.nodes.length} node(s))`)
        .join(', ')}`,
    );
  } else {
    recordPass(scenarioLabel, `axe-core a11y: 0 serious/critical violations`);
  }
}

async function runScenario(
  context: BrowserContext,
  sw: ServiceWorker,
  extId: string,
  scenario: ScenarioExpectation,
): Promise<void> {
  const page = await context.newPage();
  try {
    await page.goto(scenario.pageUrl, { waitUntil: 'load' });
    const evaluation = await findCachedEvaluation(sw, scenario.domain);

    if (!evaluation) {
      const session = await readSession(sw);
      console.error('DEBUG trace on failure:', JSON.stringify(session['__trace'], null, 2));
      recordFailure(scenario.domain, `no cached evaluation appeared in chrome.storage.session`);
      return;
    }

    if (evaluation.iconState !== scenario.expectedIconState) {
      recordFailure(
        scenario.domain,
        `iconState ${String(evaluation.iconState)} !== ${scenario.expectedIconState}`,
      );
      return;
    }
    recordPass(scenario.domain, `iconState=${scenario.expectedIconState}`);

    if (evaluation.status !== scenario.status) {
      recordFailure(
        scenario.domain,
        `status ${String(evaluation.status)} !== ${scenario.status}`,
      );
      return;
    }

    // Open the popup against this tab and assert hero text
    const tabId = page.url() === scenario.pageUrl ? await getTabIdFor(sw, scenario.pageUrl) : null;
    if (tabId === null) {
      recordFailure(scenario.domain, 'could not resolve tabId for popup test');
      return;
    }

    const popup = await context.newPage();
    try {
      await popup.goto(`chrome-extension://${extId}/popup.html?testTabId=${tabId}`);
      await popup.waitForSelector('#hero-headline');
      // Wait for popup to populate (it makes an async sendMessage)
      await popup.waitForFunction(
        () => {
          const el = document.getElementById('hero-headline');
          return el && el.textContent && el.textContent.trim() !== 'Checking…';
        },
        { timeout: 8000 },
      );
      const headline = (await popup.textContent('#hero-headline')) ?? '';
      if (!scenario.expectedHeadlineMatch.test(headline)) {
        recordFailure(
          scenario.domain,
          `popup headline "${headline.trim()}" did not match ${scenario.expectedHeadlineMatch}`,
        );
      } else {
        recordPass(scenario.domain, `popup headline matches ${scenario.expectedHeadlineMatch}`);
      }

      // Screenshot for the visual archive
      await popup.screenshot({
        path: path.join(SCREENSHOTS, `popup-${scenario.expectedIconState}.png`),
      });

      await runAxeScan(popup, extId, scenario.domain);
    } finally {
      await popup.close();
    }
  } finally {
    await page.close();
  }
}

async function getTabIdFor(sw: ServiceWorker, url: string): Promise<number | null> {
  return await (sw as unknown as { evaluate: <T>(fn: (arg: string) => Promise<T> | T, arg: string) => Promise<T> }).evaluate(
    async (target: string) => {
      const tabs = await (globalThis as { chrome: typeof chrome }).chrome.tabs.query({});
      const match = tabs.find((t: { url?: string; id?: number }) => t.url === target);
      return match?.id ?? null;
    },
    url,
  );
}

async function runRetaliationLookupScenario(
  context: BrowserContext,
  sw: ServiceWorker,
  extId: string,
): Promise<void> {
  const domain = 'unknown-example.test';
  const page = await context.newPage();
  try {
    await page.goto(`https://${domain}/`, { waitUntil: 'load' });
    const evaluation = await findCachedEvaluation(sw, domain);
    if (!evaluation) {
      recordFailure('retaliation', 'unknown-example.test never evaluated');
      return;
    }
    const tabId = await getTabIdFor(sw, `https://${domain}/`);
    if (tabId === null) {
      recordFailure('retaliation', 'could not find tab id');
      return;
    }
    const popup = await context.newPage();
    try {
      await popup.goto(`chrome-extension://${extId}/popup.html?testTabId=${tabId}`);
      await popup.waitForSelector('#lookup-btn');
      await popup.click('#lookup-btn');
      await popup.waitForSelector('#retaliation-banner:not([hidden])', { timeout: 10000 });
      const banner = (await popup.textContent('#retaliation-detail')) ?? '';
      if (!/retaliation history/i.test(banner)) {
        recordFailure('retaliation', `retaliation banner content unexpected: "${banner}"`);
      } else {
        recordPass('retaliation', 'retaliation banner rendered');
      }
      await popup.screenshot({
        path: path.join(SCREENSHOTS, `popup-retaliation.png`),
      });
    } finally {
      await popup.close();
    }
  } finally {
    await page.close();
  }
}

async function runHappyLookupScenario(
  context: BrowserContext,
  sw: ServiceWorker,
  extId: string,
): Promise<void> {
  const domain = 'unknown-example.test';
  const page = await context.newPage();
  try {
    await page.goto(`https://${domain}/`, { waitUntil: 'load' });
    await findCachedEvaluation(sw, domain);
    const tabId = await getTabIdFor(sw, `https://${domain}/`);
    if (tabId === null) {
      recordFailure('lookup-happy', 'could not find tab id');
      return;
    }
    const popup = await context.newPage();
    try {
      await popup.goto(`chrome-extension://${extId}/popup.html?testTabId=${tabId}`);
      await popup.waitForSelector('#lookup-btn');
      await popup.click('#lookup-btn');
      await popup.waitForSelector('#lookup-results:not([hidden])', { timeout: 10000 });
      const itemCount = await popup.locator('#lookup-contacts li').count();
      if (itemCount === 0) {
        recordFailure('lookup-happy', 'no contacts rendered after live lookup');
      } else {
        recordPass('lookup-happy', `${itemCount} contact(s) rendered`);
      }
    } finally {
      await popup.close();
    }
  } finally {
    await page.close();
  }
}

async function runPopupReadinessScenarios(context: BrowserContext, sw: ServiceWorker, extId: string): Promise<void> {
  const errorMatcher = (url: URL) => url.hostname === 'api.disclosebot.io'
    && /^offline[- ]example/.test(url.searchParams.get('filter[name_cont]') ?? '');
  await context.route(errorMatcher, (route) => route.fulfill({ status: 503, body: 'unavailable' }));
  const scenarios = [
    { name: 'popup-before-evaluation', url: 'https://fresh-example.test/', headline: 'Not found in the disclose.io directory', disabled: false },
    { name: 'directory-error', url: 'https://offline-example.test/', headline: 'Directory check unavailable', disabled: false },
    { name: 'ineligible-page', url: 'about:blank', headline: 'This page cannot be checked', disabled: true },
  ];
  try {
    for (const scenario of scenarios) {
      const target = await context.newPage();
      const popup = await context.newPage();
      try {
        await target.goto(scenario.url);
        const tabId = await getTabIdFor(sw, scenario.url);
        if (tabId === null) throw new Error(`could not find ${scenario.name} tab`);
        // Open immediately, without waiting for the automatic directory check.
        await popup.goto(`chrome-extension://${extId}/popup.html?testTabId=${tabId}`);
        await popup.waitForFunction((headline) => document.getElementById('hero-headline')?.textContent === headline, scenario.headline);
        const disabled = await popup.locator('#lookup-btn').isDisabled();
        if (disabled !== scenario.disabled) recordFailure(scenario.name, `lookup disabled=${disabled}; expected ${scenario.disabled}`);
        else recordPass(scenario.name, 'resolved current-tab state and lookup availability');
        if (await popup.locator('.hero__spinner').isVisible()) recordFailure(scenario.name, 'spinner remained visible after resolution');
        await runAxeScan(popup, extId, scenario.name);
      } finally {
        await popup.close();
        await target.close();
      }
    }
  } finally {
    await context.unroute(errorMatcher);
  }
}

async function getExtensionId(sw: ServiceWorker): Promise<string> {
  // SW URL is chrome-extension://<id>/background.js
  const url = (sw as unknown as { url: () => string }).url();
  const match = url.match(/^chrome-extension:\/\/([^/]+)\//);
  if (!match) throw new Error(`could not parse extension id from ${url}`);
  return match[1]!;
}

async function ensureBuilt(): Promise<void> {
  if (!existsSync(path.join(DIST, 'manifest.json'))) {
    throw new Error('dist/manifest.json missing — run `bun run build` first');
  }
  // Stage axe-core into dist as a same-origin resource for a11y scans.
  await copyFile(
    path.join(ROOT, 'node_modules/axe-core/axe.min.js'),
    path.join(DIST, 'axe.min.js'),
  );
}

async function launchContext(
  userDataDir: string,
): Promise<BrowserContext> {
  const headlessEnv = process.env.HEADLESS;
  const useHeadless = headlessEnv !== '0' && headlessEnv !== 'false';
  return await chromium.launchPersistentContext(userDataDir, {
    headless: useHeadless,
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${DIST}`,
      `--load-extension=${DIST}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-features=Translate,DialMediaRouteProvider',
    ],
  });
}

async function runSmokeCheck(): Promise<void> {
  console.log('\n— Live Chrome smoke check (SMOKE=1) —');
  const child = Bun.spawn([process.execPath, path.join(ROOT, 'scripts/test-live.ts')], {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) recordFailure('live-smoke', `live extension checks exited with code ${exitCode}`);
}

async function main(): Promise<void> {
  await ensureBuilt();
  if (existsSync(SCREENSHOTS)) await rm(SCREENSHOTS, { recursive: true, force: true });
  await mkdir(SCREENSHOTS, { recursive: true });

  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'disclose-ext-'));
  console.log(`User data dir: ${userDataDir}`);

  const context = await launchContext(userDataDir);
  let sw: ServiceWorker | null = null;
  try {
    console.log('Waiting for extension service worker…');
    sw = await getServiceWorker(context);
    await waitForServiceWorkerReady(sw);
    const extId = await getExtensionId(sw);
    console.log(`Extension id: ${extId}`);

    console.log('\n— Setting up routes (happy lookup mode) —');
    await setupRoutes(context, 'happy');

    console.log('\n— Running directory scenarios —');
    for (const scenario of SCENARIOS) {
      console.log(`\n[${scenario.domain}]`);
      await runScenario(context, sw, extId, scenario);
    }

    console.log('\n— Running happy live-lookup scenario —');
    await runHappyLookupScenario(context, sw, extId);

    console.log('\n— Popup startup, unavailable, and ineligible states —');
    await runPopupReadinessScenarios(context, sw, extId);

    console.log('\n— Switching to retaliation lookup mode and re-running —');
    await context.unrouteAll();
    await setupRoutes(context, 'retaliation');
    await runRetaliationLookupScenario(context, sw, extId);
  } catch (err) {
    recordFailure(undefined, err instanceof Error ? err.stack ?? err.message : String(err));
  } finally {
    await context.close();
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }

  // Mirror screenshots into docs/ for the repo's visual archive
  const docsDir = path.join(ROOT, 'docs/screenshots');
  await mkdir(docsDir, { recursive: true });
  for (const file of [
    'popup-level5.png',
    'popup-safe-harbor.png',
    'popup-vdp.png',
    'popup-none.png',
    'popup-retaliation.png',
  ]) {
    const src = path.join(SCREENSHOTS, file);
    if (existsSync(src)) await copyFile(src, path.join(docsDir, file));
  }

  if (process.env.SMOKE === '1') {
    await runSmokeCheck();
  }

  await writeFile(
    path.join(ROOT, 'test/results.json'),
    JSON.stringify({ failures }, null, 2),
  );

  console.log('\n=== Summary ===');
  if (failures.length === 0) {
    console.log('✓ All scenarios passed');
    process.exit(0);
  }
  console.error(`✗ ${failures.length} failure(s)`);
  process.exit(1);
}

await main();
