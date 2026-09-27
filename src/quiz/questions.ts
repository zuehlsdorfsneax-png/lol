export interface Question {
  chapter: number;
  text: string;
  options: string[];
  /** Index der richtigen Antwort. */
  answer: number;
  explanation: string;
}

export const QUESTIONS: readonly Question[] = [
  {
    chapter: 7,
    text: 'Warum lässt sich aus der Mondbahn allein nicht entscheiden, ob der Mond hohl ist?',
    options: [
      'Weil die Bahn zu ungenau vermessen ist',
      'Weil außerhalb einer Kugel nur die Gesamtmasse zählt (Schalentheorem)',
      'Weil die Sonne die Bahn zu stark stört',
      'Weil ein hohler Mond eine andere Umlaufzeit hätte',
    ],
    answer: 1,
    explanation:
      'Nach Newtons Schalentheorem wirkt eine kugelsymmetrische Masse außen wie ein Punkt – voll oder hohl macht für die Bahn keinen Unterschied.',
  },
  {
    chapter: 7,
    text: 'Das gemessene Trägheitsmoment des Mondes ist k = 0,393. Was folgt daraus?',
    options: [
      'Der Mond ist hohl, denn k > 0',
      'Der Mond ist eine homogene Kugel (k = 0,4)',
      'Die Masse ist leicht zur Mitte hin konzentriert – das Gegenteil eines Hohlkörpers',
      'Man kann daraus nichts über das Innere schließen',
    ],
    answer: 2,
    explanation: 'Jede Hohlkugel hat k > 0,4. Werte unter 0,4 bedeuten einen dichteren Kern.',
  },
  {
    chapter: 7,
    text: 'Welche Dichte bräuchte eine 50 km dicke Mondschale ungefähr?',
    options: ['3,3 g/cm³', '8 g/cm³', '22 g/cm³', '39 g/cm³'],
    answer: 3,
    explanation:
      'Rund 39 g/cm³ – fast doppelt so dicht wie Osmium, das dichteste Element (22,6 g/cm³).',
  },
  {
    chapter: 2,
    text: 'Wie folgt das 1/r²-Gesetz aus dem dritten Keplerschen Gesetz?',
    options: [
      'Aus a_z = 4π²r/T² und T² ∝ r³ folgt a_z ∝ 1/r²',
      'Aus der Energieerhaltung',
      'Es folgt nicht daraus, sondern nur aus Experimenten mit Pendeln',
      'Aus dem ersten Keplerschen Gesetz allein',
    ],
    answer: 0,
    explanation:
      'Setzt man T² = C·r³ in die Zentripetalbeschleunigung 4π²r/T² ein, bleibt 4π²/(C·r²).',
  },
  {
    chapter: 2,
    text: 'Newtons Mondtest: Um welchen Faktor ist die Bahnbeschleunigung des Mondes kleiner als g?',
    options: ['60', '360', 'etwa 3 600', 'etwa 216 000'],
    answer: 2,
    explanation:
      'Der Mond ist rund 60 Erdradien entfernt; bei 1/r² ist die Beschleunigung also 60² ≈ 3 600-mal kleiner.',
  },
  {
    chapter: 2,
    text: 'Was passiert bei einem Kraftgesetz F ∝ 1/r³ mit einer fast kreisförmigen Bahn?',
    options: [
      'Sie ist eine geschlossene Ellipse',
      'Sie ist eine Rosette, bleibt aber gebunden',
      'Sie ist instabil: Absturz oder Flucht',
      'Sie ist immer ein exakter Kreis',
    ],
    answer: 2,
    explanation: 'Ab n = 3 gibt es keine stabilen Bahnen mehr – kleine Störungen wachsen an.',
  },
  {
    chapter: 3,
    text: 'Die Sonne zieht den Mond etwa 2,2-mal stärker an als die Erde. Warum reißt sie ihn nicht weg?',
    options: [
      'Weil die Erde schwerer ist als die Sonne',
      'Weil die Sonne Erde und Mond fast gleich stark anzieht; nur der kleine Unterschied stört',
      'Weil der Mond zu schnell ist',
      'Weil die Rechnung falsch ist – die Erde zieht stärker',
    ],
    answer: 1,
    explanation:
      'Erde und Mond fallen gemeinsam um die Sonne. Für die Relativbewegung zählt nur die Gezeitenbeschleunigung von rund 1 %.',
  },
  {
    chapter: 3,
    text: 'Wie lange braucht die Apsidenlinie der Mondbahn für eine volle Drehung?',
    options: ['27,3 Tage', '1 Jahr', '8,85 Jahre', '18,6 Jahre'],
    answer: 2,
    explanation:
      '8,85 Jahre. (18,6 Jahre dauert die Drehung der Knotenlinie.) Der Simulator liefert rund 8,8 Jahre.',
  },
  {
    chapter: 3,
    text: 'Wie sieht die Bahn des Mondes von der Sonne aus betrachtet aus?',
    options: [
      'Wie eine Schraubenlinie mit Schleifen',
      'Wie eine leicht gewellte Kurve, überall zur Sonne hin gekrümmt',
      'Wie ein Kreis um die Erde',
      'Wie eine gerade Linie',
    ],
    answer: 1,
    explanation:
      'Weil die Sonne den Mond stärker anzieht als die Erde, ist seine Bahn nirgends von der Sonne weg gekrümmt – keine Schleifen.',
  },
  {
    chapter: 4,
    text: 'Wo liegen die Lagrange-Punkte L4 und L5?',
    options: [
      'Auf der Verbindungslinie der beiden Körper',
      'An den Spitzen gleichseitiger Dreiecke mit den beiden Hauptkörpern',
      'Genau hinter dem kleineren Körper',
      'Im Schwerpunkt',
    ],
    answer: 1,
    explanation:
      'Aus ∂Ω/∂r₁ = ∂Ω/∂r₂ = 0 folgt r₁ = r₂ = 1: gleichseitige Dreiecke, unabhängig vom Massenverhältnis.',
  },
  {
    chapter: 4,
    text: 'Welche Lagrange-Punkte sind im System Sonne–Jupiter stabil?',
    options: ['Nur L1', 'L1, L2 und L3', 'L4 und L5', 'Alle fünf'],
    answer: 2,
    explanation:
      'L1–L3 sind Sattelpunkte und immer instabil. L4/L5 sind stabil, weil μ = 0,00095 unter der Routh-Grenze 0,0385 liegt.',
  },
  {
    chapter: 4,
    text: 'Warum sind L4 und L5 stabil, obwohl sie Maxima des effektiven Potentials sind?',
    options: [
      'Wegen der Reibung im Weltraum',
      'Weil die Coriolis-Kraft abdriftende Körper auf Bahnen um den Punkt lenkt',
      'Weil dort keine Gravitation wirkt',
      'Sie sind in Wirklichkeit Minima',
    ],
    answer: 1,
    explanation:
      'Die geschwindigkeitsabhängige Coriolis-Kraft macht aus dem Wegrollen eine Kreisbewegung um den Punkt – solange μ < 0,0385.',
  },
  {
    chapter: 5,
    text: 'Wie groß ist der Hill-Radius der Erde ungefähr?',
    options: ['38 000 km', '384 000 km', '1,5 Mio. km', '150 Mio. km'],
    answer: 2,
    explanation:
      'Hill-Radius = a·∛(m/3M) ≈ 1,5 Mio. km – der Mond kreist bei etwa einem Viertel davon.',
  },
  {
    chapter: 5,
    text: 'Was garantiert das Jacobi-Kriterium C_Mond > C(L1)?',
    options: [
      'Dass der Mond eine Kreisbahn hat',
      'Dass der Mond die Umgebung der Erde niemals verlassen kann',
      'Dass der Mond irgendwann abstürzt',
      'Dass die Sonne keinen Einfluss hat',
    ],
    answer: 1,
    explanation:
      'Die Nullgeschwindigkeitsfläche schließt die Erdumgebung vollständig ein – ein strenger Beweis der Hill-Stabilität (im Rahmen des eingeschränkten Drei-Körper-Problems).',
  },
  {
    chapter: 5,
    text: 'Bis zu welchem Abstand sind Monde laut Simulation stabil?',
    options: [
      'Prograd und retrograd bis zum Hill-Radius',
      'Prograd bis ≈ 0,48 Hill-Radien, retrograd bis ≈ 0,92',
      'Prograd bis ≈ 0,92 Hill-Radien, retrograd bis ≈ 0,48',
      'Nur bis zur Roche-Grenze',
    ],
    answer: 1,
    explanation:
      'Retrograde Monde sind fast doppelt so weit hinaus stabil – die Coriolis-Kraft zeigt bei ihnen zum Planeten.',
  },
  {
    chapter: 8,
    text: 'Wie viel seiner Geschwindigkeit müsste der Mond verlieren, um auf die Erde zu stürzen?',
    options: ['etwa 5 %', 'etwa 30 %', 'etwa 50 %', 'etwa 80 %'],
    answer: 3,
    explanation:
      'Erst unterhalb von 0,203 · v_Kreis liegt der erdnächste Punkt unter der Erdoberfläche; zerrissen würde er schon unter 0,30 · v_Kreis.',
  },
  {
    chapter: 8,
    text: 'Ab welcher Startgeschwindigkeit entkommt der Mond im System mit Sonne?',
    options: ['1,00 · v_Kreis', 'etwa 1,19 · v_Kreis', 'genau 1,414 · v_Kreis', 'etwa 2 · v_Kreis'],
    answer: 1,
    explanation:
      'Schon ab etwa 1,19 · v_Kreis reicht die Bahn über die Stabilitätsgrenze hinaus – die Sonne hilft beim Entkommen.',
  },
  {
    chapter: 8,
    text: 'Was würde mit unserem Mond passieren, wenn die Erde auf der Merkurbahn (0,39 AE) kreiste?',
    options: [
      'Nichts, er bliebe stabil',
      'Er würde auf die Erde stürzen',
      'Er würde verloren gehen, weil der Hill-Radius zu klein wäre',
      'Er würde in die Sonne stürzen',
    ],
    answer: 2,
    explanation:
      'Der Hill-Radius wäre nur 580 000 km; der Mond stünde bei 0,66 Hill-Radien – jenseits der Grenze von 0,48.',
  },
  {
    chapter: 8,
    text: 'Warum bauen Raketen mehrere Stufen?',
    options: [
      'Damit sie schöner aussehen',
      'Leere Tanks werden abgeworfen, die nächste Stufe beschleunigt weniger Masse – das Massenverhältnis m_voll/m_leer steigt',
      'Weil ein einzelnes Triebwerk nicht zünden kann',
      'Weil die Schwerkraft mit der Höhe zunimmt',
    ],
    answer: 1,
    explanation:
      'Nach der Raketengleichung Δv = I_sp·g₀·ln(m_voll/m_leer) wächst Δv nur logarithmisch mit dem Massenverhältnis. Stufen verbessern dieses Verhältnis für jeden Abschnitt.',
  },
  {
    chapter: 5,
    text: 'Im Raketenspiel ändert sich die vorhergesagte Bahn, sobald sie in einen bestimmten Bereich um den Mond kommt. Welcher ist das?',
    options: [
      'Die Roche-Grenze',
      'Die Hill-Sphäre des Mondes',
      'Die Atmosphäre',
      'Der Lagrange-Punkt L4',
    ],
    answer: 1,
    explanation:
      'Innerhalb der Hill-Sphäre zieht der Mond stärker an der Rakete als die Gezeitenwirkung der Erde – dieselbe Größe, die in Kapitel 5 die Stabilität unseres Mondes erklärt.',
  },
  {
    chapter: 2,
    text: 'Warum fällt eine Rakete in der Umlaufbahn nicht auf die Erde?',
    options: [
      'Im Weltraum gibt es keine Schwerkraft',
      'Sie fällt ständig, ist aber so schnell zur Seite unterwegs, dass die Erde unter ihr wegkrümmt',
      'Die Triebwerke laufen die ganze Zeit',
      'Der Mond hält sie fest',
    ],
    answer: 1,
    explanation:
      'Eine Umlaufbahn ist ein endloser Fall. Die Schwerkraft liefert genau die Zentripetalkraft – wie beim Mond selbst.',
  },
];
