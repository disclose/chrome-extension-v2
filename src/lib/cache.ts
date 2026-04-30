import type { TabEvaluation } from '../types';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h, mirrors lookup-disclose-io diodb step
const STORAGE_KEY_PREFIX = 'eval:';

function key(domain: string): string {
  return STORAGE_KEY_PREFIX + domain;
}

export async function getCachedEvaluation(domain: string): Promise<TabEvaluation | null> {
  const k = key(domain);
  const result = await chrome.storage.session.get(k);
  const stored = result[k] as TabEvaluation | undefined;
  if (!stored) return null;
  if (Date.now() - stored.evaluatedAt > CACHE_TTL_MS) return null;
  return stored;
}

export async function setCachedEvaluation(evaluation: TabEvaluation): Promise<void> {
  if (evaluation.status === 'error') return;
  await chrome.storage.session.set({ [key(evaluation.domain)]: evaluation });
}

export async function clearCache(): Promise<void> {
  const all = await chrome.storage.session.get(null);
  const stale: string[] = [];
  const now = Date.now();
  for (const [k, value] of Object.entries(all)) {
    if (!k.startsWith(STORAGE_KEY_PREFIX)) continue;
    const ev = value as TabEvaluation;
    if (now - ev.evaluatedAt > CACHE_TTL_MS) stale.push(k);
  }
  if (stale.length > 0) await chrome.storage.session.remove(stale);
}

const inFlight = new Map<string, Promise<TabEvaluation>>();

export function dedupe<T extends TabEvaluation>(
  domain: string,
  factory: () => Promise<T>,
): Promise<T> {
  const existing = inFlight.get(domain);
  if (existing) return existing as Promise<T>;
  const promise = factory().finally(() => inFlight.delete(domain));
  inFlight.set(domain, promise as unknown as Promise<TabEvaluation>);
  return promise;
}
