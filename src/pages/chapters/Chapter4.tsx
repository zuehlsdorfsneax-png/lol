import { useMemo, useState } from 'preact/hooks';
import { ROUTH_MU, lagrangePoints, hillApproximation, EARTH, SUN, AU } from '../../physics';
import { lagrangeLevels } from '../../lagrange/field';
import { LagrangeCanvas } from '../../lagrange/LagrangeCanvas';
import { StabilityTable } from '../../lagrange/StabilityTable';
import { SYSTEMS, findSystem } from '../../lagrange/systems';
import { Callout, Equation, Figure, LinkButton, SectionTitle, Tex } from '../../ui/content';
import { Segmented, Slider } from '../../ui/controls';
import { fmt, km, sig } from '../../ui/format';

export function Chapter4() {
  const muSE = EARTH.mass / (EARTH.mass + SUN.mass);
  const l1 = lagrangePoints(muSE)[0]!;
  return (
    <>
      <div class="prose">
        <SectionTitle n="4.1">Definition der Lagrange-Punkte</SectionTitle>
        <p>
          Wir betrachten das <strong>eingeschränkte Drei-Körper-Problem</strong>: Zwei Hauptkörper
          (Massen <Tex>{'m_1 > m_2'}</Tex>) umkreisen einander auf Kreisbahnen, ein dritter Körper
          ist so leicht, dass er sie nicht beeinflusst. In einem Koordinatensystem, das sich mit den
          beiden Hauptkörpern mitdreht, stehen diese still. Mit normierten Einheiten (Abstand 1,
          Gesamtmasse 1, Winkelgeschwindigkeit 1) und <Tex>{String.raw`\mu = m_2/(m_1+m_2)`}</Tex>{' '}
          liegen sie bei <Tex>{'(-\\mu, 0)'}</Tex> und <Tex>{'(1-\\mu, 0)'}</Tex>. Die Bewegung des
          dritten Körpers gehorcht dann
        </p>
        <Equation
          tex={String.raw`\ddot x - 2\dot y = \frac{\partial\Omega}{\partial x},\qquad \ddot y + 2\dot x = \frac{\partial\Omega}{\partial y},\qquad \Omega = \frac{x^2+y^2}{2} + \frac{1-\mu}{r_1} + \frac{\mu}{r_2}.`}
          n="4.1"
        />
        <p>
          Das <strong>effektive Potential</strong> <Tex>{'-\\Omega'}</Tex> enthält die Gravitation
          beider Körper und die Zentrifugalkraft. Die Terme{' '}
          <Tex>{'\\mp 2\\dot y, \\pm 2\\dot x'}</Tex> sind die Coriolis-Kraft; sie hängt von der
          Geschwindigkeit ab und spielt für die Stabilität eine überraschende Rolle.
        </p>

        <SectionTitle n="4.2">Die Punkte L1 bis L5</SectionTitle>
        <p>
          Ein Körper, der im rotierenden System ruht (
          <Tex>{String.raw`\dot x=\dot y=\ddot x=\ddot y=0`}</Tex>), bleibt nach (4.1) genau dann in
          Ruhe, wenn <Tex>{String.raw`\nabla\Omega = 0`}</Tex> gilt. Dort heben sich Gravitation
          beider Körper und Zentrifugalkraft auf. Es gibt genau fünf solche Punkte – die
          Lagrange-Punkte (Euler 1767, Lagrange 1772).
        </p>
      </div>

      <Callout kind="beweis" title="Beweis: L4 und L5 bilden gleichseitige Dreiecke">
        <p>
          Mit <Tex>{String.raw`r_1^2 = (x+\mu)^2+y^2`}</Tex> und{' '}
          <Tex>{String.raw`r_2^2 = (x-1+\mu)^2+y^2`}</Tex> rechnet man nach:
        </p>
        <Equation tex={String.raw`(1-\mu)\,r_1^2 + \mu\,r_2^2 = x^2+y^2+\mu(1-\mu).`} n="4.2" />
        <p>Damit lässt sich Ω allein durch die beiden Abstände ausdrücken:</p>
        <Equation
          tex={String.raw`\Omega = (1-\mu)\left(\frac{r_1^2}{2}+\frac{1}{r_1}\right) + \mu\left(\frac{r_2^2}{2}+\frac{1}{r_2}\right) - \frac{\mu(1-\mu)}{2}.`}
          n="4.3"
        />
        <p>
          Abseits der x-Achse sind <Tex>{'r_1'}</Tex> und <Tex>{'r_2'}</Tex> unabhängige
          Koordinaten. Der Gradient verschwindet also genau dann, wenn beide Ableitungen null sind:
        </p>
        <Equation
          tex={String.raw`\frac{\partial\Omega}{\partial r_1} = (1-\mu)\left(r_1 - \frac{1}{r_1^2}\right) = 0 \;\Rightarrow\; r_1 = 1,\qquad \text{ebenso}\quad r_2 = 1.`}
          n="4.4"
        />
        <p>
          Der Punkt ist von beiden Hauptkörpern genau so weit entfernt wie diese voneinander: Die
          drei Körper bilden ein gleichseitiges Dreieck – unabhängig vom Massenverhältnis μ. ∎
        </p>
      </Callout>

      <div class="prose">
        <SectionTitle n="4.2.1">L1, L2 und L3 auf der Verbindungslinie</SectionTitle>
        <p>
          Auf der x-Achse ist <Tex>{String.raw`\partial\Omega/\partial y = 0`}</Tex> automatisch
          erfüllt. Die Bedingung <Tex>{String.raw`\partial\Omega/\partial x = 0`}</Tex> führt auf
          eine Gleichung fünften Grades ohne geschlossene Lösungsformel; der Simulator löst sie
          numerisch (Bisektionsverfahren). Für kleine μ liegen L1 und L2 näherungsweise im Abstand
        </p>
        <Equation tex={String.raw`r_{L1,L2} \approx d\,\sqrt[3]{\frac{\mu}{3}}`} n="4.5" />
        <p>
          vom kleineren Körper – das ist der Hill-Radius aus Kapitel 5. Für Sonne und Erde ergibt
          die exakte Rechnung {km(Math.abs(l1.x - (1 - muSE)) * AU)} (Näherung:{' '}
          {km(hillApproximation(muSE) * AU)}).
        </p>

        <SectionTitle n="4.3">Stabile und instabile Gleichgewichtspunkte</SectionTitle>
        <p>
          Für kleine Abweichungen <Tex>{'(\\xi, \\eta)'}</Tex> vom Gleichgewicht linearisiert man
          (4.1) mit den zweiten Ableitungen{' '}
          <Tex>{String.raw`\Omega_{xx},\Omega_{yy},\Omega_{xy}`}</Tex>. Der Ansatz{' '}
          <Tex>{String.raw`\xi,\eta\propto e^{\lambda t}`}</Tex> ergibt die charakteristische
          Gleichung
        </p>
        <Equation
          tex={String.raw`\lambda^4 + \left(4-\Omega_{xx}-\Omega_{yy}\right)\lambda^2 + \Omega_{xx}\Omega_{yy}-\Omega_{xy}^2 = 0.`}
          n="4.6"
        />
        <p>
          Hat ein Eigenwert λ einen positiven Realteil, wächst jede Abweichung exponentiell –{' '}
          <strong>instabil</strong>. Sind alle λ rein imaginär, pendelt der Körper um den Punkt –{' '}
          <strong>stabil</strong>. Für L1–L3 ist <Tex>{String.raw`\Omega_{xx}>0>\Omega_{yy}`}</Tex>,
          das konstante Glied negativ und damit ein λ² positiv: Sattelpunkte, immer instabil. An
          L4/L5 gilt{' '}
          <Tex>{String.raw`\Omega_{xx}=\tfrac34,\ \Omega_{yy}=\tfrac94,\ \Omega_{xy}=\pm\tfrac{3\sqrt3}{4}(1-2\mu)`}</Tex>
          , also
        </p>
        <Equation
          tex={String.raw`\lambda^4 + \lambda^2 + \tfrac{27}{4}\mu(1-\mu) = 0\quad\Rightarrow\quad \text{stabil} \iff 27\,\mu(1-\mu) \le 1 \iff \mu \le 0{,}0385.`}
          n="4.7"
        />
        <p>
          Das ist das <strong>Routh-Kriterium</strong> (1875). Bemerkenswert: L4 und L5 sind
          <em> Maxima</em> des effektiven Potentials – ein Ball würde vom Gipfel rollen. Stabil
          werden sie erst durch die Coriolis-Kraft, die ein wegrollendes Teilchen auf eine Bahn um
          den Punkt umlenkt.
        </p>
      </div>

      <Figure
        n="4.1"
        caption="Stabilitätsanalyse der fünf Lagrange-Punkte. Mit dem Regler lässt sich das Massenverhältnis verändern: Oberhalb von μ = 0,0385 werden auch L4 und L5 instabil."
      >
        <StabilityExplorer />
      </Figure>

      <div class="prose">
        <SectionTitle n="4.4">Bedeutung für die Bahnstabilität: Jacobi-Konstante</SectionTitle>
        <p>
          Multipliziert man (4.1) mit der Geschwindigkeit und integriert, erhält man eine
          Erhaltungsgröße:
        </p>
        <Equation
          tex={String.raw`C = 2\,\Omega(x,y) - \left(\dot x^2+\dot y^2\right) = \text{konst.}`}
          n="4.8"
        />
        <p>
          Weil <Tex>{String.raw`\dot x^2+\dot y^2 \ge 0`}</Tex> ist, kann ein Körper mit der
          Jacobi-Konstante <Tex>C</Tex> nur Orte mit <Tex>{String.raw`2\Omega(x,y)\ge C`}</Tex>{' '}
          erreichen. Die Grenzen heißen <strong>Nullgeschwindigkeitskurven</strong>. Für großes{' '}
          <Tex>C</Tex> sind die erlaubten Gebiete um die beiden Körper getrennt. Sinkt <Tex>C</Tex>{' '}
          unter <Tex>{'C(L_1)'}</Tex>, öffnet sich zwischen ihnen ein Tor bei L1, unter{' '}
          <Tex>{'C(L_2)'}</Tex> eines nach außen. Genau diese Tore entscheiden in Kapitel 5 und 8,
          ob ein Mond seinem Planeten entkommen kann.
        </p>
      </div>

      <Figure
        n="4.2"
        caption="Nullgeschwindigkeitskurven: Dunkel ist der Bereich, den ein Körper mit der gewählten Jacobi-Konstante nie erreichen kann. Die gelben Linien markieren C(L1), C(L2) und C(L3)."
      >
        <ZeroVelocityExplorer />
      </Figure>

      <div class="prose">
        <SectionTitle n="4.5">Lagrange-Punkte in der Praxis</SectionTitle>
        <ul>
          <li>
            <strong>Sonne–Erde L1</strong> (1,5 Mio. km sonnenwärts): Sonnenobservatorium SOHO, seit
            1996. Weil L1 instabil ist, braucht die Sonde regelmäßige Bahnkorrekturen.
          </li>
          <li>
            <strong>Sonne–Erde L2</strong>: James-Webb-Weltraumteleskop und Gaia. Erde, Mond und
            Sonne stehen von dort aus in einer Richtung – ideal, um sich gegen ihre Wärme
            abzuschirmen.
          </li>
          <li>
            <strong>Sonne–Jupiter L4/L5</strong>: die Trojaner-Asteroiden, die Jupiter um 60°
            voraus- bzw. hinterherlaufen. Die NASA-Sonde Lucy besucht einige von ihnen.
          </li>
          <li>
            <strong>Sonne–Erde L4</strong>: der Asteroid 2010 TK7 ist ein Erd-Trojaner.
          </li>
          <li>
            <strong>Pluto–Charon</strong>: Mit μ ≈ 0,11 ist das Routh-Kriterium verletzt – dort gibt
            es keine stabilen Trojaner.
          </li>
        </ul>
      </div>
      <div class="btn-row">
        <LinkButton to="lagrange-labor" primary>
          Im Lagrange-Labor ausprobieren
        </LinkButton>
        <LinkButton to="mission-l1">Mission: L1-Station halten</LinkButton>
        <LinkButton to="mission-trojaner">Mission: Trojaner</LinkButton>
      </div>
    </>
  );
}

