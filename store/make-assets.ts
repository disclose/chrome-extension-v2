/**
 * Generates Chrome Web Store assets from the built extension:
 *   store/screenshots/NN-<state>.png  (1280×800)
 *   store/promo-tile-440x280.png
 *
 * Renders the REAL popup (dist/popup.html + popup.css) inside an isolated iframe
 * on a disclose.io-brand backdrop, populated per directory state.
 *
 *   bun store/make-assets.ts
 */
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'store');

const css = await readFile(path.join(DIST, 'popup.css'), 'utf8');
let popupHtml = await readFile(path.join(DIST, 'popup.html'), 'utf8');
popupHtml = popupHtml
  .replace(/<link rel="stylesheet"[^>]*>/, `<style>${css}</style>`)
  .replace(/<script[^>]*><\/script>/, '');

// White-circle logo (purple glyph) — reads on the purple backdrop.
const LOGO = `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><circle cx="200" cy="200" r="200" fill="#fff"/><path fill="#673AB6" d="M241.5 279.4h-71c-9.4 0-18.3-3.7-25-10.3l-18.9-18.9c-3.9-3.9-9.3-5.7-14.7-5l-52.8 6.6C53.2 235.6 50 218.2 50 200c0-15.4 2.3-30.2 6.6-44.1h56.7c4.7 0 9.2-1.9 12.5-5.2l25.4-25.4c3-3 7.1-4.7 11.4-4.7h20.2l-35.5 35.5c-5.8 5.8-9 13.6-9 21.8 0 11.5 6.2 22 17.1 27.7 1.1.6 2.3 1.1 3.5 1.5 11 3.6 22.1 1.2 30.2-5.6l59.9 59.8c6.6 6.7 1.9 18.1-7.5 18.1z"/><path fill="#673AB6" d="M340.8 251.8l-52.8-6.6c-5.4-.7-10.8 1.2-14.7 5l-5.3 5.3-66.4-66.4 14-14c3.4-3.4 3.4-9 0-12.4-3.5-3.5-9.1-3.5-12.6 0l-24.6 24.6c-2.6 2.6-6 3.9-9.4 3.9s-6.8-1.3-9.4-3.9c-5.2-5.2-5.2-13.5 0-18.7l42.8-42.8c3.3-3.3 7.8-5.2 12.5-5.2h21.7c4.7 0 9.2 1.9 12.5 5.2l25 25c3.3 3.3 7.8 5.2 12.5 5.2h56.7c4.3 13.9 6.6 28.8 6.6 44.1.1 18.1-3.1 35.5-9.1 51.7z"/></svg>`;

type Chip = { label: string; yes: boolean };
type Shot = {
  state: string; headline: string; detail: string; icon: string;
  pill: string; level?: string; score?: string; chips: Chip[];
  caption: string; sub: string;
};

const SHOTS: Shot[] = [
  {
    state: 'level5', headline: '✨ Best-practice security disclosure',
    detail: 'This site is recognized at Maturity Level 5 — a clear, researcher-safe way to report security issues.',
    icon: '✦', pill: 'In directory · L5', level: 'Level 5', score: '95',
    chips: [{label:'Safe harbor',yes:true},{label:'Bug bounty',yes:true},{label:'Policy',yes:true},{label:'security.txt',yes:true}],
    caption: 'Know instantly if a site welcomes security researchers',
    sub: 'The toolbar badge shows every site’s disclosure posture the moment you land on it.',
  },
  {
    state: 'safe-harbor', headline: '✓ Welcomes security reports — researcher-safe',
    detail: 'This site accepts security research and protects researchers acting in good faith.',
    icon: '✓', pill: 'In directory',
    chips: [{label:'Safe harbor',yes:true},{label:'Bug bounty',yes:false},{label:'Policy',yes:true},{label:'security.txt',yes:true}],
    caption: 'VDP, safe harbor & maturity — at a glance',
    sub: 'One popup: safe harbor, bug bounty, published policy and security.txt, straight from the disclose.io directory.',
  },
  {
    state: 'none', headline: '⚠ No published way to report security problems',
    detail: 'This site is not in the disclose.io directory. Researchers may have nowhere clear to send security findings.',
    icon: '?', pill: 'Not listed', chips: [],
    caption: 'Spot the sites with no safe way to report bugs',
    sub: 'When a site isn’t in the directory, you’ll know — and can run a deeper lookup with one click.',
  },
];

function chipHtml(chips: Chip[]): string {
  return chips.map(c =>
    `<span class="chip chip--${c.yes?'yes':'no'}"><span class="chip__mark">${c.yes?'✓':'✕'}</span>${c.label}</span>`
  ).join('');
}

