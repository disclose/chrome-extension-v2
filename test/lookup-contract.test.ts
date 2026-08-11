import { afterEach, describe, expect, test } from 'bun:test';
import { runLookup } from '../src/lib/lookup';
import { describeLookupPresentation } from '../src/lib/route-presentation';
import type { LookupReport } from '../src/types';
import { happyLookupResponse } from './fixtures/lookup-mock';

const originalFetch = globalThis.fetch;

const ownerRouteReport: LookupReport = {
  input: 'example.test',
  assetType: 'domain',
  timestamp: '2026-08-11T07:00:00.000Z',
  status: 'complete',
  requestId: 'req_example_route',
  hasErrors: false,
  attribution: { organization: 'Example Org', confidence: 'high' },
  contacts: [
    {
      type: 'vdp',
      value: 'https://hackerone.com/example-org',
      confidence: 'high',
      source: 'bounty-platforms',
      label: 'Example Org vulnerability disclosure program',
      verified: true,
      entity: 'Example Org',
      entityKey: 'example-org',
      relation: 'vendor',
      routeClass: 'authorized_agent',
      deliveryAgent: 'HackerOne',
    },
  ],
  contactGroups: [
    {
      entity: 'Example Org',
      entityKey: 'example-org',
      relation: 'vendor',
      routeClass: 'authorized_agent',
      rationale: 'Official program is delivered through a managed disclosure service.',
      contacts: [],
    },
  ],
  routeSummary: {
    routeClass: 'authorized_agent',
    headline: 'Example Org accepts reports through its authorized disclosure service.',
    firstPartyFound: false,
    ownerRouteFound: true,
    coordinatorAvailable: false,
  },
  details: {},
  dataSources: [],
  chains: [],
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('lookup.disclose.io API contract', () => {
  test('sends the lookup session and recognizes a fresh validator', async () => {
    let request: Request | undefined;
    globalThis.fetch = (async (input, init) => {
      request = new Request(input, init);
      return Response.json(ownerRouteReport, {
        headers: { ETag: 'W/"lookup-example"', 'X-Lookup-Cache': 'miss' },
      });
    }) as typeof fetch;

    const result = await runLookup('example.test', {
      lookupSessionId: 's'.repeat(20),
    });

    expect(request?.url).toBe('https://lookup.disclose.io/api/lookup');
    expect(request?.headers.get('x-lookup-session')).toBe('s'.repeat(20));
    expect(request?.headers.get('if-none-match')).toBeNull();
    expect(await request?.json()).toEqual({ input: 'example.test' });
    expect(result.report).toEqual(ownerRouteReport);
    expect(result.etag).toBe('W/"lookup-example"');
    expect(result.cacheStatus).toBe('miss');
  });

  test('returns the session-cached report after a 304 response', async () => {
    globalThis.fetch = (async (input, init) => {
      const request = new Request(input, init);
      expect(request.headers.get('if-none-match')).toBe('W/"lookup-example"');
      return new Response(null, {
        status: 304,
        headers: { ETag: 'W/"lookup-example"', 'X-Lookup-Cache': 'not-modified' },
      });
    }) as typeof fetch;

    const result = await runLookup('example.test', {
      lookupSessionId: 's'.repeat(20),
      etag: 'W/"lookup-example"',
      cachedReport: ownerRouteReport,
    });

    expect(result.report).toBe(ownerRouteReport);
    expect(result.notModified).toBe(true);
  });

  test('fails clearly if the server returns 304 without a cached payload', async () => {
    globalThis.fetch = (async () => new Response(null, { status: 304 })) as unknown as typeof fetch;

    await expect(runLookup('example.test', { etag: 'W/"lookup-example"' })).rejects.toThrow(
      'without a cached lookup result',
    );
  });

  test('includes the API error message and request ID', async () => {
    globalThis.fetch = (async () => Response.json({
      status: 'rate_limited',
      errorMessage: 'Lookup service is busy; retry after 2 seconds',
      requestId: 'req_retry_later',
      errorCode: 'lookup-overloaded',
    }, { status: 503 })) as unknown as typeof fetch;

    await expect(runLookup('example.test')).rejects.toThrow(
      'Lookup service is busy; retry after 2 seconds (request req_retry_later)',
    );
  });
});

describe('route-aware presentation', () => {
  test('keeps an authorized service attributed to the queried owner', () => {
    const presentation = describeLookupPresentation(ownerRouteReport);

    expect(presentation.summary).toEqual({
      label: 'Owner-authorized reporting path',
      headline: 'Example Org accepts reports through its authorized disclosure service.',
      ownerRouteFound: true,
    });
    expect(presentation.groups).toHaveLength(1);
    expect(presentation.groups[0]).toMatchObject({
      entity: 'Example Org',
      routeLabel: 'Owner-authorized reporting path',
      contacts: [expect.objectContaining({ deliveryAgent: 'HackerOne' })],
    });
  });

  test('does not turn coordinator or inferred routes into first-party claims', () => {
    const coordinatorOnly: LookupReport = {
      ...ownerRouteReport,
      contacts: [{
        type: 'cert',
        value: 'https://www.cisa.gov/report',
        confidence: 'medium',
        source: 'cert-lookup',
        label: 'US-CERT reporting coordination',
        verified: true,
        entity: 'US-CERT',
        entityKey: 'us-cert',
        relation: 'coordinator',
        routeClass: 'coordinator',
      }],
      contactGroups: [],
      routeSummary: {
        routeClass: 'coordinator',
        headline: 'No owner reporting route was found; a coordinator may help.',
        firstPartyFound: false,
        ownerRouteFound: false,
        coordinatorAvailable: true,
      },
    };

    const presentation = describeLookupPresentation(coordinatorOnly);

    expect(presentation.summary?.label).toBe('Coordinator fallback');
    expect(presentation.summary?.label).not.toContain('First-party');
    expect(presentation.groups[0]?.routeLabel).toBe('Coordinator fallback');
  });

  test('uses a safe flat-contact fallback for legacy API responses', () => {
    const legacy = happyLookupResponse('legacy.example');
    const presentation = describeLookupPresentation(legacy);

    expect(presentation.summary).toBeUndefined();
    expect(presentation.groups).toHaveLength(1);
    expect(presentation.groups[0]?.entity).toBe('Example Org');
    expect(presentation.groups[0]?.contacts[0]?.value).toBe('https://legacy.example/security');
  });
});
