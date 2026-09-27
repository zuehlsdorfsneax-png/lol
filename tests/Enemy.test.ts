import { describe, expect, it } from 'vitest';
import { Vector2 } from '../src/engine';
import { Enemy } from '../src/game/entities/Enemy';

describe('Enemy', () => {
  it('bewegt sich mit seiner Geschwindigkeit', () => {
    const enemy = new Enemy(100, 100, new Vector2(50, -20));
    enemy.update(0.5, 960, 540);
    expect(enemy.position).toEqual(new Vector2(125, 90));
  });

  it('prallt an den Rändern ab und bleibt im Spielfeld', () => {
    const enemy = new Enemy(950, 10, new Vector2(100, -100));
    enemy.update(0.1, 960, 540);
    expect(enemy.position.x).toBe(960 - Enemy.RADIUS);
    expect(enemy.position.y).toBe(Enemy.RADIUS);
    expect(enemy.velocity).toEqual(new Vector2(-100, 100));
  });
});
