# Mitentwickeln

Danke für dein Interesse! Diese Seite erklärt, wie die App aufgebaut ist, wie du sie baust und
testest und wie du Verbesserungen einreichst. Für Installation und Bedienung siehe [README.md](README.md).

## Inhalt

- [Überblick](#überblick)
- [Projektstruktur](#projektstruktur)
- [Wie die Daten ermittelt werden](#wie-die-daten-ermittelt-werden)
- [Entwickeln im Desktop-Browser (Mock-Modus)](#entwickeln-im-desktop-browser-mock-modus)
- [Paket bauen und auf dem TV testen](#paket-bauen-und-auf-dem-tv-testen)
- [Regeln für den Code](#regeln-für-den-code)
- [Verbesserungen einreichen](#verbesserungen-einreichen)
- [Bekannte technische Grenzen](#bekannte-technische-grenzen)

## Überblick

Die App ist eine **Tizen-Web-App** (HTML, CSS, JavaScript) für Samsung-TVs ab **Tizen 2.3**.
Es gibt keine offizielle API von spiele-offensive.de: Die App lädt die normalen Webseiten per
`XMLHttpRequest`, meldet sich wie ein Browser an und liest die benötigten Daten aus dem HTML.

Ablauf: **Start → (Anmeldung) → Spieleauswahl → Player**

- Zugangsdaten und Wiedergabe-Fortschritt liegen im `localStorage` der App auf dem TV.
- Netzwerkzugriffe sind in `config.xml` (`<access>`) und zusätzlich im Code (`Api.isSiteUrl` /
  `isMediaUrl`) auf spiele-offensive.de und den Happyshops-Medienserver beschränkt.
- Es gibt keinen eigenen Server und keine Build-Abhängigkeiten (kein npm, kein Bundler).

## Projektstruktur

```text
config.xml          Tizen-Manifest (Profil tv, required_version 2.3, Privilegien, <access>)
index.html          Einstiegsseite mit allen Ansichten (Login, Kacheln, Player)
icon.png            App-Symbol (117x117)
css/style.css       Layout für 1920x1080
js/keys.js          Fernbedienungstasten registrieren und auf Namen abbilden (+ Desktop-Tasten)
js/util.js          DOM-Hilfen, inertes HTML-Parsen, URL-Auflösung
js/http.js          XHR inkl. Zeichensatz-Erkennung (Seite ist ISO-8859-1) und Formular-Kodierung
js/credstore.js     Zugangsdaten speichern/laden/löschen
js/progress.js      Wiedergabe-Fortschritt je Konto und Spiel (Fortsetzen)
js/api.js           Login, Videorechte-Liste, Videoseite auslesen, erlaubte Server
js/view-login.js    Ansicht Anmeldung
js/view-grid.js     Ansicht Spieleauswahl (Kacheln)
js/view-player.js   Ansicht Player (Kapitel, OSD, Fortsetzen-Dialog, Diagnose)
js/app.js           Ablaufsteuerung und Verteilung der Tasten an die Ansichten
build-wgt.cmd/.ps1  baut dist/SOVideoPlayer.wgt
.github/workflows/  Release-Workflow (nur für Maintainer)
```

Die Skripte werden in `index.html` in fester Reihenfolge geladen; jedes Modul ist eine globale
Variable (`Util`, `Http`, `Api`, …) nach dem Muster `var Modul = (function () { … }());`.

## Wie die Daten ermittelt werden

- **Login:** Die Loginseite wird geladen, das Formular mit Passwortfeld ausgelesen (inkl. des
  dynamischen Feldes `doubletracker`) und an `/index.php?seite=13` gesendet. Feldwerte werden wie
  vom Browser im Zeichensatz der Seite (ISO-8859-1) kodiert. Erfolg = Seite enthält einen
  Logout-Link (`cmd=logout`).
- **Sitzung:** Ist eine Seite nicht (mehr) angemeldet oder die Spieleliste trotz Anmeldung leer
  (typisch nach einem App-Neustart), meldet sich die App einmal ab und mit den gespeicherten
  Daten frisch an.
- **Spieleliste:** alle Links `/Regelvideo/<Name>-<Artikelnummer>.html` der Seite
  `index.php?cmd=videorechte`, sortiert mit eigenem Sortierschlüssel (Umlaute, ß).
- **Bild:** `https://mediaservice.happyshops.com/ANY/Article/<Artikelnr. 12-stellig>/<Artikelnr>.jpg`
  (Fallback `size=200x200/`). Fehlt ein Bild, liefert der Server `BildNichtGefunden.jpg`
  (1200×1200) – das wird an der Größe erkannt und durch eine Platzhalter-Kachel ersetzt.
- **Kapitel:** `playlist[n]='…mp4'` aus dem Skript der Videoseite, Titel aus `#playlist_n`.
  Kapitel 0 ist das Intro; schlägt ein Kapitel fehl, springt der Player weiter.

Eingelesenes HTML wird mit `Util.parseHtml` in ein inertes Dokument geparst. Skripte werden
entfernt und Attribute/Tags, die etwas nachladen könnten (`src`, `style`, `<link>`, …), umbenannt.

## Entwickeln im Desktop-Browser (Mock-Modus)

Im normalen Browser blockiert CORS den Zugriff auf spiele-offensive.de. Für Arbeiten an der
Oberfläche gibt es einen Mock-Modus, der lokale Beispielseiten statt der echten Website verwendet.

1. Im eingeloggten Browser zwei Seiten speichern (*Seite speichern unter → nur HTML*) und
   unter `.dev/HTML-Beispiele/` ablegen:
   - `videorechte.html` – die Seite `index.php?cmd=videorechte`
   - `videoseite.tml` – eine beliebige Regelvideo-Seite
2. Lokalen Webserver im Projektordner starten **und nur an 127.0.0.1 binden**:

   ```sh
   npx http-server -a 127.0.0.1 -p 8080 .
   ```

3. Im Browser öffnen: <http://localhost:8080/index.html?mock>

> **Datenschutz:** Die gespeicherten Seiten enthalten deine E-Mail-Adresse und deine Spieleliste.
> `.dev/` steht deshalb in `.gitignore` – niemals committen. Ohne `-a 127.0.0.1` wäre der Ordner
> für andere Geräte im Netzwerk abrufbar.

**Tasten im Browser:** Pfeiltasten, Enter = OK, Backspace/Esc = Zurück, Leertaste = Play/Pause,
Bild↑/Bild↓ = Kapitel vor/zurück, R = Rot, G = Grün, D = Blau.

Der Mock-Modus ersetzt keinen Test am Fernseher: Login, Cookies, Cloudflare und das Verhalten der
alten Web-Engine lassen sich nur dort prüfen.

## Paket bauen und auf dem TV testen

### Mit Apps2Samsung (empfohlen)

1. Paket bauen (Windows): `build-wgt.cmd` doppelklicken oder `.\build-wgt.cmd` in der Konsole.
   Ergebnis: `dist/SOVideoPlayer.wgt` (nur App-Dateien, ohne `.dev/`).
   Unter Linux/macOS: `zip -r -X dist/SOVideoPlayer.wgt config.xml index.html icon.png css js`
2. Am TV den Developer Mode aktivieren (siehe [README](README.md#1-entwicklermodus-am-fernseher-einschalten-einmalig)).
3. In Apps2Samsung **Eine Datei installieren…** wählen und die `.wgt` angeben.
   Apps2Samsung signiert das Paket selbst.

### Mit Tizen Studio / Tizen CLI

1. **Tizen Studio** installieren, im Package Manager unter *Extension SDK* die **TV Extensions**
   installieren.
2. Projekt importieren: *File → Import → Tizen → Tizen Project* und diesen Ordner wählen.
3. Im **Certificate Manager** ein **Samsung**-Zertifikat (Typ *TV*) mit der DUID des Fernsehers anlegen.
4. Im **Device Manager** den TV per IP verbinden, dann *Run As → Tizen Web Application*.

Per Kommandozeile:

```sh
tizen build-web -- .
tizen package -t wgt -s <Zertifikatsprofil> -- .buildResult
sdb connect <TV-IP>
tizen install -n SOVideoPlayer.wgt -- .buildResult
tizen run -p SOVidPlay0.SOVideoPlayer
```

Versteckte Ordner wie `.dev/` schließt Tizen Studio standardmäßig aus; ggf. unter
*Project Properties → Tizen Studio → Package → Excluded Resources* prüfen.

**Fehlersuche am TV:** Im Player blendet die **blaue Taste** eine Diagnose ein (Puffer, Frames,
verlorene Frames, Wartezustände). Mit Tizen Studio lässt sich außerdem der Web Inspector verbinden.

## Regeln für den Code

- **Nur ES5:** kein `let`/`const`, keine Arrow-Functions, keine Template-Strings, kein
  `fetch`/`Promise`, keine Klassen. Die Web-Engine von Tizen 2.3 ist ein altes WebKit.
  Schnelle Prüfung: `grep -nE '\b(let|const)\b|=>' js/*.js` darf nichts finden.
- **Keine externen Bibliotheken** und keine Build-Schritte – die App soll aus den Quelldateien
  direkt lauffähig bleiben.
- **Neue Server** (Hosts) nur, wenn unbedingt nötig – dann sowohl in `config.xml` (`<access>`)
  als auch in `Api.isSiteUrl` / `isMediaUrl` ergänzen und im Pull Request begründen.
- **Keine Zugangsdaten, Cookies oder persönlichen Daten** in Code, Commits, Issues oder Screenshots.
- Performance auf alten TVs beachten: Animationen per `transform`, DOM-Änderungen sparsam.
- Kommentare und Texte in der Oberfläche auf Deutsch.

## Verbesserungen einreichen

1. **Größere Änderungen vorher als Issue besprechen**, damit keine Arbeit umsonst ist.
2. Repository forken und einen Branch anlegen, z. B. `fix/leere-spieleliste` oder `feature/suche`.
3. Änderung umsetzen und testen – im Mock-Modus und, wenn möglich, auf einem Fernseher.
4. In [CHANGELOG.md](CHANGELOG.md) unter **`## [Unveröffentlicht]`** einen kurzen Eintrag
   ergänzen (Abschnitt *Neu*, *Geändert*, *Behoben* oder *Sicherheit*; ggf. anlegen).
5. **Versionsnummer nicht ändern** – Version und Releases pflegt der Maintainer.
6. Pull Request gegen `main` öffnen und beschreiben:
   - was geändert wurde und warum,
   - wie getestet wurde (Browser/Mock, TV-Modell und Tizen-Version).

Sicherheitslücken bitte **nicht** als Issue oder Pull Request, sondern vertraulich melden –
siehe [SECURITY.md](SECURITY.md).

Mit dem Einreichen eines Beitrags stimmst du zu, dass er unter der [MIT-Lizenz](LICENSE) des
Projekts veröffentlicht wird.

## Bekannte technische Grenzen

- **Cloudflare:** spiele-offensive.de steht hinter Cloudflare. Einfache Clients (curl, Node)
  bekommen eine Challenge (403); der TV wird bisher durchgelassen. Die App meldet den Fall
  gesondert (`code: 'cloudflare'`). Auch das Start-Intro liegt dort und liefert manchmal 403.
- **Zugangsdaten** liegen nur Base64-verschleiert im `localStorage` – Tizen 2.3 bietet Web-Apps
  keinen sicheren Schlüsselspeicher (siehe [SECURITY.md](SECURITY.md)).
- **Änderungen an der Website** von spiele-offensive.de können die App jederzeit brechen, da sie
  das HTML ausliest. Betroffen wären vor allem `js/api.js` (Selektoren, `playlist[n]`, Login-Formular).
- **BoardGameGeek** als zusätzliche Bildquelle ist nicht eingebaut: Die BGG-XML-API verlangt
  inzwischen eine registrierte Anwendung, und die Namenssuche ist bei deutschen Titeln ungenau.
- **Videowiedergabe:** Falls `<video>` auf einem Modell hakt, wäre die Samsung-**AVPlay**-API der
  robustere (aber aufwendigere) Weg.
