import { Equation, PageHead, SectionTitle } from '../ui/content';

const FORMULAS: { title: string; tex: string; note: string }[] = [
  {
    title: 'Gravitationsgesetz',
    tex: String.raw`F = G\,\frac{m_1 m_2}{r^2}`,
    note: 'G = 6,674 · 10⁻¹¹ m³/(kg s²)',
  },
  {
    title: 'Drittes Keplersches Gesetz',
    tex: String.raw`\frac{T^2}{a^3} = \frac{4\pi^2}{G(M+m)}`,
    note: 'liefert Massen aus Umlaufbahnen',
  },
  {
    title: 'Kreisbahn- und Fluchtgeschwindigkeit',
    tex: String.raw`v_K = \sqrt{\frac{GM}{r}},\qquad v_F = \sqrt2\,v_K`,
    note: 'Mond: 1,02 bzw. 1,45 km/s',
  },
  {
    title: 'Vis-viva-Gleichung',
    tex: String.raw`v^2 = GM\left(\frac2r-\frac1a\right)`,
    note: 'Geschwindigkeit auf einer Keplerbahn',
  },
  {
    title: 'Periapsis bei tangentialem Start',
    tex: String.raw`r_P = r_0\,\frac{f^2}{2-f^2}\quad (f<1)`,
    note: 'Absturzgrenze in Kapitel 6',
  },
  {
    title: 'Gezeitenbeschleunigung',
    tex: String.raw`a_\text{Gez} \approx \frac{2\,G M_\odot\, r}{d^3}`,
    note: 'maximal entlang der Linie Sonne–Erde',
  },
  {
    title: 'Hill-Radius',
    tex: String.raw`r_H = a\,\sqrt[3]{\frac{m}{3M}}`,
    note: 'Erde: ≈ 1,5 Mio. km',
  },
  {
    title: 'Stabilitätsgrenze (Domingos et al. 2006)',
    tex: String.raw`a_\text{krit} = 0{,}4895\,(1-1{,}0305\,e_P-0{,}2738\,e_M)\,r_H`,
    note: 'retrograd: 0,9309 (1 − 1,0764 e_P − 0,9812 e_M) r_H',
  },
  {
    title: 'Roche-Grenze (flüssig / starr)',
    tex: String.raw`d \approx 2{,}44\,R\,\sqrt[3]{\frac{\rho_P}{\rho_M}}\quad /\quad 1{,}26\,R\,\sqrt[3]{\frac{\rho_P}{\rho_M}}`,
    note: 'Erde–Mond: 18 365 km / 9 483 km',
  },
  {
    title: 'Effektives Potential (CR3BP)',
    tex: String.raw`\Omega = \frac{x^2+y^2}{2} + \frac{1-\mu}{r_1} + \frac{\mu}{r_2}`,
    note: 'normierte Einheiten',
  },
  {
    title: 'Jacobi-Konstante',
    tex: String.raw`C = 2\Omega - v^2`,
    note: 'Hill-stabil, wenn C > C(L1)',
  },
  {
    title: 'Lage von L1/L2 (Näherung)',
    tex: String.raw`r_{L1,L2} \approx d\,\sqrt[3]{\mu/3}`,
    note: 'identisch mit dem Hill-Radius',
  },
  {
    title: 'Routh-Kriterium für L4/L5',
    tex: String.raw`27\,\mu(1-\mu) < 1 \iff \mu < 0{,}0385`,
    note: '',
  },
  {
    title: 'Trägheitsmoment einer Hohlkugel',
    tex: String.raw`\frac{I}{MR^2} = \frac25\,\frac{1-q^5}{1-q^3},\quad q = \frac{r_\text{innen}}{R}`,
    note: 'Mond gemessen: 0,393',
  },
];

