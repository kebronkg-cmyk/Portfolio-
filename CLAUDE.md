# Hinweise für Claude

## Vorschau-Link (GitHub Pages)
- Jeder Push auf `main` oder einen `claude/**`-Branch baut die Seite und veröffentlicht sie
  über `.github/workflows/deploy.yml` auf GitHub Pages.
- Vorschau-URL: https://kebronkg-cmyk.github.io/Portfolio-/
- Nach jedem Push: Skill `github-weblink` nutzen und diesen Link dem User nennen (und erwähnen, dass der Build ~1–2 Min. dauert).
  Den Workflow-Status findet man unter https://github.com/kebronkg-cmyk/Portfolio-/actions
- Es gibt nur EINE Pages-Vorschau: der zuletzt gepushte Branch ist live.
- Einmalige Einstellungen (schon erledigt, falls die Vorschau läuft):
  1. Settings → Pages → Source: „GitHub Actions“
  2. Settings → Environments → `github-pages` → Deployment branches: `claude/**` erlauben
