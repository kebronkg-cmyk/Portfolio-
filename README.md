# Portfolio – Kebron.g

Scroll-getriebene Portfolio-Seite in Schwarz und Pink. Der Avatar (aus einem Foto) fängt
die Projekt-Plakate aus der Luft, lässt sie auf dem Finger kreisen und hält sie in die Kamera.

- **Aktuelle Version:** [kebronkg-cmyk.github.io/Portfolio-/v2/](https://kebronkg-cmyk.github.io/Portfolio-/v2/)
- **Version 1 (eingefroren):** [kebronkg-cmyk.github.io/Portfolio-/](https://kebronkg-cmyk.github.io/Portfolio-/)
- Was noch fehlt: [`BRIEFING.md`](BRIEFING.md) · Analyse der Referenz: [`ANALYSE.md`](ANALYSE.md)

## Ablauf der Seite

1. **Start** – Avatar vor der Wand aus verschachtelten Rechtecken, die KEBRON / DEVELOPER / DESIGNER schreibt
2. **Aussage** – ein Partikelschwarm schreibt drei Sätze vor ihm in die Luft
3. **Arbeiten** – pinke Marmorwelt; pro Projekt: Plakat fliegt an → kreist auf dem Finger → wird gedreht,
   gegriffen und groß gezeigt → weggeschleudert
4. **Für wen** – Partikel schreiben die Branchen, eine Hand zeigt darauf
5. **Ablauf** – 01 / 02 / 03
6. **Kontakt** – er hält das große Schild hin; Antippen öffnet das Formular (drei Schritte)

## Lokal starten

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # fertige Seite in /dist
```

Hilfen beim Prüfen: `?debug` (kein Einblenden, `__goto('work', 0.2)` in der Konsole),
`?debug&hq` (volle Avatar-Auflösung auch auf langsamen Rechnern).

## Aufbau

```
src/
  content.js            ← alle Texte (DE/EN), Projekte, Links
  main.js               ← Scroll, Abschnitte, Overlays, Formular, Boot
  styles/main.css       ← Schwarz/Pink, Layout, Handy
  assets/marble.jpg     ← pinker Marmor (selbst erzeugt) für Karte und Formular
  ui/                   ← Preloader, Cursor-Schild, Sprache
  gl/
    figureShader.js     ← Avatar: Kopf/Torso mit Foto, Afro, Hemdärmel, Hände (Raymarching)
    rig.js              ← Choreografie der Plakate, Federn, Arm-IK, Finger, Kopf, Geste
    compositeShader.js  ← Wand (Quadtree + Schrift), Marmor, Bildzeilen-Druck, Plakat, Tiefe
    particles.js        ← Partikelschwarm, der Wörter formt
    post.js             ← Röhren-Effekt, Glitch, Blitz bei Szenenwechsel
    stage.js            ← Kamera, Szenen, Leistungsregelung, Zusammenspiel
```

- Ohne WebGL zeigt die Seite Texte und Projektbilder statisch.
- `prefers-reduced-motion` wird respektiert.
- Schwache Geräte: Erst sinkt die Auflösung des Avatars, dann die des Bildschirms.
- Keine externen Requests, keine Cookies, Schriften lokal.

## Veröffentlichen

Jeder Push auf `main` oder `claude/**` baut über `.github/workflows/deploy.yml` beide Versionen
und veröffentlicht sie auf GitHub Pages.
