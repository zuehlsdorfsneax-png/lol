# Hinweise für Claude

- App-Ausgaben immer in **drei Varianten** bauen und auf GitHub bereitstellen:
  Windows-EXE (`npm run exe` → `release/Orbitlabor.exe`), Mac mit Apple-Chip
  (`npm run mac` → `release/Orbitlabor-Mac-Apple-Chip.zip`) und Android
  (`npm run apk` → `release/Orbitlabor.apk`, braucht Java 21 und das Android-SDK).
- Der Workflow `.github/workflows/windows-exe.yml` baut alle drei, testet sie und legt sie gemeinsam
  im GitHub-Release `app` ab (Download-Links auf der Seite „Download“).
- Android-Projekt: `android/` (Capacitor). Symbole neu erzeugen mit
  `python3 scripts/android-icons.py`.
- Texte für Nutzer auf Deutsch.
- Vor jeder Design-, Oberflächen- oder Grafik-Arbeit `docs/DESIGN-REGELN.md` vollständig lesen
  und befolgen (kein KI-Einheitslook; Abnahme-Checkliste am Ende).
- Für jede Arbeit (Code, Texte, Antworten) `docs/KI-REGELN.md` befolgen: Arbeitsweise mit
  eigener Prüfschleife, sparsamer Verbrauch, kein KI-typischer Code- oder Schreibstil.
- Kapitelstand: Sichtbar sind Kapitel 2, 3 und 6 (Hohle-Mond-Theorie), gesteuert über
  `SHOWN_CHAPTERS` in `src/app/content.ts`. Kapitel 4, 5, 7 (Eigenanteil) und 8 (Fazit) kommen
  später dazu; das frühere Kapitel 6 (Gezeitenreibung) ist entfallen, die Kapitel danach sind
  neu nummeriert. Die Texte der sichtbaren Kapitel stammen von der Autorin bzw. dem Autor: nicht
  umformulieren, keine eigenen Zusätze, nur Rechtschreibung. Versuche brauchen eine Liste
  „Ausprobieren“ (`steps` an `Figure`).
