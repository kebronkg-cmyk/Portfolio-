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

## Design-Leitplanken (vom User, Stand Version 6)
- **Alles dunkel**: Schwarz als Basis, Akzente in Weiß und seinem Rosa (`#ffccd8`). Kein Marmor, keine Verläufe.
- Avatar = er selbst: Kopf, Hals, Oberkörper sind sein ausgeschnittenes Foto als Relief
  (`public/avatar.jpg` + `public/avatar-body.png`), nur Arme/Hände sind modelliert. Muss wie ein
  normaler Mensch mit echten Proportionen aussehen.
- Plakate: **nur die Pizza (Projekt 1) kreist auf dem Finger**; die anderen holt er von rechts
  oder hebt sie mit Bücken von unten hoch (`entrance` pro Projekt in `content.js` überschreibbar).
- Partikel („Nanobots“) **nur einmal**: Zeichen-Chaos, das sich von selbst zu einem Satz formt.
  Aussage ernsthaft und vertrauensbildend, keine flapsigen Sprüche.
- Muss so flüssig laufen wie Version 1: keine teuren Berechnungen pro Bildpunkt für den Avatar
  (deshalb normale Geometrie statt Raymarching). Handy zuerst prüfen.
- Vibe von Version 1 / Referenz: Röhren-Look, flackernde Zeichen, Wand aus verschachtelten Rechtecken.
- Ziel der Seite: Anfragen (Formular in drei Schritten). Projekte nur als beste Ausschnitte.
- Installierte Skills (`.claude/skills/`): Emil Kowalskis Animations-Skills und Impeccable.
  Erst ausführen, wenn der User es sagt. Sein eigener „Google-Skill“ wurde noch nicht gefunden.
- Testen: Die Umgebung hat keine Grafikkarte. `npm run build`, dann `npx vite preview --port 4173`
  nur kurz im selben Befehl starten, mit `?debug` prüfen (Skripte liegen im Scratchpad der Sitzung).
