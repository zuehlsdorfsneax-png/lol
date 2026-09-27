import type { Game, KeyBindings } from '../engine';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** Tastenbelegung: Aktion → Liste von `KeyboardEvent.code`-Werten. */
export const bindings = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  confirm: ['Enter', 'Space'],
  pause: ['Escape', 'KeyP'],
  mute: ['KeyM'],
} as const satisfies KeyBindings<string>;

export type Action = keyof typeof bindings;
export type AppGame = Game<Action>;

export const COLORS = {
  background: '#0b1026',
  text: '#e8ecff',
  muted: '#8b93b8',
  accent: '#ffd23f',
  player: '#4cc9f0',
  enemy: '#f72585',
} as const;
