# Kritische Prüfung des Orbitlabors

Die App wurde wie von einem sehr strengen Tester durchgesehen: jede Seite auf PC, Tablet
(800 px) und Handy (390 px), hell und dunkel, dazu gezielte Spielsituationen in der Raketenwerft
(Start, Umlaufbahn, Station, Mond, Venus, Mars, Phobos, Jupiter, Sonnensystem-Karte, Absturz,
Pause, Hilfe) und automatische Flüge in den Tests. Jede Kleinigkeit, die nicht perfekt war, steht
hier – mit dem, was daraus geworden ist.

**Legende:** ✅ behoben · 🔶 bewusst so entschieden · ⛔ ohne dich nicht lösbar

## Oberfläche 3.0 – aufgeräumt, Raketenwerft als Vollbild-Spiel

Die ganze App wurde auf Übersicht geprüft; die Raketenwerft orientiert sich jetzt an der
Bedienung von Spaceflight Simulator (Steam): eigener Spielbildschirm, Werft als Blaupause,
Cockpit mit wenigen großen Knöpfen.

| #   | Befund                                                                                          | Status | Lösung                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 65  | Seitenleiste mit 22 Einträgen ohne Symbole, lange Kapiteltitel brachen um                       | ✅     | Symbole je Bereich, Kapitel mit Nummernfeld, kurze Titel, „Anhang“ einklappbar (Zustand wird gemerkt), aktive Seite mit Akzentstrich |
| 66  | Kein Schalter für Hell und Dunkel                                                               | ✅     | Umschalter System / Hell / Dunkel unten in der Leiste; gemerkt, und „System“ übernimmt wieder das Schema einer einbettenden Seite    |
| 67  | Seitenköpfe mit großer Überschrift und bis zu sieben Zeilen Einleitung in Serifenschrift        | ✅     | Kompakte Köpfe: kleinere Überschrift, Einleitung in der Oberflächenschrift; Serifen nur noch für Lesetexte                           |
| 68  | Startseite: acht gleich aussehende Textkarten, dazu die veraltete Angabe „22 Ziele“             | ✅     | Klare Abschnitte (Antwort, Kapitel, Selbst ausprobieren, Spielen und üben) mit Symbolkacheln; Zahlen aktualisiert                    |
| 69  | Raketenwerft lief eingebettet unter einem langen Text, neben der Seitenleiste                   | ✅     | Eigener Vollbild-Spielbildschirm mit Rückkehr per ✕; die Seite zeigt Rang, Punkte, Sterne und zwei Startknöpfe                       |
| 70  | Werft: Vorlagen, Hangar, drei Spalten und die Missionskontrolle untereinander – viel Scrollen   | ✅     | Wie in Spaceflight Simulator: Teile nach Art links, Blaupause mit Raster in der Mitte, Daten rechts, Vorlagen und Hangar als Menüs   |
| 71  | Stufen waren nur in einer Tabelle zu erkennen                                                   | ✅     | Stufenklammern mit Nummer und Δv direkt am Bauplan                                                                                   |
| 72  | Flug: 14 Knöpfe in einer Leiste oben, Speichern/Laden/Foto/Ton/Vollbild hinter „⋯“              | ✅     | Minimales Cockpit: Flugdaten links, Zeitraffer oben, Ziel rechts; das Pause-Menü (☰ oder Esc) bündelt alles Seltene                 |
| 73  | Schubregler klein und waagerecht                                                                | ✅     | Senkrechter Regler zum Ziehen wie im Vorbild, daneben Tankanzeige, große Taste „Stufe“                                               |
| 74  | Auf dem Handy überlagerten sich Lageanzeige, SAS-Knöpfe und Schubregler                         | ✅     | Eigenes Hochformat: Lageanzeige über den Drehknöpfen, Aktionen über dem Schubregler, Bordcomputer als Leiste von unten               |
| 75  | Die Stile der Raketenwerft verschoben die Anzeige im Simulator (gemeinsamer Klassenname `.hud`) | ✅     | Spielstile in eigener Datei und nur innerhalb des Spiels gültig                                                                      |
| 76  | Anleitung, Steuerung, Physik und Spielwelt standen als vier lange Blöcke untereinander          | ✅     | Reiter auf der Seite der Raketenwerft                                                                                                |
| 77  | Kartenmaßstab und Hinweis lagen unter dem Schubregler                                           | ✅     | Links unten über den Drehknöpfen                                                                                                     |
| 78  | Noch einige „r_H“ in Texten (Kapitel 5, 6, 9, Missionen)                                        | ✅     | r mit tiefgestelltem H bzw. „Hill-Radien“                                                                                            |

