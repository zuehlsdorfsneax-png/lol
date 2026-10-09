# Kritik am Orbitlabor

Aktueller Stand. Die frühere Befundliste mit über 200 Einträgen liegt in
`docs/archiv/KRITIK-verlauf.md`.

Geprüft mit `npm run check` (Typen, Lint, Format, 264 Tests), `npm run smoke` (12 Seiten auf PC
und Handy, Raketenwerft bis zum Flugbild) und Screenshots von Werft, Start und Flug.

## Behoben

- Erde–Mond-Abstand steht einmal in `physics/constants.ts` (`MOON_DISTANCE_KM`). Vorher waren es
  neun Literale, und die Physik rechnete mit 384.399 km statt 384.400 km.
- Die Körper der Spielwelt heißen `GAME_SUN`, `GAME_EARTH`, `GAME_MOON`. Ihr Maßstab leitet sich
  aus dem echten Erdradius ab.
- Knopf-Übergänge nur noch über `transform`, wie `DESIGN-REGELN.md` §6 verlangt.
- Auf Touch-Geräten sind Knöpfe, Zeitraffer-Chips und Logo mindestens 44 px hoch.
- Ein `fmt` statt dreier Kopien. Dezimalkommas laufen über dieselbe Formatierung.
- Der Edge-Test im Windows-Workflow blockiert den Release jetzt (vorher `continue-on-error`).
- Wegwerf-Skripte `scripts/_b.ts`, `_l2.ts`, `_land.ts` entfernt.
- Zwei stille `catch`-Blöcke erklärt.
- Schatten nur noch auf schwebenden Ebenen, Glanzkanten und Lichtverläufe in den Spielpanels weg.
- Dekorative Pfeile an Knöpfen entfernt, Richtungspfeile („Nächste Frage“) bleiben.
- Zeichenflächen (Simulation, Lagrange, Karte, Lunas Spiel, Flug, Lageanzeige) beschriftet.
- Die Einführung beim ersten Flug steht oben statt über der Rakete.
- Flamme aus mehreren flackernden Zungen, Plattennähte auf Tanks, weicher Stufenschatten,
  gekachelte Wiese, weniger Glanz an Sonne und Düse.

## Runde drei: Umsetzung und Entscheidungen

Umgesetzt, mit Test oder Prüflauf: Tempo gegen den Boden bis 20 km, ab 30 km gegen den Mittelpunkt,
dazwischen überblendet (keine Sprünge). Hinweis bei Autopilot-Zielen: „ohne Punkte (Autopilot)“.
Flag „Nach Plan“ wird erst beim Brennen gesetzt. Luftwiderstand in der Bahnvorhersage, Planung misst
am Lufteintritt, Test gegen den echten Flug ohne Fallschirm. Drehkreuz im Hochformat, Überlappung
ab 360 px behoben. Smoke-Test in der CI (ein Build). Kapitel 3: Messwerte als Liste statt drei
Kacheln. Zylinder der Rakete mit stärkerem Randabfall. Overlays aus der Flugansicht ausgelagert
(Schritt 1). Tests: Dialog-Fokus, Tautologie ersetzt, redundanter Test entfernt.

Entschieden (Standard, jederzeit änderbar):

| Frage                              | Entscheidung                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Ionentriebwerk ohne Solarflügel    | Mechanik bleibt, Bordbatterie reicht für Vollschub. Infotext nennt die Batterie.          |
| Autopilot-Läufe und Karrierepunkte | Missions- und Landepilot: keine Punkte. Hilfe-Pilot: zählt, weil er der Einstieg ist.     |
| Ziel „Nach Plan“                   | Nur gebrannt vom Spieler oder vom Autopiloten, der tatsächlich Schub gibt.                |
| Lande-Airbags und Beine            | Schräglage gleich (0,65 rad). Masse und Freischaltung unverändert.                        |
| Titan                              | Freischaltung 50 Punkte wie der Adler. Vorlagen bleiben spielbar.                         |
| Teile ohne Übergang                | Adapter zwischen 1,4 und 2,4 m bei Pfeil, Zwerg, Phönix, Sternwarte und Satellitenträger. |
| Jupiter-Oberflächendruck           | 1 bar (Folge des Venus-Fixes).                                                            |

## Offen

| Befund                                                   | Stand                                                                                                                                                                            |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rakete wirkt weiter flach                                | Die Schattierung ist nachgeschärft, aber das ist keine Materialarbeit. Eine echte Verbesserung braucht Teilebilder mit Metall, Nieten und Lichtführung je Teiltyp. Eigene Runde. |
| FlightScreen.tsx                                         | Overlays ausgelagert, die Hauptfunktion ist noch groß. Weitere Schritte: Tastatur, Telemetrie, Meldungen.                                                                        |
| Zwei redundante Tests                                    | Einer ist entfernt. Den zweiten habe ich nicht gefunden.                                                                                                                         |
| Smoke-Test in der CI                                     | Eingerichtet, läuft erst nach dem Push. Ergebnis im Workflow prüfen.                                                                                                             |
| Datei /vitest-final.txt im Dateisystem-Wurzelverzeichnis | Von einem Agenten angelegt. Von Hand entfernen.                                                                                                                                  |
| Dunkelmodus und Tablet                                   | Nicht in Screenshots geprüft.                                                                                                                                                    |
| Physik gegen Quellen                                     | Nicht geprüft.                                                                                                                                                                   |
| Wolken in Flughöhe                                       | Kamera skaliert auf die Rakete, Wolken sitzen bei 1,5 bis 8 km.                                                                                                                  |
| Simulator: nur „Szenario“ und „Mond“ offen               | Bewusst so.                                                                                                                                                                      |

Legende: ✅ behoben · 🔶 bewusst so entschieden · ⛔ ohne Gerät oder Zertifikat nicht lösbar