const SOURCES: { group: string; items: string[] }[] = [
  {
    group: 'Lehrbücher',
    items: [
      'Murray, C. D.; Dermott, S. F. (1999): Solar System Dynamics. Cambridge University Press. – Eingeschränktes Drei-Körper-Problem, Hill-Sphäre, Jacobi-Konstante, Lagrange-Punkte.',
      'Szebehely, V. (1967): Theory of Orbits – The Restricted Problem of Three Bodies. Academic Press.',
      'Meeus, J. (1998): Astronomical Algorithms. 2. Aufl., Willmann-Bell. – Bahnelemente und Störungen des Mondes.',
      'Hairer, E.; Lubich, C.; Wanner, G. (2006): Geometric Numerical Integration. 2. Aufl., Springer. – Symplektische Verfahren.',
    ],
  },
  {
    group: 'Fachartikel',
    items: [
      'Domingos, R. C.; Winter, O. C.; Yokoyama, T. (2006): Stable satellites around extrasolar giant planets. Monthly Notices of the Royal Astronomical Society 373, 1227–1234.',
      'Hamilton, D. P.; Burns, J. A. (1991): Orbital stability zones about asteroids. Icarus 92, 118–131.',
      'Gutzwiller, M. C. (1998): Moon–Earth–Sun: The oldest three-body problem. Reviews of Modern Physics 70, 589–639.',
      'Yoshida, H. (1990): Construction of higher order symplectic integrators. Physics Letters A 150, 262–268.',
      'Konopliv, A. S. et al. (1998): Improved gravity field of the Moon from Lunar Prospector. Science 281, 1476–1480. – Trägheitsmoment des Mondes.',
      'Williams, J. G. et al. (2014): Lunar interior properties from the GRAIL mission. Journal of Geophysical Research: Planets 119, 1546–1578.',
      'Weber, R. C. et al. (2011): Seismic detection of the lunar core. Science 331, 309–312.',
    ],
  },
  {
    group: 'Historische Quellen',
    items: [
      'Kepler, J. (1609): Astronomia nova; (1619): Harmonices mundi.',
      'Newton, I. (1687): Philosophiae Naturalis Principia Mathematica.',
      'Lagrange, J.-L. (1772): Essai sur le problème des trois corps.',
      'Routh, E. J. (1875): On Laplace’s three particles, with a supplement on the stability of steady motion. Proceedings of the London Mathematical Society 6, 86–97.',
      'Bertrand, J. (1873): Théorème relatif au mouvement d’un point attiré vers un centre fixe. Comptes Rendus 77, 849–853.',
      'Wassin, M.; Schtscherbakow, A. (1970): Ist der Mond eine Schöpfung außerirdischer Intelligenz? Sputnik (Zeitschrift), Moskau. – Ursprung der Hohlmond-These.',
    ],
  },
  {
    group: 'Daten',
    items: [
      'NASA Goddard Space Flight Center: Moon Fact Sheet, Earth Fact Sheet, Sun Fact Sheet (nssdc.gsfc.nasa.gov/planetary/factsheet).',
      'CODATA 2018: Gravitationskonstante G = 6,67430 · 10⁻¹¹ m³ kg⁻¹ s⁻².',
      'IAU 2012, Resolution B2: Astronomische Einheit 1 AE = 149 597 870 700 m.',
    ],
  },
];

export function SourcesPage() {
  return (
    <article class="chapter">
      <PageHead eyebrow="Anhang" title="Quellen & Formeln">
        Die wichtigsten Formeln auf einen Blick und die Literatur, auf der Theorie, Simulation und
        Daten beruhen.
      </PageHead>
      <SectionTitle n="B.1">Formelsammlung</SectionTitle>
      <div class="grid-2">
        {FORMULAS.map((f) => (
          <section class="panel panel-pad" key={f.title} style={{ gap: '4px' }}>
            <h3 style={{ fontSize: '0.95rem' }}>{f.title}</h3>
            <Equation tex={f.tex} />
            {f.note && <p class="small muted">{f.note}</p>}
          </section>
        ))}
      </div>
      <SectionTitle n="B.2">Literatur</SectionTitle>
      <div class="prose">
        {SOURCES.map((g) => (
          <section key={g.group} class="stack" style={{ gap: '8px' }}>
            <h3>{g.group}</h3>
            <ul>
              {g.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
        <SectionTitle n="B.3">Software</SectionTitle>
        <p>
          Das Orbitlabor ist in TypeScript geschrieben und läuft vollständig im Browser (Vite,
          Preact, KaTeX für Formeln). Der Quellcode der Physik liegt im Ordner{' '}
          <code>src/physics</code>, die automatischen Tests unter <code>tests</code>.
        </p>
      </div>
    </article>
  );
}