## Raketenwerft 2.0 – Ausbau als Spieleentwickler

Was jetzt über Spaceflight Simulator hinausgeht (dort gibt es nichts davon oder nur einen Teil):

| Bereich      | Neu                                                                                                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Steuerung    | Lageanzeige (Navball in 2D) mit SAS: prograd, retrograd, radial, Ziel, Manöver; Antippen richtet die Rakete aus; Feinsteuerung; Gamepad; Countdown mit Sprachausgabe                                |
| Manöver      | Manöverknoten auf der Karte setzen und mit Anfassern ziehen, geplante Bahn in Rosa, Brenndauer, Zündzeitpunkt, automatische Ausführung                                                              |
| Bordcomputer | Kreisbahn am Ap/Pe, Hohmann-Transfer zu Monden und Planeten im Startfenster, Kurskorrektur, Rendezvous und Geschwindigkeit angleichen, Rückflug vom Mond, Wiedereintritt, Lande-Autopilot           |
| Zeit         | Zeitsprung (zu Ap, Pe, Manöver, Hill-Sphäre, Startfenster); stabile Bahnen laufen „auf Schienen“ (Kepler) – 181 Tage Warten in 4 Sekunden                                                           |
| Welt         | Merkur und der Jupitermond Europa; Tag, Nacht und Dämmerung (die Sonne steht beim Start über der Rampe)                                                                                             |
| Bauteile     | Sondenkern, Satellit, Hitzeschild (wirkt nur mit dem Boden voran), Tank XL, Mammut, Atom- und Ionentriebwerk; Profi-Teile werden mit Punkten freigeschaltet                                         |
| Satelliten   | Aussetzen mit N, sie bleiben auf ihrer Kepler-Bahn – auch in späteren Flügen; Liste in der Missionskontrolle                                                                                        |
| Inhalte      | 9 Herausforderungen mit bis zu 3 Sternen (Flugschule, Profi, Meister), 36 Ziele, 7 Ränge, 7 Lackierungen, Flugbericht nach jeder Landung                                                            |
| Grafik       | Wolken, Bäume, Felsen, Startanlage mit Halle und Tanks, Mondbasis, Rauchspur und Startwolke, Explosion mit fliegenden Teilen, Blitz und Wackeln, Plasmahülle, Sonnenlicht und Glühen auf der Rakete |
| Ton          | Triebwerk, Fahrtwind, RCS-Zischen, Warnton beim Landen, Fallschirm, Andockklammern, Fanfare                                                                                                         |

Beim Ausbau hat die strenge Prüfung weitere Mängel gefunden – alle behoben:

