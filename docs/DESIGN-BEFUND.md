# Design-Befund (Phase 1 der Design-Überarbeitung)

Grundlage: Screenshots aller sichtbaren Seiten in fünf Ansichten (PC 1366×900 hell und dunkel,
Pixel 7 hoch, Pixel 7 quer dunkel, Tablet 800×1280), Spielzustände Werft, Rampe, Umlaufbahn,
Karte, Bordcomputer, Pause. Keine Konsolenfehler, kein horizontales Scrollen.
Regelverweise: Abschnitte aus `DESIGN-REGELN.md`.

Status: offen · ✅ erledigt · 🔶 bewusst belassen

## Gestaltungssystem (gemessen)

| #   | Befund                                                                                       | Regel | Lösung                                             | Status |
| --- | -------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------- | ------ |
| B1  | 34 verschiedene Schriftgrößen in `global.css`, 30 in `game.css` (plus 45 `font:`-Kurzformen) | 3     | Typ-Skala `--fs-1…8`, alle Größen darauf           | ✅     |
| B2  | 18 verschiedene Eckenradien (App), 14 (Spiel)                                                | 5     | `--r-sm/md/lg/pill`                                | ✅     |
| B3  | 66 Hex-Farben außerhalb der Token-Blöcke (25 App, 41 Spiel)                                  | 4     | alle als Token                                     | ✅     |
| B4  | 19 bzw. 14 Schatten-Deklarationen mit unterschiedlichen Werten                               | 5     | zwei Stufen `--shadow-1/2`                         | ✅     |
| B5  | 5–6 verschiedene Übergangsdauern, Standard-`ease`                                            | 6     | `--dur-1/2/3`, `--ease-out`; Hover nur bei Maus    | ✅     |
| B6  | Fließtext-Grundgröße 15 px                                                                   | 3     | Bedienung 15 px (Jost läuft klein), Lesetext 17 px | ✅     |
| B7  | Abstände frei gewählt (z. B. 5, 6, 7, 10, 14, 18 px)                                         | 5     | Raster `--sp-1…9`                                  | ✅     |
| B8  | Knöpfe: drei App-Varianten ok, Spiel mit vier Systemen (`abtn`, `hbtn`, `gbtn`, `stage-btn`) | 6/9   | gemeinsame Höhe, Radius, Zustände                  | ✅     |

## Startseite

| #   | Befund                                                                                   | Regel | Lösung                                                        | Status |
| --- | ---------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------- | ------ |
| B9  | „Die Antwort in drei Sätzen“: drei gleiche Karten mit Status-Pille; Tablet 2+1 mit Waise | 2, 5  | Thesenliste mit Nummer, Kennzeichnung als Text+Symbol, Linien | ✅     |
| B10 | „Selbst ausprobieren“: eine einzelne breite Icon-Kachel, viel Leerraum                   | 2     | als Zeile im Inhaltsverzeichnis/Werkzeugzeile integrieren     | ✅     |
| B11 | „Spielen und üben“: Verlaufs-Banner + drei gleiche Icon-Karten                           | 2     | dunkle Bildtafel mit Spielgrafik, übrige als Liste            | ✅     |
| B12 | Kapitelliste als umrandete Kästen                                                        | 2, 5  | Inhaltsverzeichnis mit Linien                                 | ✅     |
| B13 | Live-Simulation ohne Abbildungsnummer; Bildunterschrift klein und grau                   | 1     | „Abb. 1“ mit Unterschrift in Lesegröße                        | ✅     |

## Weitere Seiten

| #   | Befund                                                                                          | Regel   | Lösung                                                    | Status |
| --- | ----------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------- | ------ |
| B14 | Download: Titel „Orbitlabor für Windows“ / Kopfzeile „Download für Windows“, obwohl drei Geräte | 8       | „Orbitlabor herunterladen“, drei Plattformen gleichrangig | ✅     |
| B15 | Begriffe: jeder Eintrag in eigenem Kasten                                                       | 2, 5    | Definitionsliste mit Linien                               | ✅     |
| B16 | Quellen: Formelsammlung als Kartenraster                                                        | 2       | Tabelle/Liste mit Linien                                  | ✅     |
| B17 | Simulator: jede Gruppe als Karte mit Rahmen und Schatten                                        | 2, 5    | Flächen ohne Schatten, Trennung über Linien/Abstand       | ✅     |
| B18 | Raketenwerft-Start: Rang/Punkte/Sterne als drei Kacheln                                         | 2       | eine Instrumentenzeile                                    | ✅     |
| B19 | Kapitel: Versuche als schwebende Karte mit Schatten; Abbildungsnummer klein unten               | 1, 5    | Versuchstafel ohne Schatten, Titel oben                   | ✅     |
| B20 | Navigation: aktiver Eintrag mit Hintergrundkasten + Strich                                      | Auftrag | nur Messing-Markierung und Schriftgewicht                 | ✅     |

## Spiel

| #   | Befund                                                                   | Regel | Lösung                                 | Status |
| --- | ------------------------------------------------------------------------ | ----- | -------------------------------------- | ------ |
| B21 | Radien im HUD uneinheitlich (8–14 px), Schriftgrößen frei                | 9     | Spiel-Tokens wie App-Skala             | ✅     |
| B22 | Pause-Menü: Tastenhinweise rechts als Kästchen auch auf Tablet-Emulation | 9     | nur bei Maus/Tastatur (`hover: hover`) | ✅     |

## Leistung (Pixel 7, CPU 4× gedrosselt, ms pro Bild, Mittelwert)

| Szene                     | vorher | nachher |
| ------------------------- | ------ | ------- |
| Aufstieg                  | 56,9   | 57,1    |
| Karte (Aufstieg)          | 54,3   | 48,1    |
| Umlaufbahn                | 17,8   | 17,4    |
| Umlaufbahn + Bordcomputer | 17,9   | 17,6    |
| Zeitraffer 1000×          | 57,0   | 52,4    |

## Abnahme (Phase 7)

- Hex-Farben außerhalb der Token-Blöcke: 0 (vorher 66)
- Schriftgrößen: 9 Werte in `global.css` (8 Tokens + `1.08em` für KaTeX), 7 in `game.css` (vorher 34/30)
- Radien: nur `--r-sm/md/lg/pill`, `50%` für Kreise, `0` (vorher 18/14 Werte)
- Schatten: `--shadow-1/2`; daneben nur Abdunkelung hinter Dialogen (`100vmax`-Ring), Fokus- und Warnringe, Druckkante der Stufen-Taste
- Kontrast aller Text-Token-Paare hell/dunkel/Weltraum/Spiel ≥ 4,5:1 (Skript, 0 Fehler)
- Keine Konsolenfehler, kein seitliches Scrollen in fünf Ansichten auf allen sichtbaren Seiten
- `npm run check` grün (245 Tests), Missionen und Szenarien grün
- Hinweis: In der Playwright-Emulation meldet „Pixel 7 quer“ keinen Touch-Zeiger; Tastenhinweise erscheinen dort noch, auf echten Touch-Geräten nicht.
