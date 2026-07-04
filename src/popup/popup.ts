import type {
  IconState,
  LookupReport,
  LookupRequest,
  LookupResponse,
  PopupRequest,
  PopupResponse,
  ProgramSnapshot,
  TabEvaluation,
} from '../types';
import { verdictFor, safeHarborLabel } from '../lib/maturity';

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
};

function setText(el: HTMLElement, text: string): void {
  el.textContent = text;
}

function show(el: HTMLElement, visible: boolean): void {
  if (visible) el.removeAttribute('hidden');
  else el.setAttribute('hidden', '');
}

async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  // Test override: ?testTabId=<n> makes the popup target a specific tab id,
  // bypassing the active-window heuristic that breaks when the popup is
  // navigated to as a standalone page during automated tests.
  const params = new URLSearchParams(window.location.search);
  const testTabId = params.get('testTabId');
  if (testTabId !== null) {
    try {
      return await chrome.tabs.get(Number.parseInt(testTabId, 10));
    } catch {
      return null;
    }
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function getEvaluation(tabId: number): Promise<TabEvaluation | null> {
  const message: PopupRequest = { type: 'getEvaluation', tabId };
  const response = (await chrome.runtime.sendMessage(message)) as PopupResponse | undefined;
  return response?.evaluation ?? null;
}

// ───────────────────────────────────────────────────────────────────────────
// NEW (Refined design): presentation helpers. These read fields that already
// exist on IconState / ProgramSnapshot — no new data is required from the
// background worker. The hero background per state is driven entirely by CSS
// via [data-state="…"] selectors in popup.css.
// ───────────────────────────────────────────────────────────────────────────

const HERO_GLYPH: Record<IconState, string> = {
  level5: '✦',
  'safe-harbor': '✓',
  vdp: '✓',
  none: '⚠',
  unknown: '',
};

const STATUS_PILL: Record<IconState, { text: string; variant: '' | 'solid' | 'neutral' } | null> = {
  level5: { text: 'In directory · L5', variant: 'solid' },
  'safe-harbor': { text: 'In directory', variant: '' },
  vdp: { text: 'In directory', variant: '' },
  none: { text: 'Not listed', variant: 'neutral' },
  unknown: null,
};

function renderHeroIcon(state: IconState): void {
  setText($('hero-icon'), HERO_GLYPH[state] ?? '');
}

function renderStatusPill(state: IconState): void {
  const pill = $('status-pill');
  const cfg = STATUS_PILL[state];
  if (!cfg) {
    show(pill, false);
    return;
  }
  pill.textContent = cfg.text;
  pill.className = 'pill' + (cfg.variant ? ` pill--${cfg.variant}` : '');
  show(pill, true);
}

function renderScore(program: ProgramSnapshot | undefined): void {
  const row = $('maturity');
  if (!program || typeof program.maturityScore !== 'number') {
    show(row, false);
    return;
  }
  setText($('maturity-level'), program.maturityLevel ?? 'Rated');
  setText($('maturity-score'), program.maturityScore.toFixed(0));
  show(row, true);
}

function renderChips(program: ProgramSnapshot | undefined): void {
  const wrap = $('chips');
  wrap.innerHTML = '';
  if (!program) {
    show(wrap, false);
    return;
  }

  const shFull = safeHarborLabel(program.safeHarbor) === 'Full';
  const chips: Array<{ label: string; yes: boolean }> = [
    shFull ? { label: 'Safe harbor', yes: true } : { label: 'No safe harbor', yes: false },
    program.offersBounty ? { label: 'Bug bounty', yes: true } : { label: 'No bounty', yes: false },
  ];
  if (program.policyUrl) chips.push({ label: 'Policy', yes: true });
  if (program.securityTxtUrl) chips.push({ label: 'security.txt', yes: true });

  for (const chip of chips) {
    const span = document.createElement('span');
    span.className = `chip ${chip.yes ? 'chip--yes' : 'chip--no'}`;
    const mark = document.createElement('span');
    mark.className = 'chip__mark';
    mark.textContent = chip.yes ? '✓' : '✕';
    span.appendChild(mark);
    span.appendChild(document.createTextNode(chip.label));
    wrap.appendChild(span);
  }
  show(wrap, true);
}

// ───────────────────────────────────────────────────────────────────────────

function renderHero(state: IconState, program?: ProgramSnapshot): void {
  const root = $('root');
  root.dataset.state = state;
  const { headline, detail } = verdictFor(state, program);
  setText($('hero-headline'), headline);
  setText($('hero-detail'), detail);
  // NEW: glyph, pill, chips and score are part of the resolved hero.
  renderHeroIcon(state);
  renderStatusPill(state);
  renderChips(program);
  renderScore(program);
}

function renderDetails(program: ProgramSnapshot | undefined): void {
  const section = $('details');
  if (!program) {
    show(section, false);
    return;
  }

  const grid = $('details-grid');
  grid.innerHTML = '';

  const entries: Array<[string, string | undefined, string?]> = [
    ['Program', program.programName],
    ['Maturity', program.maturityLevel
      ? `${program.maturityLevel}${typeof program.maturityScore === 'number' ? ` (${program.maturityScore.toFixed(1)})` : ''}`
      : undefined],
    ['Safe harbor', safeHarborLabel(program.safeHarbor)],
    ['Bounty', program.offersBounty === true ? 'Yes' : program.offersBounty === false ? 'No' : undefined],
    ['Policy', program.policyUrl, 'link'],
    ['Contact', program.contactUrl ?? program.contactEmail, program.contactUrl ? 'link' : undefined],
    ['security.txt', program.securityTxtUrl, 'link'],
    ['Directory entry', program.directoryUrl, 'link'],
  ];

  for (const [label, value, kind] of entries) {
    if (!value) continue;
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    if (kind === 'link') {
      const a = document.createElement('a');
      a.href = value;
      a.textContent = value;
      a.target = '_blank';
      a.rel = 'noopener';
      dd.appendChild(a);
    } else {
      dd.textContent = value;
    }
    grid.appendChild(dt);
    grid.appendChild(dd);
  }

  const submit = $('submit-cta') as HTMLAnchorElement;
  const submitTarget = program.contactUrl ?? program.policyUrl;
  if (submitTarget) {
    submit.href = submitTarget;
    show(submit, true);
  } else {
    show(submit, false);
  }

  show(section, true);
}

function setLookupButton(label: string, disabled: boolean): void {
  const btn = $('lookup-btn') as HTMLButtonElement;
  btn.textContent = label;
  btn.disabled = disabled;
}

function renderRetaliation(report: LookupReport | null): void {
  const banner = $('retaliation-banner');
  if (!report) {
    show(banner, false);
    return;
  }
  const threats = report.contacts.filter((c) => c.source === 'research-threats');
  if (threats.length === 0) {
    show(banner, false);
    return;
  }
  const detail = $('retaliation-detail');
  detail.textContent = threats.map((t) => t.label).join(' · ');
  show(banner, true);
}

function renderLookupContacts(report: LookupReport): void {
  const section = $('lookup-results');
  const list = $('lookup-contacts');
  list.innerHTML = '';

  const nonThreats = report.contacts.filter((c) => c.source !== 'research-threats');
  if (nonThreats.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No published security contact found for this site.';
    list.appendChild(li);
    show(section, true);
    return;
  }

  for (const contact of nonThreats.slice(0, 8)) {
    const li = document.createElement('li');

    // NEW: card structure with confidence badge + copy button.
    const head = document.createElement('div');
    head.className = 'contact__head';
    const label = document.createElement('span');
    label.className = 'contact__label';
    label.textContent = contact.label || contact.type;
    const conf = document.createElement('span');
    conf.className = `contact__conf contact__conf--${contact.confidence}`;
    conf.textContent = contact.confidence;
    head.appendChild(label);
    head.appendChild(conf);

    const meta = document.createElement('div');
    meta.className = 'contact__meta';
    meta.textContent = `${contact.type.replace(/_/g, ' ')} · ${contact.source}`;

    const valueRow = document.createElement('div');
    valueRow.className = 'contact__value-row';
    const value = document.createElement('span');
    value.className = 'contact__value';
    if (/^https?:\/\//i.test(contact.value)) {
      const a = document.createElement('a');
      a.href = contact.value;
      a.textContent = contact.value;
      a.target = '_blank';
      a.rel = 'noopener';
      value.appendChild(a);
    } else {
      value.textContent = contact.value;
    }
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'contact__copy';
    copy.textContent = 'Copy';
    copy.addEventListener('click', () => {
      void navigator.clipboard?.writeText(contact.value);
      copy.textContent = 'Copied ✓';
      setTimeout(() => { copy.textContent = 'Copy'; }, 1400);
    });
    valueRow.appendChild(value);
    valueRow.appendChild(copy);

    li.appendChild(head);
    li.appendChild(meta);
    li.appendChild(valueRow);
    list.appendChild(li);
  }

  show(section, true);
}

async function runLiveLookup(domain: string): Promise<void> {
  setLookupButton('Looking up…', true);
  setText($('lookup-status'), 'Asking lookup.disclose.io…');
  const startedAt = Date.now();
  const message: LookupRequest = { type: 'runLookup', domain };
  try {
    const response = (await chrome.runtime.sendMessage(message)) as LookupResponse | undefined;
    if (!response || !response.report) {
      throw new Error(response?.error ?? 'no response');
    }
    renderRetaliation(response.report);
    renderLookupContacts(response.report);
    const elapsed = Date.now() - startedAt;
    setText(
      $('lookup-status'),
      elapsed > 5000
        ? `Done — first lookup is slow because the server cold-started. Re-running it should be much faster.`
        : `Done in ${(elapsed / 1000).toFixed(1)}s`,
    );
  } catch (err) {
    setText(
      $('lookup-status'),
      `Lookup failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    setLookupButton('Re-run live lookup', false);
  }
}

async function init(): Promise<void> {
  const tab = await getActiveTab();
  if (!tab || tab.id === undefined) {
    renderHero('unknown');
    setLookupButton('Look this up', true);
    return;
  }

  const evaluation = await getEvaluation(tab.id);
  if (!evaluation) {
    renderHero('unknown');
    setLookupButton('Look this up', true);
    return;
  }

  renderHero(evaluation.iconState, evaluation.program);
  renderDetails(evaluation.program);

  setLookupButton(
    evaluation.iconState === 'none' || evaluation.status === 'unmatched'
      ? 'Look this up'
      : 'Re-scan with full lookup',
    evaluation.status === 'ineligible' || !evaluation.domain,
  );

  const directoryLink = $('directory-link') as HTMLAnchorElement;
  if (evaluation.program?.directoryUrl) {
    directoryLink.href = evaluation.program.directoryUrl;
    directoryLink.textContent = 'View this entry on disclose.io directory';
  }

  ($('lookup-btn') as HTMLButtonElement).addEventListener('click', () => {
    if (!evaluation.domain) return;
    void runLiveLookup(evaluation.domain);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  void init();
});