| #   | Befund                                                                                                      | Status | Lösung                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| 50  | Warten auf ein Marsfenster in niedriger Bahn lief höchstens mit 500×: stundenlang echte Zeit                | ✅     | Stabile Bahnen „auf Schienen“ (Kepler); Aufprallwarnung rechnet mit der Bahn statt mit freiem Fall |
| 51  | Im hohen Zeitraffer raste die Rakete in einem Bild durch die ganze Hill-Sphäre des Mars                     | ✅     | Zeitraffer bremst vor Hill-Sphären und vor dem tiefsten Punkt eines Vorbeiflugs                    |
| 52  | Lange Brennphasen verfehlten das Ziel (fester Schubvektor verliert Energie)                                 | ✅     | Autopilot folgt der Flugrichtung und brennt bis zur geplanten Bahnenergie                          |
| 53  | Kurskorrekturen von 0,7 m/s wurden auf 0,2 m/s genau ausgeführt – 1.000 km daneben                          | ✅     | Genauigkeit passt sich an (bis 0,004 m/s)                                                          |
| 54  | Lande-Autopilot wollte auf Phobos statt auf dem Mars landen (Phobos war gerade „näher“)                     | ✅     | Gelandet wird auf dem Bezugskörper                                                                 |
| 55  | Marsboden aus der Nähe weiß (Polkappe an der Bildschirmkante statt am Pol)                                  | ✅     | Polkappen sitzen an den Polen; aus der Nähe nur Bodenfarbe                                         |
| 56  | Explosionsrauch füllte beim Absturz aus der Nähe den ganzen Bildschirm; auf dem Mond gab es Rauch ohne Luft | ✅     | Größe begrenzt, ohne Luft Staub und Funken statt Rauch                                             |
| 57  | In Herausforderungen erschienen „+10 Punkte“-Meldungen, obwohl Ziele dort nicht zählen                      | ✅     | Dort ausgeblendet, im Sandkasten als „(Sandkasten)“ markiert                                       |
| 58  | Explosionsblitz blieb in der Ergebnisanzeige stehen                                                         | ✅     | Blitz und Wackeln klingen auch in der Pause ab                                                     |
| 59  | Obere Leiste brach bei 1.040 px Spielfeldbreite um und verdeckte die Flugdaten                              | ✅     | Anordnung nach Breite des Spielfelds (Container Queries), seltene Knöpfe im Menü „⋯“               |
| 60  | Bordcomputer verdeckte auf dem Tablet fast die ganze Karte                                                  | ✅     | Eigene Spalte rechts, auf dem Handy als Leiste von unten                                           |
| 61  | Zeit bis Ap/Pe ließ die Werte über den Rand der Anzeige laufen                                              | ✅     | Kurzform („12:30“, „5 h“, „3 T“)                                                                   |
| 62  | Mondfenster wurde in Herausforderungen ohne Mond angezeigt                                                  | ✅     | Nur mit passendem Ziel                                                                             |
| 63  | Gebäude und Tanks leuchteten nachts hell wie am Tag                                                         | ✅     | Nachts abgedunkelt                                                                                 |
| 64  | Die Windows-EXE ließ sich nicht bauen: `Navball.tsx` und `navball.ts` sind für Windows derselbe Name        | ✅     | Zeichenmodul heißt `navballdraw.ts`; ein Test prüft alle Dateinamen auf diesen Fall                |

## Raketenwerft – Spielumfang (Vergleich mit Spaceflight Simulator)

