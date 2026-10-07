import { Callout, PageHead } from '../ui/content';
import { Icon } from '../ui/Icon';

export const REPO_URL = 'https://github.com/zuehlsdorfsneax-png/lol';
export const EXE_URL = `${REPO_URL}/releases/latest/download/Orbitlabor.exe`;
export const MAC_URL = `${REPO_URL}/releases/latest/download/Orbitlabor-Mac-Apple-Chip.zip`;
export const APK_URL = `${REPO_URL}/releases/latest/download/Orbitlabor.apk`;
const RELEASES_URL = `${REPO_URL}/releases/latest`;

/** Läuft die App gerade in der Windows-EXE? (Der Starter nutzt diesen festen Anschluss.) */
function insideExe(): boolean {
  return location.hostname === '127.0.0.1' && location.port === '47173';
}

const PLATFORMS = [
  {
    name: 'Windows',
    file: 'Orbitlabor.exe',
    needs: 'Windows 10 oder 11, 64 Bit',
    size: 'etwa 8 MB',
    url: EXE_URL,
  },
  {
    name: 'Mac mit Apple-Chip',
    file: 'Orbitlabor-Mac-Apple-Chip.zip',
    needs: 'macOS auf M1 oder neuer',
    size: 'etwa 4 MB',
    url: MAC_URL,
  },
  {
    name: 'Android',
    file: 'Orbitlabor.apk',
    needs: 'Android 7 oder neuer, Handy und Tablet',
    size: 'etwa 4 MB',
    url: APK_URL,
  },
];

export function DownloadPage() {
  return (
    <div class="stack download-page">
      <PageHead eyebrow="Anhang" title="Orbitlabor herunterladen">
        Die ganze App als eine Datei für Windows, Mac oder Android: ohne Internet nutzbar,
        Fortschritt und Raketen bleiben gespeichert.
      </PageHead>

      {insideExe() && (
        <Callout kind="fakt" title="Schon installiert">
          Du benutzt gerade die Windows-Version. Neuere Versionen gibt es immer unter demselben
          Link.
        </Callout>
      )}

      <ul class="platforms">
        {PLATFORMS.map((p) => (
          <li key={p.name}>
            <div class="platform-text">
              <strong>{p.name}</strong>
              <span>{p.needs}</span>
              <span class="platform-file">
                {p.file} · {p.size}
              </span>
            </div>
            <a class="btn primary" href={p.url} target="_blank" rel="noopener">
              <Icon name="download" /> Herunterladen
            </a>
          </li>
        ))}
      </ul>
      <p class="small">
        <a href={RELEASES_URL} target="_blank" rel="noopener">
          Alle Versionen auf GitHub
        </a>
      </p>

      <section class="install-steps">
        <h2>Erster Start</h2>
        <div class="install-grid">
          <div>
            <h3>Windows</h3>
            <ol class="steps">
              <li>
                Datei herunterladen. Fragt der Browser, ob sie behalten werden soll,{' '}
                <strong>Behalten</strong> wählen (in Edge unter „…“).
              </li>
              <li>
                <strong>Orbitlabor.exe</strong> doppelklicken. Bei „Der Computer wurde durch Windows
                geschützt“ auf <strong>Weitere Informationen</strong> und{' '}
                <strong>Trotzdem ausführen</strong> klicken – nur beim ersten Start.
              </li>
              <li>Die App öffnet sich in einem eigenen Fenster.</li>
            </ol>
          </div>
          <div>
            <h3>Mac</h3>
            <ol class="steps">
              <li>ZIP öffnen und Orbitlabor.app in den Ordner „Programme“ ziehen.</li>
              <li>
                Beim ersten Start unter Systemeinstellungen → Datenschutz &amp; Sicherheit{' '}
                <strong>Trotzdem öffnen</strong> wählen.
              </li>
            </ol>
          </div>
          <div>
            <h3>Android</h3>
            <ol class="steps">
              <li>APK auf dem Handy oder Tablet herunterladen und öffnen.</li>
              <li>
                Wenn gefragt, <strong>Unbekannte Apps installieren</strong> für den Browser
                erlauben, dann <strong>Installieren</strong>.
              </li>
            </ol>
          </div>
        </div>
      </section>

      <Callout kind="merke" title="Warum warnen Windows und Mac?">
        Beide vertrauen Programmen erst, wenn sie mit einem gekauften Zertifikat signiert sind, das
        auf eine geprüfte Person oder Firma ausgestellt ist. Das hat ein Schulprojekt nicht. Die
        Warnung heißt nur „unbekannter Herausgeber“, nicht „gefährlich“. Der Quelltext liegt offen
        auf GitHub, und alle drei Dateien werden dort automatisch aus genau diesem Quelltext gebaut.
      </Callout>

      <section class="prose download-how">
        <h2>Wie funktioniert das?</h2>
        <p>
          Windows- und Mac-Version enthalten die komplette Web-App. Beim Start öffnen sie einen
          kleinen Server nur auf dem eigenen Rechner (127.0.0.1) und zeigen die App in einem
          App-Fenster von Edge oder Chrome, sonst im Standardbrowser. Die Android-App zeigt dieselbe
          Web-App in einer eigenen Oberfläche. Es werden keine Daten ins Internet geschickt.
        </p>
        <p>Die App läuft auch direkt im Browser – auf jedem Gerät.</p>
      </section>
    </div>
  );
}
