# Auftrag: Design-Überarbeitung des Orbitlabors (gegen KI-Slop und Vibe-Code)

Dieser Auftrag ist vollständig auszuführen, Phase für Phase, ohne Rückfragen außer bei echten
Blockaden. Grundlage: `CLAUDE.md`, `docs/DESIGN-REGELN.md`, `docs/KI-REGELN.md` (vorher ganz
lesen). Branch: `claude/magical-mendel-rk6pwb`. Sprache aller Nutzertexte: Deutsch.

## Ausgangslage (gemessen beim Anlegen dieses Auftrags)

- Stile: `src/styles/global.css` (~2.500 Zeilen, App) und `src/rocket/game.css` (~3.500 Zeilen,
  Spiel). Darin ~157 fest eingetragene Hex-Farben außerhalb der Token-Blöcke, ~57 verschiedene
  Schriftgrößen, ~10 verschiedene Eckenradien (4, 5, 8, 9, 10, 11, 12, 14, 18 px …).
- Sichtbar (siehe `src/app/content.ts`): Start, Kapitel 2 (`Basics.tsx`, `GravityWidgets.tsx`),
  Kapitel 7 (`Hollow.tsx`, `HollowWidgets.tsx`), Simulator (`SimulatorPage.tsx`), Raketenwerft
  (`RocketPage.tsx`, `src/rocket/*`), Lunas Sternenreise (`KidsPage.tsx`), Missionen, Quiz,
  Download, Begriffe, Methodik, Quellen. Ausgeblendet bleiben: andere Kapitel, Lagrange-Labor,
  Stabilitätskarte (`SHOWN_CHAPTERS`, `SHOW_TOOLS` nicht ändern).
- Rahmen/Navigation: `src/app/App.tsx`; gemeinsame Bausteine: `src/ui/*`.
- Identität: Sternatlas + Messinginstrumente; Tokens in `:root` von `global.css`; Spiel-Tokens
  in `.game` von `game.css`; Schriften Jost / Source Serif 4 / IBM Plex Mono.

## Harte Grenzen

- Physik, Spiellogik, Autopiloten, Inhalte und Aussagen der Seminararbeit nicht ändern
  (Texte nur sprachlich straffen, Fakten und Zahlen unverändert).
- Keine neuen Abhängigkeiten, keine neuen Schriftfamilien.
- Kein `backdrop-filter`, kein `transform` auf Vorfahren von `.game` (Vollbild-Spiel),
  keine Leistungsverschlechterung (Spiel auf gedrosseltem Handy vorher/nachher messen).
- Ausgeblendete Seiten bleiben ausgeblendet, nichts löschen.
- Tests nicht abschwächen.

## Phase 1 – Bestandsaufnahme (keine Änderungen)

1. Dev-Server starten (`npx vite --port 5173`), Playwright aus
   `/opt/node22/lib/node_modules/playwright` (Chromium vorinstalliert).
2. Vor dem Spiel `localStorage['orbitlabor/rakete-einfuehrung-gesehen']='1'` setzen.
3. Ganzseitige Screenshots aller sichtbaren Seiten in fünf Ansichten: 1366×900 hell,
   1366×900 dunkel, Pixel 7 hoch, Pixel 7 quer, Tablet 800×1280 (Touch). Im Spiel zusätzlich:
   Startbildschirm, Werft, Rampe, Aufstieg, Umlaufbahn, Karte, Bordcomputer, Pause, Hilfe,
   Flugbericht, Herausforderungs-Einweisung.
4. Mängelliste in `docs/DESIGN-BEFUND.md` anlegen: je Befund Seite, Ansicht, verletzte Regel
   (Abschnitt aus `DESIGN-REGELN.md`), geplante Lösung. Mindestens prüfen: alle Muster aus
   Abschnitt 2, Kontraste (hell/dunkel), Überlappungen, abgeschnittene Texte, Touch-Ziele
   < 44 px, uneinheitliche Knöpfe, Floskel-Texte, fest eingetragene Farben/Größen/Radien.
5. Leistungs-Ausgangswert: Bildzeiten im Spiel auf Pixel 7 mit 4× CPU-Drosselung
   (Aufstieg, Karte, Umlaufbahn) notieren.

## Phase 2 – Gestaltungssystem festlegen

In `docs/DESIGN-REGELN.md` oben einen Abschnitt „Festgelegte Richtung“ anlegen und in den
CSS-Token-Blöcken umsetzen:

