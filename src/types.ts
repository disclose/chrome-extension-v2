export type IconState = 'unknown' | 'none' | 'vdp' | 'safe-harbor' | 'level5';

export interface ProgramSnapshot {
  slug: string;
  programName: string;
  policyUrl?: string;
  contactUrl?: string;
  contactEmail?: string;
  securityTxtUrl?: string;
  safeHarbor?: string;
  offersBounty?: boolean;
  offersSwag?: boolean;
  maturityLevel?: string;
  maturityScore?: number;
  directoryUrl: string;
}

export type EvaluationStatus = 'pending' | 'matched' | 'unmatched' | 'ineligible' | 'error';

export interface TabEvaluation {
  domain: string;
  status: EvaluationStatus;
  iconState: IconState;
  program?: ProgramSnapshot;
  evaluatedAt: number;
  error?: string;
}

export type ContactType =
  | 'bug_bounty'
  | 'security_txt'
  | 'dns_security_txt'
  | 'vdp'
  | 'psirt'
  | 'web_form'
  | 'email'
  | 'abuse_contact'
  | 'convention'
  | 'cna'
  | 'cert';

export type ContactRouteClass =
  | 'first_party'
  | 'authorized_agent'
  | 'responsible_operator'
  | 'related_party'
  | 'inferred'
  | 'coordinator';

export type ContactEntityRelation =
  | 'self'
  | 'vendor'
  | 'host'
  | 'parent'
  | 'subsidiary'
  | 'maintainer'
  | 'publisher'
  | 'build_origin'
  | 'identifier_assignee'
  | 'disclosure_agent'
  | 'coordinator';

export interface ContactChannel {
  type: ContactType;
  value: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
  label: string;
  verified: boolean;
  entity?: string;
  entityKey?: string;
  relation?: ContactEntityRelation;
  routeClass?: ContactRouteClass;
  deliveryAgent?: string;
  authoritative?: boolean;
}

export interface ContactGroup {
  entity: string;
  entityKey: string;
  relation?: ContactEntityRelation;
  routeClass?: ContactRouteClass;
  scopeNote?: string;
  rationale?: string;
  contacts: ContactChannel[];
}

export interface RouteSummary {
  routeClass: ContactRouteClass | 'none';
  headline: string;
  firstPartyFound: boolean;
  ownerRouteFound: boolean;
  coordinatorAvailable: boolean;
}

export interface LookupDataSource {
  name: string;
  queried: boolean;
  timestamp?: string;
  confidence?: number;
  error?: string;
}

export type LookupChainRelation =
  | 'parent_company'
  | 'parent_company_domain'
  | 'subsidiary_domain'
  | 'brand_domain'
  | 'weak_inference'
  | 'canonical_alias'
  | 'related'
  | 'manufacturer'
  | 'developer'
  | 'platform_verified'
  | 'verified_guess'
  | 'platform_host'
  | 'publisher'
  | 'build_origin'
  | 'identifier_assignee'
  | 'disclosure_agent'
  | 'infra_operator';

export interface LookupChain {
  from: string;
  to: string;
  reason: string;
  relation?: LookupChainRelation;
}

export interface LookupReport {
  input: string;
  assetType: string;
  timestamp: string;
  status: 'complete' | 'partial' | 'failed';
  requestId: string;
  hasErrors: boolean;
  attribution?: {
    organization?: string;
    industry?: string;
    confidence?: 'high' | 'medium' | 'low';
  };
  contacts: ContactChannel[];
  contactGroups?: ContactGroup[];
  routeSummary?: RouteSummary;
  details: {
    diodb?: {
      programs?: Array<{
        name?: string;
        bounty?: boolean | string;
        safeHarbor?: string;
        securityTxtUrl?: string;
      }>;
      maturity_level?: string;
      maturity_score?: number;
    };
    ownerContactFound?: boolean;
    kind?: string;
    voice?: string;
    [key: string]: unknown;
  };
  dataSources: LookupDataSource[];
  chains: LookupChain[];
}

export interface PopupRequest {
  type: 'getEvaluation';
  tabId: number;
}

export interface PopupResponse {
  evaluation: TabEvaluation | null;
}

export interface LookupRequest {
  type: 'runLookup';
  domain: string;
}

export interface LookupResponse {
  report: LookupReport | null;
  error?: string;
}
