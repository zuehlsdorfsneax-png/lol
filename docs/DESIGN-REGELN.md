# Design-Regeln für KI-Arbeit am Orbitlabor

Verbindlich für jede Änderung an Oberfläche, Spiel oder Grafik. Zweck: Die App soll wie von
einem Gestaltungsteam gebaut wirken, nicht wie „AI-Slop“ / Vibe-Code. Zusammengetragen aus
Anthropic frontend-design, Vercel Web Interface Guidelines, Emil Kowalski (design engineering),
Listen typischer KI-Design-Muster (developersdigest, vibemole, daily.dev u. a.) und
Game-HUD-Leitfäden; angepasst an dieses Projekt. Vor jeder Design-Arbeit ganz lesen.

## Festgelegte Richtung (verbindlich, Stand Design-Überarbeitung)

Leitbild: **Atlastafel**. Seiten wirken wie Tafeln eines Sternatlas bzw. einer gedruckten
wissenschaftlichen Arbeit: Inhalt auf dem Papier, Gliederung durch Linien, Nummern und Abstände
statt durch Kästen; Abbildungen und Versuche tragen Nummern („Abb. 1“, „Versuch 2.3“), Messwerte
stehen in Monospace mit Einheit. Weltraum-Flächen (Simulation, Spielbanner) sind dunkle
Bildtafeln. Das Spiel bleibt ein dunkles Cockpit.

Alle Werte nur über diese Tokens (`src/styles/global.css` `:root`, Spiel zusätzlich `.game`):

| Bereich  | Tokens                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schrift  | `--fs-1` 11 · `--fs-2` 13 · `--fs-3` 15 (Bedienung) · `--fs-4` 17 (Lesetext) · `--fs-5` 20 · `--fs-6` h2 · `--fs-7` h1 · `--fs-8` Titel · `--fs-9` Countdown |
| Abstand  | `--sp-1…9` = 4, 8, 12, 16, 24, 32, 48, 64, 96 px; `--sp-0` 2 px nur für Feinheiten                                                                           |
| Ecken    | `--r-sm` 6 (Eingaben, Marken) · `--r-md` 10 (Knöpfe) · `--r-lg` 14 (Flächen, Dialoge) · `--r-pill` · Kreise `50%`                                            |
| Schatten | `--shadow-1` anliegend · `--shadow-2` schwebend (Menüs, Dialoge, Meldungen); sonst keine                                                                     |
| Bewegung | `--dur-1` 120 ms Druck · `--dur-2` 200 ms Menüs · `--dur-3` 280 ms Dialoge · `--ease-out`                                                                    |
| Farbe    | nur Tokens; Weltraum: `--space*`, `--brass*`; Spiel: `--g-*`. Kontrast aller Textpaare ≥ 4,5:1 (geprüft)                                                     |

Knöpfe: App `.btn` (sekundär, Linie), `.btn.primary` (Messing), `.btn.ghost` (Text). Spiel:
Höhe 40 px (`.gbtn`, `.hbtn`, `.abtn`, `.sas-btn`, `.cp-action`), Menüs 46 px (`.mbtn`), alle
`--r-md`, Druck `scale(0.97)`; auf Touch-Geräten unsichtbare Tippfläche bis ≥ 44 px.
Hover-Effekte stehen nur in `@media (hover: hover) and (pointer: fine)`.

## 0. Arbeitsweise

1. Erst Bestandsaufnahme: Screenshots aller betroffenen Seiten (1366×900 hell+dunkel, Pixel 7
   hoch, Pixel 7 quer, Tablet 800×1280) ansehen, Mängel als Liste notieren, dann ändern.
2. Konkrete Entscheidungen statt „modern und clean“. Jede Änderung muss eine benennbare
   Begründung haben (Hierarchie, Lesbarkeit, Identität, Bedienbarkeit).
3. Bestehendes System zuerst: Tokens in `src/styles/global.css` (`:root`, Dunkel-Block) und
   `src/rocket/game.css` (`.game`). Neue Farben/Abstände nur als Token, nie als Einzelwert.
4. Nach der Änderung erneut screenshotten und vorher/nachher vergleichen. Erst dann committen.
5. Weniger ist mehr: Entfernen von Überflüssigem ist oft die beste Verbesserung.