function stage(s: Shot): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;box-sizing:border-box}
    html,body{width:1280px;height:800px;overflow:hidden}
    body{font-family:'Noto Sans',system-ui,-apple-system,"Segoe UI",sans-serif;
      background:radial-gradient(120% 120% at 15% 10%, #7e57c2 0%, #673ab6 42%, #4c1d95 100%);
      display:flex;align-items:center;gap:40px;padding:0 92px}
    .copy{flex:1 1 0;color:#fff;max-width:560px}
    .kicker{display:flex;align-items:center;gap:12px;font-size:22px;font-weight:600;letter-spacing:.01em;opacity:.95;margin-bottom:26px}
    .kicker svg{width:40px;height:40px}
    .copy h2{font-size:46px;line-height:1.08;font-weight:800;letter-spacing:-0.02em}
    .copy p{font-size:22px;line-height:1.5;opacity:.9;margin-top:22px;max-width:500px}
    .device{flex:none;width:376px;transform:scale(1.32);transform-origin:center right;
      border-radius:16px;overflow:hidden;background:#fff;
      box-shadow:0 30px 70px rgba(20,8,50,.45),0 6px 18px rgba(20,8,50,.35)}
    iframe{width:376px;border:0;display:block}
  </style></head><body>
    <div class="copy"><div class="kicker">${LOGO}<span>disclose.io</span></div>
      <h2>${s.caption}</h2><p>${s.sub}</p></div>
    <div class="device"><iframe id="pop"></iframe></div>
  </body></html>`;
}

const browser = await chromium.launch();
await mkdir(path.join(OUT, 'screenshots'), { recursive: true });

let i = 0;
for (const s of SHOTS) {
  i++;
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.setContent(stage(s), { waitUntil: 'load' });
  await page.$eval('#pop', (el, html) => { (el as HTMLIFrameElement).setAttribute('srcdoc', html as string); }, popupHtml);
  await page.waitForTimeout(250);
  const frame = page.frames().find(f => f !== page.mainFrame())!;
  await frame.evaluate((s) => {
    const main = document.querySelector('main')!;
    main.setAttribute('data-state', s.state);
    const set = (id: string, txt: string) => { const e = document.getElementById(id); if (e) e.textContent = txt; };
    set('hero-headline', s.headline); set('hero-detail', s.detail); set('hero-icon', s.icon);
    const pill = document.getElementById('status-pill') as HTMLElement;
    pill.hidden = false; pill.textContent = s.pill;
    if (s.state === 'none') pill.className = 'pill pill--neutral';
    if (s.level) {
      const m = document.getElementById('maturity') as HTMLElement; m.hidden = false;
      set('maturity-level', s.level); set('maturity-score', s.score ?? '');
    }
    const chips = document.getElementById('chips') as HTMLElement;
    if (s.chips.length) { chips.hidden = false; chips.innerHTML = s.chipHtml; }
    // Turn the primary button into the plain "Look this up" resting state.
  }, { ...s, chipHtml: chipHtml(s.chips) } as any);
  // size the iframe to its content
  const h = await frame.evaluate(() => document.body.scrollHeight);
  await page.$eval('#pop', (el, h) => { (el as HTMLElement).style.height = `${h}px`; }, h);
  await page.waitForTimeout(120);
  const name = `${String(i).padStart(2, '0')}-${s.state}.png`;
  await page.screenshot({ path: path.join(OUT, 'screenshots', name) });
  await page.close();
  console.log('wrote screenshots/' + name);
}

// ---- promo tile 440×280 ----
const promo = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  html,body{width:440px;height:280px;overflow:hidden}
  body{font-family:'Noto Sans',system-ui,-apple-system,sans-serif;
    background:radial-gradient(120% 120% at 20% 10%, #7e57c2 0%, #673ab6 45%, #4c1d95 100%);
    color:#fff;display:flex;flex-direction:column;justify-content:center;padding:34px 36px}
  .row{display:flex;align-items:center;gap:14px;margin-bottom:16px}
  .row svg{width:48px;height:48px}
  .row b{font-size:30px;font-weight:800;letter-spacing:-0.01em}
  h3{font-size:21px;line-height:1.25;font-weight:700;max-width:360px}
  p{margin-top:10px;font-size:14px;opacity:.9}
</style></head><body>
  <div class="row">${LOGO}<b>disclose.io</b></div>
  <h3>Does this site welcome security researchers?</h3>
  <p>VDP · safe harbor · disclosure maturity — at a glance.</p>
</body></html>`;
const pp = await browser.newPage({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 });
await pp.setContent(promo, { waitUntil: 'load' });
await pp.waitForTimeout(80);
await pp.screenshot({ path: path.join(OUT, 'promo-tile-440x280.png') });
await pp.close();
console.log('wrote promo-tile-440x280.png');

await browser.close();
console.log('done');
