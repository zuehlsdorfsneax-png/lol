import {
  circlesIntersect,
  drawText,
  pointInRect,
  randomRange,
  Vector2,
  type RandomSource,
  type Rect,
  type Scene,
} from '../../engine';
import { COLORS, GAME_WIDTH, type AppGame } from '../config';
import { Collectible } from '../entities/Collectible';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Starfield } from '../entities/Starfield';
import { saveStore, toggleMute } from '../save';
import { GameOverScene } from './GameOverScene';
import { PauseScene } from './PauseScene';

const COLLECTIBLE_COUNT = 3;
const MAX_ENEMIES = 12;
/** Sekunden bis zum nächsten zusätzlichen Gegner. */
const ENEMY_INTERVAL = 6;
/** Pause-Knopf oben rechts – wichtig für Touch-Geräte ohne Tastatur. */
const PAUSE_BUTTON: Rect = { x: GAME_WIDTH - 60, y: 14, width: 44, height: 44 };

export class PlayScene implements Scene {
  private readonly starfield: Starfield;
  private readonly player: Player;
  private readonly collectibles: Collectible[] = [];
  private readonly enemies: Enemy[] = [];
  private readonly highscore: number;
  private score = 0;
  private elapsed = 0;
  private enemyTimer = ENEMY_INTERVAL;

  constructor(
    private readonly game: AppGame,
    private readonly random: RandomSource = Math.random,
  ) {
    this.starfield = new Starfield(game.width, game.height, 90, random);
    this.player = new Player(game.width / 2, game.height / 2);
    this.highscore = saveStore.load().highscore;
    for (let i = 0; i < COLLECTIBLE_COUNT; i++) this.collectibles.push(this.createCollectible());
    this.spawnEnemy();
  }

  update(dt: number): void {
    const { input, width, height } = this.game;
    const { pointer } = input;

    if (
      input.wasPressed('pause') ||
      (pointer.pressed && pointInRect(pointer.x, pointer.y, PAUSE_BUTTON))
    ) {
      this.game.scenes.push(new PauseScene(this.game));
      return;
    }
    if (input.wasPressed('mute')) toggleMute(this.game);

    this.elapsed += dt;
    this.starfield.update(dt);
    this.player.update(dt, this.readDirection(dt), width, height);
    for (const enemy of this.enemies) enemy.update(dt, width, height);

    this.collectibles.forEach((collectible, index) => {
      collectible.update(dt);
      if (circlesIntersect(this.player.bounds, collectible.bounds)) {
        this.score++;
        this.collectibles[index] = this.createCollectible();
        this.game.sound.tone(660 + Math.min(this.score, 30) * 15, 0.08);
      }
    });

    this.enemyTimer -= dt;
    if (this.enemyTimer <= 0) {
      this.enemyTimer += ENEMY_INTERVAL;
      if (this.enemies.length < MAX_ENEMIES) this.spawnEnemy();
    }

    if (this.enemies.some((enemy) => circlesIntersect(this.player.bounds, enemy.bounds))) {
      this.gameOver();
    }
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.starfield.render(ctx);
    for (const collectible of this.collectibles) collectible.render(ctx);
    for (const enemy of this.enemies) enemy.render(ctx, alpha);
    this.player.render(ctx, alpha);
    this.renderHud(ctx);
  }

  /** Richtung aus Tastatur oder – falls keine Taste gedrückt ist – aus Maus/Touch. */
  private readDirection(dt: number): Vector2 {
    const { input } = this.game;
    const keyboard = new Vector2(input.axis('left', 'right'), input.axis('up', 'down'));
    if (keyboard.x !== 0 || keyboard.y !== 0) return keyboard.normalize();
    if (!input.pointer.down) return new Vector2();

    // Auf den Zeiger zusteuern, ohne im letzten Schritt darüber hinauszuschießen.
    const toPointer = new Vector2(input.pointer.x, input.pointer.y).sub(this.player.position);
    const direction = toPointer.scale(1 / (Player.SPEED * dt));
    return direction.length() > 1 ? direction.normalize() : direction;
  }

  private gameOver(): void {
    const isRecord = this.score > this.highscore;
    if (isRecord) saveStore.update((data) => ({ ...data, highscore: this.score }));
    this.game.sound.tone(140, 0.4, 'sawtooth', 0.2);
    this.game.scenes.replace(
      new GameOverScene(this.game, this.score, Math.max(this.score, this.highscore), isRecord),
    );
  }

  private createCollectible(): Collectible {
    const position = this.randomPosition(Collectible.RADIUS + 10, 80);
    return new Collectible(position.x, position.y, randomRange(0, Math.PI * 2, this.random));
  }

  private spawnEnemy(): void {
    const position = this.randomPosition(Enemy.RADIUS, 220);
    const speed = Math.min(110 + this.elapsed * 4, 300);
    const angle = randomRange(0, Math.PI * 2, this.random);
    this.enemies.push(new Enemy(position.x, position.y, Vector2.fromAngle(angle, speed)));
  }

  /** Zufällige Position mit möglichst `minDistance` Abstand zum Spieler. */
  private randomPosition(margin: number, minDistance: number): Vector2 {
    const { width, height } = this.game;
    const position = new Vector2();
    for (let attempt = 0; attempt < 20; attempt++) {
      position.set(
        randomRange(margin, width - margin, this.random),
        randomRange(margin, height - margin, this.random),
      );
      if (position.distanceTo(this.player.position) >= minDistance) break;
    }
    return position;
  }

  private renderHud(ctx: CanvasRenderingContext2D): void {
    drawText(ctx, `Sterne: ${this.score}`, 20, 42, {
      size: 26,
      weight: 'bold',
      color: COLORS.accent,
    });
    drawText(ctx, `Rekord: ${Math.max(this.score, this.highscore)}`, 20, 68, {
      size: 16,
      color: COLORS.muted,
    });
    drawText(ctx, `${Math.floor(this.elapsed)} s`, this.game.width / 2, 42, {
      size: 20,
      align: 'center',
      color: COLORS.text,
    });

    const b = PAUSE_BUTTON;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.width, b.height, 10);
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.fillRect(b.x + 14, b.y + 12, 6, 20);
    ctx.fillRect(b.x + 24, b.y + 12, 6, 20);

    if (this.game.sound.muted) {
      drawText(ctx, 'Ton aus (M)', b.x - 12, 42, { size: 14, align: 'right', color: COLORS.muted });
    }
  }
}
