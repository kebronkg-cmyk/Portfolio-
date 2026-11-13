---
name: github-weblink
description: Give the user clickable, direct GitHub links to set up and open the GitHub Pages website preview of this repo (Pages source, environment branch rule, Actions re-run, live preview URL). Use after every push, whenever the user asks for a preview/Vorschau link, or asks where to change the Pages settings.
---

# GitHub Web-Links für die Website-Vorschau

Der User arbeitet meist vom Handy aus und will **direkt klickbare Links** – keine Pfade
wie „Settings → Pages“ ohne Link.

## 1. Repo bestimmen

```bash
git remote get-url origin   # → owner/repo ablesen
```

Den Repo-Namen **exakt** übernehmen (Groß-/Kleinschreibung, z. B. endet `Portfolio-`
auf einen Bindestrich). Platzhalter unten: `OWNER`, `REPO`.

## 2. Links IMMER als Markdown-Links ausgeben

Nie nackte URLs (Bindestriche am Ende des Repo-Namens brechen sonst das Auto-Linking).
Format: `👉 [Beschreibung](URL)`

| Zweck | URL |
|---|---|
| Pages einschalten (Source → „GitHub Actions“) | `https://github.com/OWNER/REPO/settings/pages` |
| Branch-Freigabe (Environment `github-pages` → „Add deployment branch or tag rule“ → `claude/**`) | `https://github.com/OWNER/REPO/settings/environments` |
| Build-Status / „Re-run all jobs“ | `https://github.com/OWNER/REPO/actions` |
| Workflow direkt | `https://github.com/OWNER/REPO/actions/workflows/deploy.yml` |
| **Live-Vorschau** | `https://OWNER.github.io/REPO/` (Owner kleingeschrieben). Baut der Workflow mehrere Versionen (siehe `deploy.yml`), liegt die aktuelle unter `/v2/` – steht in `CLAUDE.md`. |
| Pull Requests | `https://github.com/OWNER/REPO/pulls` |

## 3. Vorgehen

1. Prüfen, ob `.github/workflows/deploy.yml` existiert und auf `main` **und** `claude/**`
   triggert. Wenn nicht: anlegen/ergänzen (Vite-Build → `actions/upload-pages-artifact` →
   `actions/deploy-pages`), committen, pushen.
2. Prüfen, ob die Vorschau schon läuft:
   `curl -s -o /dev/null -w "%{http_code}" https://OWNER.github.io/REPO/`
   - `200` → nur den **Live-Vorschau**-Link nennen + „Build dauert ~1–2 Min. nach dem Push“.
   - sonst → die drei Einrichtungs-Schritte (Pages, Branch-Freigabe, Re-run) mit Links
     nummeriert ausgeben, danach den Vorschau-Link.
3. Hinweis geben: Es gibt nur **eine** Pages-Vorschau – der zuletzt gepushte Branch ist live.
4. Die Seite des Environments `github-pages` selbst hat eine ID in der URL, die man ohne
   API-Zugriff nicht kennt → auf die Environments-Übersicht verlinken und sagen, dass man
   dort auf „github-pages“ klickt.

## Antwort-Vorlage (Deutsch, kurz)

**1. Pages einschalten** – 👉 [Pages-Einstellungen](…/settings/pages) → Source: **GitHub Actions**
**2. Branches freigeben** – 👉 [Environments](…/settings/environments) → **github-pages** →
„Add deployment branch or tag rule“ → `claude/**`
**3. Build neu starten** – 👉 [Actions](…/actions) → oberster Lauf → **Re-run all jobs**

👉 **[Website-Vorschau](https://OWNER.github.io/REPO/)** (1–2 Min. nach dem Push)
