import { useMemo, useState } from 'preact/hooks';
import {
  AU,
  EARTH,
  EARTH_HILL_RADIUS,
  G,
  KM,
  MOON,
  REAL_PARAMS,
  SUN,
  buildScenario,
  criticalMoonDistance,
  hillRadius,
  jacobiCheck,
} from '../../physics';
import { LagrangeCanvas } from '../../lagrange/LagrangeCanvas';
import {
  Callout,
  Equation,
  Figure,
  LinkButton,
  SectionTitle,
  StatusChip,
  Tex,
} from '../../ui/content';
import { Segmented, Slider } from '../../ui/controls';
import { distance, fmt, sig } from '../../ui/format';

const PLANETS_HILL = [
  { name: 'Merkur', m: 0.0553, a: 0.387 },
  { name: 'Venus', m: 0.815, a: 0.723 },
  { name: 'Erde', m: 1, a: 1 },
  { name: 'Mars', m: 0.107, a: 1.524 },
  { name: 'Jupiter', m: 317.8, a: 5.203 },
  { name: 'Saturn', m: 95.16, a: 9.537 },
  { name: 'Uranus', m: 14.54, a: 19.19 },
  { name: 'Neptun', m: 17.15, a: 30.07 },
];

export function Chapter5() {
  const rh = EARTH_HILL_RADIUS;
  const moonFrac = MOON.semiMajorAxis / rh;
  return (
    <>
      <div class="prose">
        <SectionTitle n="5.1">Definition und physikalische Bedeutung</SectionTitle>
        <p>
          Die Sonne ist rund 390-mal weiter von der Erde entfernt als der Mond. Solche
          <strong> hierarchischen</strong> Drei-Körper-Systeme – ein enges Paar, weit entfernt ein
          dritter Körper – sind oft über sehr lange Zeiten stabil, während Systeme mit ähnlichen
          Abständen meist chaotisch zerfallen. Wie in Kapitel 3 gezeigt, stört die Sonne die
          Mondbahn nur mit etwa 1 % der Erdanziehung. Drei Überlegungen machen genau, warum das
          reicht.
        </p>

        <SectionTitle n="5.2">Herleitung des Hill-Radius</SectionTitle>
        <p>
          Wie weit reicht die „Herrschaft“ der Erde? Im mitrotierenden System wirken auf einen
          Körper auf der Linie Sonne–Erde im Abstand <Tex>r</Tex> von der Erde die Gezeitenkraft der
          Sonne und die Zentrifugalkraft, zusammen <Tex>{String.raw`3\,GM_\odot\, r/d^3`}</Tex>.
          Setzt man sie der Anziehung der Erde gleich, erhält man den <strong>Hill-Radius</strong>:
        </p>
        <Equation
          tex={String.raw`\frac{G M_\oplus}{r_H^2} = \frac{3\,G M_\odot\, r_H}{d^3}\quad\Rightarrow\quad r_H = d\,\sqrt[3]{\frac{M_\oplus}{3 M_\odot}} \approx 1{,}5\ \text{Mio. km}.`}
          n="5.1"
        />
        <p>
          Er stimmt mit dem Abstand von L1 und L2 überein (Kapitel 4). Der Mond kreist bei{' '}
          <strong>
            {fmt(moonFrac, 3)} r<sub>H</sub>
          </strong>
          . Dort ist die Anziehung der Erde rund {fmt(1 / ((3 * moonFrac ** 3) / 1), 0)}-mal stärker
          als die störende Gezeitenwirkung der Sonne (sie wächst mit <Tex>r^3</Tex>, die
          Erdanziehung fällt mit <Tex>{'1/r^2'}</Tex>).
        </p>
      </div>

      <Figure
        n="5.1"
        caption="Hill-Radien der Planeten nach (5.1) und ein eigener Rechner. Der Hill-Radius wächst linear mit dem Abstand zur Sonne und mit der dritten Wurzel aus der Planetenmasse."
      >
        <HillCalculator />
      </Figure>

      <div class="prose">
        <SectionTitle n="5.3">
          Die Hill-Sphäre als Stabilitätsgrenze: das Jacobi-Kriterium
        </SectionTitle>
        <p>
          Die Jacobi-Konstante aus Kapitel 4 liefert einen echten mathematischen Beweis. Betrachtet
          man Sonne und Erde als Hauptkörper auf einer Kreisbahn und den Mond als leichten dritten
          Körper, gilt: Ist <Tex>{String.raw`C_\text{Mond} > C(L_1)`}</Tex>, dann ist die erlaubte
          Region um die Erde vollständig von einer verbotenen Zone umschlossen. Der Mond kann die
          Umgebung der Erde <strong>niemals</strong> verlassen – egal wie lange man wartet. Man
          nennt das
          <em> Hill-Stabilität</em>.
        </p>
        <p>
          Für den heutigen Mond ergibt sich{' '}
          <Tex>{String.raw`C = 3{,}00131 > C(L_1) = 3{,}00089`}</Tex>. Der Mond ist also beweisbar
          an die Erde gebunden (im Rahmen der Näherung). Abb. 5.2 zeigt die
          Nullgeschwindigkeitskurve für verschiedene Mondbahnen.
        </p>
      </div>

      <Figure
        n="5.2"
        caption="Nullgeschwindigkeitskurven um die Erde (Sonne links, weit außerhalb des Bildes). Dunkel: für den Mond verbotenes Gebiet. Bleibt das Gebiet um die Erde geschlossen, ist der Mond für immer gebunden."
      >
        <MoonJacobi />
      </Figure>

      <div class="prose">
        <SectionTitle n="5.4">Bedingungen für das Verlassen des Erde-Mond-Systems</SectionTitle>
        <p>
          Das Jacobi-Kriterium ist <em>hinreichend</em>, aber nicht <em>notwendig</em>: Auch Monde
          mit <Tex>{String.raw`C < C(L_1)`}</Tex> können stabil sein, wenn sie das offene Tor
          einfach nie treffen. Die tatsächliche Grenze lässt sich nur numerisch bestimmen. Domingos,
          Winter und Yokoyama (2006) fanden in umfangreichen Simulationen:
        </p>
        <Equation
          tex={String.raw`a_\text{krit} \approx 0{,}49\,(1 - 1{,}03\,e_P - 0{,}27\,e_M)\,r_H\ \text{(prograd)},\qquad a_\text{krit} \approx 0{,}93\,(1 - 1{,}08\,e_P - 0{,}98\,e_M)\,r_H\ \text{(retrograd)}.`}
          n="5.2"
        />
        <p>
          Der Simulator bestätigt das: Kreisbahnen um die Erde bleiben prograd bis{' '}
          <strong>
            0,478 r<sub>H</sub>
          </strong>{' '}
          und retrograd bis{' '}
          <strong>
            0,923 r<sub>H</sub>
          </strong>{' '}
          stabil (30 Jahre, Skript <code>npm run calibrate</code>). Der Mond hat also fast die
          doppelte Sicherheitsreserve.
        </p>
        <p>
          Warum sind rückläufige Monde so viel stabiler? Im mitrotierenden System wirkt auf einen
          bewegten Körper die Coriolis-Kraft <Tex>{String.raw`-2\,\vec\omega\times\vec v`}</Tex>.
          Für einen prograden Mond zeigt sie von der Erde <em>weg</em> und schwächt die Bindung; für
          einen retrograden Mond zeigt sie zur Erde <em>hin</em> und hält ihn zusätzlich fest.
          Außerdem wechselt ein retrograder Mond schneller zwischen den Stellungen zur Sonne, sodass
          sich die Störungen eher ausmitteln.
        </p>

        <SectionTitle n="5.5">Und in ferner Zukunft?</SectionTitle>
        <p>
          Die Gezeitenreibung bremst die Erdrotation und schiebt den Mond nach außen – heute um 3,8
          cm pro Jahr (gemessen mit Laserreflektoren). Das endet, wenn ein Erdtag so lang ist wie
          ein Monat. Aus der Erhaltung des Drehimpulses von Erdrotation und Mondbahn folgt dafür ein
          Abstand von etwa 555.000 km. Das sind rund{' '}
          <strong>
            0,37 r<sub>H</sub>
          </strong>{' '}
          – immer noch deutlich innerhalb der Stabilitätsgrenze. Dieser Zustand würde erst in vielen
          Milliarden Jahren erreicht, lange nachdem sich die Sonne zum Roten Riesen aufgebläht hat.
        </p>
      </div>

      <Callout kind="merke">
        Der Mond ist stabil, weil er (1) bei nur einem Viertel des Hill-Radius kreist, wo die Erde
        die Sonne um fast das Hundertfache übertrifft, (2) seine Jacobi-Konstante größer als C(L1)
        ist und die Erdumgebung damit beweisbar geschlossen bleibt, und (3) die numerisch bestimmte
        Stabilitätsgrenze bei 0,48 r<sub>H</sub> fast doppelt so weit außen liegt.
      </Callout>

      <div class="btn-row">
        <LinkButton to="sim-teilchen" primary>
          Teilchenwolke: Grenze sichtbar machen
        </LinkButton>
        <LinkButton to="sim-teilchen-retro">Dasselbe retrograd</LinkButton>
        <LinkButton to="sim-grenze">
          Mond bei 0,45 r<sub>H</sub>
        </LinkButton>
      </div>
    </>
  );
}

