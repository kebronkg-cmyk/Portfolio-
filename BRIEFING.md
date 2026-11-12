# Briefing – was ich von dir brauche

> Stand: erste Iteration. Die Seite läuft komplett mit Platzhaltern.
> Alles unten Genannte ersetzt die Platzhalter – die meisten Punkte sind
> nur ein Eintrag in `src/content.js` oder eine Datei in `public/`.

## 1. Pflicht (ohne das geht's nicht live)

| # | Was | Wohin | Hinweis |
|---|-----|-------|---------|
| 1 | **Dein Name** (so wie er groß im Hero stehen soll) | `site.name` | Aktuell steht da „KEBRON K.“ – geraten aus deinem GitHub-Namen. |
| 2 | **Was du machst** (1 Satz, Positionierung) | `heroLine` (de/en) | z. B. „Designer & Developer für Marken, die auffallen wollen“. |
| 3 | **E-Mail-Adresse** für Anfragen | `site.email` | |
| 4 | **Porträtfoto** | `public/portrait.jpg` | Siehe Foto-Guide unten – das ist das wichtigste Asset. |
| 5 | **3–6 Projekte** mit Titel, Jahr, 1–3 Sätzen, Rolle, ggf. Link | `projects` | Mehr als 6 wird lang – lieber kuratieren. |
| 6 | **Projektbilder** (2–6 pro Projekt) | `public/projects/<slug>/` | Siehe Bild-Guide unten. |
| 7 | **Impressum-Daten** (Name, Anschrift, ggf. USt-ID) | `impressum.html` | In DE Pflicht, sobald die Seite geschäftlich ist. |

## 2. Wichtig für den Feinschliff

- **Social-Links** (Instagram, LinkedIn, Behance, GitHub, X …) → `site.socials`
- **Über-mich-Texte**: Wer bist du, mit wem arbeitest du, was machst du → `aboutTitle/aboutText/clientsText/services`
- **Sprache**: Nur Deutsch, nur Englisch oder beides? (aktuell: beides mit Umschalter)
- **Status im Menü**: „offen für Projekte“ / „ausgebucht bis …“, Standort
- **Formular**: Soll das Formular wirklich Mails verschicken? Dann einen kostenlosen
  Account bei [formspree.io](https://formspree.io) anlegen und die Endpoint-URL bei
  `site.formEndpoint` eintragen. Ohne Endpoint öffnet das Formular dein Mailprogramm.
- **Domain**: Hast du schon eine (z. B. `deinname.de`)? Dann richte ich die ein.
- **Farbakzent**: Aktuell „Signal-Lime“ `#c6ff3d`. Wenn du eine Markenfarbe hast → sag Bescheid.

## 3. Foto-Guide (Hero-Porträt)

Das Foto wird in ein Raster aus leuchtenden Punkten zerlegt (Helligkeit → Punktgröße
und Tiefe). Damit das richtig gut aussieht:

- **Brustbild / Büste**, Kopf + Schultern, frontal oder leicht seitlich (¾-Ansicht)
- **Ruhiger, einfarbiger Hintergrund** – am besten **schwarz oder sehr dunkel**
  (alternativ ganz weiß). Der Hintergrund wird automatisch herausgerechnet.
- **Seitliches, hartes Licht** (eine Lichtquelle, z. B. Fenster von der Seite) –
  Kontrast = Tiefe im Effekt. Flaches Licht wirkt im Punktraster flach.
- Hochformat, mind. **1200 px** hoch, JPG oder PNG.
- **Ideal**: PNG mit freigestelltem Hintergrund (transparent). Dann `portraitKeyOut: 'none'`.
- Optional/Next Level: ein **kurzes Video (3–5 s, Kopf dreht sich leicht)** – dann
  kann ich das Porträt animieren statt statisch (wie bei der Referenz).

## 4. Bild-Guide (Projekte)

- Format **16:10 oder 16:9**, mind. **1600 px** breit, JPG/WebP, je < 400 KB
- Das **erste Bild** ist das Cover auf dem „Röhrenbildschirm“ im 3D-Raum → am besten
  ein starker Website-Screenshot (Hero der Seite) mit großer Typo
- Die weiteren Bilder erscheinen in der Projekt-Galerie (Detailansichten, Mobile-Screens,
  Close-ups von Interaktionen)
- Dateien z. B. `public/projects/mein-projekt/01.jpg`, `02.jpg` … und in `content.js`:
  `images: ['01.jpg', '02.jpg']`

## 5. Offene Fragen an dich

1. Was genau ist dein Beruf / Angebot? (Webdesign? Development? Branding? Fotografie? Motion?)
   – davon hängt ab, wie ich die Projekt-Sektion und die Texte zuspitze.
2. Wer soll die Seite sehen? (Agenturen, Start-ups, Künstler:innen, Arbeitgeber?)
3. Gibt es Projekte mit Videos? → Die Bildschirme können auch **Videos abspielen** (Loop).
4. Brauchst du Unterseiten wie bei der Referenz (Articles, Tools, Credits)?
5. Soll ich zusätzlich einen **Sound-Layer** (leises Röhren-Brummen, UI-Klicks, standardmäßig aus) einbauen?
