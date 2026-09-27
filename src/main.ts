import './style.css';
import { Game } from './engine';
import { bindings, COLORS, GAME_HEIGHT, GAME_WIDTH, type AppGame } from './game/config';
import { saveStore } from './game/save';
import { MenuScene } from './game/scenes/MenuScene';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Canvas #game wurde nicht gefunden.');

const game: AppGame = new Game({
  canvas,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  bindings,
  background: COLORS.background,
});
game.sound.muted = saveStore.load().muted;
game.start(new MenuScene(game));

// In der Entwicklung über die Browser-Konsole erreichbar: `game.debug = true` usw.
if (import.meta.env.DEV) {
  (window as unknown as { game: AppGame }).game = game;
}
