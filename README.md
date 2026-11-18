# SO Regelvideos – Tizen-TV-App

Tizen-Web-App (Samsung Smart TV, **Tizen 2.3+**) zum Abspielen der Spielregel-Videos
von spiele-offensive.de mit dem eigenen Kundenkonto.

> **Hinweis:** Inoffizielles Projekt, nicht mit Spiele-Offensive.de oder Happyshops verbunden
> und von diesen weder unterstützt noch geprüft. Die App benötigt ein eigenes Kundenkonto mit
> erworbenen Videorechten. Alle Inhalte (Videos, Bilder, Texte, Marken) gehören ihren jeweiligen
> Inhabern und sind nicht Teil dieses Repositorys bzw. der Lizenz.

## Funktionen

- Login mit E-Mail/Passwort des Spiele-Offensive-Kundenkontos (wird lokal in der App gespeichert)
- Automatischer (Re-)Login, wenn die Session abgelaufen ist
- Liste der Spiele mit Videorechten (`index.php?cmd=videorechte`) als quadratische Kacheln mit Spielbild
- Spiele alphabetisch sortiert (Umlaute richtig einsortiert, unabhängig vom TV-Browser)
- Player mit Kapiteln: automatischer Wechsel zum nächsten Kapitel, Kapitelauswahl per Liste
- **Fortsetzen:** Der Fortschritt pro Spiel wird auf dem TV gespeichert; beim erneuten Öffnen
  fragt die App „Fortsetzen“ oder „Von vorne“. Die Kacheln zeigen den Fortschritt als Balken.
  Nach dem letzten Kapitel wird der Stand gelöscht.

## Bedienung (Fernbedienung)

| Ansicht | Taste | Aktion |
|---|---|---|
| Login | ▲ ▼ / OK | Feld wählen / Bildschirmtastatur öffnen bzw. Anmelden |
| | BLAU | mit gespeicherten Zugangsdaten neu anmelden (falls vorhanden) |
| Spieleauswahl | Pfeiltasten / OK | Spiel wählen / Video starten |
| | ROT | Abmelden (gespeicherte Zugangsdaten löschen) |
| | GRÜN | Liste neu laden |
| | BLAU | neu anmelden mit gespeicherten Zugangsdaten (alte Sitzung wird beendet) |
| | ZURÜCK | App beenden |
| Player | OK / ⏯ | Play/Pause |
| | ◀ ▶ / ⏪ ⏩ | 10 s zurück/vor |
| | ▲ ▼ | Kapitelliste öffnen, Kapitel wählen, OK startet es |
| | CH+ / CH− (⏭ ⏮) | nächstes / vorheriges Kapitel |
| | ZURÜCK / ⏹ | zurück zur Spieleauswahl (Position wird gespeichert) |
| | BLAU | Diagnose-Anzeige ein/aus (Desktop: D) |
| Fortsetzen-Dialog | ◀ ▶ / OK | „Fortsetzen“ oder „Von vorne“ wählen |

## Projektstruktur

```
config.xml          Tizen-Manifest (Profil tv, required_version 2.3, Privilegien)
index.html          Einstiegsseite mit den drei Ansichten
css/style.css       Layout für 1920x1080
js/keys.js          Registrierung/Mapping der Fernbedienungstasten
js/util.js          DOM-/HTML-Hilfen
js/http.js          XHR inkl. Zeichensatz-Behandlung (Seite ist ISO-8859-1)
js/credstore.js     Speicherung der Zugangsdaten (localStorage)
js/progress.js      Wiedergabe-Fortschritt pro Spiel (Fortsetzen)
js/api.js           Login, Videorechte-Liste, Videoseite parsen
js/view-*.js        Ansichten Login / Kacheln / Player
js/app.js           Ablaufsteuerung, Tastenverteilung
.dev/               Beispiel-HTML-Seiten (nur für Entwicklung)
```

Der Code ist bewusst **ES5** (kein `let`/`const`, keine Arrow-Functions, kein `fetch`/`Promise`),
weil die Web-Engine von Tizen 2.3 ein älteres WebKit ist.

## Wie die Daten ermittelt werden

- **Login:** Die Loginseite wird geladen, das Formular mit Passwortfeld ausgelesen (inkl. des
  dynamischen Feldes `doubletracker`) und an `/index.php?seite=13` gesendet. Feldwerte werden wie
  vom Browser im Zeichensatz der Seite (ISO-8859-1) kodiert. Erfolg = Seite enthält einen Logout-Link.
- **Spieleliste:** alle Links `/Regelvideo/<Name>-<Artikelnummer>.html` der Videorechte-Seite.
- **Bild:** `https://mediaservice.happyshops.com/ANY/Article/<Artikelnr. 12-stellig>/<Artikelnr>.jpg`
  (Fallback `size=200x200/`). Fehlt ein Bild, liefert der Server `BildNichtGefunden.jpg`
  (1200×1200) – das wird erkannt und durch eine Platzhalter-Kachel ersetzt.
- **Kapitel:** `playlist[n]='…mp4'` aus dem Skript der Videoseite, Titel aus `#playlist_n`.

## Entwicklung im Desktop-Browser (Mock-Modus)

Im normalen Browser blockiert CORS den Zugriff auf spiele-offensive.de. Für UI-Tests gibt es einen
Mock-Modus, der die Beispielseiten aus `.dev/HTML-Beispiele/` verwendet:

> `.dev/` ist nicht im Repository (die Seiten enthalten persönliche Daten). Lege dort eigene, im
> eingeloggten Browser gespeicherte Kopien ab: `videorechte.html` (Seite `index.php?cmd=videorechte`)
> und `videoseite.tml` (eine beliebige Regelvideo-Seite).

