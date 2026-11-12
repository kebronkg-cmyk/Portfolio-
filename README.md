# Portfolio

Scroll-getriebene Portfolio-Seite: Ein verpixelter Riese zieht die Website-Entwürfe wie
Blätter von unten ins Bild und hält sie dem Besucher hin. Weiß, Rosé, Schwarz.

- **Aktuelle Version:** [kebronkg-cmyk.github.io/Portfolio-/v2/](https://kebronkg-cmyk.github.io/Portfolio-/v2/)
- **Version 1 (eingefroren):** [kebronkg-cmyk.github.io/Portfolio-/](https://kebronkg-cmyk.github.io/Portfolio-/)
- Analyse der Referenz: [`ANALYSE.md`](ANALYSE.md) · Was noch fehlt: [`BRIEFING.md`](BRIEFING.md)

## Lokal starten

```bash
npm install
npm run dev        # http://localhost:5173  (?debug zeigt FPS)
npm run build      # fertige Seite in /dist
npm run preview    # gebaute Seite testen
```

## Inhalte ändern

Fast alles steht in **`src/content.js`**: Name, Texte (DE/EN), Links, Projekte.

| Datei | Zweck |
|---|---|
| `public/projects/<slug>/` | `01.jpg` = Blatt am Desktop (quer), `m.jpg` = Blatt am Handy (hoch), weitere für die Galerie |
| `impressum.html`, `datenschutz.html` | Rechtliches (Vorlagen, bitte ausfüllen) |
| `public/og.jpg` | Vorschaubild beim Teilen (WhatsApp, LinkedIn …) |

## Aufbau

```
src/
  content.js          ← Inhalte (Texte DE/EN, Projekte, Links)
  main.js             ← Scroll, Overlays, Formular, Boot
  styles/main.css     ← Farben, Layout, Responsive
  ui/                 ← Preloader, Cursor, Sprache, Sensoren
  gl/
    figureShader.js   ← der Riese: Kopf, Rumpf, Arme, Hände (Raymarching, sehr niedrige Auflösung)
    rig.js            ← „Skelett“: Blatt-Choreografie, Federn, Arm-IK, Kopf, Atmung
    stage.js          ← Kamera, Farbwelten, Raster-Druck (ein Quadrat pro Pixel), Blatt
```

- Kein WebGL? → Die Seite zeigt automatisch eine statische Variante.
- `prefers-reduced-motion` wird respektiert (keine Glitches, kein Smooth-Scroll).
- Schwache Geräte: Die Auflösung regelt sich automatisch herunter, wenn die FPS fallen.
- Keine externen Requests, keine Cookies, Fonts lokal (DSGVO-freundlich).

## Veröffentlichen

**GitHub Pages** (schon vorbereitet): Im Repo unter *Settings → Pages → Source*
„GitHub Actions“ wählen. Jeder Push auf `main` baut und veröffentlicht die Seite.

Alternativ **Vercel/Netlify**: Repo verbinden, Build-Befehl `npm run build`, Ordner `dist`.
