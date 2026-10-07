# Design-Befund (Phase 1 der Design-Überarbeitung)

Grundlage: Screenshots aller sichtbaren Seiten in fünf Ansichten (PC 1366×900 hell und dunkel,
Pixel 7 hoch, Pixel 7 quer dunkel, Tablet 800×1280), Spielzustände Werft, Rampe, Umlaufbahn,
Karte, Bordcomputer, Pause. Keine Konsolenfehler, kein horizontales Scrollen.
Regelverweise: Abschnitte aus `DESIGN-REGELN.md`.

Status: offen · ✅ erledigt · 🔶 bewusst belassen

## Gestaltungssystem (gemessen)

| #   | Befund                                                                                       | Regel | Lösung                                          | Status |
| --- | -------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------- | ------ |
| B1  | 34 verschiedene Schriftgrößen in `global.css`, 30 in `game.css` (plus 45 `font:`-Kurzformen) | 3     | Typ-Skala `--fs-1…8`, alle Größen darauf        | offen  |
| B2  | 18 verschiedene Eckenradien (App), 14 (Spiel)                                                | 5     | `--r-sm/md/lg/pill`                             | offen  |
| B3  | 66 Hex-Farben außerhalb der Token-Blöcke (25 App, 41 Spiel)                                  | 4     | alle als Token                                  | offen  |
| B4  | 19 bzw. 14 Schatten-Deklarationen mit unterschiedlichen Werten                               | 5     | zwei Stufen `--shadow-1/2`                      | offen  |
| B5  | 5–6 verschiedene Übergangsdauern, Standard-`ease`                                            | 6     | `--dur-1/2/3`, `--ease-out`; Hover nur bei Maus | offen  |
| B6  | Fließtext-Grundgröße 15 px                                                                   | 3     | 16 px Grundgröße, Lesetext 17–18 px             | offen  |
| B7  | Abstände frei gewählt (z. B. 5, 6, 7, 10, 14, 18 px)                                         | 5     | Raster `--sp-1…9`                               | offen  |
| B8  | Knöpfe: drei App-Varianten ok, Spiel mit vier Systemen (`abtn`, `hbtn`, `gbtn`, `stage-btn`) | 6/9   | gemeinsame Höhe, Radius, Zustände               | offen  |

## Startseite

| #   | Befund                                                                                   | Regel | Lösung                                                        | Status |
| --- | ---------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------- | ------ |
| B9  | „Die Antwort in drei Sätzen“: drei gleiche Karten mit Status-Pille; Tablet 2+1 mit Waise | 2, 5  | Thesenliste mit Nummer, Kennzeichnung als Text+Symbol, Linien | offen  |
| B10 | „Selbst ausprobieren“: eine einzelne breite Icon-Kachel, viel Leerraum                   | 2     | als Zeile im Inhaltsverzeichnis/Werkzeugzeile integrieren     | offen  |
| B11 | „Spielen und üben“: Verlaufs-Banner + drei gleiche Icon-Karten                           | 2     | dunkle Bildtafel mit Spielgrafik, übrige als Liste            | offen  |
| B12 | Kapitelliste als umrandete Kästen                                                        | 2, 5  | Inhaltsverzeichnis mit Linien                                 | offen  |
| B13 | Live-Simulation ohne Abbildungsnummer; Bildunterschrift klein und grau                   | 1     | „Abb. 1“ mit Unterschrift in Lesegröße                        | offen  |

## Weitere Seiten

| #   | Befund                                                                                          | Regel   | Lösung                                                    | Status |
| --- | ----------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------- | ------ |
| B14 | Download: Titel „Orbitlabor für Windows“ / Kopfzeile „Download für Windows“, obwohl drei Geräte | 8       | „Orbitlabor herunterladen“, drei Plattformen gleichrangig | offen  |
| B15 | Begriffe: jeder Eintrag in eigenem Kasten                                                       | 2, 5    | Definitionsliste mit Linien                               | offen  |
| B16 | Quellen: Formelsammlung als Kartenraster                                                        | 2       | Tabelle/Liste mit Linien                                  | offen  |
| B17 | Simulator: jede Gruppe als Karte mit Rahmen und Schatten                                        | 2, 5    | Flächen ohne Schatten, Trennung über Linien/Abstand       | offen  |
| B18 | Raketenwerft-Start: Rang/Punkte/Sterne als drei Kacheln                                         | 2       | eine Instrumentenzeile                                    | offen  |
| B19 | Kapitel: Versuche als schwebende Karte mit Schatten; Abbildungsnummer klein unten               | 1, 5    | Versuchstafel ohne Schatten, Titel oben                   | offen  |
| B20 | Navigation: aktiver Eintrag mit Hintergrundkasten + Strich                                      | Auftrag | nur Messing-Markierung und Schriftgewicht                 | offen  |

## Spiel

| #   | Befund                                                                   | Regel | Lösung                                 | Status |
| --- | ------------------------------------------------------------------------ | ----- | -------------------------------------- | ------ |
| B21 | Radien im HUD uneinheitlich (8–14 px), Schriftgrößen frei                | 9     | Spiel-Tokens wie App-Skala             | offen  |
| B22 | Pause-Menü: Tastenhinweise rechts als Kästchen auch auf Tablet-Emulation | 9     | nur bei Maus/Tastatur (`hover: hover`) | offen  |

## Leistung (Ausgangswert, Pixel 7, CPU 4× gedrosselt, ms pro Bild, Mittel)

Aufstieg 56,9 · Karte 54,3 · Umlaufbahn 17,8 · Umlaufbahn + Bordcomputer 17,9 · Zeitraffer 57,0
