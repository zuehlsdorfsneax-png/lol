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

## Offen

| Befund                                                                        | Stand | Grund                                                                                       |
| ----------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| Sicherheitsabstand an der Kerbe auf einem echten iPhone                       | ⛔    | Kein Gerät hier.                                                                            |
| Windows-Warnung „unbekannter Herausgeber“                                     | ⛔    | Braucht ein gekauftes Code-Signing-Zertifikat.                                              |
| Luftdruck im Spiel auf 2 bar gedeckelt                                        | 🔶    | Spielentscheidung. Ob die App das erklärt, ist nicht geprüft.                               |
| Sehr große Dateien: `flight.ts`, `FlightScreen.tsx`, `game.css`, `global.css` | offen | Aufteilung braucht eine eigene Runde.                                                       |
| Farben in den Zeichenroutinen sind teils Einzelwerte                          | offen | Planeten- und Gesteinsfarben bleiben bewusst. Himmel und Overlays sollten Tokens lesen.     |
| Wolken sitzen bei 1,5 bis 8 km und sind im Flug unsichtbar                    | 🔶    | Die Kamera skaliert auf die Rakete. Wolken in Flughöhe bräuchten eine andere Kameraführung. |
| Simulator: nur „Szenario“ und „Mond“ sind beim Öffnen aufgeklappt             | 🔶    | Die Mond-Regler sind das Herz der Arbeit. Bewusst so gelassen.                              |
| Dunkelmodus und Tablet nicht in Screenshots geprüft                           | offen | Nur Smoke-Test, kein Bildvergleich.                                                         |
| Physik gegen Quellen nachgerechnet                                            | offen | Nicht Teil dieser Runde.                                                                    |

Legende: ✅ behoben · 🔶 bewusst so entschieden · ⛔ ohne Gerät oder Zertifikat nicht lösbar
