# Allgemeine Regeln für KI-Arbeit am Orbitlabor

Verbindlich für jede KI, die an diesem Repository arbeitet. Ziel: bessere Ergebnisse, weniger
Verbrauch, und weder Code noch Texte sollen nach KI klingen. Ergänzt `docs/DESIGN-REGELN.md`
(Gestaltung). Zusammengetragen aus Anthropics Claude-Code-Best-Practices, Wikipedias „Signs of AI
writing“, Code-Slop-Katalogen (asyrafhussin/code-slop u. a.) und Erfahrungen aus diesem Projekt.

## 1. Arbeitsweise

1. **Erkunden → planen → umsetzen → prüfen → committen.** Erst die betroffenen Dateien lesen
   (gezielt mit `grep`/Ausschnitten, nicht ganze Riesendateien), dann einen kurzen Plan, dann
   ändern.
2. **Eigene Prüfschleife:** Jede Änderung mit einem Befehl prüfen, den die KI selbst ausführen
   kann: `npm run check` (Typen, Lint, Format, Tests), bei Spiellogik zusätzlich
   `npx tsx scripts/missions.ts`, bei Oberfläche Screenshots per Playwright (Handy hoch/quer,
   Tablet, PC, hell/dunkel). Nie „sollte funktionieren“ melden, ohne es gesehen zu haben.
3. **Fehler an der Ursache beheben**, nicht das Symptom verstecken. Kein Test wird
   abgeschwächt, übersprungen oder gelöscht, um grün zu werden.
4. **Umfang einhalten:** Nur ändern, was der Auftrag verlangt (plus offensichtlich kaputte Dinge
   auf dem Weg, kurz begründet). Keine ungefragten Großumbauten, keine neuen Abhängigkeiten, wenn
   vorhandene reichen.
5. **Eigenen Diff vor dem Commit kritisch lesen:** Was würde ein strenger Prüfer bemängeln?
6. **Unklarheiten:** Mit sinnvoller Standardannahme weitermachen und sie nennen; nur fragen, wenn
   die Antwort die Arbeit wirklich ändert.
7. **Ehrlich berichten:** Was geprüft wurde, was nicht, was fehlgeschlagen ist (mit Ursache).
   Keine geschönten Messwerte.

## 2. Verbrauch sparen

- Dateien nur ausschnittsweise lesen (`sed -n`, `grep -n`), große Dateien nie mehrfach komplett.
- Mehrere unabhängige Befehle in einem Schritt bündeln; lange Läufe (Builds, Missionen) im
  Hintergrund starten und erst bei Abschluss weiterarbeiten, statt zu warten oder abzufragen.
- Keine Unteragenten für Aufgaben, die direkt erledigt werden können.
- Screenshots zusammenfassen (mehrere Ansichten in ein Bild), nur die nötigen ansehen.
- Ausgaben filtern (`| tail`, `| grep`), keine kompletten Logs in den Verlauf kippen.
- Bei klaren Aufträgen nicht lange abwägen: entscheiden, umsetzen, prüfen.

## 3. Code, der nicht nach KI aussieht

**Kommentare**

- Nur das _Warum_ kommentieren (Physik, Grenzwerte, Umgehungen, Messwerte), nie das _Was_.
- Keine Erzähl-Kommentare (`// Zähler erhöhen`), keine leeren Docblocks, keine
  `// end function`-Labels, keine `TODO: implement`-Platzhalter.
- Kommentardichte und -stil wie im umgebenden Code (hier: deutsche Sätze, sparsam, präzise).

**Namen**

- Konkret und fachlich (`periapsis`, `burnTime`, `padRocket`), nicht `data`, `result`, `info`,
  `temp`, `helper`, `manager`, `util`.
- Keine Typen im Namen (`userObject`, `listArray`), keine Romannamen.
- Bestehende Benennung des Projekts übernehmen.

**Struktur**

- Keine vorsorglichen Abstraktionen: keine Schnittstelle mit nur einer Umsetzung, keine Klasse
  um eine einzelne Funktion, keine Wrapper, die nur durchreichen.
- Drei ähnliche Zeilen sind besser als eine verfrühte Abstraktion.
- Keine Konfigurationsoptionen „für später“.

**Fehlerbehandlung**