| #   | Befund                                                                | Status | Lösung                                                                                                                             |
| --- | --------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Nur Erde und Mond – Spaceflight Simulator hat ein ganzes Sonnensystem | ✅     | Sonne, Venus, Erde, Mond, Mars, Phobos und Jupiter mit echter Mehrkörper-Schwerkraft; Bezugskörper über Hill-Sphären               |
| 2   | Kein Andocken                                                         | ✅     | Raumstation „Kepler“ in 150 km Höhe, Zielanzeige (Abstand, Relativgeschwindigkeit), nächste Annäherung auf der Karte, Andocken     |
| 3   | Keine Lagekontrolldüsen (RCS)                                         | ✅     | RCS-Modus (R): vor, zurück und seitwärts schieben, auch per Touch                                                                  |
| 4   | Kein Ziel, das man ansteuern kann                                     | ✅     | Zielauswahl (Station, Mond, Planeten) mit violetter Richtungsmarke                                                                 |
| 5   | Keine Belohnungen, kein Fortschritt                                   | ✅     | 22 Ziele mit Punkten, 6 Ränge vom Kadett bis zur Raumfahrt-Legende, 6 freischaltbare Lackierungen, Missionskontrolle in der Werft  |
| 6   | Kein Speichern während des Flugs, keine Pause                         | ✅     | Spielstand speichern/laden (F5/F9, Knöpfe, auch nach einem Absturz), Pause (Esc), Hilfe (H)                                        |
| 7   | Kein Hitzeschaden beim Wiedereintritt                                 | ✅     | Hitzemodell nach Sutton-Graves (∝ √ρ·v³) mit Anzeige; zu steil und zu schnell verglüht die Rakete                                  |
| 8   | Kein Sandkasten zum Ausprobieren                                      | ✅     | Sandkasten-Schalter: unendlich Treibstoff, dafür keine Punkte                                                                      |
| 9   | Keine Hilfe bei interplanetaren Flügen                                | ✅     | Startfenster für Mond und Planeten (Hohmann) mit Wartezeit, Vorsprungswinkel und Zündhinweis – das hat Spaceflight Simulator nicht |
| 10  | Nur Mond-Vorlagen                                                     | ✅     | Neue Vorlagen „Stationsfähre“ und „Ares (Mars)“; Reihenfolge nach Schwierigkeit                                                    |
| 11  | Kein Tanken                                                           | ✅     | An der Station alle Tanks füllen – so reicht auch eine kleine Rakete weit                                                          |

## Raketenwerft – Fehler

| #   | Befund                                                                                               | Status | Lösung                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| 12  | Bei hohem Zeitraffer fiel die Rakete innerhalb eines Bildes aus großer Höhe ungebremst auf den Boden | ✅     | Zeitraffer drosselt automatisch vor Aufprall und Atmosphäre (mindestens zehn Bilder vorher)     |
| 13  | Fallschirm blieb nach der Landung offen und beim nächsten Start sichtbar                             | ✅     | Fallschirme sind Einmalteile; bei mehr als 600 m/s reißen sie                                   |
| 14  | Andocken klappte nur, wenn vorher die Station als Ziel gewählt war                                   | ✅     | Andocken immer, sobald man langsam genug am Stutzen ist                                         |
| 15  | Station in 300 m Entfernung unsichtbar (lag unter dem Raketensymbol)                                 | ✅     | Beim Anflug zoomt die Kamera so, dass Rakete und Station ins Bild passen                        |
| 16  | Mondfenster wurde angezeigt, obwohl die Station das Ziel war                                         | ✅     | Es erscheint nur das Fenster, das zum Ziel passt                                                |
| 17  | Über Phobos stand der Landetipp für den Mars (mit Fallschirm – Phobos hat keine Luft)                | ✅     | Eigener Tipp für Phobos                                                                         |
| 18  | Absturzfenster immer „Bumm!“, auch beim Verglühen in der Sonne                                       | ✅     | Passende Überschrift (Verglüht / Verschluckt / Zerschellt)                                      |
| 19  | Zeitangabe „181 T 05:08:06“ unverständlich                                                           | ✅     | „181 Tage 05:08:06“                                                                             |
| 20  | Anzeige „-0 m/s“                                                                                     | ✅     | Sehr kleine Werte werden als 0 angezeigt                                                        |
| 21  | Relativgeschwindigkeit zum Mars mit Nachkommastelle („5.200,7 m/s“)                                  | ✅     | Nachkommastellen nur bei kleinen Werten                                                         |
| 22  | Ap/Pe-Beschriftungen überdeckten in der Sonnensystem-Karte die Erde                                  | ✅     | Beschriftung nur, wenn sie sich auf dem Bildschirm vom Körper abhebt                            |
| 23  | Nach einer Begegnung war die vorhergesagte Bahn verzerrt dargestellt                                 | ✅     | Abschnitt in der Hill-Sphäre wird relativ zum Zielkörper bei Ankunft gezeichnet (orange)        |
| 24  | Maßstab und Kartenhinweis lagen hinter der linken Anzeige bzw. den Knöpfen                           | ✅     | Neu platziert; auf dem Handy ohne Maus-Hinweis                                                  |
| 25  | Drei lange Zielmeldungen verdeckten die Rakete                                                       | ✅     | Kompakte Meldungen (Titel, Punkte, eine Zeile), oben statt unten; auf dem Handy nur die neueste |
| 26  | Hitzemodell anfangs zu gutmütig: ein senkrechter Sturz mit 4,5 km/s wurde überlebt                   | ✅     | Neu kalibriert und mit Tests abgesichert (Mondrückkehr ≈ 55 % Hitze, steiler Sturz verglüht)    |
| 27  | Hilfefenster: Tastennamen brachen um, einige Tasten fehlten; Esc schloss die Hilfe nicht             | ✅     | Behoben, Tabelle vollständig                                                                    |

