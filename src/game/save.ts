import { SaveStore } from '../engine';
import type { AppGame } from './config';

export interface SaveData {
  highscore: number;
  muted: boolean;
}

export const saveStore = new SaveStore<SaveData>('lol-game/save', { highscore: 0, muted: false });

export function toggleMute(game: AppGame): void {
  game.sound.muted = !game.sound.muted;
  saveStore.update((data) => ({ ...data, muted: game.sound.muted }));
}
