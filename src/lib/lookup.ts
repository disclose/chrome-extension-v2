import type { LookupReport } from '../types';

const LOOKUP_BASE_URL = 'https://lookup.disclose.io';
const LOOKUP_TIMEOUT_MS = 30000;

export async function runLookup(
  domain: string,
  options: { signal?: AbortSignal; baseUrl?: string } = {},
): Promise<LookupReport> {
  const baseUrl = options.baseUrl ?? LOOKUP_BASE_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    const response = await fetch(`${baseUrl}/api/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: domain }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`lookup failed: ${response.status}`);
    }
    const json = (await response.json()) as LookupReport;
    return json;
  } finally {
    clearTimeout(timeout);
  }
}