```
npx http-server -p 8080 .
# dann im Browser:  http://localhost:8080/index.html?mock
```

Tasten im Browser: Pfeiltasten, Enter, Backspace/Esc = Zurück, Leertaste = Play/Pause,
Bild↑/Bild↓ = Kapitel vor/zurück, R = Abmelden, G = Neu laden, D = neu anmelden (Spieleauswahl) bzw. Diagnose (Player).

## Auf den Fernseher bringen (empfohlen: Apps2Samsung)

1. Am TV den **Developer Mode** aktivieren: *Apps* öffnen, `1 2 3 4 5` auf der Fernbedienung,
   Developer Mode *On*, IP des PCs eintragen, auf dem Apps2Samsung läuft, TV neu starten.
2. Paket bauen: `build-wgt.cmd` (Doppelklick oder in der Konsole `.\build-wgt.cmd`)
   → erzeugt `dist/SOVideoPlayer.wgt` (nur App-Dateien, ohne `.dev/`).
3. In **Apps2Samsung** den TV auswählen, *eigene .wgt-Datei* wählen und installieren.
   Apps2Samsung kümmert sich um die Signierung.

Fertige Pakete gibt es auch unter
[Releases](https://github.com/UbivisMedia/SO-Regelvideo-SamsungTizenTVApp/releases); Direktlink
auf die jeweils neueste Version:
<https://github.com/UbivisMedia/SO-Regelvideo-SamsungTizenTVApp/releases/latest/download/SOVideoPlayer.wgt>

## Neues Release veröffentlichen

1. Version in `config.xml` erhöhen (`<widget … version="x.y.z">`).
2. In `CHANGELOG.md` den Abschnitt *Unveröffentlicht* in `## [x.y.z] – Datum` umbenennen.
3. Committen und pushen.
4. Auf GitHub: *Actions* → **Release erstellen** → *Run workflow*.
   Der Workflow baut die `.wgt`, legt Tag `vx.y.z` und das Release mit den Changelog-Notizen an.
   Existiert das Release schon, bricht er ab.

## Alternativ: Tizen Studio / Tizen CLI

1. **Tizen Studio** installieren, im Package Manager unter *Extension SDK* die
   **TV Extensions** (inkl. `tv-samsung-2.3`/`Samsung TV Extension`) installieren.
2. Projekt importieren: *File → Import → Tizen → Tizen Project* (oder *General → Existing Projects*)
   und diesen Ordner wählen.
3. Im **Certificate Manager** ein **Samsung**-Zertifikat (Typ *TV*) anlegen – Samsung-Konto nötig.
   Dabei die DUID des Fernsehers eintragen (oder Gerät beim Anlegen verbunden haben).
4. Am TV den **Developer Mode** aktivieren: *Apps* öffnen, `1 2 3 4 5` auf der Fernbedienung,
   Developer Mode *On*, IP des Entwicklungsrechners eintragen, TV neu starten.
5. Im **Device Manager** den TV per IP verbinden, dann *Run As → Tizen Web Application*.

Per Kommandozeile (Tizen CLI):

```
tizen build-web -- .
tizen package -t wgt -s <Zertifikatsprofil> -- .buildResult
sdb connect <TV-IP>
tizen install -n SOVideoPlayer.wgt -- .buildResult
tizen run -p SOVidPlay0.SOVideoPlayer
```

Der Ordner `.dev/` sollte nicht ins Paket – versteckte Dateien/Ordner (`.*`) schließt Tizen Studio
standardmäßig aus; ggf. unter *Project Properties → Tizen Studio → Package → Excluded Resources* prüfen.

## Bekannte Risiken / offene Punkte

- **Cloudflare:** spiele-offensive.de steht hinter Cloudflare. Einfache Clients (curl) bekommen eine
  Challenge (403). Ob die Requests des TVs durchgelassen werden, muss auf dem Gerät getestet werden.
  Die App meldet diesen Fall gesondert. Das Start-Intro (`regelvideo_splash_regel.mp4`) liegt ebenfalls
  auf diesem Server; schlägt es fehl, springt der Player automatisch zum ersten Kapitel.
- **Session-Cookies:** Die Tizen-Web-Runtime verwaltet Cookies für XHR selbst; die `<access>`-Einträge
  in `config.xml` (nur spiele-offensive.de und Happyshops) heben dafür die Same-Origin-Beschränkung auf.
  Nach einem App-Neustart kann die alte Sitzung nur noch „halb“ gültig sein (leere Spieleliste); die App meldet sich dann
  automatisch frisch an. Notfalls hilft die **blaue Taste** (neu anmelden mit gespeicherten Daten).
- **Zugangsdaten** liegen Base64-verschleiert (nicht verschlüsselt) im localStorage der App.
- **BoardGameGeek** als Bildquelle ist nicht eingebaut: Die BGG-XML-API erfordert inzwischen eine
  registrierte Anwendung/Token und eine Namenssuche, die bei deutschen Titeln oft ungenau ist.
  Die Bilder der Spiele-Offensive decken die meisten Spiele ab.
- Sehr alte Web-Engines: falls die Wiedergabe per `<video>` auf einem Modell hakt, wäre der
  Samsung-**AVPlay**-API der robustere Weg.

## Lizenz

Der Quellcode dieses Projekts steht unter der [MIT-Lizenz](LICENSE).
Sie gilt nur für den Code in diesem Repository, nicht für die Inhalte und Dienste von
Spiele-Offensive.de bzw. Happyshops, auf die die App zugreift.
