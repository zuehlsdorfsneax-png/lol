# Web-App-Spiel – Grundgerüst

Ein schlankes Fundament für Browserspiele mit **Vite**, **TypeScript** und **Canvas 2D** – ohne
Spiele-Framework, damit jede Zeile verständlich und anpassbar bleibt. Als Beispiel ist das kleine
Spiel **„Sternensammler“** enthalten: Sterne einsammeln, Meteoren ausweichen. Es zeigt, wie alle
Bausteine zusammenspielen, und läuft mit Tastatur, Maus und Touch.

## Schnellstart

Voraussetzung: Node.js ≥ 22.13 (siehe `.nvmrc`).

```bash
npm install
npm run dev        # Entwicklungsserver mit Live-Reload → http://localhost:5173
```

Zum Testen auf dem Handy im selben WLAN: `npm run dev -- --host` und die angezeigte
Netzwerk-Adresse öffnen.

| Befehl            | Zweck                                                   |
| ----------------- | ------------------------------------------------------- |
| `npm run dev`     | Entwicklungsserver                                      |
| `npm run build`   | Typprüfung + Produktions-Build nach `dist/`             |
| `npm run preview` | Den Build lokal ausliefern                              |
| `npm test`        | Unit-Tests (Vitest)                                     |
| `npm run lint`    | ESLint                                                  |
| `npm run format`  | Code mit Prettier formatieren                           |
| `npm run check`   | Alles auf einmal: Typen, Lint, Formatierung, Tests (CI) |

## Projektstruktur

```
index.html              Einstiegsseite mit <canvas id="game">
public/                 Statische Dateien (Icon, Web-App-Manifest, später Bilder/Sounds)
src/
  main.ts               Erstellt das Spiel und startet die erste Szene
  style.css             Vollbild-Layout, Touch-Optimierungen
  engine/               Wiederverwendbare, spielunabhängige Bausteine
    Game.ts             Verbindet alles und besitzt die Spielschleife
    GameLoop.ts         Fester Zeitschritt + Interpolation, FPS-Messung
    SceneManager.ts     Szenen-Stapel (Menü, Spiel, Pause-Overlay …)
    Scene.ts            Schnittstelle für Szenen
    Input.ts            Tastatur (mit Aktions-Belegung) und Zeiger (Maus/Touch/Stift)
    Viewport.ts         Feste logische Auflösung, Skalierung, scharfe Darstellung (HiDPI)
    AssetLoader.ts      Bilder und JSON vorladen, mit Fortschritt
    SoundPlayer.ts      Web Audio: Sounddateien und synthetische Töne, Stummschaltung
    SaveStore.ts        Spielstand in localStorage – robust gegen Fehler
    draw.ts             Zeichenhilfen (Text, Kreis, Stern)
    math/               Vector2, clamp/lerp/Zufall, Kollisionstests
  game/                 Das eigentliche Spiel (hier: Sternensammler)
    config.ts           Auflösung, Tastenbelegung, Farben
    save.ts             Spielstand-Definition
    entities/           Spieler, Gegner, Sammelobjekte, Hintergrund
    scenes/             Menü, Spiel, Pause, Game Over
tests/                  Unit-Tests für Engine und Spiellogik
```

Die Trennung ist bewusst: `src/engine` weiß nichts über das konkrete Spiel. Für ein neues Spiel
bleibt die Engine, und `src/game` wird ersetzt.

## Wie die Engine funktioniert

### Spielschleife mit festem Zeitschritt

`update(dt)` läuft immer mit derselben Schrittweite (Standard 1/60 s), unabhängig davon, ob der
Bildschirm mit 60, 120 oder 144 Hz läuft. Dadurch verhält sich Physik überall gleich.
`render(ctx, alpha)` läuft einmal pro Bild; `alpha` (0..1) gibt an, wie weit die Zeit schon zum
nächsten Schritt fortgeschritten ist. Damit lassen sich Bewegungen glatt interpolieren (siehe
`Player.render`). Ist der Tab im Hintergrund, pausiert die Schleife automatisch.

### Szenen

Eine Szene implementiert mindestens `update` und `render`:

