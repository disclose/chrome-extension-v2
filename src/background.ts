import { lookupDirectory } from './lib/directory';
import { runLookup } from './lib/lookup';
import { iconStateFor } from './lib/maturity';
import { paintIcon } from './lib/icon';
import { eligibleDomainForUrl } from './lib/match';
import { dedupe, getCachedEvaluation, setCachedEvaluation, clearCache } from './lib/cache';
import type {
  IconState,
  LookupReport,
  PopupRequest,
  PopupResponse,
  TabEvaluation,
  LookupRequest,
  LookupResponse,
} from './types';

interface PendingTab {
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<number, PendingTab>();
const tabGenerations = new Map<number, number>();
const DEBOUNCE_MS = 250;
const LOOKUP_SESSION_STORAGE_KEY = 'lookup:session-id';
const LOOKUP_CACHE_STORAGE_PREFIX = 'lookup:response:';

interface CachedLookup {
  report: LookupReport;
  etag?: string;
}

function lookupCacheKey(domain: string): string {
  return LOOKUP_CACHE_STORAGE_PREFIX + domain;
}

function isCachedLookup(value: unknown): value is CachedLookup {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CachedLookup>;
  return Boolean(candidate.report && typeof candidate.report === 'object');
}

async function getLookupSessionId(): Promise<string> {
  const stored = await chrome.storage.session.get(LOOKUP_SESSION_STORAGE_KEY);
  const existing = stored[LOOKUP_SESSION_STORAGE_KEY];
  if (typeof existing === 'string' && existing.length >= 20) return existing;

  const sessionId = `dio_${crypto.randomUUID()}`;
  await chrome.storage.session.set({ [LOOKUP_SESSION_STORAGE_KEY]: sessionId });
  return sessionId;
}

async function getCachedLookup(domain: string): Promise<CachedLookup | undefined> {
  const key = lookupCacheKey(domain);
  const stored = await chrome.storage.session.get(key);
  const candidate = stored[key];
  return isCachedLookup(candidate) ? candidate : undefined;
}

async function runCachedLookup(domain: string): Promise<LookupReport> {
  const [sessionId, cached] = await Promise.all([
    getLookupSessionId(),
    getCachedLookup(domain),
  ]);
  const result = await runLookup(domain, {
    lookupSessionId: sessionId,
    etag: cached?.etag,
    cachedReport: cached?.report,
  });
  if (!result.notModified) {
    await chrome.storage.session.set({
      [lookupCacheKey(domain)]: { report: result.report, etag: result.etag } satisfies CachedLookup,
    });
  }
  return result.report;
}

function makeIneligibleEvaluation(domain: string): TabEvaluation {
  return {
    domain,
    status: 'ineligible',
    iconState: 'unknown',
    evaluatedAt: Date.now(),
  };
}

async function evaluateDomain(domain: string): Promise<TabEvaluation> {
  const cached = await getCachedEvaluation(domain);
  if (cached && cached.status !== 'error' && cached.status !== 'pending') return cached;

  return dedupe(domain, async () => {
    try {
      const result = await lookupDirectory(domain);
      const iconState: IconState = result.matched ? iconStateFor(result.program) : 'none';
      const evaluation: TabEvaluation = {
        domain,
        status: result.matched ? 'matched' : 'unmatched',
        iconState,
        program: result.program,
        evaluatedAt: Date.now(),
      };
      await setCachedEvaluation(evaluation);
      return evaluation;
    } catch (err) {
      return {
        domain,
        status: 'error',
        iconState: 'unknown',
        evaluatedAt: Date.now(),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
}

function invalidateTab(tabId: number): number {
  const existing = pending.get(tabId);
  if (existing) clearTimeout(existing.timer);
  pending.delete(tabId);
  const generation = (tabGenerations.get(tabId) ?? 0) + 1;
  tabGenerations.set(tabId, generation);
  return generation;
}

async function evaluateTab(tabId: number, generation: number, automatic: boolean): Promise<TabEvaluation | null> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tabGenerations.get(tabId) !== generation || (automatic && !tab.active)) return null;
    const domain = eligibleDomainForUrl(tab.url);
    await paintIcon(tabId, 'unknown');
    const evaluation = domain ? await evaluateDomain(domain) : makeIneligibleEvaluation('');

    // A slow request must never repaint a tab that has moved to another site.
    const current = await chrome.tabs.get(tabId);
    if (tabGenerations.get(tabId) !== generation || eligibleDomainForUrl(current.url) !== domain) return null;
    await paintIcon(tabId, evaluation.iconState);
    return evaluation;
  } catch {
    // The tab may have closed while its request was running.
    return null;
  }
}

function scheduleEvaluation(tabId: number): void {
  const generation = invalidateTab(tabId);
  const timer = setTimeout(() => {
    pending.delete(tabId);
    void evaluateTab(tabId, generation, true);
  }, DEBOUNCE_MS);
  pending.set(tabId, { timer });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'loading') {
    invalidateTab(tabId);
    void paintIcon(tabId, 'unknown');
  }
  if (changeInfo.status === 'complete' && tab.active) scheduleEvaluation(tabId);
});

chrome.tabs.onActivated.addListener((info) => {
  scheduleEvaluation(info.tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const p = pending.get(tabId);
  if (p) {
    clearTimeout(p.timer);
    pending.delete(tabId);
  }
  tabGenerations.delete(tabId);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('cache-sweep', { periodInMinutes: 60 });
  void chrome.tabs.query({ active: true }).then((tabs) => {
    for (const tab of tabs) if (tab.id !== undefined) scheduleEvaluation(tab.id);
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cache-sweep') void clearCache();
});

chrome.runtime.onMessage.addListener((message: PopupRequest | LookupRequest, _sender, sendResponse) => {
  if (message.type === 'getEvaluation') {
    void (async () => {
      // Resolve the current URL and await a fresh or cached result. This also
      // covers installation, worker restarts, and opening the popup mid-request.
      const evaluation = await evaluateTab(message.tabId, invalidateTab(message.tabId), false);
      const response: PopupResponse = { evaluation };
      sendResponse(response);
    })();
    return true;
  }
  if (message.type === 'runLookup') {
    void (async () => {
      try {
        const tab = await chrome.tabs.get(message.tabId);
        if (!message.domain || eligibleDomainForUrl(tab.url) !== message.domain) {
          throw new Error('This tab changed sites. Close and reopen the popup before looking it up.');
        }
        const report = await runCachedLookup(message.domain);
        const current = await chrome.tabs.get(message.tabId);
        if (eligibleDomainForUrl(current.url) !== message.domain) {
          throw new Error('This tab changed sites. Close and reopen the popup to see its current status.');
        }
        const response: LookupResponse = { report };
        sendResponse(response);
      } catch (err) {
        const response: LookupResponse = {
          report: null,
          error: err instanceof Error ? err.message : String(err),
        };
        sendResponse(response);
      }
    })();
    return true;
  }
  return false;
});
