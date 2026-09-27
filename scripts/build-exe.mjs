// Baut release/Orbitlabor.exe: Web-App bauen, in den Go-Starter einbetten, für Windows übersetzen.
// Benötigt Node und Go (ab 1.22). Aufruf: npm run exe
import { execFileSync, execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const launcher = join(root, 'desktop', 'launcher');
const app = join(launcher, 'app');
const out = join(root, 'release', 'Orbitlabor.exe');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { stdio: 'inherit', cwd: root, ...opts });

if (!process.argv.includes('--skip-build'))
  execSync('npm run build', { stdio: 'inherit', cwd: root });

rmSync(app, { recursive: true, force: true });
cpSync(join(root, 'dist'), app, {
  recursive: true,
  filter: (src) => !src.endsWith('.map'),
});

// Symbol, Versionsangaben und Manifest für Windows (Datei-Eigenschaften im Explorer).
const winres = 'github.com/tc-hib/go-winres@v0.3.3';
const numeric = `${version.split('-')[0]}.0`;
run(
  'go',
  [
    'run',
    winres,
    'simply',
    '--arch',
    'amd64',
    '--icon',
    join(root, 'desktop', 'icon.png'),
    '--manifest',
    'gui',
    '--product-name',
    'Orbitlabor',
    '--file-description',
    'Orbitlabor – Bahnstabilität im Drei-Körper-System',
    '--product-version',
    numeric,
    '--file-version',
    numeric,
    '--original-filename',
    'Orbitlabor.exe',
    '--copyright',
    'Seminararbeit Astronomie',
  ],
  { cwd: launcher },
);

mkdirSync(join(root, 'release'), { recursive: true });
run(
  'go',
  [
    'build',
    '-trimpath',
    '-ldflags',
    `-s -w -H windowsgui -X main.version=${version}`,
    '-o',
    out,
    '.',
  ],
  { cwd: launcher, env: { ...process.env, GOOS: 'windows', GOARCH: 'amd64', CGO_ENABLED: '0' } },
);

if (!existsSync(out)) throw new Error('Die EXE wurde nicht erzeugt.');
console.log(`\nFertig: ${out} (${(statSync(out).size / 1e6).toFixed(1)} MB)`);