1. **Typ-Skala** als Tokens `--fs-1 … --fs-8` (z. B. 0.75 / 0.875 / 1 / 1.125 / 1.375 / 1.75 /
   2.5 rem / Hero per `clamp`). Alle `font-size` in beiden CSS-Dateien auf diese Tokens
   umstellen; Ziel: höchstens 9 verschiedene Werte je Datei.
2. **Abstände** als `--sp-1 … --sp-9` (4, 8, 12, 16, 24, 32, 48, 64, 96 px); alle `gap`,
   `padding`, `margin` darauf runden.
3. **Radien**: `--r-sm 6px` (Eingaben, kleine Knöpfe), `--r-md 10px` (Knöpfe, Felder),
   `--r-lg 14px` (Panels, Karten), `--r-pill 999px`. Alle anderen Werte ersetzen.
4. **Schatten**: genau zwei Stufen `--shadow-1` (anliegend), `--shadow-2` (schwebend: Menüs,
   Dialoge, Toasts). Sonst keine Schatten.
5. **Farben**: alle fest eingetragenen Hex-Werte außerhalb der Token-Blöcke durch Tokens
   ersetzen (Ausnahme: Canvas-Zeichencode in `*.ts`). Fehlende Rollen als Token ergänzen, für
   hell UND dunkel definieren. Kontrast jeder Text-Token-Kombination ≥ 4.5:1 prüfen
   (kleines Skript mit WCAG-Formel), Ergebnis in den Befund schreiben.
6. **Bewegung**: `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--dur-1 120ms` (Druck),
   `--dur-2 200ms` (Menüs), `--dur-3 280ms` (Dialoge). Alle Übergänge darauf umstellen,
   `transition: all` entfernen, Hover nur unter `(hover: hover) and (pointer: fine)`,
   `:active { transform: scale(0.97) }` für Knöpfe.
7. **Knopf-System**: genau drei App-Knopfarten (primär Messing, sekundär Linie, Text) und im
   Spiel eine einheitliche Knopfsprache (`.abtn`, `.hbtn`, `.gbtn`, `.stage-btn` angleichen:
   Höhe, Radius, Schrift, Zustände hover/aktiv/fokus/deaktiviert/an).

## Phase 3 – App-Rahmen und Startseite

1. **Navigation** (`App.tsx`, Sidebar/Topbar): klare Hierarchie (Gruppen-Labels klein,
   gesperrt; Einträge in Satzschreibung), aktiver Eintrag mit Messing-Markierung statt
   Hintergrundkasten, Theme-Umschalter ruhig. Handy: Menü als Schublade mit
   `overscroll-behavior: contain`, Ziele ≥ 44 px.
2. **Startseite** (`HomePage.tsx`): kein Standard-Hero. Aufbau als „Atlastafel“: links Titel,
   Problemfrage (Serif) und zwei Handlungen; rechts die Live-Simulation als Abbildung mit
   Bildunterschrift „Abb. 1 – …“ und Maßstab. „Die Antwort in drei Sätzen“ nicht als drei
   gleiche Karten, sondern als nummerierte Thesen mit feinen Trennlinien und Kennzeichnung
   (stabil / Absturz / Flucht) als Text+Symbol. Kapitelliste als Inhaltsverzeichnis
   (Nummer, Titel, Leitfrage, Seitenpfeil) ohne Kastenoptik. Raketenwerft-Banner als
   eigenständige, dunkle Bildtafel mit echter Spielgrafik statt Verlauf.
3. Überall: Eyebrow-Labels höchstens 3 Wörter, keine Floskeln, Zahlen mit Einheiten.

## Phase 4 – Kapitel 2 und 7, Simulator

1. **Kapitelseiten** (`ChapterPage.tsx`, `Basics.tsx`, `Hollow.tsx`, Widgets): Lesespalte
   65ch, Serif-Fließtext, Zwischenüberschriften mit Abschnittsnummer (2.1, 2.2 …),
   Formeln mit Luft und Legende, Experimente als „Versuch“-Tafeln: Titel „Versuch 2.3 – …“,
   Bedienelemente links/oben, Abbildung mit Achsenbeschriftung und Einheiten, Ergebnis als
   Messwert-Zeile in Monospace. Schieberegler einheitlich (Track, Daumen ≥ 24 px, Wert daneben
   mit Einheit). Vorher/nächster Kapitel-Navigation am Ende als ruhige Zeile.
2. **Diagramme** (`src/ui/charts`): Farben nur aus `--series-*`, Achsen/Raster aus `--axis`/
   `--grid`, Beschriftungen nie überlappend, Legende direkt an den Linien statt Kasten,
   hell/dunkel lesbar.