## Raketenwerft – Handy und Tablet

| #   | Befund                                                                                         | Status | Lösung                                                                        |
| --- | ---------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| 28  | Obere Leiste brach in drei Zeilen um; Zeitraffer, Pause und Karte lagen unter der Höhenanzeige | ✅     | Seltene Knöpfe im Menü „⋯“, Werft und Neustart als Symbole, klare zwei Zeilen |
| 29  | Keine Zielauswahl auf Handy und Tablet                                                         | ✅     | Zielauswahl und Zielanzeige rechts neben der Flugdatenanzeige                 |
| 30  | Kartenmitte (z. B. Sonne) auf dem Handy nicht wählbar                                          | ✅     | Auswahl in eigener Zeile; Zoom mit zwei Fingern                               |
| 31  | Tablet: Leiste überfüllt, Knöpfe überlappten                                                   | ✅     | Menü „⋯“ auch auf dem Tablet                                                  |
| 32  | Werft auf dem Handy: erst alle Bauteile, dann weit unten die Rakete                            | ✅     | Rakete zuerst, Bauteile als wischbare Leiste                                  |

## Raketenwerft – Texte

| #   | Befund                                                                             | Status | Lösung                                                                    |
| --- | ---------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| 33  | Einleitung, Startseiten-Banner und Kurzbeschreibung erwähnten nur den Mond         | ✅     | Station, Mars und Sonnensystem ergänzt                                    |
| 34  | Anleitung „So kommst du zum Mond“ ohne Station und Mars                            | ✅     | „So kommst du ans Ziel“ mit Station, Mond, Mars und Heimkehr              |
| 35  | Steuerungstabelle ohne RCS, Speichern, Pause und Hilfe                             | ✅     | Vollständig                                                               |
| 36  | Tabelle „Spielwelt und Wirklichkeit“ ohne Sonnensystem                             | ✅     | Maßstab, Marsradius, Abstand zur Sonne und Länge des Jahres ergänzt       |
| 37  | Δv-Meilensteine ohne Station und Mars                                              | ✅     | Raumstation ≈ 4.400 m/s, Marslandung ≈ 7.800 m/s (per Testflug ermittelt) |
| 38  | Physik-Kästen: eine einzelne Karte in der letzten Reihe                            | ✅     | Gleichmäßiges 2×2-Raster                                                  |
| 39  | Missionskontrolle: „Punkte machen dich zum Raumfahrt-Legende“ (grammatisch falsch) | ✅     | „… bis zur Raumfahrt-Legende“                                             |

## Ganze App

