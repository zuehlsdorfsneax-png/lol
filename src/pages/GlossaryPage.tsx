import { PageHead } from '../ui/content';

interface Term {
  term: string;
  text: string;
  /** Wo es in der App vorkommt. */
  link?: [string, string];
}

const TERMS: readonly Term[] = [
  {
    term: 'Apoapsis (Ap)',
    text: 'Der höchste, am weitesten entfernte Punkt einer Umlaufbahn.',
    link: ['rakete', 'Raketenwerft'],
  },
  {
    term: 'Baryzentrum',
    text: 'Gemeinsamer Schwerpunkt zweier Körper, um den beide kreisen. Beim System Erde–Mond liegt er etwa 4.700 km vom Erdmittelpunkt entfernt, also noch in der Erde.',
    link: ['kapitel-2', 'Kapitel 2'],
  },
  {
    term: 'Bahnstabilität',
    text: 'Eine Bahn ist stabil, wenn kleine Störungen sie nur wenig verändern und der Körper über lange Zeit weder abstürzt noch entkommt.',
    link: ['kapitel-1', 'Kapitel 1'],
  },
  {
    term: 'Drei-Körper-Problem',
    text: 'Die Bewegung dreier sich gegenseitig anziehender Körper. Es gibt dafür keine allgemeine Formel, deshalb rechnet man numerisch – wie im Simulator.',
    link: ['kapitel-8', 'Kapitel 8'],
  },
  {
    term: 'Δv (Delta-v)',
    text: 'Die Geschwindigkeitsänderung, die eine Rakete mit ihrem Treibstoff insgesamt erreichen kann. Das „Budget“ jeder Raumfahrtmission.',
    link: ['rakete', 'Raketenwerft'],
  },
  {
    term: 'Exzentrizität',
    text: 'Maß für die Form einer Bahn: 0 ist ein Kreis, zwischen 0 und 1 eine Ellipse, ab 1 ist die Bahn offen (Flucht).',
    link: ['simulator', 'Simulator'],
  },
  {
    term: 'Fluchtgeschwindigkeit',
    text: 'Die Geschwindigkeit, ab der ein Körper nicht mehr zurückfällt: √2-mal die Kreisbahngeschwindigkeit.',
    link: ['kapitel-8', 'Kapitel 8'],
  },
  {
    term: 'Gebundene Rotation',
    text: 'Ein Körper dreht sich in derselben Zeit um sich selbst, in der er seinen Partner umkreist. Darum zeigt uns der Mond immer dieselbe Seite.',
    link: ['kapitel-6', 'Kapitel 6'],
  },
  {
    term: 'Gezeitenreibung',
    text: 'Die Gezeitenberge bremsen die Erddrehung; der Drehimpuls wandert zum Mond, der sich dadurch um etwa 3,8 cm pro Jahr entfernt.',
    link: ['kapitel-6', 'Kapitel 6'],
  },
  {
    term: 'Gravitationsgesetz',
    text: 'Zwei Massen ziehen sich mit F = G·m₁·m₂/r² an – doppelter Abstand, ein Viertel der Kraft.',
    link: ['kapitel-2', 'Kapitel 2'],
  },
  {
    term: 'Hill-Sphäre',
    text: 'Der Bereich um einen Körper, in dem seine Anziehung die Störung durch einen größeren Körper überwiegt. Monde bleiben nur weit innerhalb davon dauerhaft stabil (etwa 0,48 Hill-Radien).',
    link: ['kapitel-5', 'Kapitel 5'],
  },
  {
    term: 'Hohmann-Transfer',
    text: 'Der sparsamste Weg zwischen zwei Kreisbahnen: ein Schub, eine halbe Ellipse, ein zweiter Schub. So fliegt man im Spiel zum Mond.',
    link: ['rakete', 'Raketenwerft'],
  },
  {
    term: 'Integrator',
    text: 'Rechenverfahren, das die Bewegung Schritt für Schritt vorausberechnet, z. B. Euler, Velocity-Verlet oder Runge-Kutta 4.',
    link: ['methodik', 'Methodik'],
  },
  {
    term: 'Jacobi-Konstante',
    text: 'Eine Erhaltungsgröße im rotierenden Drei-Körper-System. Aus ihr folgt, welche Bereiche ein Körper nie erreichen kann – der Beweis, dass unser Mond gebunden bleibt.',
    link: ['kapitel-5', 'Kapitel 5'],
  },
  {
    term: 'Kepler-Gesetze',
    text: 'Planeten laufen auf Ellipsen, überstreichen in gleichen Zeiten gleiche Flächen, und T² ist proportional zu a³.',
    link: ['kapitel-2', 'Kapitel 2'],
  },
  {
    term: 'Lagrange-Punkte',
    text: 'Fünf Punkte, an denen ein kleiner Körper mit zwei großen mitlaufen kann. L4 und L5 sind stabil, L1 bis L3 instabil.',
    link: ['kapitel-4', 'Kapitel 4'],
  },
  {
    term: 'Periapsis (Pe)',
    text: 'Der tiefste, nächste Punkt einer Umlaufbahn. Liegt er in der Atmosphäre oder im Boden, endet die Bahn dort.',
    link: ['rakete', 'Raketenwerft'],
  },
  {
    term: 'Raketengleichung',
    text: 'Δv = I_sp·g₀·ln(m_voll/m_leer). Mehr Treibstoff hilft nur logarithmisch – deshalb gibt es Stufen.',
    link: ['rakete', 'Raketenwerft'],
  },
  {
    term: 'Roche-Grenze',
    text: 'Unterhalb dieses Abstands zerreißen die Gezeitenkräfte einen Mond, der nur durch seine eigene Schwerkraft zusammenhält. Für den Mond etwa 18.000 km.',
    link: ['kapitel-8', 'Kapitel 8'],
  },
  {
    term: 'Schalentheorem',
    text: 'Außerhalb einer kugelsymmetrischen Masse wirkt sie wie ein Punkt im Mittelpunkt. Voll oder hohl macht für die Bahn deshalb keinen Unterschied.',
    link: ['kapitel-7', 'Kapitel 7'],
  },
  {
    term: 'Schwerkraftwende',
    text: 'Die Rakete neigt sich nach dem Start langsam zur Seite, bis sie waagerecht fliegt – so geht am wenigsten Treibstoff gegen die Schwerkraft verloren.',
    link: ['rakete', 'Raketenwerft'],
  },
  {
    term: 'Spezifischer Impuls (I_sp)',
    text: 'Wie sparsam ein Triebwerk ist: je höher, desto mehr Schub pro Kilogramm Treibstoff.',
    link: ['rakete', 'Raketenwerft'],
  },
];

export function GlossaryPage() {
  return (
    <div class="stack" style={{ gap: '18px', maxWidth: '900px' }}>
      <PageHead eyebrow="Anhang" title="Begriffe von A bis Z">
        Die wichtigsten Fachwörter aus der Seminararbeit und den Spielen – kurz erklärt, mit Link
        zur passenden Stelle.
      </PageHead>
      <dl class="glossary">
        {TERMS.map((t) => (
          <div
            key={t.term}
            class="glossary-item"
            id={`begriff-${t.term.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-')}`}
          >
            <dt>{t.term}</dt>
            <dd>
              {t.text}
              {t.link && (
                <>
                  {' '}
                  <a href={`#${t.link[0]}`}>→ {t.link[1]}</a>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
