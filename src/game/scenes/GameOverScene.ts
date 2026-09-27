import { drawText, type Scene } from '../../engine';
import { COLORS, type AppGame } from '../config';
import { Starfield } from '../entities/Starfield';
import { MenuScene } from './MenuScene';
import { PlayScene } from './PlayScene';

/** Kurze Sperre, damit ein noch gehaltener Finger/Tastendruck den Bildschirm nicht sofort überspringt. */
const INPUT_DELAY = 0.6;

export class GameOverScene implements Scene {
  private readonly starfield: Starfield;
  private time = 0;

  constructor(
    private readonly game: AppGame,
    private readonly score: number,
    private readonly highscore: number,
    private readonly isRecord: boolean,
  ) {
    this.starfield = new Starfield(game.width, game.height);
  }

  update(dt: number): void {
    this.time += dt;
    this.starfield.update(dt);
    if (this.time < INPUT_DELAY) return;

    const { input } = this.game;
    if (input.wasPressed('confirm') || input.pointer.pressed) {
      this.game.scenes.replace(new PlayScene(this.game));
    } else if (input.wasPressed('pause')) {
      this.game.scenes.replace(new MenuScene(this.game));
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const cx = this.game.width / 2;
    this.starfield.render(ctx);

    drawText(ctx, 'Game Over', cx, 200, {
      size: 60,
      weight: 'bold',
      align: 'center',
      color: COLORS.enemy,
    });
    drawText(ctx, `Sterne: ${this.score}`, cx, 270, {
      size: 30,
      weight: 'bold',
      align: 'center',
      color: COLORS.accent,
    });
    drawText(ctx, this.isRecord ? 'Neuer Rekord!' : `Rekord: ${this.highscore}`, cx, 310, {
      size: 20,
      align: 'center',
      color: this.isRecord ? COLORS.accent : COLORS.muted,
    });

    if (this.time >= INPUT_DELAY) {
      drawText(ctx, 'Enter / Tippen: Nochmal · Esc: Menü', cx, 400, {
        size: 20,
        align: 'center',
        color: COLORS.text,
      });
    }
  }
}