3. **Simulator** (`SimulatorPage.tsx`): Werkzeugleiste gruppieren (Szenario, Zeit, Ansicht,
   Export), Bedienfeld als ruhige Seitenleiste, Messwerte als Instrumententafel
   (Monospace, Einheiten, tabellarische Ziffern). Handy: Bedienfeld unter der Fläche,
   keine Überlappung.

## Phase 5 – Raketenwerft (Spiel)

1. **Startbildschirm** (`RocketPage.tsx`): Titelbild mit echter Szene (Rakete auf der Rampe aus
   dem Spiel-Renderer oder `RocketArt.tsx`), Rang/Punkte/Sterne als eine Instrumentenzeile statt
   drei Kacheln, Hauptknopf „Spielen“, sekundär „Herausforderungen“.
2. **Werft** (`Builder.tsx`): Teile-Leiste mit klarer Auswahl, Teilekarten mit Name, Masse,
   Kennwert (Schub/Isp/Treibstoff) in Monospace; Statistikleiste mit „→ Reichweite“; Stufen
   farblich nur über Markierung, nicht über bunte Kästen.
3. **Flug-HUD** (`FlightScreen.tsx`, `Navball.tsx`, `ComputerPanel.tsx`, `game.css`):
   Telemetrie als Instrument (Werte groß, Einheiten klein, Labels gesperrt), alle Panels
   gleiche Fläche/Radius/Linie, Meldungen einheitlich, Bordcomputer-Karten als Liste mit
   Trennlinien, Pause-Menü als ruhige Liste. Touch-Ziele ≥ 44 px, Daumenzonen beachten,
   Mitte frei für die Rakete. Keine Überlappungen in allen fünf Ansichten.
4. **Overlays** (`Overlays.tsx`, Flugbericht, Einweisung, Einführung): gleiche Dialog-Optik,
   Eintritt 280 ms aus `scale(0.97)` + Deckkraft.
5. Leistung nach Phase 5 erneut messen; nicht schlechter als Ausgangswert (±5 %).

## Phase 6 – Übrige Seiten

Missionen, Quiz, Lunas Sternenreise (kindgerecht, aber gleiches System, größere Ziele),
Download (drei Plattformen als ruhige Liste mit Symbol, Größe, Anleitung), Begriffe
(Glossar als Definitionsliste mit Anker-Links), Methodik, Quellen (bibliografische
Typografie, hängender Einzug).

## Phase 7 – Prüfen

1. Alle Screenshots aus Phase 1 erneut erzeugen; je Seite Vorher/Nachher nebeneinander
   (ein Bild pro Seite) ansehen; jeden Befund in `DESIGN-BEFUND.md` als erledigt/offen
   markieren.
2. Abnahme-Checkliste (Abschnitt 11 in `DESIGN-REGELN.md`) vollständig abhaken.
3. Automatisch prüfen: keine Konsolenfehler auf allen Seiten; kein horizontales Scrollen
   (`document.documentElement.scrollWidth <= innerWidth`) in allen Ansichten; Kontrast-Skript
   grün; Zählung: Hex-Farben außerhalb Token-Blöcken = 0, Schriftgrößen ≤ 9 Werte je Datei,
   Radien nur Tokens.
4. `npm run check` grün, `npx tsx scripts/missions.ts` und `npx tsx scripts/scenarios.ts` grün.
5. Leistungsvergleich (Phase 1, Punkt 5) dokumentieren.

## Phase 8 – Ausliefern

1. Commits je Phase mit deutschen Nachrichten (was und warum), Push auf den Branch.
2. Workflow „Windows-EXE, Mac-App und Android-APK“ abwarten; Release `app` muss
   `Orbitlabor.exe`, `Orbitlabor-Mac-Apple-Chip.zip`, `Orbitlabor.apk` vom neuen Commit
   enthalten.
3. Artefakt https://claude.ai/artifact/6LSGL7zXa6P5oVKLWaXXzt aktualisieren
   (`npm run build:artifact`, `dist-artifact/index.html` mit `files`-Map; entfernte Dateien
   auf `null`).
4. `docs/KRITIK.md`: neuer Abschnitt mit den Befunden und Lösungen.
5. Bericht an den Nutzer (deutsch, kurz, ohne Floskeln): sichtbare Änderungen, 3–4
   Vorher/Nachher-Bilder, Messwerte, offene Punkte.
