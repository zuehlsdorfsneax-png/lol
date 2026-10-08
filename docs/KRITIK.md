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

## Umsetzungsrunde (Befundliste aus fünf Bereichen)

Umgesetzt, jeweils mit Test oder Prüflauf: Lageanzeige und SAS-Knöpfe auf dem Handy, Leertaste
zündet keine Stufe mehr bei fokussierten Knöpfen, Dialoge mit Fokus und Inert, Menü-Knöpfe
schließen, Meldungen ausblendbar, Hitze und Tank mit Zahl, Ionen-Brenndauer mit Stromfaktor,
Landung und Start auf drehenden Monden (Europa, Ganymed), Ionen-Brennmitte am Knoten,
Venus-Triebwerke mit Bodenschub (Druck auf den Meereswert gedeckelt), Phobos-Mindestabstand,
Sandkasten-Sterne nicht gespeichert, Fortschrittsdaten geprüft, Missionsprüflauf mit Abschluss am
Ende, stetiges Seitenlicht, weiche Flamme, Feuer über Rauch, Gebirgsumriss, Nachtschein der
Planeten, Himmelsebene an die Pixeldichte gekoppelt.

## Offen

Entscheidungen der Spielleitung (Spielwerte, nicht umgesetzt):

| Befund                                                                      | Frage                                                                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Ionentriebwerk ohne Solarflügel läuft mit voller Leistung                   | Schub ohne Strom auf null setzen, oder Infotext „Batterie“? Die Ionensonde Dämmerung kommt am Ceres mit 46.500 m/s Reserve an. |
| Missions- und Lande-Autopilot vergeben volle Karriereziele                  | Sollen Autopilot-Läufe Karrierepunkte bringen?                                                                                 |
| Ziel „Nach Plan“ wird durch den Manöver-Autopiloten trivial                 | Nur Handmanöver zählen?                                                                                                        |
| Lande-Airbags schlagen Stoßdämpfer-Beine (Masse, Freischaltung, Schräglage) | Welche Lande-Stufe ist gewollt?                                                                                                |
| Titan ohne Freischaltung, Adler mit 50 Punkten schwächer                    | Titan ebenfalls freischalten?                                                                                                  |
| Neun Teile in keiner Vorlage, Zwischenstufe fehlt                           | Teile in Vorlagen aufnehmen?                                                                                                   |
| Oberflächendruck Jupiter jetzt 1 bar statt 2 (Folge des Venus-Fixes)        | Wert bestätigen.                                                                                                               |

Umsetzung offen:

| Befund                                                                            | Stand                                                                                                                                                 |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Luftwiderstand in der Bahnvorhersage (physik-4)                                   | Ein Entwurf liegt im Scratchpad. planner.ts braucht eine Anpassung (Fallschirm-Annahme, Zielhöhe), sonst schlagen drei Tests fehl.                    |
| Geschwindigkeitsanzeige nach Landung auf drehenden Monden                         | Misst gegen den Mittelpunkt: Mond rund 1,4 m/s, Europa rund 9,6 m/s statt 0. FlightScreen über speedFrame.                                            |
| FlightScreen.tsx: eine Funktion über rund 2.280 Zeilen                            | Aufteilung in Schritten mit Screenshot-Vergleich.                                                                                                     |
| Handy Hochformat: rechter Pfeil des Drehkreuzes von der Schubleiste angeschnitten | Ursache nicht geklärt.                                                                                                                                |
| Einfangen-Text nennt die Richtung fest (physik-6)                                 | Kosmetisch, von der Prüfung verworfen.                                                                                                                |
| Gegenprüfung (niedrig)                                                            | Dialog/isolate ohne Test (KI-REGELN §3), zwei redundante Tests, ein tautologischer Test in tests/rocket-physik.test.ts, neue Einzelwerte in game.css. |
| Smoke-Test läuft nicht in der CI                                                  | Browser im Workflow einrichten.                                                                                                                       |
| Workflow-Läufe für die Commits seit 6ff6675                                       | Noch nicht bestätigt.                                                                                                                                 |
| Grafik nur teilweise per Screenshot geprüft                                       | Orbit ja, Werft und Nachtseite nicht.                                                                                                                 |
| Datei /vitest-final.txt im Dateisystem-Wurzelverzeichnis                          | Von einem Agenten angelegt, Löschen wurde blockiert. Von Hand entfernen.                                                                              |

Älter, weiterhin offen:

| Befund                                                            | Stand                                   |
| ----------------------------------------------------------------- | --------------------------------------- |
| Sicherheitsabstand an der Kerbe auf einem echten iPhone           | ⛔ Kein Gerät hier.                     |
| Windows-Warnung „unbekannter Herausgeber“                         | ⛔ Braucht ein Code-Signing-Zertifikat. |
| Wolken sitzen bei 1,5 bis 8 km und sind im Flug unsichtbar        | 🔶 Kamera skaliert auf die Rakete.      |
| Simulator: nur „Szenario“ und „Mond“ sind beim Öffnen aufgeklappt | 🔶 Bewusst so.                          |
| Dunkelmodus und Tablet nicht in Screenshots geprüft               | Offen.                                  |
| Physik gegen Quellen nachgerechnet                                | Offen.                                  |

Legende: ✅ behoben · 🔶 bewusst so entschieden · ⛔ ohne Gerät oder Zertifikat nicht lösbar
