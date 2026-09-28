# Orbitlabor – Bahnstabilität im Drei-Körper-System

Interaktive Web-App zur Seminararbeit Astronomie mit der Problemfrage:

> „Unter welchen physikalischen Bedingungen ist ein Mond in einem Drei-Körper-System
> (Erde–Mond–Sonne) langfristig stabil, und wann würde er abstürzen oder das System verlassen?“

Das Orbitlabor ist der **Eigenanteil** der Arbeit: eine digitale Drei-Körper-Simulation mit frei
einstellbaren Parametern. Dazu kommen die neun Kapitel der Arbeit mit interaktiven Experimenten,
eine Stabilitätskarte aus tausenden Simulationen, ein Lagrange-Labor und drei Spiele: die
**Raketenwerft** (Rakete bauen und durchs Sonnensystem fliegen), **Lunas Sternenreise** (für Jüngere) und
Missionen mit Quiz. Das vollständige Konzept steht in [`docs/KONZEPT.md`](docs/KONZEPT.md), die kritische Prüfung mit allen behobenen Mängeln in [`docs/KRITIK.md`](docs/KRITIK.md).

**Für Windows:** [Orbitlabor.exe herunterladen](https://github.com/zuehlsdorfsneax-png/lol/releases/latest/download/Orbitlabor.exe)
(etwa 8 MB, ohne Installation, siehe unten).

## Schnellstart

Voraussetzung: Node.js ≥ 22.13.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Befehl                   | Zweck                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `npm run dev`            | Entwicklungsserver                                                                               |
| `npm run build`          | Typprüfung + Produktions-Build nach `dist/`                                                      |
| `npm run preview`        | Build lokal ausliefern                                                                           |
| `npm test`               | Automatische Tests (Physik, Simulation, Missionen, Spiele, Engine)                               |
| `npm run calibrate`      | Stabilitätsgrenzen per Simulation bestimmen (für Kapitel 8)                                      |
| `npm run build:artifact` | Variante mit eingebetteten Schriften für eingebettete Seiten; CSV-Export über die Zwischenablage |
| `npm run check`          | Typen, Lint, Formatierung und Tests (wie in der CI)                                              |
| `npm run exe`            | Windows-EXE nach `release/Orbitlabor.exe` bauen (braucht zusätzlich Go ≥ 1.22)                   |

## Was die App enthält

| Bereich                | Inhalt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Simulator**          | Erde, Mond, Sonne mit allen Parametern; 17 Szenarien; drei Bezugssysteme; Kräfte; Hill-Sphäre, Roche-Grenze, L-Punkte; Teilchenwolken; Vorbeiflüge; Live-Messwerte; Stabilitätsprognose; Diagramme; CSV- und Bild-Export                                                                                                                                                                                                                                                                                                                              |
| **Stabilitätskarte**   | Parallel gerechnete Karten (Web Worker) mit Theorie-Linien, z. B. Abstand × Geschwindigkeit                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Lagrange-Labor**     | Effektives Potential, Nullgeschwindigkeitskurven, Eigenwertanalyse, Teilchen per Mausziehen                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Kapitel 1–9**        | Genau die Gliederung der Arbeit, mit den Texten der Arbeit, Formeln, Beweisen und Experimenten                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Raketenwerft**       | Rakete bauen (Raketengleichung, Stufen, Seitenbooster, Hangar, 17 Bauteile), verkleinertes Sonnensystem mit Sonne, Merkur, Venus, Erde, Mond, Mars, Phobos, Jupiter und Europa; Raumstation mit Andocken, RCS und Tanken; Lageanzeige mit SAS; Manöverknoten auf der Karte; Bordcomputer (Hohmann-Transfers, Kurskorrektur, Rendezvous, Rückflug, Wiedereintritt, Lande-Autopilot); Zeitsprung und Kepler-Schienen; Satelliten; Hitzeschild; 9 Herausforderungen mit Sternen, 36 Ziele, 7 Ränge; Tag und Nacht, Wolken, Ton, Gamepad, Countdown, Foto |
| **Lunas Sternenreise** | Schleuder-Spiel für Jüngere: sechs Level, echte Schwerkraft, Sterne einsammeln                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Missionen**          | 9 Aufträge mit Sternen, u. a. Echtzeit-Steuerung am instabilen Punkt L1 und eine Trojaner-Mission                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Quiz**               | 21 Fragen mit Erklärungen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Methodik**           | Modellannahmen, Integratorvergleich, Validierung gegen Messwerte, Vorschlag für den Aufbau der Arbeit                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Quellen & Formeln**  | Formelsammlung und Literatur                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

### Die Kapitel

1. **Einleitung** – Problemfrage, Vorgehen, Aufbau
2. **Physikalische Grundlagen** – Newtonsche Gesetze (Texte der Arbeit), Gravitationsgesetz, Kepler-Labor, N-Körper-Problem und Schwerpunkt
3. **Einfluss der Sonne** – Kräftevergleich, Gezeitenfeld, Evektion, Apsidendrehung
4. **Lagrange-Punkte** – Beweis für L4/L5, L1–L3 numerisch, Eigenwerte, Routh-Kriterium
5. **Die Hill-Sphäre der Erde** – Hill-Radius, Jacobi-Kriterium, Stabilitätsgrenze
6. **Gezeitenreibung** – Drehimpulserhaltung, Tag- und Monatslänge, synchrone Bahn
7. **Widerlegung der Hohle-Mond-Theorie** – Texte der Arbeit, Schalentheorem, Schwerpunkt- und Umlaufzeitrechnung
8. **Eigenanteil: Simulation** – Aufbau, Formeln, Stabilitätsfälle, Validierung
9. **Fazit** – Antwort auf die Problemfrage

### Zentrale Ergebnisse

| Bedingung                        | Theorie             | Simulation (30 Jahre) |
| -------------------------------- | ------------------- | --------------------- |
| Absturz bei Startgeschwindigkeit | < 0,203 · v_Kreis   | < 0,205 · v_Kreis     |
| Roche-Grenze                     | < 0,302 · v_Kreis   | < 0,303 · v_Kreis     |
| Flucht (mit Sonne)               | –                   | > 1,19 · v_Kreis      |
| Flucht (ohne Sonne)              | ≥ 1,414 · v_Kreis   | ≥ 1,415 · v_Kreis     |
| Abstand prograd                  | 0,48 r_H (Domingos) | 0,478 r_H             |
| Abstand retrograd                | 0,91 r_H (Domingos) | 0,923 r_H             |
| Erde näher an der Sonne          | < 0,52 AE           | < 0,524 AE            |
| Schwerere Sonne                  | > 6,6 M☉            | > 6,5 M☉              |

Der heutige Mond kreist bei 0,26 Hill-Radien, weit innerhalb aller Grenzen.

## Projektstruktur

```
src/
  physics/      Physik ohne Oberfläche: N-Körper, Integratoren, Bahnelemente, Szenarien,
                eingeschränktes Drei-Körper-Problem, Kriterien, Hohlmond, Stabilitätsläufe
  sim/          Laufende Simulation (Ereignisse, Spuren, Messreihen), Darstellung, Voreinstellungen
  stability/    Stabilitätskarte mit Web Worker
  lagrange/     Rotierendes System: Potentialfeld, Höhenlinien, Teilchen, Systeme
  missions/     Spielmodus: Missionen, L1-Spiel, Trojaner, Fortschritt, Klänge
  rocket/       Raketenwerft: Spielwelt, Kepler-Bahnen, Bauteile, Flugphysik, Manöver-Planer,
                Autopiloten, Herausforderungen, Flugszene, Karte, Lageanzeige, Oberfläche, Klänge
  kids/         Lunas Sternenreise (Level und Spiel)
  quiz/         Quizfragen
  validation/   Integratorvergleich und Vergleich mit Messwerten
  pages/        Seiten und Kapitel
  ui/           Bedienelemente, Diagramme, Formeln (KaTeX), Formatierung
  engine/       Kleine Spiel-Engine: Spielschleife, Eingabe, Speicherstand, Ton
  app/          Navigation und Routing
scripts/        Kalibrierung der Stabilitätsgrenzen, Bau der Windows-EXE
desktop/        Windows-Starter (Go) und Programmsymbol
tests/          Automatische Tests
docs/           Konzept
```

## Physik und Numerik in Kürze

- Newtonsche Gravitation zwischen Punktmassen, ebene Bewegung, SI-Einheiten
- Standardverfahren **Velocity-Verlet** (symplektisch) mit adaptiver Schrittweite
  `Δt = η · min(√(r³/GM), r/v)`; wählbar sind außerdem Euler, Euler-Cromer, Runge-Kutta 4 und Yoshida (4. Ordnung)
- Validierung: siderischer und synodischer Monat, siderisches Jahr, Apsidendrehung und L1-Abstand
  stimmen mit Messwerten überein (siehe Seite „Methodik & Validierung“)

## Veröffentlichen

`npm run build` erzeugt eine statische Seite in `dist/`, die auf jedem Webhoster läuft
(GitHub Pages, Netlify …). Schriften werden mitgeliefert, es werden keine externen Dienste
geladen.

## Windows-EXE

Download: **https://github.com/zuehlsdorfsneax-png/lol/releases/latest/download/Orbitlabor.exe**

Die EXE (etwa 8 MB) enthält die komplette App. Beim Start öffnet sie einen kleinen Server nur auf
dem eigenen Rechner (`127.0.0.1:47173`) und zeigt die App in einem App-Fenster von Microsoft Edge,
das auf jedem Windows 10/11 vorhanden ist; fehlt Edge, übernimmt der Standardbrowser. Schließt man
das Fenster, beendet sich das Programm. Spielstände bleiben erhalten.

- **Selbst bauen:** `npm run exe` (Node und Go ≥ 1.22) → `release/Orbitlabor.exe`
- **Automatisch:** Die GitHub-Action _Windows-EXE_ baut die Datei bei jedem Push, testet sie auf
  einem Windows-Rechner (Server, Dateitypen, Edge-Fenster) und veröffentlicht sie als Release
  „Orbitlabor für Windows“ unter dem festen Link oben.
- **Signatur:** Die EXE ist nicht signiert. Ein Zertifikat, dem Windows vertraut, gibt es nur
  gegen Geld und nach Prüfung einer echten Person oder Firma (z. B. über Certum, SignPath oder
  Azure Trusted Signing). Bis dahin fragt Windows SmartScreen beim ersten Start nach:
  „Weitere Informationen“ → „Trotzdem ausführen“.
