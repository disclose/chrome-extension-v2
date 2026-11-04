// Structured directory lookup through the disclose.io tenant's public JSON:API.

import {
  HOSTING_SUBDOMAINS,
  domainMatchesOrganization,
  domainOwnsHost,
  extractEmailDomain,
  extractHostFromUrl,
  isEmail,
  isUrl,
} from './match';
import type { ProgramSnapshot } from '../types';

const DIRECTORY_API_BASE_URL = 'https://api.disclosebot.io/v1/p/directories/adf701';
const DIRECTORY_DISPLAY_BASE_URL = 'https://directory.disclose.io/o';
const FETCH_TIMEOUT_MS = 8000;

interface DirectoryPolicy {
  safeHarbor?: string | null;
  offersBounty?: boolean | null;
  offersSwag?: boolean | null;
  pointOfContact?: string | null;
  contactUrl?: string | null;
  policyUrl?: string | null;
  securitytxtUrl?: string | null;
}

interface DirectoryOrganization {
  name: string;
  slug: string;
  safeHarbor?: string | null;
  offersBounty?: boolean | null;
  offersSwag?: boolean | null;
  policyUrl?: string | null;
  contactUrl?: string | null;
  securityTxtUrl?: string | null;
  maturity?: {
    level?: number | null;
    label?: string | null;
    score?: number | null;
  } | null;
  policies?: DirectoryPolicy[] | null;
}

interface DirectoryListResponse {
  organizations: DirectoryOrganization[];
}

