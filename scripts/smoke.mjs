// Oberflächen-Prüfung im Browser: jede Seite auf Handy und PC laden, auf Fehler, horizontales
// Scrollen und fehlende Überschrift prüfen, und einmal die Raketenwerft bis zum Flug öffnen.
// Aufruf: gegen eine laufende Vorschau (npm run preview), Adresse per BASE_URL.
// Browser: Standard von Playwright oder CHROMIUM_PATH für eine eigene Installation.
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const PAGES = [
  'start',
  'simulator',
  'karte',
  'lagrange',
  'kapitel-3',
  'missionen',
  'quiz',
  'rakete',
  'download',
  'begriffe',
  'methodik',
  'quellen',
];
const VIEWS = [
  { name: 'PC', width: 1366, height: 900 },
  { name: 'Handy', width: 412, height: 915, phone: true },
];

const failures = [];
const fail = (where, what) => failures.push(`${where}: ${what}`);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox'],
});

for (const view of VIEWS) {
  const context = await browser.newContext({
    viewport: { width: view.width, height: view.height },
    isMobile: !!view.phone,
    hasTouch: !!view.phone,
  });
  for (const id of PAGES) {
    const page = await context.newPage();
    const where = `${view.name} #${id}`;
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto(`${BASE}#${id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      heading: !!document.querySelector('h1, h2'),
    }));
    if (state.overflow > 0) fail(where, `horizontales Scrollen um ${state.overflow} px`);
    if (!state.heading) fail(where, 'keine Überschrift');
    for (const e of errors.slice(0, 3)) fail(where, `Fehler: ${e.slice(0, 160)}`);
    await page.close();
  }

  const page = await context.newPage();
  const where = `${view.name} Raketenwerft`;
  await page.goto(`${BASE}#rakete`, { waitUntil: 'networkidle' });
  await page
    .getByRole('button', { name: /^Spielen/ })
    .first()
    .click();
  await page
    .getByRole('button', { name: /^Starten/ })
    .first()
    .click();
  await page
    .waitForSelector('canvas', { timeout: 15_000 })
    .catch(() => fail(where, 'kein Flugbild'));
  await page.close();
  await context.close();
}

await browser.close();

if (failures.length) {
  console.error(`Oberflächen-Prüfung: ${failures.length} Problem(e)`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Oberflächen-Prüfung bestanden: ${PAGES.length} Seiten × ${VIEWS.length} Ansichten`);
