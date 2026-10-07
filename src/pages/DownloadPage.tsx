import { Callout, PageHead } from '../ui/content';
import { Icon } from '../ui/Icon';

export const REPO_URL = 'https://github.com/zuehlsdorfsneax-png/lol';
export const EXE_URL = `${REPO_URL}/releases/latest/download/Orbitlabor.exe`;
export const MAC_URL = `${REPO_URL}/releases/latest/download/Orbitlabor-Mac-Apple-Chip.zip`;
const RELEASES_URL = `${REPO_URL}/releases/latest`;

/** Läuft die App gerade in der Windows-EXE? (Der Starter nutzt diesen festen Anschluss.) */
function insideExe(): boolean {
  return location.hostname === '127.0.0.1' && location.port === '47173';
}

export function DownloadPage() {
  return (
    <div class="stack download-page" style={{ gap: '18px', maxWidth: '860px' }}>
      <PageHead eyebrow="Anhang · Windows" title="Orbitlabor für Windows">
        Die ganze App als eine einzige Datei: herunterladen, doppelklicken, loslegen – ohne
        Installation und ohne Internet.
      </PageHead>

      {insideExe() && (
        <Callout kind="fakt" title="Schon installiert">
          Du benutzt gerade die Windows-Version. Neuere Versionen gibt es immer unter demselben
          Link.
        </Callout>
      )}

      <div class="download-hero panel">
        <div>
          <h2>Orbitlabor.exe</h2>
          <p class="small muted">
            Windows 10 und 11 (64 Bit) · etwa 8 MB · Fortschritt und Raketen werden gespeichert
          </p>
        </div>
        <a class="btn primary download-btn" href={EXE_URL} target="_blank" rel="noopener">
          <Icon name="download" /> Herunterladen
        </a>
        <a class="btn download-btn" href={MAC_URL} target="_blank" rel="noopener">
          <Icon name="download" /> Für Mac (Apple-Chip)
        </a>
        <p class="small muted">
          Mac: ZIP öffnen, Orbitlabor.app in „Programme“ ziehen. Beim ersten Start unter
          Systemeinstellungen → Datenschutz &amp; Sicherheit „Trotzdem öffnen“ wählen.
        </p>
        <a class="small" href={RELEASES_URL} target="_blank" rel="noopener">
          Alle Versionen auf GitHub
        </a>
      </div>

      <section class="panel panel-pad">
        <h3>In drei Schritten starten</h3>
        <ol class="steps">
          <li>
            Auf <strong>Herunterladen</strong> klicken. Fragt der Browser nach, ob die Datei
            behalten werden soll, <strong>Behalten</strong> wählen (in Edge unter „…“).
          </li>
          <li>
            <strong>Orbitlabor.exe</strong> im Download-Ordner doppelklicken. Erscheint das blaue
            Fenster „Der Computer wurde durch Windows geschützt“, auf{' '}
            <strong>Weitere Informationen</strong> und dann auf <strong>Trotzdem ausführen</strong>{' '}
            klicken. Das ist nur beim ersten Start nötig.
          </li>
          <li>
            Das Orbitlabor öffnet sich in einem eigenen Fenster. Schließt man das Fenster, beendet
            sich das Programm nach kurzer Zeit von selbst.
          </li>
        </ol>
      </section>

      <Callout kind="merke" title="Warum warnt Windows?">
        Windows vertraut Programmen erst, wenn sie mit einem gekauften Zertifikat signiert sind, das
        auf eine geprüfte Person oder Firma ausgestellt ist, oder wenn sie schon sehr oft
        heruntergeladen wurden. Beides hat ein Schulprojekt nicht. Die Warnung heißt nur
        „unbekannter Herausgeber“, nicht „gefährlich“. Der komplette Quelltext liegt offen auf
        GitHub, und die Datei wird dort automatisch aus genau diesem Quelltext gebaut.
      </Callout>

      <section class="panel panel-pad">
        <h3>Wie funktioniert die EXE?</h3>
        <p>
          Die Datei enthält die komplette Web-App. Beim Start öffnet sie einen kleinen Server nur
          auf dem eigenen Rechner (127.0.0.1) und zeigt die App in einem App-Fenster von Microsoft
          Edge, das auf jedem Windows 10 und 11 vorhanden ist. Fehlt Edge, öffnet sich der
          Standardbrowser. Es werden keine Daten ins Internet geschickt.
        </p>
        <p class="small muted">
          Ohne Windows? Die App läuft auch direkt im Browser – auf Handy, Tablet, Mac oder Linux.
        </p>
      </section>
    </div>
  );
}