interface DirectoryProgram extends DirectoryOrganization {
  programName: string;
  contactEmail?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function decodePolicy(value: unknown): DirectoryPolicy | null {
  if (!isRecord(value) || !isRecord(value.attributes)) return null;
  const attributes = value.attributes;
  return {
    safeHarbor: stringValue(attributes.safe_harbor),
    offersBounty: booleanValue(attributes.offers_bounty),
    offersSwag: booleanValue(attributes.offers_swag),
    pointOfContact: stringValue(attributes.point_of_contact),
    contactUrl: stringValue(attributes.contact_url),
    policyUrl: stringValue(attributes.policy_url) ?? stringValue(attributes.hosted_policy_url) ?? stringValue(attributes.public_url),
    securitytxtUrl: stringValue(attributes.securitytxt_url),
  };
}

function decodeOrganization(value: unknown, included: unknown = []): DirectoryOrganization | null {
  if (!isRecord(value) || value.type !== 'directory_organization' || !isRecord(value.attributes)) return null;
  const attributes = value.attributes;
  const name = stringValue(attributes.name);
  const slug = stringValue(attributes.slug);
  if (!name || !slug) return null;
  const relationships = isRecord(value.relationships) ? value.relationships : {};
  const policyRelationship = isRecord(relationships.policies) ? relationships.policies : {};
  const references = Array.isArray(policyRelationship.data) ? policyRelationship.data : [];
  const resources = Array.isArray(included) ? included : [];
  const policies = references.map((reference) => {
    if (!isRecord(reference)) return null;
    const resource = resources.find((candidate) => isRecord(candidate)
      && candidate.id === reference.id && candidate.type === reference.type);
    return decodePolicy(resource);
  }).filter((policy): policy is DirectoryPolicy => policy !== null);
  return {
    name,
    slug,
    safeHarbor: stringValue(attributes.safe_harbor),
    offersBounty: booleanValue(attributes.offers_bounty),
    offersSwag: booleanValue(attributes.offers_swag),
    policyUrl: stringValue(attributes.policy_url),
    contactUrl: stringValue(attributes.contact_url),
    securityTxtUrl: stringValue(attributes.security_txt_url),
    maturity: {
      level: numberValue(attributes.maturity_level),
      label: stringValue(attributes.maturity_label),
      score: numberValue(attributes.maturity_score),
    },
    policies,
  };
}

function decodeListResponse(value: unknown): DirectoryListResponse {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error('directory API returned no JSON:API data array');
  }
  return {
    organizations: value.data
      .map((organization) => decodeOrganization(organization, value.included))
      .filter((organization): organization is DirectoryOrganization => organization !== null),
  };
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  if (signal) signal.addEventListener('abort', abortFromCaller, { once: true });
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'follow',
      headers: { Accept: 'application/vnd.api+json' },
    });
    if (!response.ok) throw new Error(`directory API fetch failed: ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener('abort', abortFromCaller);
  }
}

function apiPath(baseUrl: string, suffix = ''): string {
  return `${baseUrl.replace(/\/$/, '')}/organizations${suffix}`;
}

function listUrl(baseUrl: string, query: string): string {
  const url = new URL(apiPath(baseUrl));
  url.searchParams.set('filter[name_cont]', query);
  url.searchParams.set('sort', 'name');
  url.searchParams.set('page[size]', '25');
  return url.toString();
}

function policyFor(program: DirectoryOrganization): DirectoryPolicy | undefined {
  return program.policies?.find((policy) =>
    Boolean(policy.policyUrl || policy.contactUrl || policy.pointOfContact || policy.securitytxtUrl),
  ) ?? program.policies?.[0];
}

function toProgram(organization: DirectoryOrganization): DirectoryProgram {
  const policy = policyFor(organization);
  const contact = organization.contactUrl ?? policy?.contactUrl ?? policy?.pointOfContact ?? undefined;
  return {
    ...organization,
    programName: organization.name,
    policyUrl: organization.policyUrl ?? policy?.policyUrl,
    contactUrl: isUrl(contact) ? contact : undefined,
    contactEmail: isEmail(contact) ? contact : undefined,
    securityTxtUrl: organization.securityTxtUrl ?? policy?.securitytxtUrl,
    safeHarbor: organization.safeHarbor || policy?.safeHarbor,
    offersBounty: organization.offersBounty ?? policy?.offersBounty,
    offersSwag: organization.offersSwag ?? policy?.offersSwag,
  };
}

function rankCandidates(domain: string, programs: DirectoryProgram[]): DirectoryProgram[] {
  const filtered = programs.filter((program) => {
    const scopeMatch = program.programName.match(/\(([a-z0-9][a-z0-9.-]*\.[a-z]{2,})\)\s*$/i);
    if (scopeMatch) return domainOwnsHost(domain, scopeMatch[1]!.toLowerCase());

    const policyHost = extractHostFromUrl(program.policyUrl ?? '');
    const contactHost = extractHostFromUrl(program.contactUrl ?? '');
    const securityTxtHost = extractHostFromUrl(program.securityTxtUrl ?? '');
    const contactEmailDomain = extractEmailDomain(program.contactEmail);
    const policyIsHosted = policyHost ? HOSTING_SUBDOMAINS.has(policyHost) : false;
    const contactIsHosted = contactHost ? HOSTING_SUBDOMAINS.has(contactHost) : false;

    const domainInPolicy = !policyIsHosted && domainOwnsHost(domain, policyHost);
    const domainInContact = !contactIsHosted && domainOwnsHost(domain, contactHost);
    const domainInSecurityTxt = domainOwnsHost(domain, securityTxtHost);
    const domainInEmail = domainOwnsHost(domain, contactEmailDomain);
    const nameMatch = domainMatchesOrganization(domain, program.programName.toLowerCase());
    return domainInSecurityTxt || domainInEmail || (nameMatch && (domainInPolicy || domainInContact));
  });

  filtered.sort((a, b) => {
    const score = (program: DirectoryProgram): number =>
      Number(domainOwnsHost(domain, extractHostFromUrl(program.securityTxtUrl ?? ''))) * 3 +
      Number(domainOwnsHost(domain, extractEmailDomain(program.contactEmail))) * 2 +
      Number(domainMatchesOrganization(domain, program.programName.toLowerCase()));
    const delta = score(b) - score(a);
    return delta || a.programName.localeCompare(b.programName);
  });
  return filtered;
}

export interface DirectoryLookupResult {
  matched: boolean;
  program?: ProgramSnapshot;
  candidatesConsidered: number;
}

function buildSearchQueries(domain: string): string[] {
  const queries = new Set([domain]);
  const base = domain.split('.')[0]?.replace(/[^a-z0-9]+/gi, ' ').trim();
  if (base && base.length >= 3) queries.add(base);
  return [...queries].filter(Boolean);
}

export async function lookupDirectory(
  domain: string,
  options: { signal?: AbortSignal; baseUrl?: string } = {},
): Promise<DirectoryLookupResult> {
  const baseUrl = options.baseUrl ?? DIRECTORY_API_BASE_URL;
  const searchResponses = await Promise.allSettled(
    buildSearchQueries(domain).map(async (query) => decodeListResponse(
      await fetchJson(listUrl(baseUrl, query), options.signal),
    )),
  );
  if (searchResponses.every((result) => result.status === 'rejected')) {
    const failure = searchResponses[0] as PromiseRejectedResult;
    throw new Error(`directory check unavailable: ${failure.reason instanceof Error ? failure.reason.message : String(failure.reason)}`);
  }
  const candidates = new Map<string, DirectoryOrganization>();
  for (const result of searchResponses) {
    if (result.status !== 'fulfilled') continue;
    for (const organization of result.value.organizations.slice(0, 8)) {
      if (!candidates.has(organization.slug)) candidates.set(organization.slug, organization);
    }
  }
  if (candidates.size === 0) {
    if (searchResponses.some((result) => result.status === 'rejected')) {
      throw new Error('directory check unavailable: a directory search failed');
    }
    return { matched: false, candidatesConsidered: 0 };
  }

  const programs = await Promise.all(
    [...candidates.values()].map(async (candidate) => {
      try {
        const document = await fetchJson(
          apiPath(baseUrl, `/${encodeURIComponent(candidate.slug)}`),
          options.signal,
        );
        const detail = isRecord(document) ? decodeOrganization(document.data, document.included) : null;
        return toProgram(detail ?? candidate);
      } catch {
        return toProgram(candidate);
      }
    }),
  );
  const ranked = rankCandidates(domain, programs);
  if (ranked.length === 0) return { matched: false, candidatesConsidered: programs.length };

  const best = ranked[0]!;
  return {
    matched: true,
    candidatesConsidered: programs.length,
    program: {
      slug: best.slug,
      programName: best.programName,
      policyUrl: best.policyUrl ?? undefined,
      contactUrl: best.contactUrl ?? undefined,
      contactEmail: best.contactEmail ?? undefined,
      securityTxtUrl: best.securityTxtUrl ?? undefined,
      safeHarbor: best.safeHarbor ?? undefined,
      offersBounty: best.offersBounty ?? undefined,
      offersSwag: best.offersSwag ?? undefined,
      maturityLevel: best.maturity?.label ?? undefined,
      maturityRank: best.maturity?.level ?? undefined,
      maturityScore: best.maturity?.score ?? undefined,
      directoryUrl: `${DIRECTORY_DISPLAY_BASE_URL}/${best.slug}`,
    },
  };
}
