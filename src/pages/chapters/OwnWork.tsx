import { INTEGRATORS } from '../../physics';
import { Callout, Equation, Figure, LinkButton, SectionTitle } from '../../ui/content';
import { ValidationTable } from '../MethodsPage';
import { Instability } from './Instability';

export function OwnWork() {
  return (
    <>
      <div class="prose">
        <SectionTitle n="8.1">Aufbau der Simulation</SectionTitle>
        <p>
          Unser Eigenanteil ist das <strong>Orbitlabor</strong>: eine Drei-Körper-Simulation, die
          komplett im Browser läuft (und als Windows-Programm). Sie besteht aus vier Teilen:
        </p>
        <ul>
          <li>
            <strong>Physik-Kern:</strong> berechnet die Bewegung von Sonne, Erde, Mond und beliebig
            vielen Testteilchen mit dem Newtonschen Gravitationsgesetz. Er ist von der Oberfläche
            getrennt und durch über 100 automatische Tests abgesichert.
          </li>
          <li>
            <strong>Simulator:</strong> Alle Massen, Abstände, Geschwindigkeiten und die
            Umlaufrichtung sind einstellbar. Die Simulation erkennt Absturz, Roche-Grenze und
            Flucht, zeigt Messwerte (Abstand, Bahnform, Hill-Anteil, Jacobi-Konstante,
            Energiefehler) und exportiert Messreihen.
          </li>
          <li>
            <strong>Stabilitätskarte:</strong> rechnet für ein Raster aus zwei Parametern tausende
            Langzeitsimulationen parallel und stellt das Ergebnis farbig dar.
          </li>
          <li>
            <strong>Lagrange-Labor:</strong> das eingeschränkte Drei-Körper-Problem im
            mitrotierenden System.
          </li>
        </ul>
        <p>
          Die Oberfläche (Bedienung) ist so aufgebaut, dass rechts alle Parameter stehen, in der
          Mitte die Weltraumansicht mit drei wählbaren Bezugssystemen und darunter Prognose,
          Messwerte und Diagramme.
        </p>

        <SectionTitle n="8.2">Benutzte Formeln</SectionTitle>
        <p>Grundlage ist die Bewegungsgleichung für jeden Körper (2.4):</p>
        <Equation
          tex={String.raw`\ddot{\vec r}_i = \sum_{j\neq i} G\,m_j\,\frac{\vec r_j-\vec r_i}{\lvert\vec r_j-\vec r_i\rvert^3}`}
        />
        <p>
          Sie wird schrittweise mit dem <strong>Velocity-Verlet-Verfahren</strong> gelöst, das die
          Energie über lange Zeit erhält:
        </p>
        <Equation
          tex={String.raw`\vec v_{n+\frac12} = \vec v_n + \tfrac{\Delta t}{2}\,\vec a_n,\quad \vec r_{n+1} = \vec r_n + \Delta t\,\vec v_{n+\frac12},\quad \vec v_{n+1} = \vec v_{n+\frac12} + \tfrac{\Delta t}{2}\,\vec a_{n+1}`}
        />
        <p>Die Schrittweite passt sich automatisch an (bei enger Begegnung kleiner):</p>
        <Equation
          tex={String.raw`\Delta t = \eta\cdot\min\left(\sqrt{\tfrac{r^3}{G(m_1+m_2)}},\ \tfrac{r}{v}\right),\qquad \eta = 0{,}01`}
        />
        <p>
          Zur Auswertung dienen die Bahnelemente (große Halbachse, Exzentrizität), der Hill-Radius{' '}
          (5.1), die Roche-Grenze, die Jacobi-Konstante (4.8) und das Stabilitätskriterium nach
          Domingos et al. Zum Vergleich stehen {Object.keys(INTEGRATORS).length} Rechenverfahren zur
          Auswahl (Euler, Euler-Cromer, Velocity-Verlet, Runge-Kutta 4, Yoshida).
        </p>

        <SectionTitle n="8.3">Untersuchung verschiedener Stabilitätsfälle</SectionTitle>
      </div>

      <Instability />

      <div class="prose">
        <SectionTitle n="8.4">Simulation von Instabilität und des hohlen Mondes</SectionTitle>
        <p>
          Die folgenden Voreinstellungen zeigen die untersuchten Fälle direkt im Simulator. Den
          hohlen Mond aus Kapitel 7 kann man dort ebenfalls simulieren: Bei 10 % Schalenstärke rückt
          das Baryzentrum von 4.670 km auf etwa 1.320 km, die Umlaufzeit ändert sich kaum.
        </p>
      </div>
      <div class="btn-row">
        <LinkButton to="sim-absturz">Absturz</LinkButton>
        <LinkButton to="sim-roche">Roche-Grenze</LinkButton>
        <LinkButton to="sim-flucht">Flucht</LinkButton>
        <LinkButton to="sim-jenseits">Jenseits der Hill-Grenze</LinkButton>
        <LinkButton to="sim-merkurbahn">Erde auf Merkurbahn</LinkButton>
        <LinkButton to="kapitel-7">Hohler Mond (Abb. 7.2)</LinkButton>
      </div>

      <div class="prose">
        <SectionTitle n="8.5">Auswertung der Simulationsergebnisse</SectionTitle>
        <p>
          Um der Simulation vertrauen zu können, haben wir sie mit echten Messungen verglichen. Die
          Tabelle zeigt Werte aus einer 30-jährigen Simulation des realen Systems. Alle Grenzwerte
          aus 8.3 stimmen außerdem mit den theoretischen Vorhersagen (Hill-Radius, Roche-Grenze,
          Domingos et al.) auf wenige Prozent überein.
        </p>
      </div>
      <Figure
        n="8.2"
        caption="Vergleich der Simulation (Velocity-Verlet, adaptive Schrittweite, 30 Jahre) mit Messwerten."
      >
        <ValidationTable />
      </Figure>
      <Callout kind="seminar">
        Weitere Details (Integratorvergleich, Grenzen des Modells) stehen unter „Methodik &amp;
        Validierung“. Die Grenzwerte lassen sich mit <code>npm run calibrate</code> reproduzieren.
      </Callout>
    </>
  );
}
