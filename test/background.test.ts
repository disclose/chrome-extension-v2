import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import type { LookupResponse, PopupResponse } from '../src/types';

const originalFetch = globalThis.fetch;
const originalChrome = globalThis.chrome;
const tabs = new Map<number, chrome.tabs.Tab>();
const storage: Record<string, unknown> = {};
const painted = new Map<number, string>();
let onUpdated: (id: number, change: { status?: string; url?: string }, tab: chrome.tabs.Tab) => void;
let onActivated: (info: { tabId: number; windowId: number }) => void;
let onMessage: (message: unknown, sender: unknown, respond: (response: unknown) => void) => boolean;

function tab(id: number, domain: string, active = true): chrome.tabs.Tab {
  const value = { id, url: `https://${domain}/`, active } as chrome.tabs.Tab;
  tabs.set(id, value);
  return value;
}

function getEvaluation(tabId: number): Promise<PopupResponse> {
  return new Promise((resolve) => onMessage({ type: 'getEvaluation', tabId }, {}, (response) => resolve(response as PopupResponse)));
}

function lookup(tabId: number, domain: string): Promise<LookupResponse> {
  return new Promise((resolve) => onMessage({ type: 'runLookup', tabId, domain }, {}, (response) => resolve(response as LookupResponse)));
}

function directoryResponse(input: RequestInfo | URL): Response {
  const url = new URL(String(input));
  const slug = url.pathname.includes('/organizations/')
    ? url.pathname.split('/').at(-1)!
    : url.searchParams.get('filter[name_cont]')!.split('.')[0]!;
  const organization = {
    id: slug,
    type: 'directory_organization',
    attributes: {
      name: slug,
      slug,
      policy_url: `https://${slug}.test/security`,
      safe_harbor: slug === 'alpha' ? 'full' : 'none',
    },
  };
  return Response.json({ data: url.pathname.includes('/organizations/') ? organization : [organization] });
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (predicate()) return;
    await Bun.sleep(10);
  }
  throw new Error('background operation did not complete');
}

beforeAll(async () => {
  globalThis.chrome = {
    tabs: {
      get: async (id: number) => {
        const value = tabs.get(id);
        if (!value) throw new Error('tab closed');
        return value;
      },
      query: async () => [...tabs.values()].filter((value) => value.active),
      onUpdated: { addListener: (listener: typeof onUpdated) => { onUpdated = listener; } },
      onActivated: { addListener: (listener: typeof onActivated) => { onActivated = listener; } },
      onRemoved: { addListener: () => {} },
    },
    storage: { session: {
      get: async (key: string | null) => key === null ? { ...storage } : { [key]: storage[key] },
      set: async (values: Record<string, unknown>) => { Object.assign(storage, values); },
      remove: async (keys: string[]) => { for (const key of keys) delete storage[key]; },
    } },
    action: {
      setIcon: async ({ tabId, path }: { tabId: number; path: Record<string, string> }) => { painted.set(tabId, path['16']!); },
      setTitle: async () => {},
    },
    runtime: {
      onInstalled: { addListener: () => {} },
      onMessage: { addListener: (listener: typeof onMessage) => { onMessage = listener; } },
    },
    alarms: { onAlarm: { addListener: () => {} }, create: () => {} },
  } as unknown as typeof chrome;
  await import('../src/background');
});

beforeEach(() => {
  tabs.clear();
  painted.clear();
  for (const key of Object.keys(storage)) delete storage[key];
  globalThis.fetch = (async (input) => directoryResponse(input)) as typeof fetch;
});

afterAll(() => {
  globalThis.chrome = originalChrome;
  globalThis.fetch = originalFetch;
});

