# Portfolio

Scroll-getriebene WebGL-Portfolio-Seite im Röhrenmonitor-/Terminal-Look.
Inspiriert vom Niveau von fojcikdominik.com – eigenständig umgesetzt.

**Live-Vorschau:** [kebronkg-cmyk.github.io/Portfolio-](https://kebronkg-cmyk.github.io/Portfolio-/)

- **Was ich mir angeschaut habe und wie ich vorgegangen bin:** [`ANALYSE.md`](ANALYSE.md)
- **Was ich von dir brauche:** [`BRIEFING.md`](BRIEFING.md)

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
| `public/portrait.jpg` | Dein Porträt (fehlt es, wird eine generierte Büste gezeigt) |
| `public/projects/<slug>/*.jpg` | Projektbilder, in `content.js` bei `images` eintragen |
| `impressum.html`, `datenschutz.html` | Rechtliches (Vorlagen, bitte ausfüllen) |
| `public/og.jpg` | Vorschaubild beim Teilen (WhatsApp, LinkedIn …) |

## Aufbau

```
src/
  content.js        ← Inhalte
  main.js           ← Scroll, Overlays, Formular, Boot
  styles/main.css   ← Design-Tokens, Layout, Responsive
  ui/               ← Preloader, Cursor, Sprache, Sensoren, Text-Scramble
  gl/               ← WebGL-Szene (Three.js)
    stage.js        ← Renderer, Kamerafahrt, Theme-Wechsel
    post.js         ← CRT-Shader (Fisheye, Scanlines, RGB, Glitch, Grain)
    portrait.js     ← Punktmatrix-Porträt (+ bust.js als Platzhalter)
    screens.js      ← gewölbte Projekt-Bildschirme
    covers.js       ← generierte Platzhalter-Cover
    tunnel.js       ← Drahtgitter-Raum
    floorText.js    ← Terminal-Text am Boden
    emblem.js       ← Morph-Punktwolke (About/Kontakt)
```

- Kein WebGL? → Die Seite zeigt automatisch eine statische Variante.
- `prefers-reduced-motion` wird respektiert (keine Glitches, kein Smooth-Scroll).
- Schwache Geräte: Die Auflösung regelt sich automatisch herunter, wenn die FPS fallen.
- Keine externen Requests, keine Cookies, Fonts lokal (DSGVO-freundlich).

## Veröffentlichen

**GitHub Pages** (schon vorbereitet): Im Repo unter *Settings → Pages → Source*
„GitHub Actions“ wählen. Jeder Push auf `main` baut und veröffentlicht die Seite.

Alternativ **Vercel/Netlify**: Repo verbinden, Build-Befehl `npm run build`, Ordner `dist`.
