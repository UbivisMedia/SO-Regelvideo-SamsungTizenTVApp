# SO Regelvideos – Samsung-TV-App

Die Spielregel-Videos von [spiele-offensive.de](https://www.spiele-offensive.de) direkt auf dem
Samsung-Fernseher ansehen – mit dem eigenen Kundenkonto, bequem per Fernbedienung.

> **Hinweis:** Inoffizielles Projekt, nicht mit Spiele-Offensive.de oder Happyshops verbunden
> und von diesen weder unterstützt noch geprüft. Die App benötigt ein eigenes Kundenkonto mit
> erworbenen Videorechten. Alle Inhalte (Videos, Bilder, Texte, Marken) gehören ihren jeweiligen
> Inhabern und sind nicht Teil dieses Repositorys bzw. der Lizenz.

## Funktionen

- Anmeldung mit E-Mail-Adresse und Passwort deines Spiele-Offensive-Kundenkontos
  (wird gespeichert, du musst sie nur einmal eingeben)
- Alle Spiele, für die du Videorechte hast, als Kacheln mit Spielbild – alphabetisch sortiert
- Videos mit Kapiteln: Kapitel laufen automatisch nacheinander, einzelne Kapitel lassen sich
  direkt anwählen
- **Fortsetzen:** Die App merkt sich je Spiel, wo du aufgehört hast, und fragt beim nächsten Öffnen
  „Fortsetzen“ oder „Von vorne“. Angefangene Spiele zeigen einen Fortschrittsbalken.

## Voraussetzungen

- Samsung-Smart-TV mit **Tizen** (ab Modelljahr 2015 / Tizen 2.3)
- Ein PC (Windows, macOS oder Linux) im selben Netzwerk – nur für die Installation
- Ein Kundenkonto bei spiele-offensive.de mit gekauften Videorechten

## Installation

Die App wird mit **[Apps2Samsung](https://www.apps2samsung.com)** installiert, einem kostenlosen
Programm für den PC ([GitHub](https://github.com/Apps2Samsung/Apps2Samsung)).

### 1. Entwicklermodus am Fernseher einschalten (einmalig)

1. Am TV die Übersicht **Apps** öffnen.
2. Auf der Fernbedienung nacheinander **1 2 3 4 5** drücken.
3. **Developer Mode** auf *On* stellen und die **IP-Adresse des PCs** eintragen,
   auf dem Apps2Samsung läuft.
4. Fernseher neu starten (komplett aus- und wieder einschalten).

### 2. App installieren

1. **Apps2Samsung** auf dem PC starten. Der Fernseher wird im Netzwerk gesucht und oben links angezeigt.
2. Unter **Installieren** in der Rubrik **Andere** die App **SO-Regelvideos** auswählen
   (oder oben nach „SO-Regelvideos“ suchen).
3. Installieren – fertig. Die App erscheint danach in der App-Übersicht des Fernsehers.

**Updates** werden ebenfalls über Apps2Samsung installiert, sobald eine neue Version erscheint.

### Alternativ: Datei manuell installieren

Die fertige App-Datei gibt es auch direkt zum Herunterladen:
[SOVideoPlayer.wgt (neueste Version)](https://github.com/UbivisMedia/SO-Regelvideo-SamsungTizenTVApp/releases/latest/download/SOVideoPlayer.wgt)
· [alle Versionen](https://github.com/UbivisMedia/SO-Regelvideo-SamsungTizenTVApp/releases)

In Apps2Samsung dann **Eine Datei installieren…** wählen und die heruntergeladene Datei angeben.

## Bedienung

Beim ersten Start fragt die App nach E-Mail-Adresse und Passwort. Mit **OK** öffnet sich die
Bildschirmtastatur, danach **Anmelden** wählen.

| Ansicht | Taste | Aktion |
|---|---|---|
| Anmeldung | ▲ ▼ / OK | Feld wählen / Bildschirmtastatur öffnen bzw. anmelden |
| | 🔵 BLAU | mit den gespeicherten Zugangsdaten neu anmelden |
| Spieleauswahl | Pfeiltasten / OK | Spiel wählen / Video starten |
| | 🔴 ROT | abmelden (gespeicherte Zugangsdaten werden gelöscht) |
| | 🟢 GRÜN | Liste aktualisieren |
| | 🔵 BLAU | neu anmelden mit den gespeicherten Zugangsdaten |
| | ZURÜCK | App beenden |
| Video | OK / ⏯ | Pause / Weiter |
| | ◀ ▶ / ⏪ ⏩ | 10 Sekunden zurück / vor |
| | ▲ ▼ | Kapitelliste öffnen und Kapitel wählen, OK startet es |
| | CH+ / CH− (⏭ ⏮) | nächstes / vorheriges Kapitel |
| | ZURÜCK / ⏹ | zurück zur Spieleauswahl (die Stelle wird gemerkt) |
| | 🔵 BLAU | technische Diagnose-Anzeige ein/aus |
| Fortsetzen-Frage | ◀ ▶ / OK | „Fortsetzen“ oder „Von vorne“ wählen |

## Häufige Fragen

**Die Spieleliste ist leer oder die Anmeldung schlägt fehl.**
Die App versucht sich in diesem Fall automatisch neu anzumelden. Hilft das nicht, die
**blaue Taste** drücken (neu anmelden mit den gespeicherten Daten). Prüfe außerdem, ob du dich mit
denselben Daten auf spiele-offensive.de anmelden kannst und dort Videorechte hast.

**Es erscheint „Die Spiele-Offensive blockiert den Zugriff“.**
Die Website nutzt einen Schutzdienst (Cloudflare), der Zugriffe zeitweise blockieren kann.
Später erneut versuchen (grüne Taste).

**Was bedeutet „Puffern… 4 / 10 s“?**
Die App lädt vor dem Start eines Kapitels (und nach einem Hänger) erst etwas Video vor, damit es
danach flüssig läuft. Bei langsamer Internetverbindung dauert das ein paar Sekunden.

**Das Intro-Video wird übersprungen.**
Das ist normal, wenn es nicht geladen werden kann – die App springt dann direkt zum ersten Kapitel.

**Wie entferne ich meine Zugangsdaten vom Fernseher?**
In der Spieleauswahl die **rote Taste** drücken (abmelden). Die gespeicherten Daten werden gelöscht.

## Datenschutz

- E-Mail-Adresse und Passwort werden **nur auf deinem Fernseher** gespeichert
  (verschleiert, aber nicht verschlüsselt) und nur an spiele-offensive.de gesendet.
- Die App kommuniziert ausschließlich mit spiele-offensive.de und dem Bild- und Videoserver
  von Happyshops. Es gibt keinen eigenen Server, keine Werbung und kein Tracking.
- Der Wiedergabe-Fortschritt wird ebenfalls nur auf dem Fernseher gespeichert, getrennt je Konto.

## Mithelfen, Fehler melden

- **Fehler oder Ideen:** gern als [Issue](https://github.com/UbivisMedia/SO-Regelvideo-SamsungTizenTVApp/issues)
  melden – mit TV-Modell und App-Version.
- **Selbst mitentwickeln:** Aufbau, Build und Ablauf für Pull Requests stehen in
  [CONTRIBUTING.md](CONTRIBUTING.md).
- **Sicherheitslücken** bitte vertraulich melden, siehe [SECURITY.md](SECURITY.md).
- Änderungen je Version: [CHANGELOG.md](CHANGELOG.md)

## Lizenz

Der Quellcode steht unter der [MIT-Lizenz](LICENSE). Sie gilt nur für den Code in diesem
Repository, nicht für die Inhalte und Dienste von Spiele-Offensive.de bzw. Happyshops, auf die
die App zugreift.
