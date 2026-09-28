import { StabilityMap } from '../../stability/StabilityMap';
import { Callout, Equation, Figure, LinkButton, SectionTitle, Tex } from '../../ui/content';

const THRESHOLDS = [
  {
    cond: 'Startgeschwindigkeit zu klein',
    theory: 'v < 0,203 · v_K',
    sim: 'v < 0,205 · v_K',
    result: 'Absturz auf die Erde',
    link: 'sim-absturz',
  },
  {
    cond: '… schon vorher',
    theory: 'v < 0,302 · v_K',
    sim: 'v < 0,303 · v_K',
    result: 'Zerrissen an der Roche-Grenze (Ring)',
    link: 'sim-roche',
  },
  {
    cond: 'Startgeschwindigkeit zu groß',
    theory: 'v ≥ 1,414 · v_K (ohne Sonne)',
    sim: 'v > 1,19 · v_K',
    result: 'Flucht über L1/L2',
    link: 'sim-flucht',
  },
  {
    cond: 'Kreisbahn zu weit außen (prograd)',
    theory: 'a > 0,48 Hill-Radien',
    sim: 'a > 0,478 Hill-Radien',
    result: 'Flucht',
    link: 'sim-jenseits',
  },
  {
    cond: 'Kreisbahn zu weit außen (retrograd)',
    theory: 'a > 0,91 Hill-Radien',
    sim: 'a > 0,923 Hill-Radien',
    result: 'Flucht',
    link: 'sim-retrograd',
  },
  {
    cond: 'Erde näher an der Sonne',
    theory: 'a_Erde < 0,52 AE',
    sim: 'a_Erde < 0,524 AE',
    result: 'Flucht',
    link: 'sim-merkurbahn',
  },
  {
    cond: 'Sonne schwerer',
    theory: 'M > 6,6 M☉',
    sim: 'M > 6,5 M☉',
    result: 'Flucht',
    link: 'sim-schwere-sonne',
  },
  {
    cond: 'Erdbahn stark elliptisch',
    theory: 'e > 0,46',
    sim: 'e > 0,51',
    result: 'Flucht im Perihel',
    link: 'sim-exzentrisch',
  },
];

