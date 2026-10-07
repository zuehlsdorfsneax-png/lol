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