describe('current-tab background evaluation', () => {
  test('evaluates an existing tab without requiring a navigation or old cache', async () => {
    tab(101, 'alpha.test');
    expect((await getEvaluation(101)).evaluation).toMatchObject({ domain: 'alpha.test', status: 'matched', iconState: 'safe-harbor' });
  });

  test('directory requests send only the registrable domain or derived name', async () => {
    tabs.set(108, {
      id: 108, active: true,
      url: 'https://user:dummy-secret@sub.alpha.test/private?token=dummy-secret',
    } as chrome.tabs.Tab);
    const requests: Request[] = [];
    const credentials: unknown[] = [];
    globalThis.fetch = (async (input, init) => {
      requests.push(new Request(input, init));
      credentials.push(init?.credentials);
      return directoryResponse(input);
    }) as typeof fetch;
    expect((await getEvaluation(108)).evaluation?.domain).toBe('alpha.test');
    const searches = requests.filter((request) => new URL(request.url).pathname.endsWith('/organizations'));
    expect(searches.map((request) => new URL(request.url).searchParams.get('filter[name_cont]')).sort()).toEqual(['alpha', 'alpha.test']);
    expect(credentials.every((value) => value === 'omit')).toBe(true);
    for (const request of requests) {
      expect(request.url).not.toMatch(/dummy-secret|private|token|sub\.alpha|user/);
      expect(await request.text()).toBe('');
      expect(request.headers.get('authorization')).toBeNull();
      expect(request.headers.get('cookie')).toBeNull();
    }
  });

  test('popup requests await an evaluation already in flight', async () => {
    const value = tab(102, 'alpha.test');
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let started = false;
    globalThis.fetch = (async (input) => { started = true; await gate; return directoryResponse(input); }) as typeof fetch;
    onUpdated(102, { status: 'complete' }, value);
    await waitFor(() => started);
    const response = getEvaluation(102);
    release();
    expect((await response).evaluation?.domain).toBe('alpha.test');
  });

  test('a stale result cannot replace a newer site after navigation', async () => {
    tab(103, 'alpha.test');
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let started = false;
    globalThis.fetch = (async (input) => {
      if (String(input).includes('alpha')) { started = true; await gate; }
      return directoryResponse(input);
    }) as typeof fetch;
    const stale = getEvaluation(103);
    await waitFor(() => started);
    const current = tab(103, 'bravo.test');
    onUpdated(103, { url: current.url, status: 'loading' }, current);
    expect((await getEvaluation(103)).evaluation).toMatchObject({ domain: 'bravo.test', iconState: 'vdp' });
    release();
    expect((await stale).evaluation).toBeNull();
    expect(painted.get(103)).toBe('icons/vdp-16.png');
  });

  test('inactive navigation makes no automatic requests until tab activation', async () => {
    const value = tab(104, 'bravo.test', false);
    let requests = 0;
    globalThis.fetch = (async (input) => { requests++; return directoryResponse(input); }) as typeof fetch;
    onUpdated(104, { status: 'complete' }, value);
    await Bun.sleep(300);
    expect(requests).toBe(0);
    value.active = true;
    onActivated({ tabId: 104, windowId: 1 });
    await waitFor(() => Boolean(storage['eval:bravo.test']));
    expect(requests).toBeGreaterThan(0);
  });

  test('network errors remain errors, are not cached, and can recover on reopen', async () => {
    tab(105, 'alpha.test');
    globalThis.fetch = (async () => new Response(null, { status: 503 })) as unknown as typeof fetch;
    expect((await getEvaluation(105)).evaluation?.status).toBe('error');
    expect(storage['eval:alpha.test']).toBeUndefined();
    globalThis.fetch = (async (input) => directoryResponse(input)) as typeof fetch;
    expect((await getEvaluation(105)).evaluation?.status).toBe('matched');
  });

  test('ineligible pages return an explicit state without a request', async () => {
    tabs.set(106, { id: 106, url: 'chrome://extensions/', active: true } as chrome.tabs.Tab);
    let requests = 0;
    globalThis.fetch = (async () => { requests++; throw new Error('unexpected request'); }) as unknown as typeof fetch;
    expect((await getEvaluation(106)).evaluation?.status).toBe('ineligible');
    expect(requests).toBe(0);
  });

  test('live lookup rejects a popup domain left over from the previous site', async () => {
    tab(107, 'bravo.test');
    let requests = 0;
    globalThis.fetch = (async () => { requests++; return Response.json({ input: 'bravo.test', contacts: [] }); }) as unknown as typeof fetch;
    expect((await lookup(107, 'alpha.test')).error).toContain('changed sites');
    expect(requests).toBe(0);
    expect((await lookup(107, 'bravo.test')).report?.input).toBe('bravo.test');
    expect(requests).toBe(1);
  });
});
