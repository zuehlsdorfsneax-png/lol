import { drawText, fillStar, type Scene } from '../../engine';
import { COLORS, type AppGame } from '../config';
import { Starfield } from '../entities/Starfield';
import { saveStore, toggleMute } from '../save';
import { PlayScene } from './PlayScene';

export class MenuScene implements Scene {
  private readonly starfield: Starfield;
  private readonly highscore: number;
  private time = 0;

  constructor(private readonly game: AppGame) {
    this.starfield = new Starfield(game.width, game.height);
    this.highscore = saveStore.load().highscore;
  }

  update(dt: number): void {
    this.time += dt;
    this.starfield.update(dt);

    const { input } = this.game;
    if (input.wasPressed('mute')) toggleMute(this.game);
    if (input.wasPressed('confirm') || input.pointer.pressed) {
      this.game.scenes.replace(new PlayScene(this.game));
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const cx = this.game.width / 2;
    this.starfield.render(ctx);

    ctx.shadowColor = COLORS.accent;
    ctx.shadowBlur = 24;
    fillStar(ctx, cx, 120, 5, 42, 18, COLORS.accent, this.time * 0.8);
    ctx.shadowBlur = 0;

    drawText(ctx, 'Sternensammler', cx, 230, {
      size: 64,
      weight: 'bold',
      align: 'center',
      color: COLORS.accent,
    });
    drawText(ctx, 'Sammle Sterne und weiche den Meteoren aus!', cx, 275, {
      size: 20,
      align: 'center',
      color: COLORS.text,
    });

    if (Math.floor(this.time * 2) % 2 === 0) {
      drawText(ctx, 'Enter / Leertaste oder Tippen zum Starten', cx, 360, {
        size: 22,
        weight: 'bold',
        align: 'center',
        color: COLORS.text,
      });
    }
    if (this.highscore > 0) {
      drawText(ctx, `Rekord: ${this.highscore}`, cx, 405, {
        size: 18,
        align: 'center',
        color: COLORS.accent,
      });
    }

    const sound = this.game.sound.muted ? 'aus' : 'an';
    drawText(ctx, 'Bewegen: Pfeiltasten / WASD oder Finger bzw. Maus gedrückt halten', cx, 470, {
      size: 15,
      align: 'center',
      color: COLORS.muted,
    });
    drawText(ctx, `P / Esc: Pause · M: Ton (${sound}) · ^: Debug-Anzeige`, cx, 495, {
      size: 15,
      align: 'center',
      color: COLORS.muted,
    });
  }
}