export function Instability() {
  return (
    <>
      <div class="prose">
        <SectionTitle n="8.3.1">Zwei Arten zu scheitern</SectionTitle>
        <p>
          Ein Mond kann seinen Planeten auf zwei Wegen verlieren: Er <strong>stürzt ab</strong>{' '}
          (oder wird vorher von Gezeitenkräften zerrissen), oder er <strong>entkommt</strong> und
          umkreist danach die Sonne. Beide Grenzen lassen sich zuerst mit einfachen Formeln
          abschätzen und dann mit dem Simulator genau bestimmen.
        </p>

        <SectionTitle n="8.3.2">Zu langsam: Absturz und Roche-Grenze</SectionTitle>
        <p>
          Startet der Mond im Abstand <Tex>{'r_0'}</Tex> tangential mit dem Bruchteil <Tex>f</Tex>{' '}
          der Kreisbahngeschwindigkeit, ist der Start der erdfernste Punkt einer Ellipse. Aus
          Energie- und Drehimpulserhaltung folgt der erdnächste Punkt
        </p>
        <Equation tex={String.raw`r_P = r_0\,\frac{f^2}{2-f^2}.`} n="8.1" />
        <p>
          Ein Aufprall erfolgt, wenn{' '}
          <Tex>{String.raw`r_P < R_\oplus + R_\text{Mond} = 8\,108\ \text{km}`}</Tex>, also für{' '}
          <Tex>{String.raw`f < 0{,}203`}</Tex>. Schon vorher, unterhalb der{' '}
          <strong>Roche-Grenze</strong> von 18 365 km, übersteigen die Gezeitenkräfte der Erde den
          Zusammenhalt des Mondes: Er würde zu einem Ring zerrieben, wie ihn Saturn hat. Dazu genügt{' '}
          <Tex>{String.raw`f < 0{,}302`}</Tex>. Der Mond müsste also rund 70 % seiner
          Geschwindigkeit verlieren – ein Vorgang, für den es keinen natürlichen Mechanismus gibt.
        </p>

        <SectionTitle n="8.3.3">
          Zu schnell: Flucht – schon unterhalb der Fluchtgeschwindigkeit
        </SectionTitle>
        <p>
          Ohne Sonne entkommt der Mond erst mit der Fluchtgeschwindigkeit{' '}
          <Tex>{String.raw`v_F = \sqrt2\,v_K`}</Tex>. Mit Sonne genügt schon{' '}
          <Tex>{String.raw`f \approx 1{,}19`}</Tex>: Dann reicht die Ellipse bis etwa 930 000 km,
          also 0,62 Hill-Radien – jenseits der Stabilitätsgrenze. Dort öffnet sich das Tor bei L1
          oder L2 und die Sonne übernimmt. Die Sonne senkt die nötige Geschwindigkeit damit um 16 %.
        </p>

        <SectionTitle n="8.3.4">Die Hill-Sphäre schrumpft</SectionTitle>
        <p>
          Aus <Tex>{String.raw`r_H = a\,\sqrt[3]{m/3M}`}</Tex> folgt: Der Mond wird instabil, wenn
          die Erde der Sonne näher kommt oder die Sonne schwerer wird. Mit der Grenze 0,48 r
          <sub>H</sub> gilt für unseren Mond (384 400 km)
        </p>
        <Equation
          tex={String.raw`a_\text{Erde} > \frac{384\,400\ \text{km}}{0{,}48\cdot 1{,}5\ \text{Mio. km}}\ \text{AE} \approx 0{,}52\ \text{AE},\qquad M_\odot < \left(\frac{0{,}48\cdot r_H}{384\,400\ \text{km}}\right)^3 M_\odot \approx 6{,}6\,M_\odot.`}
          n="8.2"
        />
        <p>
          Auf der Venusbahn (0,72 AE) wäre der Mond noch stabil, auf der Merkurbahn (0,39 AE) nicht
          mehr. Bei einer stark elliptischen Erdbahn zählt der kleinste Hill-Radius im Perihel.
        </p>
      </div>

      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Bedingung</th>
              <th>Theorie</th>
              <th>Simulation (30 Jahre)</th>
              <th>Folge</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {THRESHOLDS.map((t) => (
              <tr key={t.cond}>
                <td>{t.cond}</td>
                <td class="num">{t.theory}</td>
                <td class="num">{t.sim}</td>
                <td>{t.result}</td>
                <td>
                  <a href={`#${t.link}`}>ansehen</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="small muted">
        v_K = Kreisbahngeschwindigkeit im Startabstand 384 400 km. Simulationswerte ermittelt mit{' '}
        <code>npm run calibrate</code> (Velocity-Verlet, adaptive Schrittweite, Schrittweite 0,25 %
        der Umlaufzeit). Theorie: Formeln (8.1), (8.2) und Domingos et al. (2006).
      </p>

      <Figure
        n="8.1"
        caption="Stabilitätskarte: Jede Zelle ist eine eigene Simulation über 10 Jahre. Die Linien zeigen die Vorhersagen aus (8.1) und die Stabilitätsgrenze nach Domingos et al. Größere Karten und weitere Parameter im Werkzeug „Stabilitätskarte“."
      >
        <StabilityMap compact />
      </Figure>

      <div class="prose">
        <SectionTitle n="8.3.5">Was die Karte zusätzlich verrät</SectionTitle>
        <ul>
          <li>
            Die Grenze zum Entkommen ist <strong>ausgefranst</strong>: Nahe der Grenze entscheiden
            Kleinigkeiten wie der Startwinkel, ob der Mond das Tor bei L1/L2 trifft. Das ist ein
            Kennzeichen von Chaos im Drei-Körper-Problem.
          </li>
          <li>
            Weit außen und langsam stürzt der Mond öfter ab, als die Zwei-Körper-Formel (8.1)
            vorhersagt: Während des langen Falls verändert die Gezeitenkraft der Sonne seinen
            Drehimpuls, sodass er die Erde trifft.
          </li>
          <li>
            Einzelne Zellen nahe der Fluchtgrenze enden mit einem Absturz: Der Mond kehrt nach einem
            Ausflug zurück und trifft die Erde.
          </li>
        </ul>

        <SectionTitle n="8.3.6">Weitere Wege zur Instabilität</SectionTitle>
        <ul>
          <li>
            <strong>Nahe Vorbeiflüge</strong>: Ein Stern oder Schurkenplanet, der nahe genug
            vorbeizieht, stört das System von außen. Ein Körper mit Jupitermasse in 500 000 km
            Abstand reißt den Mond fort (Voreinstellung „Vorbeiflug“). Für Sterne ist ein so naher
            Vorbeiflug in der Sonnenumgebung extrem unwahrscheinlich.
          </li>
          <li>
            <strong>Gezeitenwanderung nach innen</strong>: Kreist ein Mond schneller um seinen
            Planeten, als dieser sich dreht, bremsen die Gezeiten den Mond. Der Marsmond Phobos
            nähert sich so um etwa 2 m pro Jahrhundert und wird in einigen zehn Millionen Jahren
            zerrissen. Auch der retrograd laufende Neptunmond Triton spiralt langsam nach innen.
          </li>
          <li>
            <strong>Resonanzen</strong>: Stehen Umlaufzeiten im Verhältnis kleiner ganzer Zahlen,
            können sich Störungen aufschaukeln. In der Frühzeit des Erde–Mond-Systems könnte eine
            solche Resonanz mit der Sonne (Evektionsresonanz) die Mondbahn verändert haben.
          </li>
        </ul>
      </div>

      <Callout kind="merke">
        Damit der Mond abstürzt, müsste er etwa 70 % seiner Geschwindigkeit verlieren (Roche-Grenze)
        bzw. 80 % (Aufprall). Damit er entkommt, bräuchte er 19 % mehr Geschwindigkeit, einen
        doppelt so großen Abstand, eine Erde auf halber Entfernung zur Sonne oder eine 6,5-mal
        schwerere Sonne. Nichts davon ist in Sicht – der Mond bleibt.
      </Callout>

      <div class="btn-row">
        <LinkButton to="stabilitaetskarte" primary>
          Stabilitätskarte öffnen
        </LinkButton>
        <LinkButton to="sim-vorbeiflug">Vorbeiflug simulieren</LinkButton>
        <LinkButton to="missionen">Grenzen in Missionen testen</LinkButton>
      </div>
    </>
  );
}