function HillCalculator() {
  const [star, setStar] = useState(1);
  const [planet, setPlanet] = useState(1);
  const [a, setA] = useState(1);
  const r = hillRadius(a * AU, planet * EARTH.mass, star * SUN.mass);
  const pro = criticalMoonDistance(false, 0, 0) * r;
  const retro = criticalMoonDistance(true, 0, 0) * r;
  return (
    <div class="grid-2">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Planet</th>
              <th class="num">Masse (M⊕)</th>
              <th class="num">a (AE)</th>
              <th class="num">Hill-Radius</th>
            </tr>
          </thead>
          <tbody>
            {PLANETS_HILL.map((p) => (
              <tr key={p.name}>
                <td>{p.name}</td>
                <td class="num">{sig(p.m, 3)}</td>
                <td class="num">{sig(p.a, 3)}</td>
                <td class="num">
                  {fmt(hillRadius(p.a * AU, p.m * EARTH.mass, SUN.mass) / 1e9, 2)} Mio. km
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div class="stack">
        <Slider
          id="hill-star"
          label="Sternmasse"
          value={star}
          min={0.1}
          max={20}
          log
          format={(v) => `${sig(v, 2)} M☉`}
          onChange={setStar}
        />
        <Slider
          id="hill-planet"
          label="Planetenmasse"
          value={planet}
          min={0.01}
          max={1000}
          log
          format={(v) => `${sig(v, 2)} M⊕`}
          onChange={setPlanet}
        />
        <Slider
          id="hill-a"
          label="Abstand zum Stern"
          value={a}
          min={0.05}
          max={40}
          log
          format={(v) => `${sig(v, 3)} AE`}
          onChange={setA}
        />
        <dl class="kv">
          <dt>Hill-Radius</dt>
          <dd>{distance(r)}</dd>
          <dt>
            Stabil prograd bis ≈ 0,49 r<sub>H</sub>
          </dt>
          <dd>{distance(pro)}</dd>
          <dt>
            Stabil retrograd bis ≈ 0,93 r<sub>H</sub>
          </dt>
          <dd>{distance(retro)}</dd>
          <dt>Unser Mond (384.400 km) läge bei</dt>
          <dd>
            {fmt(MOON.semiMajorAxis / r, 2)} r<sub>H</sub>
          </dd>
        </dl>
        <StatusChip
          status={MOON.semiMajorAxis < pro ? 'ok' : MOON.semiMajorAxis < retro ? 'warn' : 'fail'}
        >
          {MOON.semiMajorAxis < pro
            ? 'Ein Mond wie unserer wäre hier stabil'
            : MOON.semiMajorAxis < retro
              ? 'Nur retrograd stabil'
              : 'Ein Mond wie unserer ginge verloren'}
        </StatusChip>
      </div>
    </div>
  );
}

function MoonJacobi() {
  const [dist, setDist] = useState(384_400);
  const [speed, setSpeed] = useState(1);
  const [dir, setDir] = useState<'pro' | 'retro'>('pro');
  const mu = EARTH.mass / (EARTH.mass + SUN.mass);
  const check = useMemo(() => {
    const s = buildScenario({
      ...REAL_PARAMS,
      earthEccentricity: 0,
      earthOrbit: 1,
      moonDistance: dist,
      moonSpeed: speed,
      moonRetrograde: dir === 'retro',
      moonAngle: 90,
    });
    const b = (i: number) => s.bodies[i]!;
    const sun = b(s.indices.sun);
    const earth = b(s.indices.earth);
    return jacobiCheck(G * (sun.mass + earth.mass), mu, sun, earth, b(s.indices.moon));
  }, [dist, speed, dir]);
  const rhN = Math.cbrt(mu / 3);
  const view = { cx: 1 - mu, cy: 0, half: 2.4 * rhN };
  const rN = (dist * KM) / AU;
  return (
    <div class="stack" style={{ gap: '14px' }}>
      <LagrangeCanvas
        mu={mu}
        view={view}
        forbiddenC={check.C}
        heat={false}
        contours
        bodyLabels={['Sonne', 'Erde']}
        label="Nullgeschwindigkeitskurve des Mondes um die Erde"
        overlay={(ctx, toScreen, scale) => {
          const [ex, ey] = toScreen(1 - mu, 0);
          ctx.strokeStyle = '#8f84ff';
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(ex, ey, rhN * scale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          const [mx, my] = toScreen(1 - mu, rN);
          ctx.fillStyle = '#d8dce6';
          ctx.beginPath();
          ctx.arc(mx, my, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#dfe5f5';
          ctx.font = '12px Jost, system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('Mond', mx + 8, my - 6);
          ctx.fillStyle = '#8f84ff';
          ctx.fillText('Hill-Radius', ex + rhN * scale * 0.72, ey - rhN * scale * 0.72);
        }}
      />
      <div class="grid-2">
        <div class="stack">
          <Slider
            id="jac-dist"
            label="Mondabstand"
            value={dist}
            min={100_000}
            max={1_500_000}
            log
            format={(v) => `${fmt(v)} km`}
            hint={`= ${fmt((dist * KM) / EARTH_HILL_RADIUS, 2)} Hill-Radien`}
            onChange={(v) => setDist(Math.round(v / 1000) * 1000)}
          />
          <Slider
            id="jac-speed"
            label="Geschwindigkeit (× vₖ, Kreisbahntempo)"
            value={speed}
            min={0.5}
            max={1.5}
            step={0.01}
            format={(v) => fmt(v, 2)}
            onChange={setSpeed}
          />
          <Segmented
            label="Umlaufrichtung"
            value={dir}
            options={[
              { value: 'pro', label: 'prograd' },
              { value: 'retro', label: 'retrograd' },
            ]}
            onChange={setDir}
          />
        </div>
        <div class="stack">
          <dl class="kv">
            <dt>Jacobi-Konstante des Mondes</dt>
            <dd>{fmt(check.C, 6)}</dd>
            <dt>C(L1)</dt>
            <dd>{fmt(check.CL1, 6)}</dd>
            <dt>Differenz</dt>
            <dd>{fmt((check.C - check.CL1) * 1e4, 2)} · 10⁻⁴</dd>
          </dl>
          <StatusChip status={check.trapped ? 'ok' : 'warn'}>
            {check.trapped
              ? 'Tor bei L1 geschlossen: beweisbar gebunden'
              : 'Tor offen: Flucht möglich, aber nicht sicher'}
          </StatusChip>
          <p class="small muted">
            Probiere den heutigen Mond retrograd: Er ist trotzdem stabil, obwohl das Kriterium knapp
            wird – das Jacobi-Kriterium ist streng, aber vorsichtig.
          </p>
        </div>
      </div>
    </div>
  );
}
