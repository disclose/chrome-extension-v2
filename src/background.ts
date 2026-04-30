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
  tabId: number;
  url: string;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<number, PendingTab>();
const tabEvaluations = new Map<number, TabEvaluation>();
const DEBOUNCE_MS = 250;

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

async function handleTab(tabId: number, url: string | undefined): Promise<void> {
  const domain = eligibleDomainForUrl(url);
  if (!domain) {
    const evaluation = makeIneligibleEvaluation('');
    tabEvaluations.set(tabId, evaluation);
    await paintIcon(tabId, 'unknown');
    return;
  }

  // Show "checking" state immediately
  await paintIcon(tabId, 'unknown');

  const evaluation = await evaluateDomain(domain);
  tabEvaluations.set(tabId, evaluation);
  await paintIcon(tabId, evaluation.iconState);
}

function scheduleEvaluation(tabId: number, url: string | undefined): void {
  const existing = pending.get(tabId);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    pending.delete(tabId);
    void handleTab(tabId, url);
  }, DEBOUNCE_MS);
  pending.set(tabId, { tabId, url: url ?? '', timer });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  scheduleEvaluation(tabId, tab.url);
});

chrome.tabs.onActivated.addListener(async (info) => {
  try {
    const tab = await chrome.tabs.get(info.tabId);
    scheduleEvaluation(info.tabId, tab.url);
  } catch {
    /* tab gone */
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const p = pending.get(tabId);
  if (p) {
    clearTimeout(p.timer);
    pending.delete(tabId);
  }
  tabEvaluations.delete(tabId);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('cache-sweep', { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cache-sweep') void clearCache();
});

chrome.runtime.onMessage.addListener((message: PopupRequest | LookupRequest, _sender, sendResponse) => {
  if (message.type === 'getEvaluation') {
    void (async () => {
      let evaluation = tabEvaluations.get(message.tabId) ?? null;
      if (!evaluation) {
        // Fall back to the persistent cache via the tab's URL — covers SW
        // restart and the brief window between cache write and tabEvaluations.set.
        try {
          const tab = await chrome.tabs.get(message.tabId);
          const domain = eligibleDomainForUrl(tab.url);
          if (domain) {
            evaluation = await getCachedEvaluation(domain);
            if (evaluation) tabEvaluations.set(message.tabId, evaluation);
          }
        } catch {
          /* tab gone */
        }
      }
      const response: PopupResponse = { evaluation };
      sendResponse(response);
    })();
    return true;
  }
  if (message.type === 'runLookup') {
    void (async () => {
      try {
        const report: LookupReport = await runLookup(message.domain);
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
