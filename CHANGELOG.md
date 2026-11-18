# Changelog

Alle nennenswerten Änderungen an diesem Projekt. Format angelehnt an
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/), Versionierung nach
[Semantic Versioning](https://semver.org/lang/de/). Die Versionsnummer steht auch in `config.xml`.

## [Unveröffentlicht]

### Neu
- GitHub-Workflow „Release erstellen“ (manuell startbar): baut die `.wgt` und veröffentlicht sie
  als GitHub-Release mit den Notizen aus diesem Changelog.

## [1.1.0] – 2026-11-17

### Neu
- **Fortsetzen-Funktion:** Kapitel und Position werden pro Spiel auf dem TV gespeichert
  (alle 5 s, bei Pause, Kapitelwechsel und Verlassen des Players). Beim erneuten Öffnen fragt ein
  Dialog „Fortsetzen“ oder „Von vorne“; fortgesetzt wird 3 s vor der gespeicherten Stelle.
  Nach dem letzten Kapitel wird der Stand gelöscht.
- Fortschrittsbalken auf den Kacheln angefangener Spiele.

### Geändert
- Alphabetische Sortierung der Spieleliste mit eigenem Sortierschlüssel (Umlaute wie Grundbuchstaben,
  ß wie ss, ohne Groß-/Kleinschreibung) – unabhängig von `localeCompare`, das auf dem alten
  WebKit von Tizen 2.3 das Gebietsschema ignorieren kann.

### Behoben
- `build-wgt.ps1` verwendet fest das Windows-`tar.exe`. Stand GNU-tar aus Git for Windows vorne im
  PATH, schlug der Build fehl („zip: Invalid archive format“) und die alte `.wgt` war bereits gelöscht.

## [1.0.0] – 2026-11-17

Erste Version, auf einem Samsung-TV getestet (Installation per Apps2Samsung).

### Neu
- Login mit dem Spiele-Offensive-Kundenkonto; das Loginformular wird zur Laufzeit ausgelesen
  (inkl. `doubletracker`), Werte werden wie vom Browser in ISO-8859-1 kodiert.
  Automatischer Re-Login bei abgelaufener Session.
- Spiele mit Videorechten als quadratische Kacheln mit Artikelbild vom Happyshops-Medienserver;
  fehlende Bilder („BildNichtGefunden.jpg“) werden erkannt und durch einen Platzhalter ersetzt.
- Kapitel-Player: automatisches Weiterschalten, Kapitelliste, Spulen, Kapitel vor/zurück per
  CH+/CH−; schlägt ein Kapitel fehl (z. B. das Start-Intro), geht es automatisch weiter.
- Bedienung komplett per Fernbedienung, inkl. Bildschirmtastatur im Login.
- Diagnose-Anzeige im Player (blaue Taste / D): Puffer, Frames, verlorene Frames, Wartezustände.
- Mock-Modus (`index.html?mock`) für Tests im Desktop-Browser mit lokalen Beispielseiten.
- Build-Skript `build-wgt.cmd` / `build-wgt.ps1` für die `.wgt`-Datei.

### Technisch
- ES5-Code für das WebKit von Tizen 2.3; eigene Zeichensatz-Dekodierung (ISO-8859-1/UTF-8).
- Player-Overlays auf eigenen Compositing-Ebenen, Fortschritt per `transform` statt `width`.

[1.1.0]: https://github.com/UbivisMedia/SO-Regelvideo-SamsungTizenTVApp/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/UbivisMedia/SO-Regelvideo-SamsungTizenTVApp/tree/v1.0.0
