# Hinweise für Claude

- Desktop-Ausgaben immer in **zwei Varianten** bauen und auf GitHub bereitstellen:
  Windows-EXE (`npm run exe` → `release/Orbitlabor.exe`) und Mac mit Apple-Chip
  (`npm run mac` → `release/Orbitlabor-Mac-Apple-Chip.zip`).
- Der Workflow `.github/workflows/windows-exe.yml` baut beide, testet sie und legt sie gemeinsam im
  GitHub-Release `app` ab (Download-Links auf der Seite „Download“).
- Texte für Nutzer auf Deutsch.
