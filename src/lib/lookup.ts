import type { LookupReport } from '../types';

const LOOKUP_BASE_URL = 'https://lookup.disclose.io';
const LOOKUP_TIMEOUT_MS = 30000;

export interface LookupRequestOptions {
  signal?: AbortSignal;
  baseUrl?: string;
  lookupSessionId?: string;
  etag?: string;
  cachedReport?: LookupReport;
}

export interface LookupFetchResult {
  report: LookupReport;
  etag?: string;
  cacheStatus?: string;
  notModified: boolean;
}

interface ErrorEnvelope {
  errorMessage?: unknown;
  requestId?: unknown;
}

async function responseError(response: Response): Promise<Error> {
  let message = `lookup failed: ${response.status}`;
  try {
    const error = await response.json() as ErrorEnvelope;
    if (typeof error.errorMessage === 'string' && error.errorMessage) {
      message = error.errorMessage;
      if (typeof error.requestId === 'string' && error.requestId) {
        message += ` (request ${error.requestId})`;
      }
    }
  } catch {
    // A non-JSON error body still receives a useful status message.
  }
  return new Error(message);
}

export async function runLookup(
  domain: string,
  options: LookupRequestOptions = {},
): Promise<LookupFetchResult> {
  const baseUrl = options.baseUrl ?? LOOKUP_BASE_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  if (options.signal) {
    options.signal.addEventListener('abort', abortFromCaller, { once: true });
  }
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.lookupSessionId) headers['X-Lookup-Session'] = options.lookupSessionId;
    if (options.etag) headers['If-None-Match'] = options.etag;
    const response = await fetch(`${baseUrl}/api/lookup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ input: domain }),
      signal: controller.signal,
    });
    if (response.status === 304) {
      if (!options.cachedReport) {
        throw new Error('lookup returned 304 without a cached lookup result');
      }
      return {
        report: options.cachedReport,
        etag: response.headers.get('etag') ?? options.etag,
        cacheStatus: response.headers.get('x-lookup-cache') ?? undefined,
        notModified: true,
      };
    }
    if (!response.ok) {
      throw await responseError(response);
    }
    const json = (await response.json()) as LookupReport;
    return {
      report: json,
      etag: response.headers.get('etag') ?? undefined,
      cacheStatus: response.headers.get('x-lookup-cache') ?? undefined,
      notModified: false,
    };
  } finally {
    clearTimeout(timeout);
    if (options.signal) options.signal.removeEventListener('abort', abortFromCaller);
  }
}
