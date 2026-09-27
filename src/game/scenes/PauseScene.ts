import { drawText, type Scene } from '../../engine';
import { COLORS, type AppGame } from '../config';
import { toggleMute } from '../save';

/** Halbtransparentes Overlay – die Spielszene darunter bleibt sichtbar, wird aber nicht aktualisiert. */
export class PauseScene implements Scene {
  readonly transparent = true;

  constructor(private readonly game: AppGame) {}

  update(): void {
    const { input } = this.game;
    if (input.wasPressed('pause') || input.wasPressed('confirm') || input.pointer.pressed) {
      this.game.scenes.pop();
    } else if (input.wasPressed('mute')) {
      toggleMute(this.game);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { width, height } = this.game;
    ctx.fillStyle = 'rgba(5, 8, 20, 0.72)';
    ctx.fillRect(0, 0, width, height);

    drawText(ctx, 'Pause', width / 2, height / 2 - 20, {
      size: 56,
      weight: 'bold',
      align: 'center',
      color: COLORS.text,
    });
    drawText(ctx, 'Enter, Esc oder Tippen zum Weiterspielen', width / 2, height / 2 + 30, {
      size: 20,
      align: 'center',
      color: COLORS.muted,
    });
    drawText(
      ctx,
      `M: Ton ${this.game.sound.muted ? 'an' : 'aus'}schalten`,
      width / 2,
      height / 2 + 60,
      {
        size: 16,
        align: 'center',
        color: COLORS.muted,
      },
    );
  }
}