- Kein `try/catch` um Code, der nicht werfen kann; keine Null-Prüfungen für Werte, die der Typ
  garantiert. Fehler nur dort abfangen, wo sinnvoll reagiert werden kann (Speicher, Netzwerk,
  Browser-APIs mit `try/catch` – das ist hier echt nötig).
- Keine verschluckten Fehler (`catch {}` ohne Begründung).

**Typen und Sauberkeit**

- Kein `as any`, kein `@ts-ignore`; Typen richtig modellieren.
- Keine `console.log`-Reste, kein toter Code, keine auskommentierten Blöcke.
- Ausdrücke direkt schreiben (`return x > 0`, nicht `if (x > 0) return true; else return false`).

**Tests**

- Verhalten prüfen, nicht die Umsetzung spiegeln. Keine Tests, die nur „wirft nicht“ prüfen.
- Echte Szenarien (ganze Flüge, Grenzfälle) statt alles wegzumocken.
- Zu jedem behobenen Fehler ein Test, der ihn vorher gefunden hätte.

**Leistung**

- Im Spiel-Hotpath (pro Bild): keine Allokationen in Schleifen, wo vermeidbar; keine
  Layout-Abfragen; nichts neu zeichnen, was sich nicht ändert; Caches nutzen. Erst messen,
  dann optimieren, Ergebnisse ehrlich angeben.

## 4. Texte, die nicht nach KI klingen (App-Texte, Doku, Commits, Antworten)

**Wörter und Wendungen meiden**

- Deutsch: „entscheidend“, „maßgeblich“, „nahtlos“, „revolutionär“, „ganzheitlich“,
  „eintauchen“, „Reise“, „Welt der …“, „spannend“, „vielfältig“, „unterstreicht“, „zeugt von“,
  „spielt eine zentrale Rolle“, „nicht nur …, sondern auch …“, „Zusammenfassend lässt sich
  sagen“, „Insgesamt“, „Es ist wichtig zu beachten“.
- Englisch (falls nötig): delve, crucial, pivotal, tapestry, testament, seamless, robust,
  leverage, vibrant, showcase, underscore, „not just X but Y“.

**Stil**

- Kurze, konkrete Sätze mit Zahlen und Fakten statt Bewertungen („3.151 m/s Δv reichen für
  149 km Höhe“ statt „beeindruckende Leistung“).
- „ist/sind“ statt Umschreibungen wie „dient als“, „fungiert als“, „stellt dar“.
- Keine Lobhudelei, keine Werbesprache, kein künstlicher Spannungsbogen, kein positives
  Pflicht-Fazit.
- Sparsam formatieren: Fettdruck nur für wirklich Wichtiges, Listen nur bei echten
  Aufzählungen, keine Überschrift über jedem zweiten Satz, keine Emojis.
- Gedankenstriche sparsam; deutsche Typografie („…“, „ “, –, Zahl und Einheit zusammen).
- Satzanfang groß, keine Title Case-Überschriften.
- Commit-Nachrichten: was und warum, sachlich, deutsch, ohne Füllwörter.

**Gegenüber dem Nutzer**

- Auf Deutsch, direkt, ohne Einleitungsfloskeln („Gute Frage!“, „Gerne!“) und ohne
  Wiederholung der Aufgabe.
- Ergebnis zuerst, dann Kurzbegründung, dann offene Punkte. Kein Fachjargon ohne Erklärung.
- Keine Behauptungen über Dinge, die nicht geprüft wurden.

## 5. Projektfeste Regeln (aus CLAUDE.md, hier zur Erinnerung)

- App-Ausgaben immer in drei Varianten (Windows-EXE, Mac Apple-Chip, Android-APK) über den
  Workflow ins Release `app`.
- Nur auf dem vorgegebenen Branch arbeiten; Pushes bei Netzfehlern mit Wartezeit wiederholen.
- Nutzertexte auf Deutsch.

Quellen: Anthropic, „Claude Code: Best practices for agentic coding“; Wikipedia,
„Signs of AI writing“ (WikiProject AI Cleanup); asyrafhussin/agent-skills „code-slop“;
kitemetric „Spotting AI-generated code“; Erfahrungen aus diesem Repository (`docs/archiv/KRITIK-verlauf.md`).
