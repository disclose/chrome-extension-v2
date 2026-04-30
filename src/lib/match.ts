// Ported from ~/Projects/lookup-disclose-io/src/utils/entity-match.ts
// and the HOSTING_DOMAINS / HOSTING_SUBDOMAINS sets from src/steps/diodb.ts:13-27.
// Kept structurally identical so re-syncs are mechanical.

import { getDomain } from 'tldts';

export const HOSTING_DOMAINS: ReadonlySet<string> = new Set([
  'github.com', 'gitlab.com', 'bitbucket.org', 'atlassian.com',
  'amazonaws.com', 'cloudfront.net', 'azurewebsites.net',
  'herokuapp.com', 'firebaseapp.com', 'netlify.app',
  'pages.dev', 'vercel.app', 'render.com', 'fly.dev',
  'digitaloceanspaces.com', 'supabase.co', 'railway.app',
]);

export const HOSTING_SUBDOMAINS: ReadonlySet<string> = new Set([
  'docs.google.com', 'forms.google.com', 'sites.google.com',
  'drive.google.com', 'storage.googleapis.com',
  'notion.so', 'notion.site',
]);

const CORP_SUFFIXES = new Set([
  'inc', 'llc', 'ltd', 'corp', 'corporation', 'limited', 'group',
  'gmbh', 'pty', 'plc', 'company', 'co', 'ag', 'ab', 'sa', 'nv',
  'se', 'bv', 'sas', 'srl', 'oyj', 'oy', 'the',
]);

const GENERIC_DESCRIPTOR_TOKENS = new Set([
  'bug', 'bounty', 'bounties', 'disclosure', 'responsible', 'vulnerability',
  'report', 'reporting', 'security', 'whitehat', 'program', 'programs',
  'platform', 'platforms', 'service', 'services', 'online', 'product',
  'products', 'team', 'teams', 'portal', 'cloud', 'dns', 'cyber',
  'defense', 'defence', 'response', 'incident', 'center', 'centre',
  'computer', 'digital', 'data', 'technology', 'tech', 'systems',
  'solutions', 'network', 'networks', 'operations', 'ops', 'lab', 'labs',
  'web', 'vdp', 'bbp', 'engagement',
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function significantTokens(value: string): string[] {
  return tokenize(value).filter((token) => !CORP_SUFFIXES.has(token));
}

function compact(tokens: string[]): string {
  return tokens.join('');
}

function isGenericSuffix(tokens: string[]): boolean {
  return tokens.length > 0 && tokens.every((token) => GENERIC_DESCRIPTOR_TOKENS.has(token));
}

function isWeakIdentityToken(token: string): boolean {
  return GENERIC_DESCRIPTOR_TOKENS.has(token);
}

function prefixRatioMatch(a: string, b: string): boolean {
  const shorter = Math.min(a.length, b.length);
  const longer = Math.max(a.length, b.length);
  if (shorter < 5 || longer === 0) return false;
  if (shorter / longer < 0.85) return false;
  return a.startsWith(b) || b.startsWith(a);
}

export function organizationNameMatches(query: string, candidate: string): boolean {
  const queryTokens = significantTokens(query);
  const candidateTokens = significantTokens(candidate);
  if (queryTokens.length === 0 || candidateTokens.length === 0) return false;

  if (queryTokens.length === 1) {
    const queryToken = queryTokens[0]!;
    if (candidateTokens.length === 1) {
      return queryToken === candidateTokens[0];
    }

    if (isWeakIdentityToken(queryToken)) return false;

    if (
      candidateTokens[0] === queryToken &&
      isGenericSuffix(candidateTokens.slice(1))
    ) {
      return true;
    }

    return false;
  }

  const queryNorm = queryTokens.join(' ');
  const candidateNorm = candidateTokens.join(' ');
  if (queryNorm === candidateNorm) return true;

  const queryCompact = compact(queryTokens);
  const candidateCompact = compact(candidateTokens);
  if (queryCompact === candidateCompact) return true;
  if (prefixRatioMatch(queryCompact, candidateCompact)) return true;

  if (
    candidateTokens.length > queryTokens.length &&
    candidateTokens.slice(0, queryTokens.length).join(' ') === queryNorm &&
    isGenericSuffix(candidateTokens.slice(queryTokens.length))
  ) {
    return true;
  }

  if (
    queryTokens.length > candidateTokens.length &&
    queryTokens.slice(0, candidateTokens.length).join(' ') === candidateNorm &&
    isGenericSuffix(queryTokens.slice(candidateTokens.length))
  ) {
    return true;
  }

  const querySet = new Set(queryTokens);
  let overlap = 0;
  for (const token of candidateTokens) {
    if (querySet.has(token)) overlap++;
  }

  return overlap / Math.min(queryTokens.length, candidateTokens.length) >= 0.75;
}

export function domainMatchesOrganization(domain: string, organization: string): boolean {
  const host = domain.toLowerCase().replace(/\.$/, '');
  const base = host.split('.')[0]?.replace(/[-_]+/g, ' ') ?? '';
  if (!base) return false;
  return organizationNameMatches(base, organization);
}

export function extractHostFromUrl(url: string): string | null {
  try {
    if (!url.startsWith('http')) return null;
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function extractEmailDomain(email: string | undefined): string | null {
  if (!email) return null;
  const match = email.match(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/i);
  if (!match) return null;
  return match[1]!.replace(/[>),.;\]]+$/, '').toLowerCase();
}

export function isEmail(value: string | undefined): boolean {
  return value ? /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value.trim()) : false;
}

export function isUrl(value: string | undefined): boolean {
  return value ? /^https?:\/\//i.test(value.trim()) : false;
}

export function domainOwnsHost(inputDomain: string, host: string | null): boolean {
  if (!host) return false;
  return host === inputDomain || host.endsWith(`.${inputDomain}`);
}

const NON_ELIGIBLE_PROTOCOLS = ['chrome:', 'chrome-extension:', 'about:', 'file:', 'edge:', 'view-source:', 'data:', 'blob:'];

export function eligibleDomainForUrl(url: string | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (NON_ELIGIBLE_PROTOCOLS.includes(parsed.protocol)) return null;
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase();
  if (!host) return null;
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.localhost')) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  if (host.includes(':')) return null;
  const registrable = getDomain(host);
  if (!registrable) return null;
  if (HOSTING_DOMAINS.has(registrable)) return null;
  return registrable;
}
