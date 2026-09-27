import { PROBLEM_QUESTION } from '../../app/content';
import { Callout, LinkButton, SectionTitle } from '../../ui/content';

export function Conclusion() {
  return (
    <>
      <div class="prose">
        <SectionTitle n="9.1">Beantwortung der Problemfrage</SectionTitle>
        <blockquote class="problem">
          <p>„{PROBLEM_QUESTION}“</p>
        </blockquote>
        <p>
          <strong>Stabil</strong> ist ein Mond, solange er tief genug in der Hill-Sphäre seines
          Planeten kreist: bei prograder Bahn innerhalb von etwa 0,48 Hill-Radien, bei retrograder
          innerhalb von etwa 0,92. Zusätzlich muss sein erdnächster Punkt über der Roche-Grenze
          liegen und seine Geschwindigkeit deutlich unter der Fluchtgeschwindigkeit. Unser Mond
          kreist bei 0,26 Hill-Radien; das Jacobi-Kriterium beweist sogar, dass er die Erdumgebung
          nicht verlassen kann.
        </p>
        <p>
          <strong>Abstürzen</strong> würde der Mond erst, wenn er rund 80 % seiner Geschwindigkeit
          verlöre; bei 70 % Verlust würde er an der Roche-Grenze zerrissen.{' '}
          <strong>Verlassen</strong> würde er das System mit etwa 19 % mehr Geschwindigkeit, bei
          einem Abstand über 0,48 Hill-Radien, wenn die Erde der Sonne näher als 0,52 AE käme oder
          die Sonne 6,5-mal schwerer wäre. Keine dieser Bedingungen ist absehbar – auch die
          Gezeitenreibung treibt den Mond nur bis etwa 554 000 km (0,37 r_H).
        </p>

        <SectionTitle n="9.2">Zusammenfassung der wichtigsten Erkenntnisse</SectionTitle>
        <ul>
          <li>
            Newtons Gravitationsgesetz beschreibt Zweikörpersysteme exakt; ab drei Körpern braucht
            man Näherungen und Simulationen.
          </li>
          <li>
            Die Sonne zieht den Mond stärker an als die Erde, stört die Mondbahn aber nur mit etwa 1
            % (Gezeitenkraft).
          </li>
          <li>
            Die Lagrange-Punkte L1 und L2 markieren die „Tore“ der Hill-Sphäre; L4/L5 sind stabil,
            L1–L3 instabil.
          </li>
          <li>
            Unsere Simulation reproduziert Monat, Jahr und Apsidendrehung und bestätigt die
            Stabilitätsgrenzen aus der Literatur.
          </li>
          <li>
            Die Hohle-Mond-Theorie ist durch Baryzentrum, Dichte, Trägheitsmoment und Seismik
            widerlegt.
          </li>
        </ul>

        <SectionTitle n="9.3">Grenzen der Untersuchung</SectionTitle>
        <ul>
          <li>Die Simulation rechnet in einer Ebene (2D); die Neigung der Mondbahn fehlt.</li>
          <li>
            Andere Planeten, Gezeitenreibung und Relativitätstheorie sind in der Bahnsimulation
            nicht enthalten.
          </li>
          <li>
            Stabilitätsgrenzen wurden über 10–30 Jahre bestimmt; manche Bahnen werden erst nach
            Jahrhunderten instabil.
          </li>
        </ul>

        <SectionTitle n="9.4">Ausblick auf weiterführende Untersuchungen</SectionTitle>
        <ul>
          <li>Dreidimensionale Simulation mit Knotendrehung und Finsternisvorhersage.</li>
          <li>Gezeitenreibung direkt in der Bahnsimulation.</li>
          <li>Monde von Exoplaneten und Planeten in Doppelsternsystemen.</li>
          <li>
            Der Asteroidengürtel und die Kirkwood-Lücken als Beispiel für Resonanzen mit Jupiter.
          </li>
        </ul>
      </div>
      <Callout kind="merke">
        Der Mond bleibt: Er liegt mit großem Sicherheitsabstand innerhalb aller Stabilitätsgrenzen.
      </Callout>
      <div class="btn-row">
        <LinkButton to="quiz" primary>
          Wissen im Quiz testen
        </LinkButton>
        <LinkButton to="spiel">Luna-Abenteuer spielen</LinkButton>
      </div>
    </>
  );
}
