# Sicherheitsrichtlinie

## Unterstützte Versionen

Sicherheitskorrekturen gibt es nur für die jeweils **neueste Version** unter
[Releases](https://github.com/UbivisMedia/SO-Regelvideo-SamsungTizenTVApp/releases).
Ältere Versionen werden nicht nachgepflegt. Bitte vor einer Meldung prüfen, ob das Problem
auch in der aktuellen Version besteht.

| Version          | Unterstützt |
| ---------------- | ----------- |
| neueste (1.x)    | ✅          |
| ältere Versionen | ❌          |

## Sicherheitslücke melden

Bitte **kein öffentliches Issue** für Sicherheitslücken anlegen.

Melde sie stattdessen vertraulich über GitHub:
**[Sicherheitslücke melden](https://github.com/UbivisMedia/SO-Regelvideo-SamsungTizenTVApp/security/advisories/new)**
(Reiter *Security* → *Report a vulnerability*).

Hilfreich sind:

- betroffene Version und TV-Modell bzw. Tizen-Version
- Beschreibung des Problems und der möglichen Auswirkungen
- Schritte zum Nachvollziehen, ggf. ein Proof of Concept
- falls vorhanden: Vorschlag zur Behebung

Bitte keine echten Zugangsdaten, Session-Cookies oder sonstigen persönlichen Daten in die Meldung
schreiben.

## Ablauf

Das ist ein privates Freizeitprojekt, Antworten erfolgen nach bestem Bemühen:

- Eingangsbestätigung in der Regel innerhalb von **7 Tagen**
- danach Einschätzung und, falls nötig, eine Korrektur in einem neuen Release
- Veröffentlichung der Details erst, wenn eine korrigierte Version verfügbar ist; auf Wunsch
  wirst du im Advisory bzw. Changelog genannt

## Geltungsbereich

**Betroffen** ist der Code in diesem Repository (die TV-App und das Build-Skript), z. B.:

- Abfluss der gespeicherten Zugangsdaten an Dritte
- Einschleusen von Code über Inhalte der abgerufenen Seiten (XSS in der App)
- Anfragen an andere als die vorgesehenen Server

**Nicht betroffen** sind:

- **Website und Dienste von Spiele-Offensive.de bzw. Happyshops.** Lücken dort bitte direkt
  an den jeweiligen Betreiber melden. Dieses Projekt ist mit ihnen nicht verbunden.
- Lücken im TV-Betriebssystem, in der Tizen-Web-Runtime oder in Apps2Samsung. Diese bitte an
  Samsung bzw. die jeweiligen Entwickler melden.

## Bekannte Einschränkungen

Diese Punkte sind bewusst so umgesetzt und gelten nicht als neue Lücke:

- **Zugangsdaten** liegen nur Base64-verschleiert, aber **nicht verschlüsselt** im localStorage
  der App auf dem TV. Wer Zugriff auf den Speicher des TVs hat (z. B. per Developer Mode),
  kann sie auslesen. Mit der roten Taste (Abmelden) werden sie gelöscht.
- `config.xml` erlaubt mit `<access origin="*">` Netzwerkzugriffe auf beliebige Server. Der Code
  prüft aber selbst jede Zieladresse: Anfragen mit Cookies und Zugangsdaten gehen nur per HTTPS an
  spiele-offensive.de, Videos zusätzlich nur an den Happyshops-Medienserver.
- Die App hat keinen eigenen Server und sendet keine Daten an Dritte. Sie spricht ausschließlich
  mit den oben genannten Diensten.
