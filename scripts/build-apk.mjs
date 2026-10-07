// Baut release/Orbitlabor.apk: Web-App bauen, mit Capacitor in die Android-App kopieren und mit
// Gradle übersetzen. Benötigt Node, Java 21 und das Android-SDK (ANDROID_HOME). Aufruf: npm run apk
import { execFileSync, execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const android = join(root, 'android');
const out = join(root, 'release', 'Orbitlabor.apk');

if (
  !process.env.ANDROID_HOME &&
  !process.env.ANDROID_SDK_ROOT &&
  !existsSync(join(android, 'local.properties'))
)
  throw new Error('Android-SDK nicht gefunden: ANDROID_HOME setzen.');

if (!process.argv.includes('--skip-build'))
  execSync('npm run build', { stdio: 'inherit', cwd: root });
execSync('npx cap sync android', { stdio: 'inherit', cwd: root });
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
execFileSync(gradlew, ['assembleRelease', '--no-daemon', '--console=plain'], {
  stdio: 'inherit',
  cwd: android,
  shell: process.platform === 'win32',
});

const apk = join(android, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!existsSync(apk)) throw new Error('Die APK wurde nicht erzeugt.');
mkdirSync(join(root, 'release'), { recursive: true });
copyFileSync(apk, out);
console.log(`\nFertig: ${out} (${(statSync(out).size / 1e6).toFixed(1)} MB)`);
