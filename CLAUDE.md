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

## Design-Leitplanken (vom User)
- Farben: Papierweiß, weiches Rosé, Schwarz für alles Wichtige; eine Zusatzfarbe (Weinrot) sparsam.
  **Keine Farbverläufe.** Clean, futuristisch.
- Herzstück: der verpixelte Riese (Oberkörper + Arme), der die Website-Entwürfe wie Blätter
  von unten hochzieht und zeigt. Bewegung soll menschlich wirken.
- Ziel der Seite: Anfragen. Projekte nur als beste Ausschnitte.
- Installierte Skills (`.claude/skills/`): Emil Kowalskis Animations-Skills und Impeccable.
  Erst ausführen, wenn der User es sagt.
