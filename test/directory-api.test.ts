import { afterEach, describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { lookupDirectory } from '../src/lib/directory';

const originalFetch = globalThis.fetch;

const listOrganization = {
  id: 'org-example',
  type: 'directory_organization',
  attributes: {
    name: 'Example',
    slug: 'example-123abc',
    safe_harbor: 'full',
    offers_bounty: true,
    maturity_label: 'Full',
    maturity_level: 4,
    maturity_score: 86.67,
  },
  relationships: { policies: { data: [{ id: 'policy-example', type: 'policy_summary' }] } },
};
const included = [{
  id: 'policy-example',
  type: 'policy_summary',
  attributes: {
    policy_url: 'https://example.test/security',
    point_of_contact: 'security@example.test',
    securitytxt_url: 'https://example.test/.well-known/security.txt',
    safe_harbor: 'full',
    offers_bounty: true,
  },
}];

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('disclose.io public directory JSON:API', () => {
  test('decodes a captured production response and resolves included policies by relationship', async () => {
    // Public response captured 2026-11-04 from the current organization endpoint.
    const fixture = JSON.parse(await readFile(path.join(import.meta.dir, 'fixtures/directory-google-jsonapi.json'), 'utf8'));
    globalThis.fetch = (async (input) => Response.json({
      ...fixture,
      data: new URL(String(input)).pathname.endsWith('/organizations') ? [fixture.data] : fixture.data,
      included: [...fixture.included].reverse(),
    })) as typeof fetch;
    expect((await lookupDirectory('google.com')).program).toMatchObject({
      programName: 'Google',
      policyUrl: 'https://g.co/vrp',
      contactEmail: 'security@google.com',
      safeHarbor: 'none',
      offersBounty: true,
      maturityRank: 2,
      maturityLevel: 'Basic',
      maturityScore: 53.33,
    });
  });

  test('maps the disclose.io tenant list and detail payloads into a program snapshot', async () => {
    const requests: URL[] = [];
    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      if (url.pathname.endsWith('/organizations/example-123abc')) {
        return Response.json({
          data: {
            ...listOrganization,
            attributes: { ...listOrganization.attributes, offers_swag: false },
          },
          included,
        });
      }
      return Response.json({ data: [listOrganization], included });
    }) as typeof fetch;

    const result = await lookupDirectory('example.test');

    expect(result).toMatchObject({
      matched: true,
      candidatesConsidered: 1,
      program: {
        slug: 'example-123abc',
        programName: 'Example',
        policyUrl: 'https://example.test/security',
        contactEmail: 'security@example.test',
        securityTxtUrl: 'https://example.test/.well-known/security.txt',
        safeHarbor: 'full',
        offersBounty: true,
        maturityLevel: 'Full',
        maturityRank: 4,
        maturityScore: 86.67,
        directoryUrl: 'https://directory.disclose.io/o/example-123abc',
      },
    });
    expect(requests).toEqual(expect.arrayContaining([
      expect.objectContaining({
        hostname: 'api.disclosebot.io',
        pathname: '/v1/p/directories/adf701/organizations',
      }),
      expect.objectContaining({
        hostname: 'api.disclosebot.io',
        pathname: '/v1/p/directories/adf701/organizations/example-123abc',
      }),
    ]));
    expect(requests.filter((url) => url.pathname.endsWith('/organizations')).every(
      (url) => url.searchParams.get('page[size]') === '25' && Boolean(url.searchParams.get('filter[name_cont]')),
    )).toBe(true);
  });

  test('rejects malformed directory payloads instead of returning a negative verdict', async () => {
    globalThis.fetch = (async () => Response.json({ data: 'not-an-array' })) as unknown as typeof fetch;

    await expect(lookupDirectory('example.test')).rejects.toThrow('directory check unavailable');
  });

  test('rejects offline and HTTP failures instead of returning a negative verdict', async () => {
    globalThis.fetch = (async () => { throw new TypeError('offline'); }) as unknown as typeof fetch;
    await expect(lookupDirectory('example.test')).rejects.toThrow('offline');
    globalThis.fetch = (async () => new Response(null, { status: 503 })) as unknown as typeof fetch;
    await expect(lookupDirectory('example.test')).rejects.toThrow('503');
  });

  test('a successful empty search is a genuine unmatched result', async () => {
    globalThis.fetch = (async () => Response.json({ data: [] })) as unknown as typeof fetch;
    expect(await lookupDirectory('example.test')).toEqual({ matched: false, candidatesConsidered: 0 });
  });

  test('uses a successful search even if the other search fails', async () => {
    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      if (url.searchParams.get('filter[name_cont]') === 'example.test') return new Response(null, { status: 503 });
      if (url.pathname.includes('/organizations/')) return Response.json({ data: listOrganization, included });
      return Response.json({ data: [listOrganization], included });
    }) as typeof fetch;
    expect((await lookupDirectory('example.test')).matched).toBe(true);
  });

  test('does not treat an incomplete empty search as a negative verdict', async () => {
    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      if (url.searchParams.get('filter[name_cont]') === 'example.test') return new Response(null, { status: 503 });
      return Response.json({ data: [] });
    }) as typeof fetch;
    await expect(lookupDirectory('example.test')).rejects.toThrow('a directory search failed');
  });

  test('limits the Origin rewrite to the disclose.io tenant public API endpoint', async () => {
    const root = path.resolve(import.meta.dir, '..');
    const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
    const rules = JSON.parse(await readFile(path.join(root, 'rules/directory-api-origin.json'), 'utf8'));

    expect(manifest.permissions).toContain('declarativeNetRequestWithHostAccess');
    expect(manifest.host_permissions).toContain('https://api.disclosebot.io/*');
    expect(rules).toEqual([expect.objectContaining({
      condition: expect.objectContaining({
        urlFilter: '||api.disclosebot.io/v1/p/directories/adf701/',
        resourceTypes: ['xmlhttprequest'],
      }),
      action: expect.objectContaining({
        requestHeaders: [expect.objectContaining({
          header: 'Origin',
          operation: 'set',
          value: 'https://directory.disclose.io',
        })],
      }),
    })]);
  });
});
