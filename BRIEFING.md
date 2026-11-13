# Briefing – was noch von dir kommt

Stand: Version 5 (Schwarz/Pink, du als Avatar). Alles Folgende steht in
`src/content.js` oder ist eine Datei in `public/`.

## Offen

| # | Was | Wohin |
|---|-----|-------|
| 1 | **Formular-Versand**: kostenloser Zugang bei formspree.io, die Adresse von dort eintragen. Bis dahin öffnet „Anfrage senden“ dein Mailprogramm. | `site.formEndpoint` |
| 2 | **Instagram-/LinkedIn-Link** (aktuell nur Platzhalter-Adresse) | `site.socials` |
| 3 | **Erlaubnis für die vier gezeigten Seiten**: Darfst du Antica, Weg der vier Winde, Irmonhair und Omer’s Hair öffentlich als Arbeiten zeigen? | `projects` |
| 4 | **Standort** „München“ stimmt? | `role` (de/en) |
| 5 | **Budget-Stufen** im Formular passen zu deinen Preisen? | `form.budgets` |
| 6 | **Status** „Nimmt Projekte an“ aktuell halten | `status` |
| 7 | **Impressum und Datenschutz** ausfüllen (in Deutschland Pflicht) | `impressum.html`, `datenschutz.html` |
| 8 | **Eigene Domain** und später eine Mail-Adresse darauf | – |

## Bilder austauschen

- **Avatar**: `public/avatar.jpg` (577 × 1024, Graustufen). Das Bild wird von vorn auf Kopf und
  Oberkörper gelegt. Ein neues Bild muss denselben Ausschnitt haben (Augen bei x 300 / y 262,
  Ohr zu Ohr ca. 180 px), sonst sitzt das Gesicht schief – sag mir Bescheid, ich richte es aus.
- **Projekte**: `public/projects/<slug>/01.jpg` (quer, 1600 × 1000) ist das Plakat am Desktop,
  `m.jpg` (hoch, 780 × 1300) das Plakat am Handy, `02.jpg`, `03.jpg` … erscheinen in der Galerie.

## Texte

Alle Texte (Deutsch und Englisch) stehen in `src/content.js`:
Wand-Wörter (`wallWords`), Aussagen (`pitch`), Branchen (`sectors`), Ablauf (`process`),
Schild am Ende (`contactTitle`). Die Wörter, die die Partikel schreiben, stehen jeweils bei `words` bzw. `word`.
