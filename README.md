# Portfolio – Kebron.g

Scroll-getriebene Portfolio-Seite, dunkel mit rosa und weißen Akzenten. Der Avatar (aus einem Foto) fängt
die Projekt-Plakate aus der Luft, lässt sie auf dem Finger kreisen und hält sie in die Kamera.

- **Aktuelle Version:** [kebronkg-cmyk.github.io/Portfolio-/v2/](https://kebronkg-cmyk.github.io/Portfolio-/v2/)
- **Version 1 (eingefroren):** [kebronkg-cmyk.github.io/Portfolio-/](https://kebronkg-cmyk.github.io/Portfolio-/)
- Was noch fehlt: [`BRIEFING.md`](BRIEFING.md) · Analyse der Referenz: [`ANALYSE.md`](ANALYSE.md)

## Ablauf der Seite

1. **Start** – der Avatar (das ausgeschnittene Foto als Relief) vor der Wand aus verschachtelten
   Rechtecken, die KEBRON / DEVELOPER / DESIGNER schreibt
2. **Aussage** – einmalig: ein Chaos flackernder Zeichen formt von selbst den Satz
3. **Arbeiten** – pro Projekt ein Plakat: die Pizza kreist auf dem Finger, die anderen holt er
   von rechts oder hebt sie von unten hoch; dann groß zeigen
4. **Für wen** und 5. **Ablauf** – großes Pixel-Wort, eine Hand zeigt darauf
6. **Kontakt** – er hebt das große Schild hoch; Antippen öffnet das Formular (drei Schritte)

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
  ui/                   ← Preloader, Cursor-Schild, Sprache
  gl/
    figure.js           ← Avatar: Foto-Relief für Kopf/Torso, Arme mit echtem Ärmelstoff, Hände
    rig.js              ← Choreografie der Plakate, Federn, Arm-IK, Finger, Kopf, Geste
    compositeShader.js  ← Wand (Quadtree + Schrift), Bildzeilen-Druck, Plakat, Tiefe
    particles.js        ← Zeichen-Schwarm, der einmal einen Satz formt
    post.js             ← Röhren-Effekt, Glitch, Blitz
    stage.js            ← Kamera, Szenen, Leistungsregelung, Zusammenspiel
```

- Ohne WebGL zeigt die Seite Texte und Projektbilder statisch.
- `prefers-reduced-motion` wird respektiert.
- Schwache Geräte: Erst sinkt die Auflösung des Avatars, dann die des Bildschirms.
- Keine externen Requests, keine Cookies, Schriften lokal.

## Veröffentlichen

Jeder Push auf `main` oder `claude/**` baut über `.github/workflows/deploy.yml` beide Versionen
und veröffentlicht sie auf GitHub Pages.
