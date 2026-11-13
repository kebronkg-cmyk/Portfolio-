# Hinweise für Claude

## Vorschau-Links (GitHub Pages)
- Jeder Push auf `main` oder einen `claude/**`-Branch baut die Seite und veröffentlicht sie
  über `.github/workflows/deploy.yml` auf GitHub Pages (Build dauert ~1–2 Min.).
- **Aktuelle Version:** https://kebronkg-cmyk.github.io/Portfolio-/v2/
- **Version 1 (eingefroren, Commit `41fb9ad`):** https://kebronkg-cmyk.github.io/Portfolio-/
- Nach jedem Push: Skill `github-weblink` nutzen und den Link der aktuellen Version als
  klickbaren Markdown-Link nennen. Build-Status: https://github.com/kebronkg-cmyk/Portfolio-/actions
- Einmalige Einstellungen (erledigt): Pages-Source „GitHub Actions“; Environment `github-pages`
  erlaubt `claude/**`.

## Design-Leitplanken (vom User, Stand Version 5)
- Farben: **viel Schwarz und Pink** (sein Pink: `#ffccd8`, als fließender Marmor). Wichtiges kontrastreich.
- Herzstück: er selbst als Avatar (`public/avatar.jpg` auf Kopf/Torso projiziert). Die Plakate
  fliegen an, kreisen auf dem Finger, werden groß gezeigt und weggeschleudert. Bewegung soll
  menschlich und flüssig sein, kein Schritt darf beim normalen Scrollen übersprungen werden.
- Wand-Schrift aus verschachtelten Rechtecken, Partikel („Nanobots“) formen Aussagen.
- Röhren-Look und Übergänge wie bei Version 1 / der Referenz (fojcikdominik.com).
- Ziel der Seite: Anfragen (Formular in drei Schritten). Projekte nur als beste Ausschnitte.
- Plakate und Schild groß, aber immer vollständig sichtbar; am Handy besonders prüfen.
- Installierte Skills (`.claude/skills/`): Emil Kowalskis Animations-Skills und Impeccable.
  Erst ausführen, wenn der User es sagt. Sein eigener „Google-Skill“ wurde noch nicht gefunden.
- Testen: Die Umgebung hat keine Grafikkarte (Software-WebGL, wenige Bilder pro Sekunde).
  Mit `?debug` und langen Wartezeiten prüfen, `?debug&hq` für volle Avatar-Qualität.
