/// <reference lib="webworker" />
import { runStability } from '../physics';
import { cellParams, type CellResult, type MapConfig } from './axes';

export interface RunMessage {
  type: 'run';
  job: number;
  config: MapConfig;
  cells: [number, number][];
}

export type WorkerReply = ({ type: 'cell'; job: number } & CellResult) | { type: 'done'; job: number };

self.onmessage = (e: MessageEvent<RunMessage>) => {
  const { job, config, cells } = e.data;
  for (const [i, j] of cells) {
    const r = runStability(cellParams(config, i, j), { years: config.years, roche: config.roche });
    const reply: WorkerReply = {
      type: 'cell',
      job,
      i,
      j,
      outcome: r.outcome,
      time: r.time,
      minDistance: r.minDistance,
      maxDistance: r.maxDistance,
    };
    self.postMessage(reply);
  }
  self.postMessage({ type: 'done', job } satisfies WorkerReply);
};
