import { afterEach, describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { lookupDirectory } from '../src/lib/directory';

const originalFetch = globalThis.fetch;

const listOrganization = {
  name: 'Example',
  slug: 'example-123abc',
  safeHarbor: 'full',
  offersBounty: true,
  maturity: { label: 'Full', score: 86.67 },
  policies: [{
    policyUrl: 'https://example.test/security',
    pointOfContact: 'security@example.test',
    securitytxtUrl: 'https://example.test/.well-known/security.txt',
    safeHarbor: 'full',
    offersBounty: true,
  }],
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('directory.disclose.io widget API', () => {
  test('maps the disclose.io tenant list and detail payloads into a program snapshot', async () => {
    const requests: URL[] = [];
    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      requests.push(url);
      if (url.pathname.endsWith('/organization/example-123abc.json')) {
        return Response.json({
          ...listOrganization,
          policyUrl: 'https://example.test/security',
          securityTxtUrl: 'https://example.test/.well-known/security.txt',
          contactUrl: 'security@example.test',
          offersSwag: false,
        });
      }
      return Response.json({ organizations: [listOrganization] });
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
        maturityScore: 86.67,
        directoryUrl: 'https://directory.disclose.io/o/example-123abc',
      },
    });
    expect(requests).toEqual(expect.arrayContaining([
      expect.objectContaining({
        hostname: 'widgets.disclosebot.io',
        pathname: '/directory/adf701.json',
      }),
      expect.objectContaining({
        hostname: 'widgets.disclosebot.io',
        pathname: '/directory/adf701/organization/example-123abc.json',
      }),
    ]));
    expect(requests.filter((url) => url.pathname.endsWith('adf701.json')).every(
      (url) => url.searchParams.get('per_page') === '100',
    )).toBe(true);
  });

  test('treats malformed directory API payloads as a failed fetch, not an HTML fallback', async () => {
    globalThis.fetch = (async () => Response.json({ organizations: 'not-an-array' })) as unknown as typeof fetch;

    const result = await lookupDirectory('example.test');

    expect(result).toEqual({ matched: false, candidatesConsidered: 0 });
  });

  test('limits the Origin rewrite to the disclose.io tenant widget endpoint', async () => {
    const root = path.resolve(import.meta.dir, '..');
    const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
    const rules = JSON.parse(await readFile(path.join(root, 'rules/directory-api-origin.json'), 'utf8'));

    expect(manifest.permissions).toContain('declarativeNetRequestWithHostAccess');
    expect(manifest.host_permissions).toContain('https://widgets.disclosebot.io/*');
    expect(rules).toEqual([expect.objectContaining({
      condition: expect.objectContaining({
        urlFilter: '||widgets.disclosebot.io/directory/adf701',
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
