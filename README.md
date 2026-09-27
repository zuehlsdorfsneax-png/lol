# Orbitlabor – Bahnstabilität im Drei-Körper-System

Interaktive Web-App zur Seminararbeit Astronomie mit der Problemfrage:

> „Unter welchen physikalischen Bedingungen ist ein Mond in einem Drei-Körper-System
> (Erde–Mond–Sonne) langfristig stabil, und wann würde er abstürzen oder das System verlassen?“

Das Orbitlabor ist der **Eigenanteil** der Arbeit: eine digitale Drei-Körper-Simulation mit frei
einstellbaren Parametern. Dazu kommen sechs Kapitel mit interaktiven Experimenten, eine
Stabilitätskarte aus tausenden Simulationen, ein Lagrange-Labor und ein Spielmodus mit Missionen
und Quiz. Das vollständige Konzept steht in [`docs/KONZEPT.md`](docs/KONZEPT.md).

## Schnellstart

Voraussetzung: Node.js ≥ 22.13.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Befehl              | Zweck                                                       |
| ------------------- | ----------------------------------------------------------- |
| `npm run dev`       | Entwicklungsserver                                          |
| `npm run build`     | Typprüfung + Produktions-Build nach `dist/`                 |
| `npm run preview`   | Build lokal ausliefern                                      |
| `npm test`          | Automatische Tests (Physik, Simulation, Missionen, Engine)  |
| `npm run calibrate` | Stabilitätsgrenzen per Simulation bestimmen (für Kapitel 6) |
| `npm run check`     | Typen, Lint, Formatierung und Tests (wie in der CI)         |

## Was die App enthält

| Bereich               | Inhalt                                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Simulator**         | Erde, Mond, Sonne mit allen Parametern; 17 Szenarien; drei Bezugssysteme; Kräfte; Hill-Sphäre, Roche-Grenze, L-Punkte; Teilchenwolken; Vorbeiflüge; Live-Messwerte; Stabilitätsprognose; Diagramme; CSV- und Bild-Export |
| **Stabilitätskarte**  | Parallel gerechnete Karten (Web Worker) mit Theorie-Linien, z. B. Abstand × Geschwindigkeit                                                                                                                              |
| **Lagrange-Labor**    | Effektives Potential, Nullgeschwindigkeitskurven, Eigenwertanalyse, Teilchen per Mausziehen                                                                                                                              |
| **Kapitel 1–6**       | Genau die Gliederung der Arbeit, mit Formeln, Beweisen und Experimenten                                                                                                                                                  |
| **Missionen**         | 9 Aufträge mit Sternen, u. a. Echtzeit-Steuerung am instabilen Punkt L1 und eine Trojaner-Mission                                                                                                                        |
| **Quiz**              | 18 Fragen mit Erklärungen                                                                                                                                                                                                |
| **Methodik**          | Modellannahmen, Integratorvergleich, Validierung gegen Messwerte, Vorschlag für den Aufbau der Arbeit                                                                                                                    |
| **Quellen & Formeln** | Formelsammlung und Literatur                                                                                                                                                                                             |

### Die Kapitel

1. **Hohlmond-Theorie (widerlegt)** – Schalentheorem, nötige Schalendichte, Trägheitsmoment (Rollversuch), Mondbeben, Festigkeit
2. **Herleitung der Gravitationsgesetze** – Kepler-Labor, 1/r² aus Kepler III, Newtons Mondrechnung, Satz von Bertrand
3. **Störung durch die Sonne** – Kräftevergleich, Gezeitenfeld, Evektion, Apsidendrehung (gemessen: 8,7 statt 8,85 Jahre)
4. **Lagrange-Punkte (Beweis)** – Beweis für L4/L5, L1–L3 numerisch, Eigenwerte, Routh-Kriterium, Nullgeschwindigkeitskurven
5. **Warum stabil?** – Hill-Sphäre, Jacobi-Kriterium (Beweis der Hill-Stabilität), Stabilitätsgrenze, Coriolis-Argument
6. **Wann instabil?** – Grenzwerte aus Theorie und Simulation, Stabilitätskarte, weitere Mechanismen

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
  quiz/         Quizfragen
  validation/   Integratorvergleich und Vergleich mit Messwerten
  pages/        Seiten und Kapitel
  ui/           Bedienelemente, Diagramme, Formeln (KaTeX), Formatierung
  engine/       Kleine Spiel-Engine: Spielschleife, Eingabe, Speicherstand, Ton
  app/          Navigation und Routing
scripts/        Kalibrierung der Stabilitätsgrenzen
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