## 1. Identität des Orbitlabors (nicht verwässern)

- Thema: Sternatlas, Messinginstrumente, wissenschaftliche Arbeit (Seminararbeit Astronomie).
- Hell: kühles Papier (`--bg #f5f6fa`), Tinte Nachtblau (`--ink #111a33`), Akzent Messing
  (`--accent #b7791f`). Dunkel: Nachthimmel, gleiche Rollen. Weltraum-Flächen immer dunkel.
- Schrift: Jost (Anzeige/Bedienung), Source Serif 4 (Fließtext, Zitate), IBM Plex Mono (Zahlen,
  Messwerte). Keine weitere Schriftfamilie hinzufügen.
- Charakterdetails, die nur dieses Thema hat, als Inhalt statt Deko: echte Einheiten (km, m/s,
  Hill-Radien, Tage), Abbildungsnummern („Abb. 3“), Maßstabsleisten, Koordinaten/Markierungen
  wie L1/L2, feine Gitter- oder Bahnlinien, Messing-Akzente wie Instrumentenskalen.
- Das Spiel (Raketenwerft) ist bewusst dunkel und an Spaceflight Simulator angelehnt; App-Seiten
  dürfen nicht wie das Spiel aussehen und umgekehrt.

## 2. Verbotene KI-Muster (sofort entfernen, wenn gefunden)

- Lila/Violett/Indigo-Verläufe, „VibeCode-Lavendel“, Neon-Glow, farbige Schatten.
- Verläufe als Standard-Hintergrund; Verläufe nur, wenn sie etwas Echtes darstellen (Himmel,
  Atmosphäre, Licht).
- Inter, Roboto, Arial, Space Grotesk, Instrument Serif; kursives Serif-Akzentwort in Überschriften.
- Zentrierter Hero mit Badge/Pill über der H1, darunter zwei Buttons und drei Feature-Karten.
- Reihen gleicher Karten mit Icon oben + Titel + zwei Zeilen Text.
- Farbige Linien oben/links an Karten als Deko (ausgenommen echte Statusbedeutung).
- Kästen um alles: jede Gruppe mit Rahmen + Radius + Schatten. Karte nur für eigenständige Objekte.
- Statistik-Banner („3 Zahlen in großen Kacheln“), nummerierte 1-2-3-Schritt-Reihen als Deko.
- Emojis als Icons in Navigation, Buttons oder Überschriften.
- DURCHGEHEND GROSSGESCHRIEBENE Überschriften; Versalien nur für kurze Labels (Eyebrow,
  max. ~3 Wörter, mit `letter-spacing: 0.08–0.14em`).
- Glassmorphism / `backdrop-filter` – auch aus Leistungsgründen (über dem Spiel-Canvas verboten).
- Leere Floskeln: „Entdecke“, „Nahtlos“, „Revolutionär“, „Alles, was du brauchst“, „Willkommen!“.
- Platzhalterinhalte, Lorem ipsum, erfundene Zahlen.
- Gleiche Eckenradien und Schatten auf jedem Element.
- Dauerhafte Hover-Hebeeffekte auf allem; Animationen ohne Zweck.

## 3. Typografie

- Typ-Skala festlegen und einhalten (z. B. 0.75 / 0.875 / 1 / 1.125 / 1.375 / 1.75 / 2.5 /
  clamp für Hero). Keine Zwischengrößen erfinden.
- Fließtext 16–18 px, Zeilenhöhe 1.5–1.65, Zeilenlänge 55–75 Zeichen (`max-width: 65ch`).
- Überschriften: Zeilenhöhe 1.05–1.25, `text-wrap: balance`; Absätze `text-wrap: pretty`.
- Hierarchie über Größe, Gewicht und Farbe (ink / ink-2 / ink-3), nicht über Kästen.
- Zahlen in Tabellen, HUD und Messwerten: `font-variant-numeric: tabular-nums`, Monospace.
- Deutsche Typografie: „…“ statt "...", Anführungszeichen „ “, Gedankenstrich –, geschützte
  Leerzeichen zwischen Zahl und Einheit (`3 900 m/s` bzw. `3.900&nbsp;m/s`), Tausenderpunkt.