function StabilityExplorer() {
  const [mu, setMu] = useState(SYSTEMS[0]!.mu);
  return (
    <div class="stack" style={{ gap: '14px' }}>
      <Slider
        id="stab-mu"
        label="Massenverhältnis μ"
        value={mu}
        min={1e-6}
        max={0.5}
        log
        format={(v) => sig(v, 3)}
        hint={`Erde–Mond: 0,0121 · Sonne–Jupiter: 0,000954 · Pluto–Charon: 0,108 · Routh-Grenze: ${fmt(ROUTH_MU, 4)}`}
        onChange={setMu}
      />
      <div class="btn-row">
        {SYSTEMS.map((s) => (
          <button key={s.id} type="button" class="btn small" onClick={() => setMu(s.mu)}>
            {s.name}
          </button>
        ))}
      </div>
      <StabilityTable mu={mu} secondary="m₂" />
    </div>
  );
}

function ZeroVelocityExplorer() {
  const [systemId, setSystemId] = useState('erde-mond');
  const system = findSystem(systemId);
  const mu = system.mu;
  const levels = useMemo(() => lagrangeLevels(mu), [mu]);
  const cL1 = levels[0]!.C;
  const cL4 = levels[3]!.C;
  const [rel, setRel] = useState(1.02);
  // Regler von knapp unter C(L4) bis deutlich über C(L1), relativ zur Spanne.
  const C = cL4 + (cL1 - cL4) * rel;
  const open = levels
    .slice(0, 4)
    .filter((l) => C < l.C)
    .map((l) => l.name);
  const view =
    mu < 1e-3
      ? { cx: 1 - mu, cy: 0, half: Math.max(5 * Math.cbrt(mu / 3), 0.03) }
      : { cx: 0.1, cy: 0, half: 1.55 };
  return (
    <div class="stack" style={{ gap: '14px' }}>
      <Segmented
        label="System"
        value={systemId}
        options={SYSTEMS.filter((s) => s.id !== 'pluto-charon').map((s) => ({
          value: s.id,
          label: s.name,
        }))}
        onChange={setSystemId}
      />
      <LagrangeCanvas
        mu={mu}
        view={view}
        forbiddenC={C}
        bodyLabels={system.labels}
        shape="wide"
        label="Nullgeschwindigkeitskurven im rotierenden System"
      />
      <Slider
        id="jacobi-level"
        label="Jacobi-Konstante C"
        value={rel}
        min={-0.05}
        max={1.3}
        step={0.005}
        format={() => fmt(C, 5)}
        hint={`C(L1) = ${fmt(cL1, 5)} · C(L2) = ${fmt(levels[1]!.C, 5)} · C(L3) = ${fmt(levels[2]!.C, 5)} · C(L4) = ${fmt(cL4, 5)}`}
        onChange={setRel}
      />
      <p class="small">
        {open.length === 0
          ? `Alle Tore geschlossen: Ein Körper nahe ${system.labels[1]} bleibt für immer dort.`
          : `Offen: ${open.join(', ')}. ${open.includes('L1') ? `Über L1 kann ein Körper zwischen ${system.labels[0]} und ${system.labels[1]} wechseln.` : ''} ${open.includes('L2') ? 'Über L2 kann er nach außen entkommen.' : ''}`}
      </p>
    </div>
  );
}
