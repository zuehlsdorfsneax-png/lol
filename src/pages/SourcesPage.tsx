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
    note: 'Absturzgrenze in Kapitel 8',
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

const OWN_SOURCES: { group: string; items: string[] }[] = [
  {
    group: 'Kapitel 2.3: Erde-Mond-Sonne-System',
    items: [
      "Laskar, J., Joutel, F. & Robutel, P. (1993): Stabilization of the Earth's obliquity by the Moon. In: Nature, Bd. 361, S. 615–617. https://www.nature.com/articles/361615a0(Zugriff: 27.08.2026)",
      'wissenschaft.de: Der überschätzte Mond. https://www.wissenschaft.de/erde-umwelt/der-ueberschaetzte-mond/(Zugriff: 27.08.2026)',
      'Welt der Physik (Deutsche Physikalische Gesellschaft): Leben auf der Erde auch ohne Mond möglich. http://www.weltderphysik.de/gebiet/astro/news/2011/leben-auf-der-erde-auch-ohne-mond-moeglich/(Zugriff: 27.08.2026)',
      'Welt der Physik (Deutsche Physikalische Gesellschaft): Der Mond – Trabant unserer Erde. https://www.weltderphysik.de/gebiet/universum/der-mond/(Zugriff: 27.08.2026)',
      'planet schule (SWR/WDR): Welche Wirkung hat das Sonnenlicht auf der Erde? https://www.planet-schule.de/mm/die-erde/Barrierefrei/pages/Die_Wirkung_von_Sonnenlicht.html(Zugriff: 27.08.2026)',
      'planet schule (SWR/WDR): Wattenmeer – Lebensräume im Meer. https://www.planet-schule.de/schwerpunkt/lebensraeume-im-meer/hintergrund-wattenmeer-100.html(Zugriff: 27.08.2026)',
      'Schutzstation Wattenmeer: Einführung Ökosystem Wattenmeer. https://www.schutzstation-wattenmeer.de/fileadmin/schutzstation/dokumente/Watt_f%C3%BCr_Fortgeschrittene/WfF_2_1_L_Einfuehrung_Oekosystem_Wattenmeer.pdf(Zugriff: 27.08.2026)',
      'Nationalpark Niedersächsisches Wattenmeer: Nationalpark Niedersächsisches Wattenmeer. https://wildnisindeutschland.de/gebiete/niedersaechsisches-wattenmeer/(Zugriff: 27.08.2026)',
      'Bundesverband Geothermie: Gezeitenreibung (Lexikoneintrag). https://www.geothermie.de/bibliothek/lexikon-der-geothermie/g/gezeitenreibung(Zugriff: 27.08.2026)',
      'lernhelfer (Duden): Sonnenfinsternisse. https://www.lernhelfer.de/schuelerlexikon/physik-abitur/artikel/sonnenfinsternisse(Zugriff: 27.08.2026)',
      'timeanddate.de: Wie genau sind unsere Finsternis-Zeiten? https://www.timeanddate.de/finsternis/genauigkeit(Zugriff: 27.08.2026)',
      'Wikipedia: Sonnenfinsternis. https://de.wikipedia.org/wiki/Sonnenfinsternis(Zugriff: 27.08.2026)',
    ],
  },
  {
    group: 'Kapitel 7.1: Ursprung der Hohle-Mond-These',
    items: [
      'Wikipedia (englisch): Hollow Moon. https://en.wikipedia.org/wiki/Hollow_Moon(Zugriff: 20.09.2026)',
      'Armagh Planetarium – Astronotes: Is the Moon Hollow? https://armaghplanet.com/is-the-moon-hollow.html(Zugriff: 20.09.2026)',
      'Skeptoid (Brian Dunning): Episode 776 – zum Ursprung des Hohle-Mond-Mythos. https://skeptoid.com/episodes/776(Zugriff: 20.09.2026)',
      'RationalWiki: Hollow Moon. https://rationalwiki.org/wiki/Hollow_Moon(Zugriff: 20.09.2026)',
      'Academic Block: The Hollow Moon Hypothesis. https://www.academicblock.com/science/fringe-science/hollow-moon-hypothesis(Zugriff: 20.09.2026)',
    ],
  },
  {
    group: 'Kapitel 7.2: Physikalische Argumente',
    items: [
      'Weber, R. C.: Interior of the Moon (NASA-Bericht). https://ntrs.nasa.gov/api/citations/20130013896/downloads/20130013896.pdf(Zugriff: 27.08.2026)',
      'HandWiki: Moment of inertia factor. https://handwiki.org/wiki/Astronomy:Moment_of_inertia_factor(Zugriff: 27.08.2026)',
      'ScienceDirect Topics: Lunar Interior. https://www.sciencedirect.com/topics/physics-and-astronomy/lunar-interior(Zugriff: 27.08.2026)',
      'Springer Nature Link: Aufbau und Stoffbestand des Mondes. https://link.springer.com/chapter/10.1007/978-3-642-87508-3_32(Zugriff: 27.08.2026)',
      'DLR: Der Mond / Die Entstehung des Mondes. https://solarsystem.dlr.de/mond/62-die-entstehung-des-mondes(Zugriff: 27.08.2026)',
      'der-mond.de: Der Mond – Basiswissen, Aufbau und Merkmale. https://www.der-mond.de/basiswissen/der-mond-basiswissen-aufbau-und-merkmale(Zugriff: 27.08.2026)',
      'SpaceDaily: Erklärung des „Klingelns" des Mondes nach Apollo-12-Einschlag. https://spacedaily.com/?p=764637(Zugriff: 27.08.2026)',
      'Popular Science: Does the Moon Sound Like a Bell? https://www.popsci.com/does-moon-sound-like-bell(Zugriff: 27.08.2026)',
      'Wikipedia (englisch): Hollow Moon. https://en.wikipedia.org/wiki/Hollow_Moon(Zugriff: 27.08.2026)',
      "Physics World: GRAIL mission peers beneath the Moon's fractured surface. https://physicsworld.com/a/grail-mission-peers-beneath-the-moons-fractured-surface/(Zugriff: 27.08.2026)",
      'MIT News: GRAIL reveals a battered lunar history. https://news.mit.edu/2012/grail-reveals-a-battered-lunar-history-1205(Zugriff: 27.08.2026)',
      'Uni Heidelberg: Astro 23/08 – Baryzentrum-Berechnung Erde-Mond (PDF). https://www.mathi.uni-heidelberg.de/~flemmermeyer/HA/astro-23-08.pdf(Zugriff: 27.08.2026)',
    ],
  },
  {
    group: 'Kapitel 7.3: Dichte und innerer Aufbau',
    items: [
      'NASA: Moon Fact Sheet. https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
      'NASA: Earth Fact Sheet. https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html',
      'Kiefer, W. S. et al. (2012): The density and porosity of lunar rocks. In: Geophysical Research Letters39. https://stars.library.ucf.edu/facultybib2010/2858',
      'Williams, J. G. & Dickey, J. O.: Lunar Geophysics, Geodesy, and Dynamics (NASA ILRS). https://ilrs.gsfc.nasa.gov/docs/williams_lw13.pdf',
      'Weber, R. C.: Interior of the Moon (NASA NTRS). https://ntrs.nasa.gov/api/citations/20130013896/downloads/20130013896.pdf',
      'Wieczorek, M. A. et al. (2013): The Crust of the Moon as Seen by GRAIL. In: Science339, S. 671–675. https://www.science.org/doi/10.1126/science.1231530',
      'Weber, R. C. et al. (2011): Seismic Detection of the Lunar Core. In: Science. https://www.science.org/doi/10.1126/science.1199375',
      'Astronomy.com: NASA research team reveals the Moon has earthlike core. https://www.astronomy.com/science/nasa-research-team-reveals-the-moon-has-earthlike-core/',
      "Phys.org: More evidence found showing the moon's inner core is solid, like Earth's (Briaud et al.,Nature2023). https://phys.org/news/2023-05-evidence-moon-core-solid-earth.html",
    ],
  },
  {
    group: 'Kapitel 7.4: Beobachtungen',
    items: [
      'NASA Apollo Flight Journal: Apollo 12, Day 7. https://www.nasa.gov/history/afj/ap12fj/19day7_rev44_tei.html',
      'Latham, G. et al.: Seismology of the Moon and Implications on Internal Structure (Cambridge University Press). https://doi.org/10.1017/S1539299600000101',
      'University of Notre Dame: Rumblings on the moon could be problematic for lunar base. https://news.nd.edu/news/rumblings-on-the-moon-could-be-problematic-for-lunar-base/',
      'Universe Today (NASA-Artikel): Watch Out for Moonquakes. https://www.universetoday.com/articles/watch-out-for-moonquakes',
      'SpaceDaily: Erklärung des „Klingelns" nach den Apollo-Einschlägen. https://spacedaily.com/?p=764637',
      'NASA Science: Moonquakes. https://science.nasa.gov/moon/moonquakes/',
      'Museum of the Earth: Lunar seismometer. https://www.museumoftheearth.org/lunar-seismometer',
      'Wikipedia (englisch): Hollow Moon. https://en.wikipedia.org/wiki/Hollow_Moon',
      'Lunar Laser Ranging Science (arXiv). https://arxiv.org/pdf/gr-qc/0411095',
      "Physics World: GRAIL mission peers beneath the Moon's fractured surface. https://physicsworld.com/a/grail-mission-peers-beneath-the-moons-fractured-surface/",
      'NASA JPL: Closer Look at Lunar Highland Crust (PIA16588). https://www.jpl.nasa.gov/images/pia16588-closer-look-at-lunar-highland-crust',
      'NASA: Allton, J. H.: Lunar Samples – Apollo Collection Tools. https://www.nasa.gov/wp-content/uploads/2019/04/02_allton_corrected_apollo.pdf',
      'National Academies (2019): Strategic Investments in Instrumentation and Facilities for Extraterrestrial Sample Curation and Analysis. https://www.nationalacademies.org/read/25312/chapter/4',
    ],
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
        <SectionTitle n="B.3">Quellen der Seminararbeit</SectionTitle>
        {OWN_SOURCES.map((g) => (
          <section key={g.group} class="stack" style={{ gap: '8px' }}>
            <h3>{g.group}</h3>
            <ul class="source-list">
              {g.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
        <SectionTitle n="B.4">Software</SectionTitle>
        <p>
          Das Orbitlabor ist in TypeScript geschrieben und läuft vollständig im Browser (Vite,
          Preact, KaTeX für Formeln). Der Quellcode der Physik liegt im Ordner{' '}
          <code>src/physics</code>, die automatischen Tests unter <code>tests</code>.
        </p>
      </div>
    </article>
  );
}