- Satzanfang groß, Rest normal (keine Title Case-Überschriften im Deutschen).

## 4. Farbe und Kontrast

- Ein Akzent (Messing). Zusätzliche Farben nur mit Bedeutung: ok/grün, warn/orange, fail/rot,
  Datenreihen (`--series-*`). Nie mehr als ein Akzent pro Bildschirmbereich.
- Neutrale Töne leicht zum Nachtblau getönt, kein reines Mittelgrau.
- WCAG AA: Text ≥ 4.5:1, große Schrift/Icons ≥ 3:1 – in hell UND dunkel prüfen.
- Status nie nur über Farbe (zusätzlich Text, Symbol oder Form).
- Dunkelmodus ist keine Invertierung: Flächen in Stufen (`--surface`, `-2`, `-3`), Akzent etwas
  heller (`#e2a846`), Schatten fast unsichtbar, Trennung über Helligkeitsstufen.
- Jede Farbe nur über Tokens; `color-scheme` und `theme-color` passend zum Hintergrund.

## 5. Layout und Abstände

- 4-/8-px-Raster: Abstände 4, 8, 12, 16, 24, 32, 48, 64, 96. Abstände zwischen Gruppen größer
  als innerhalb (Nähe zeigt Zusammengehörigkeit).
- Trennung in dieser Reihenfolge versuchen: Weißraum → 3–5 % Helligkeitsunterschied → feine
  Linie (1px `--line`) → erst zuletzt Rahmen/Schatten.
- Flex/Grid mit `gap`, keine Einzel-Margins für Geschwister.
- Asymmetrie erlaubt und erwünscht (z. B. Text links, großes Instrument/Simulation rechts, Bild
  ragt in den Rand). Nicht alles zentrieren.
- Wiederholte Elemente exakt gleich ausrichten (gleiche Innenabstände, Grundlinien, Positionen).
- Seitenrand mindestens 16 px auf dem Handy; kein horizontales Scrollen außer in Tabellen/Code.
- Inhalt bestimmt die Höhe; keine 100vh-Heros, die den Rest aus dem ersten Bild drängen.
- Eckenradius nach Rolle: Buttons 7 px, Karten/Panels 12 px, Pillen voll rund. Nicht mischen.
- Schatten nur für schwebende Ebenen (Menüs, Dialoge, Toasts), dezent und neutral.

## 6. Bewegung (Emil-Kowalski-Werte)

- Nur `transform` und `opacity` animieren; nie `transition: all`.
- Dauer: Button-Druck 100–160 ms, Menüs/Dropdowns 150–250 ms, Dialoge 200–300 ms. Obergrenze
  für UI 300 ms. Versatz bei Listen 30–80 ms pro Element.
- Easing: ease-out bzw. eigene Kurve, z. B. `cubic-bezier(0.22, 1, 0.36, 1)`; nie `ease-in`
  für Erscheinen. Keine federnden Springs in normaler UI.
- Erscheinen: von `scale(0.95–0.97)` + Deckkraft, nie von `scale(0)`. Popover wachsen vom
  Auslöser (`transform-origin`), Dialoge aus der Mitte.
- Druck-Feedback: `:active { transform: scale(0.97) }`.
- Häufige Aktionen ohne Animation (Navigation, Tabs, Spielsteuerung).
- Hover-Effekte nur unter `@media (hover: hover) and (pointer: fine)`.
- `prefers-reduced-motion`: Bewegung aus, nur Deckkraft/Farbe.
- VERBOT im Projekt: `transform`-Animation auf Vorfahren von `position: fixed`-Elementen (z. B.
  `.main > *`) – verschiebt das Vollbild-Spiel. Seitenübergänge nur mit `opacity`, `backwards`.
- Keine dauernden Endlos-Animationen außer echten Inhalten (Simulation, Countdown, Warnung).

## 7. Bedienung und Barrierefreiheit (Vercel-Regeln)

