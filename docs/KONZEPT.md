# Konzept: Orbitlabor

Dieses Dokument beschreibt Planung und Entwurf der App als Eigenanteil der Seminararbeit
„Bahnstabilität“.

## 1. Ziel

Die Problemfrage – _Unter welchen Bedingungen ist ein Mond im System Erde–Mond–Sonne langfristig
stabil, und wann stürzt er ab oder verlässt das System?_ – soll nicht nur beschrieben, sondern
**selbst untersucht** werden. Die App ist deshalb dreierlei:

1. **Werkzeug** für die Arbeit: Simulator, Stabilitätskarte und Lagrange-Labor liefern Ergebnisse,
   Abbildungen und Rohdaten (CSV).
2. **Lernumgebung**: Sechs Kapitel folgen genau der Gliederung der Arbeit und verbinden Text,
   Formeln und Experimente.
3. **Spiel**: Missionen und Quiz machen die Grenzen der Stabilität erlebbar – für Präsentation und
   Mitschüler.

## 2. Zuordnung zur Gliederung der Arbeit

| Gliederungspunkt der Arbeit                        | Umsetzung in der App                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| Hohle-Mond-Theorie (widerlegen)                    | Kapitel 1: Schalentheorem, Dichte-Rechner, Trägheitsmoment, Rollversuch    |
| Herleitung der Gravitationsgesetze                 | Kapitel 2: Kepler-Labor, Mondrechnung, Kraftgesetz-Experiment              |
| Wie stört die Sonne das Zwei-Körper-System?        | Kapitel 3: Gezeitenfeld, Präzessionsmessung, Voreinstellungen              |
| Lagrange-Punkte (beweisen)                         | Kapitel 4 + Lagrange-Labor: Beweis, Eigenwerte, Nullgeschwindigkeitskurven |
| Wieso ist das Drei-Körper-System stabil?           | Kapitel 5: Hill-Sphäre, Jacobi-Beweis, Stabilitätsgrenze                   |
| Was braucht es, damit es instabil wird?            | Kapitel 6 + Stabilitätskarte: Grenzwerte aus Theorie und Simulation        |
| Eigenanteil: Simulation mit anpassbaren Parametern | Simulator, Stabilitätskarte, Methodik & Validierung                        |

## 3. Module

### Simulator

- Parameter: Massen von Sonne, Erde, Mond; Erdbahn (Abstand, Exzentrizität); Mond (Abstand,
  Geschwindigkeit, Richtung, Startposition); Teilchenwolke; vorbeifliegender Störkörper
- Bezugssysteme: erdfest, mitrotierend (Sonne–Erde), ruhend
- Anzeigen: Bahnspuren, Kraftvektoren (inkl. Gezeitenkraft), Hill-Sphäre, Stabilitätsgrenze,
  Roche-Grenze, L1/L2
- Ereignisse: Absturz, Roche-Grenze, Flucht, Sturz in die Sonne, Zusammenstöße (mit Verschmelzung)
- Messwerte: Bahnelemente, Hill-Anteil, Kräfteverhältnis, Jacobi-Konstante, Energiefehler
- Prognose-Checkliste aus den Startwerten (Absturz, Roche, Fluchtgeschwindigkeit, Domingos-Grenze,
  Jacobi-Kriterium), die die Simulation dann bestätigt oder widerlegt
- 17 Voreinstellungen, Diagramme mit Tabellenansicht, CSV- und Bild-Export, Schub-Knöpfe

### Stabilitätskarte

- Zwei frei wählbare Parameter als Achsen, jede Zelle eine eigene Langzeitsimulation
- Parallel in Web Workern, fortschreitende Anzeige, Farbmodi „Ergebnis“ und „Lebensdauer“
- Theorie-Linien (Absturzkurve, Roche-Kurve, Fluchtgeschwindigkeit, Domingos-Grenze, Hill-Skalierung)
- Klick auf ein Feld öffnet die Konfiguration im Simulator

### Lagrange-Labor

- Eingeschränktes Drei-Körper-Problem für Erde–Mond, Sonne–Erde, Sonne–Jupiter, Pluto–Charon und
  beliebiges μ
- Effektives Potential als Farbe, Höhenlinien C(L1–L3), verbotene Zone eines Teilchens
- Teilchen per Mausziehen, Tabelle mit Eigenwerten und Stabilität

### Spielmodus

- Missionen mit einem Regler und Sternen (Grenzen „fast genau treffen“ gibt drei Sterne):
  erste Umlaufbahn, Mondabsturz, Ausbruch, Grenzgänger, rückwärts weiter, näher an die Sonne,
  Schwergewicht
- Echtzeitspiel „L1-Station“: Sonde mit Triebwerk am instabilen Punkt halten, Vorhersagelinie,
  Treibstoffbudget
- „Trojaner“: Asteroid bei L4 platzieren, 50 Jupiterumläufe überstehen
- Quiz mit 18 Fragen; Fortschritt wird im Browser gespeichert

## 4. Didaktisches Prinzip

Jedes Kapitel folgt dem Muster **Frage → Herleitung → Experiment → Ergebnis**. Abbildungen sind
wie in einer wissenschaftlichen Arbeit nummeriert (Abb. 3.2, Formel 4.7), damit sie sich direkt
zitieren lassen. Kästen „Merke“, „Beweisidee“ und „Für die Seminararbeit“ strukturieren.

## 5. Technik

- Vite + TypeScript + Preact, KaTeX für Formeln, selbst gehostete Schriften (keine externen Dienste)
- Physik vollständig getrennt von der Oberfläche (`src/physics`) und mit über 100 Tests abgesichert
- Numerik: Velocity-Verlet mit adaptiver Schrittweite; Euler, Euler-Cromer, RK4 und Yoshida zum
  Vergleich
- Kalibrierskript (`npm run calibrate`) bestimmt die Grenzwerte reproduzierbar

## 6. Validierung

| Größe             | Simulation    | Messwert       |
| ----------------- | ------------- | -------------- |
| Siderischer Monat | 27,319 d      | 27,322 d       |
| Synodischer Monat | 29,528 d      | 29,531 d       |
| Siderisches Jahr  | 365,25 d      | 365,26 d       |
| Apsidendrehung    | 8,73 a        | 8,85 a         |
| Abstand Erde–L1   | 1,492 Mio. km | ≈ 1,49 Mio. km |

Angepasst wurde nur die Startphase des Mondes (für den siderischen Monat); alle anderen Werte sind
unabhängige Vorhersagen.

## 7. Designentscheidungen

- Farbwelt „Sternatlas“: kühles Papier mit nachtblauer Tinte und Messing, im Dunkelmodus Nachthimmel;
  der Weltraum in den Simulationen bleibt immer dunkel
- Schriften: Jost (angelehnt an Futura, die Schrift der Apollo-11-Gedenkplakette auf dem Mond),
  Source Serif 4 für Lesetexte, IBM Plex Mono für Messwerte
- Diagrammfarben auf Farbfehlsichtigkeit geprüft; jede Grafik hat eine Tabellenansicht

## 8. Ideen für später

- Dreidimensionale Rechnung (Bahnneigung, Knotendrehung 18,6 Jahre, Finsternisse)
- Gezeitenreibung (Mond entfernt sich, Tageslänge wächst)
- Weitere Monde und Planeten (Mars mit Phobos, Jupiter mit galileischen Monden)
- Resonanzen und chaotische Bereiche mit Ljapunov-Exponenten sichtbar machen
- Offline-Nutzung als installierbare App (Service Worker)
