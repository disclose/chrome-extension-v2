// Live polling of directory.disclose.io.
// Ported from ~/Projects/lookup-disclose-io/src/steps/diodb.ts (parseSearchRows,
// fetchDirectoryProgram, matchPrograms). Kept structurally identical so re-syncs
// are mechanical when the directory's HTML shape evolves.

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

const DIRECTORY_BASE_URL = 'https://directory.disclose.io';
const FETCH_TIMEOUT_MS = 8000;

interface DirectorySearchRow {
  slug: string;
  programName: string;
  policyUrl?: string;
  contactValue?: string;
  maturityLevel?: string;
  maturityScore?: number;
}

interface DirectoryProgram extends DirectorySearchRow {
  contactUrl?: string;
  contactEmail?: string;
  securityTxtUrl?: string;
  offersBounty?: boolean;
  offersSwag?: boolean;
  safeHarbor?: string;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
}

async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'disclose-chrome-extension/0.1 (+https://github.com/disclose/chrome-extension)',
      },
    });
    if (!response.ok) {
      throw new Error(`directory fetch failed: ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export function parseSearchRows(html: string): DirectorySearchRow[] {
  if (html.includes('No organizations found.')) return [];

  const rows: DirectorySearchRow[] = [];
  const rowPattern = /<tr>([\s\S]*?)<\/tr>/gi;

  for (const rowMatch of html.matchAll(rowPattern)) {
    const rowHtml = rowMatch[1] ?? '';
    if (rowHtml.includes('empty-row') || !rowHtml.includes('org-name')) continue;

    const orgMatch = rowHtml.match(/<td class="org-name"[\s\S]*?<a href="\/([^"]+)" title="([^"]+)">/i);
    if (!orgMatch) continue;

    const policyMatch = rowHtml.match(/<td class="policy-col"[\s\S]*?<a href="([^"]+)"/i);
    const contactMatch = rowHtml.match(/<td class="contact-col"[\s\S]*?<span title="([^"]+)"/i);
    // m-badge class is now compound (e.g. "m-badge m-badge-partial"); allow extra classes.
    const maturityMatch = rowHtml.match(/<span class="m-badge(?:[ a-z0-9_-]*)"[^>]*>([^<]+)<\/span>/i);
    const scoreMatch = rowHtml.match(/<span style="font-weight: 500; color: #111827;">([\d.]+)<\/span>/i);

    rows.push({
      slug: orgMatch[1]!,
      programName: decodeHtmlEntities(orgMatch[2]!),
      policyUrl: policyMatch?.[1],
      contactValue: contactMatch ? decodeHtmlEntities(contactMatch[1]!) : undefined,
      maturityLevel: maturityMatch ? decodeHtmlEntities(maturityMatch[1]!) : undefined,
      maturityScore: scoreMatch ? Number.parseFloat(scoreMatch[1]!) : undefined,
    });
  }

  return rows;
}

function extractDetailField(html: string, label: string): string | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<div class="pol-grid-label">${escaped}<\\/div>\\s*<div class="pol-grid-value">([\\s\\S]*?)<\\/div>`,
    'i',
  );
  const match = html.match(pattern);
  return match ? stripHtml(match[1]!) : undefined;
}

function extractDetailHref(html: string, label: string): string | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<div class="pol-grid-label">${escaped}<\\/div>\\s*<div class="pol-grid-value">[\\s\\S]*?<a href="([^"]+)"`,
    'i',
  );
  return html.match(pattern)?.[1];
}

