import type {
  ContactChannel,
  ContactGroup,
  ContactRouteClass,
  LookupReport,
} from '../types';

const ROUTE_LABELS: Record<ContactRouteClass | 'none', string> = {
  first_party: 'First-party reporting path',
  authorized_agent: 'Owner-authorized reporting path',
  responsible_operator: 'Responsible operator',
  related_party: 'Related party',
  inferred: 'Suggested lead',
  coordinator: 'Coordinator fallback',
  none: 'No owner reporting path',
};

export interface ReportingGroup {
  entity: string;
  routeClass?: ContactRouteClass;
  routeLabel?: string;
  scopeNote?: string;
  rationale?: string;
  contacts: ContactChannel[];
}

export interface LookupPresentation {
  summary?: {
    label: string;
    headline: string;
    ownerRouteFound: boolean;
  };
  groups: ReportingGroup[];
}

export function routeClassLabel(routeClass: ContactRouteClass | 'none'): string {
  return ROUTE_LABELS[routeClass];
}

function reportableContacts(contacts: ContactChannel[]): ContactChannel[] {
  return contacts.filter((contact) => contact.source !== 'research-threats');
}

function groupFromApi(group: ContactGroup): ReportingGroup | null {
  const contacts = reportableContacts(group.contacts);
  if (contacts.length === 0) return null;
  const routeClass = group.routeClass ?? contacts[0]?.routeClass;
  return {
    entity: group.entity,
    ...(routeClass
      ? { routeClass, routeLabel: routeClassLabel(routeClass) }
      : {}),
    scopeNote: group.scopeNote,
    rationale: group.rationale,
    contacts,
  };
}

function fallbackGroups(report: LookupReport): ReportingGroup[] {
  const groups = new Map<string, ReportingGroup>();
  for (const contact of reportableContacts(report.contacts)) {
    const entity = contact.entity ?? report.attribution?.organization ?? 'Reporting path';
    const key = contact.entityKey ?? entity.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.contacts.push(contact);
      continue;
    }
    const routeClass = contact.routeClass;
    groups.set(key, {
      entity,
      ...(routeClass
        ? { routeClass, routeLabel: routeClassLabel(routeClass) }
        : {}),
      contacts: [contact],
    });
  }
  return [...groups.values()];
}

export function describeLookupPresentation(report: LookupReport): LookupPresentation {
  const apiGroups = report.contactGroups?.map(groupFromApi).filter((group): group is ReportingGroup => group !== null) ?? [];
  const groups = apiGroups.length > 0 ? apiGroups : fallbackGroups(report);
  const summary = report.routeSummary
    ? {
      label: routeClassLabel(report.routeSummary.routeClass),
      headline: report.routeSummary.headline,
      ownerRouteFound: report.routeSummary.ownerRouteFound,
    }
    : undefined;
  return { summary, groups };
}
