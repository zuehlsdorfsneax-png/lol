/**
 * Bahnvorhersage im Hintergrund: rechnet die Vorhersage auf einer Kopie des Flugs und schickt
 * die Punkte zurück (die Zahlenreihen werden übergeben, nicht kopiert). So ruckelt das Spiel nicht,
 * während tausende Schritte gerechnet werden – vor allem auf Tablets und Handys.
 */
import { Flight } from './flight';
import { packPrediction, type PredictRequest, type PredictResponse } from './predictClient';

self.onmessage = (e: MessageEvent<PredictRequest>) => {
  const { id, snap } = e.data;
  let res: PredictResponse;
  try {
    const f = Flight.restore(snap);
    const p = f.predict();
    const packed = packPrediction(p);
    res = { id, pred: packed };
    (self as unknown as Worker).postMessage(res, [
      packed.xs.buffer,
      packed.ys.buffer,
      packed.vxs.buffer,
      packed.vys.buffer,
      packed.ts.buffer,
    ]);
    return;
  } catch (err) {
    res = { id, pred: null, error: String(err) };
  }
  self.postMessage(res);
};
