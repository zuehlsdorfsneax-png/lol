// Baut release/Orbitlabor-Mac.zip: Web-App bauen, in den Go-Starter einbetten, für macOS
// (Apple-Chip und Intel) übersetzen und als Orbitlabor.app verpacken.
// Benötigt Node, Go (ab 1.22), Python mit Pillow (für das Symbol) und zip. Aufruf: npm run mac
import { execFileSync, execSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const launcher = join(root, 'desktop', 'launcher');
const release = join(root, 'release');
const work = join(release, 'mac');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

if (!process.argv.includes('--skip-build'))
  execSync('npm run build', { stdio: 'inherit', cwd: root });
rmSync(join(launcher, 'app'), { recursive: true, force: true });
cpSync(join(root, 'dist'), join(launcher, 'app'), {
  recursive: true,
  filter: (s) => !s.endsWith('.map'),
});

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Orbitlabor</string>
  <key>CFBundleDisplayName</key><string>Orbitlabor</string>
  <key>CFBundleIdentifier</key><string>de.seminararbeit.orbitlabor</string>
  <key>CFBundleVersion</key><string>${version}</string>
  <key>CFBundleShortVersionString</key><string>${version.split('-')[0]}</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>Orbitlabor</string>
  <key>CFBundleIconFile</key><string>Orbitlabor</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>Seminararbeit Astronomie</string>
</dict>
</plist>
`;

// Symbol im Mac-Format (.icns) aus dem PNG
const icns = join(work, 'Orbitlabor.icns');
execFileSync('python3', [
  '-c',
  'import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGBA").resize((1024,1024)).save(sys.argv[2])',
  join(root, 'desktop', 'icon.png'),
  icns,
]);

const zips = [];
for (const [arch, label] of [
  ['arm64', 'Apple-Chip'],
  ['amd64', 'Intel'],
]) {
  const app = join(work, label, 'Orbitlabor.app');
  mkdirSync(join(app, 'Contents', 'MacOS'), { recursive: true });
  mkdirSync(join(app, 'Contents', 'Resources'), { recursive: true });
  writeFileSync(join(app, 'Contents', 'Info.plist'), plist);
  cpSync(icns, join(app, 'Contents', 'Resources', 'Orbitlabor.icns'));
  const bin = join(app, 'Contents', 'MacOS', 'Orbitlabor');
  execFileSync(
    'go',
    ['build', '-trimpath', '-ldflags', `-s -w -X main.version=${version}`, '-o', bin, '.'],
    {
      stdio: 'inherit',
      cwd: launcher,
      env: { ...process.env, GOOS: 'darwin', GOARCH: arch, CGO_ENABLED: '0' },
    },
  );
  chmodSync(bin, 0o755);
  // Auf einem Mac (z. B. in GitHub Actions) das ganze Paket ad-hoc signieren: Dann meldet macOS
  // nicht „beschädigt“, sondern nur „nicht verifizierter Entwickler“.
  if (process.platform === 'darwin')
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  const zip = join(release, `Orbitlabor-Mac-${label}.zip`);
  rmSync(zip, { force: true });
  execFileSync('zip', ['-qry', zip, 'Orbitlabor.app'], { cwd: join(work, label) });
  if (!existsSync(zip)) throw new Error('Das Mac-Paket wurde nicht erzeugt.');
  zips.push(`${zip} (${(statSync(zip).size / 1e6).toFixed(1)} MB)`);
}
console.log(`\nFertig:\n  ${zips.join('\n  ')}`);