```ts
import { drawText, type Scene } from '../../engine';
import type { AppGame } from '../config';

export class CreditsScene implements Scene {
  constructor(private readonly game: AppGame) {}

  update(): void {
    if (this.game.input.wasPressed('confirm')) this.game.scenes.pop();
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawText(ctx, 'Danke fürs Spielen!', this.game.width / 2, 200, { align: 'center', size: 40 });
  }
}
```

- `scenes.replace(scene)` – Szenenwechsel (Menü → Spiel → Game Over)
- `scenes.push(scene)` / `scenes.pop()` – Szene darüberlegen und wieder entfernen
- `transparent = true` – die Szene darunter bleibt sichtbar (z. B. Pausemenü)
- Optionale Hooks: `enter`, `exit`, `pause`, `resume`

### Eingabe

Tasten werden in `src/game/config.ts` Aktionen zugeordnet. Verwendet werden
[`KeyboardEvent.code`](https://developer.mozilla.org/de/docs/Web/API/KeyboardEvent/code)-Werte,
also physische Tastenpositionen – WASD funktioniert so auch auf AZERTY-Tastaturen.

```ts
input.isDown('left'); // gehalten
input.wasPressed('confirm'); // gerade gedrückt (einmalig pro Druck)
input.axis('left', 'right'); // -1, 0 oder 1
input.pointer; // { x, y, down, pressed, released } in Spielkoordinaten
```

### Auflösung und Darstellung

Das Spiel rechnet und zeichnet in einer festen logischen Auflösung (hier 960 × 540). Der
`Viewport` skaliert den Canvas passend ins Fenster, behält das Seitenverhältnis bei und
berücksichtigt die Pixeldichte, damit alles auf Retina-Displays scharf ist. Für Pixel-Art-Spiele
`pixelArt: true` in der Spielkonfiguration setzen.

### Assets, Sound und Spielstand

```ts
await game.assets.loadAll({ images: { player: 'assets/player.png' } }, (done, total) => {
  /* Ladebalken */
});
ctx.drawImage(game.assets.image('player'), x, y);

const jump = await game.sound.load('assets/jump.ogg');
game.sound.play(jump);
game.sound.tone(880, 0.1); // synthetischer Ton, ideal für Prototypen

const store = new SaveStore('mein-spiel', { level: 1 });
store.update((data) => ({ ...data, level: data.level + 1 }));
```

Dateien für `assets/…` gehören nach `public/assets/`. Browser spielen Ton erst nach einer
Nutzerinteraktion ab – die Engine entsperrt Audio beim ersten Klick oder Tastendruck automatisch.

### Debugging

- `^`-Taste (bzw. `` ` ``): Debug-Anzeige mit FPS, Szenenanzahl und Zeigerposition
- Im Entwicklungsmodus ist das Spielobjekt in der Browser-Konsole als `game` verfügbar,
  z. B. `game.scenes.current`

## Steuerung im Beispielspiel

| Aktion     | Tastatur              | Maus / Touch                    |
| ---------- | --------------------- | ------------------------------- |
| Bewegen    | Pfeiltasten oder WASD | Gedrückt halten – Spieler folgt |
| Start      | Enter oder Leertaste  | Tippen                          |
| Pause      | P oder Esc            | Pause-Knopf oben rechts         |
| Ton an/aus | M                     | –                               |

## Veröffentlichen

`npm run build` erzeugt in `dist/` eine rein statische Seite. Sie kann auf jedem Webhoster
liegen, z. B. GitHub Pages, Netlify oder Cloudflare Pages. Da relative Pfade verwendet werden
(`base: './'` in `vite.config.ts`), funktioniert sie auch in Unterverzeichnissen. Dank
Web-App-Manifest lässt sich das Spiel auf dem Handy zum Startbildschirm hinzufügen.

## Mögliche nächste Schritte

- Sprites und Animationen (Spritesheets über den `AssetLoader`)
- Kamera/Scrolling für Level, die größer als der Bildschirm sind
- Partikeleffekte, Screen-Shake
- Offline-Spielen per Service Worker (z. B. `vite-plugin-pwa`)
- Gamepad-Unterstützung über die Gamepad API
- Automatisches Deployment auf GitHub Pages per GitHub Actions