- Aktionen `<button>`, Navigation `<a href>`; nie klickbare `div`/`span`.
- Icon-Buttons: `aria-label`; dekorative Icons `aria-hidden="true"`; Bilder mit `alt`.
- Sichtbarer Fokus mit `:focus-visible` (2px `--focus`), nie Outline ohne Ersatz entfernen.
- Touch-Ziele ≥ 44×44 px, Abstand dazwischen ≥ 8 px; `touch-action: manipulation`.
- Formulare: `<label>`, passender `type`/`inputmode`, Fehler direkt am Feld mit Lösungshinweis.
- Zustände für alles: Hover, Aktiv, Fokus, Deaktiviert, Laden („Lädt…“), Leer, Fehler.
- Lange Texte: `min-width: 0`, Umbruch/Ellipsis statt Überlauf.
- Seiten-Zustand in der URL (Tabs/Kapitel per `#`), Zurück-Taste funktioniert.
- Zerstörende Aktionen: Nachfrage oder Rückgängig.
- Safe Areas (`env(safe-area-inset-*)`) bei Vollbild und fixierten Leisten (APK!).

## 8. Texte (deutsch)

- Du-Form, aktiv, kurz, konkret. Buttons sagen genau, was passiert („Simulation starten“,
  „Rakete starten“), nicht „Los“ / „Mehr erfahren“.
- Zahlen als Ziffern mit Einheit; Fachbegriffe beim ersten Auftreten kurz erklären.
- Fehlermeldungen: was ist passiert + was tun.
- Keine Marketingsprache; der Ton ist der einer guten Seminararbeit: sachlich, klar, neugierig.

## 9. Spiel / HUD (Raketenwerft)

- Lesbarkeit vor Atmosphäre: Werte groß, Monospace, tabellarische Ziffern; Labels klein.
- Wichtigstes in Daumennähe (unten links: Drehen/SAS, unten rechts: Schub/Stufe); oben nur
  Information. Nichts Wichtiges in die Mitte, dort ist die Rakete.
- HUD-Panels deckend genug für Kontrast über jedem Hintergrund (Tag, Nacht, Planet), ohne
  Unschärfe-Filter.
- Zustände nie nur per Farbe (z. B. Hitze, Treibstoff: Zahl + Balken + Farbe).
- Meldungen kurz, maximal 2 gleichzeitig, nie über Steuerelementen.
- Gleiche Knopfsprache überall (Höhe, Radius, Schrift); Tastenhinweise nur ohne Touch.
- Jede Änderung auf Pixel 7 hoch/quer und Tablet prüfen; keine Überlappungen.
- Leistung ist Teil des Designs: keine `backdrop-filter`, keine `shadowBlur`/`ctx.filter` im
  Canvas, kein `getImageData` pro Bild, Layer-Caches nutzen, Qualität adaptiv.

## 10. Grafik (Canvas)

- Licht aus einer Richtung (Sonne) konsistent für Planeten, Rakete und Gelände.
- Farben aus der echten Welt (Atmosphäre, Gestein), keine Neonfarben.
- Details nach Zoomstufe dosieren (LOD); kleine Darstellungen zwischenspeichern.
- Luftperspektive: Entferntes heller/blasser, Nahes kontrastreicher.

## 11. Abnahme-Checkliste vor dem Commit

- [ ] Keines der verbotenen Muster aus Abschnitt 2 vorhanden.
- [ ] Hell und dunkel geprüft, Kontrast AA, keine unlesbaren Stellen.
- [ ] Handy hoch/quer, Tablet, PC ohne Überlappung und ohne horizontales Scrollen.
- [ ] Alle Farben/Abstände über Tokens; keine neuen Einzelwerte.
- [ ] Animationen nur transform/opacity, ≤ 300 ms, reduced-motion beachtet.
- [ ] Fokus sichtbar, Touch-Ziele ≥ 44 px, Icon-Buttons beschriftet.
- [ ] Texte deutsch, konkret, korrekte Typografie („…“, –, Einheiten).
- [ ] `npm run check` grün; Missionen (`npx tsx scripts/missions.ts`) grün, falls Spiel berührt.
- [ ] Vorher/Nachher-Screenshots verglichen; jede Änderung begründbar.

Quellen: anthropics/claude-code frontend-design skill; vercel-labs/web-interface-guidelines;
emilkowalski/skill (emil-design-eng); developersdigest.tech „AI Design Slop: 16 Patterns“;
vibemole.com, daily.dev „How to de-slopify your designs“; Game-UI/HUD-Leitfäden
(get-design-done gaming-patterns).
