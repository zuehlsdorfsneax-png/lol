import { describe, expect, it } from 'vitest';
import { Flight } from '../src/rocket/flight';
import { GAME_EARTH } from '../src/rocket/world';
import { TEMPLATES, type Design } from '../src/rocket/parts';

const DT = 0.05;

function template(id: string): Design {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Vorlage fehlt: ${id}`);
  return [...t.parts];
}

// Die Vorhersage muss den Aufschlag so treffen wie der echte Flug. Mit Luftwiderstand (ohne
// Fallschirm) war sie vorher um Minuten daneben oder zeigte ein Abprallen, das nicht stattfindet.
describe('Vorhersage im Luftraum', () => {
  it('sagt den Aufschlag einer Rakete ohne Fallschirm zeitlich richtig voraus', () => {
    const f = new Flight(template('faehre'));
    f.placeInOrbit(GAME_EARTH, 200_000, 0);
    // Zehn Prozent abbremsen: die Bahn sinkt in die Luft und stürzt nach rund 700 s ab.
    f.vx *= 0.9;
    f.vy *= 0.9;
    const pred = f.predict();
    expect(pred.impact).toBe(GAME_EARTH);
    const predictedEnd = pred.ts[pred.n - 1]!;

    for (let i = 0; i < 200_000 && f.status === 'flying'; i++) f.update(DT);
    expect(f.status).toBe('crashed');
    expect(Math.abs(f.t - predictedEnd)).toBeLessThan(10);
  });
});