| #   | Befund                                                                                | Status | Lösung                                                                                          |
| --- | ------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| 40  | Die Startseite lud das gesamte JavaScript (625 KB) auf einmal                         | ✅     | Seiten werden erst beim Öffnen geladen; die Startseite braucht nur noch etwa ein Sechstel davon |
| 41  | Der Browser-Tab hieß auf jeder Seite nur „Orbitlabor“                                 | ✅     | Eigener Titel je Seite, z. B. „Kapitel 5: Die Hill-Sphäre der Erde · Orbitlabor“                |
| 42  | Kein Sprunglink „Zum Inhalt“, Fokus blieb nach einem Seitenwechsel im Menü            | ✅     | Sprunglink für Tastatur und Screenreader; Fokus wandert an den Seitenanfang                     |
| 43  | Animationen ignorierten die Systemeinstellung „Bewegung reduzieren“                   | ✅     | Animationen und weiches Scrollen werden dann abgeschaltet                                       |
| 44  | Formelzeichen als „r_H“ mit Unterstrich in Oberflächentexten (wirkt wie Programmcode) | ✅     | „Hill-Radien“ bzw. r mit tiefgestelltem H                                                       |

## Bewusste Entscheidungen und Grenzen

| #   | Befund                                                                                         | Status | Begründung                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 45  | Windows warnt beim ersten Start der EXE („unbekannter Herausgeber“)                            | ⛔     | Eine Signatur, der Windows vertraut, gibt es nur mit einem gekauften Zertifikat, das auf eine geprüfte Person oder Firma ausgestellt wird. Die Download-Seite erklärt die zwei Klicks. |
| 46  | Die Welt ist verkleinert (1 : 10,6)                                                            | 🔶     | Sonst dauert ein Flug zum Mars Monate. Schwerkraft an der Oberfläche und alle Verhältnisse stimmen.                                                                                    |
| 47  | Alles läuft in einer Ebene (2D), die Erde dreht sich nicht                                     | 🔶     | Wie in Spaceflight Simulator; übersichtlicher und für Jüngere verständlich.                                                                                                            |
| 48  | Bauteile werden gestapelt statt frei positioniert; keine Verkleidungen, Rover oder Astronauten | 🔶     | Ein Stapel mit Stufen und Seitenboostern deckt die Physik ab und ist auf dem Handy bedienbar. Frei platzierbare Teile, Astronauten und Rover wären ein eigenes Projekt.                |
| 49  | Spielfeld (Zeichenfläche) für Screenreader nur über die Textanzeigen erfassbar                 | 🔶     | Alle Werte (Höhe, Tempo, Bahn, Ziel, Tipps) stehen als Text daneben; die Grafik selbst lässt sich nicht sinnvoll vorlesen.                                                             |

## Wie geprüft wurde

- **173 automatische Tests**, darunter komplette Flüge: Mondmission von Hand und eine zweite, die
  der Bordcomputer allein fliegt (Transfer, Einschwenken, Landung, Rückflug, Wiedereintritt),
  Marsmission mit Startfenster, zwei Kurskorrekturen, Einschwenken und Landung, Rendezvous mit der
  Station, Satelliten, Hitzeschild, Kepler-Bahnen und alle neun Herausforderungen (Start stabil,
  sieben davon mit Autopilot gelöst).
- **Browser-Durchlauf** aller Seiten auf PC und Handy (hell und dunkel) ohne Fehlermeldung und
  ohne seitliches Scrollen; die Raketenwerft zusätzlich auf 1.400, 820 und 390 px Breite mit
  Start, Countdown, Umlaufbahn, Bordcomputer, Karte mit Manöver, Nacht, Satelliten, Europa,
  Jupiter, Wiedereintritt, Absturz und Herausforderungen; nach dem Umbau der Oberfläche erneut auf
  1.400, 1.000 und 390 px: Werft, Vorlagen-Menü, Stufenmarken, Start, Bordcomputer, Karte,
  Pause-Menü, Herausforderung mit Einweisung und Rückkehr, Karriere, Hell/Dunkel-Umschalter.
- **Leistung:** Auch bei 5.000.000-fachem Zeitraffer mit offener Karte bleiben es 60 Bilder pro
  Sekunde (gemessen im Browser ohne Bildschirmausgabe).