function extractBonusFlag(html: string, label: string): boolean | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<span class="(met|unmet)">${escaped}<\\/span>`, 'i');
  const match = html.match(pattern);
  if (!match) return undefined;
  return match[1] === 'met';
}

export function parseProgramDetail(html: string, row: DirectorySearchRow): DirectoryProgram {
  const contact = extractDetailField(html, 'Contact') ?? row.contactValue;
  const policyUrl = extractDetailHref(html, 'Policy URL') ?? row.policyUrl;
  const securityTxtUrl = extractDetailHref(html, 'security.txt');
  const safeHarbor = extractDetailField(html, 'Safe Harbor');

  return {
    ...row,
    policyUrl,
    contactUrl: isUrl(contact) ? contact : undefined,
    contactEmail: isEmail(contact) ? contact : undefined,
    securityTxtUrl,
    offersBounty: extractBonusFlag(html, 'Offers Bounty'),
    offersSwag: extractBonusFlag(html, 'Offers Swag'),
    safeHarbor,
  };
}

function rankCandidates(domain: string, programs: DirectoryProgram[]): DirectoryProgram[] {
  const filtered = programs.filter((program) => {
    const name = program.programName.toLowerCase();

    // Honor the scoped-name pattern "Org (scope.com)" — only match if the
    // parenthetical asset matches the input domain, ignoring all other signals.
    const scopeMatch = program.programName.match(/\(([a-z0-9][a-z0-9.-]*\.[a-z]{2,})\)\s*$/i);
    if (scopeMatch) {
      return domainOwnsHost(domain, scopeMatch[1]!.toLowerCase());
    }

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
    const nameMatch = domainMatchesOrganization(domain, name);

    return (
      domainInSecurityTxt ||
      domainInEmail ||
      (nameMatch && (domainInPolicy || domainInContact))
    );
  });

  filtered.sort((a, b) => {
    const aScore =
      Number(domainOwnsHost(domain, extractHostFromUrl(a.securityTxtUrl ?? ''))) * 3 +
      Number(domainOwnsHost(domain, extractEmailDomain(a.contactEmail))) * 2 +
      Number(domainMatchesOrganization(domain, a.programName.toLowerCase()));
    const bScore =
      Number(domainOwnsHost(domain, extractHostFromUrl(b.securityTxtUrl ?? ''))) * 3 +
      Number(domainOwnsHost(domain, extractEmailDomain(b.contactEmail))) * 2 +
      Number(domainMatchesOrganization(domain, b.programName.toLowerCase()));
    if (bScore !== aScore) return bScore - aScore;
    return a.programName.localeCompare(b.programName);
  });

  return filtered;
}

export interface DirectoryLookupResult {
  matched: boolean;
  program?: ProgramSnapshot;
  candidatesConsidered: number;
}

// Mirror buildSearchQueries from lookup-disclose-io/src/steps/diodb.ts:110-122.
// The directory's server-side search splits FQDNs into name tokens — searching
// for "1password.com" can return zero rows while "1password" returns the
// agilebits entry. So we try the full eTLD+1 plus the base name.
function buildSearchQueries(domain: string): string[] {
  const queries = new Set<string>();
  queries.add(domain);
  const base = domain.split('.')[0]?.replace(/[^a-z0-9]+/gi, ' ').trim();
  if (base && base.length >= 3) queries.add(base);
  return [...queries].filter(Boolean);
}

export async function lookupDirectory(
  domain: string,
  options: { signal?: AbortSignal; baseUrl?: string } = {},
): Promise<DirectoryLookupResult> {
  const baseUrl = options.baseUrl ?? DIRECTORY_BASE_URL;

  const candidates = new Map<string, DirectorySearchRow>();
  for (const query of buildSearchQueries(domain)) {
    try {
      const html = await fetchText(
        `${baseUrl}/?q=${encodeURIComponent(query)}`,
        options.signal,
      );
      for (const row of parseSearchRows(html).slice(0, 8)) {
        if (!candidates.has(row.slug)) candidates.set(row.slug, row);
      }
    } catch {
      /* ignore one query failure; later queries may still match */
    }
  }
  if (candidates.size === 0) return { matched: false, candidatesConsidered: 0 };

  const programs: DirectoryProgram[] = await Promise.all(
    [...candidates.values()].map(async (row) => {
      try {
        const detailHtml = await fetchText(`${baseUrl}/${row.slug}`, options.signal);
        return parseProgramDetail(detailHtml, row);
      } catch {
        return { ...row };
      }
    }),
  );

  const ranked = rankCandidates(domain, programs);
  if (ranked.length === 0) {
    return { matched: false, candidatesConsidered: programs.length };
  }

  const best = ranked[0]!;
  const snapshot: ProgramSnapshot = {
    slug: best.slug,
    programName: best.programName,
    policyUrl: best.policyUrl,
    contactUrl: best.contactUrl,
    contactEmail: best.contactEmail,
    securityTxtUrl: best.securityTxtUrl,
    safeHarbor: best.safeHarbor,
    offersBounty: best.offersBounty,
    offersSwag: best.offersSwag,
    maturityLevel: best.maturityLevel,
    maturityScore: best.maturityScore,
    directoryUrl: `${baseUrl}/${best.slug}`,
  };

  return { matched: true, program: snapshot, candidatesConsidered: programs.length };
}
