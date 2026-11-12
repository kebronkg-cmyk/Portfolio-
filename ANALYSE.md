# Analyse der Referenz: fojcikdominik.com

Untersucht am 12.11.2026 – per Headless-Browser (Screenshots über die komplette
Scroll-Strecke), HTML-Struktur und den ausgelieferten JavaScript-Bundles.

## 1. Technik-Stack

| Bereich | Was er nutzt | Erkenntnis |
|---|---|---|
| Framework | **Astro 6** (statisch generiert) + View Transitions (`ClientRouter`) | Schnelle, SEO-freundliche HTML-Seiten; das 3D läuft als Insel obendrauf. |
| 3D | **Three.js mit WebGPU-Renderer** (Fallback WebGL2), TSL-Shader | Gerendert in einem **Web Worker** (OffscreenCanvas) → Main-Thread bleibt flüssig. |
| Assets | GLB-Modelle (Draco/Meshopt komprimiert), KTX2-Texturen, AVIF-Bilder | Robotik-Arme, Galerie-Kacheln, Korridor, „City Block“ – alles echte 3D-Szenen. |
| Porträt | `glitch-portrait-quadtree.bin` + `impostor.ktx2` | Ein **Video-Porträt**, das in einen **Quadtree** zerlegt wird (große Zellen in ruhigen Bereichen, kleine an Details). |
| Post-Processing | TRAA (temporales Anti-Aliasing), Gaussian Blur, eigener CRT-Pass | Fisheye/Barrel-Verzerrung, Scanlines, RGB-Versatz, VHS-Störstreifen. |
| Scroll | Virtuelles Scrollen (`--scroll-viewports: 18.1`) | Die Seite ist technisch nur 100vh hoch, der Scroll treibt eine Kamerafahrt. |
| Fonts | **OffBit Dot Bold** (Display) + **Doto** (Punktmatrix) | Gesamte Typo im Pixel-/LED-Look. |
| Mobile | Fragt nach **Bewegungs-/Lagesensoren** → Parallax per Handy-Neigung | Eigener Consent-Dialog. |
| Fallback | Alte Browser → Redirect auf `bio.fojcikdominik.com` (Linktree-artig) | |

## 2. Ablauf Stück für Stück

1. **Preloader** – „LOADING“ in Punktschrift, Pill-Ladebalken mit leuchtendem Punkt.
2. **Hero (dunkel)** – Drahtgitter-Raum mit gekrümmten Linien (Fisheye). In der Mitte das
   Quadtree-Porträt in Cyan, gespiegelt am Boden. Links groß der Name + „// portfolio · 02026“,
   rechts ein Blocksatz-Claim in Versalien. Header: Name links, „let’s talk •“ + „menu ☰“ rechts.
3. **Übergang** – Glitch, das Bild kippt von **schwarz auf weiß** (invertiert).
4. **Selected Work (hell)** – Projekte als **gewölbte Röhrenbildschirme**, die durch den Raum
   fliegen. Links eine sticky Liste `[01] … [04]` mit aktivem Punkt. Am Boden läuft
   **Terminal-Text** (Login-Log). Zwischen den Screens echte 3D-Szenen (Roboterarme etc.).
5. **About** – zwei Blöcke („about me“, „who i work with“) mit gestrichelten Icons und „> learn more“.
6. **Contact** – „let’s talk about your next project“, Pill-Button mit blinkenden Pfeilen
   links/rechts/unten beim Hover, Social-Links mit „>“, „scroll back“, Footer.
7. **Menü** – Vollbild, nummerierte Punkte `home 01 … credits 06`, Socials, Privacy.
8. **Projekt-Detail** – Overlay mit „Project 01 / 06“ Bildzähler, Info + Rolle.

## 3. Was die Seite so hochwertig wirken lässt

- **Ein durchgehendes Konzept**: alles ist „Röhrenfernseher / Terminal“ – Fonts, Shader,
  Preloader, Boden-Text, Cursor. Nichts fällt aus dem Rahmen.
- **Kamerafahrt statt Seitenscroll** – man „reist“ durch einen Raum.
- **Kontrastwechsel** dunkel → hell → dunkel gliedert die Seite ohne Trennlinien.
- **Mikro-Details**: blinkender Live-Punkt, Text-Glitches, Fadenkreuz-Cursor, Jahr als „02026“.
- **Performance-Arbeit**: Worker-Rendering, komprimierte Assets, Qualitätsstufen.

## 4. Meine Umsetzung – ähnlich, aber eigenständig

Kein 1:1-Nachbau, sondern das gleiche *Niveau* und die gleiche *Haltung* mit eigenen Ideen:

| Referenz | Meine Version |
|---|---|
| Pill-Ladebalken „LOADING“ | **Boot-Sequenz**: Prozentzähler in Punktschrift + Terminal-Log + CRT-„Einschalt“-Strahl |
| Quadtree-Video-Porträt | **Punktmatrix-Relief**: Foto → leuchtende Pixel, Helligkeit = Tiefe; Maus drückt Pixel weg; beim Scrollen **zerfällt** das Porträt Richtung Kamera |
| Fliegende Screens | Screens, deren Bild sich **von grober Mosaik-Auflösung zu scharf „einschaltet“**, wenn man näherkommt; Hover = RGB-Tearing |
| 3D-Szenen zwischen Projekten | **Morph-Objekt** aus 7.000 Punkten: Kugel → Globus → Knoten → Portal-Ring (passt sich den About-Texten an) |
| Kontakt | Das Morph-Objekt wird zum **Portal-Ring** um die Kontakt-Headline |
| Menü | Plus **Status-Block**: Verfügbarkeit, Live-Ortszeit, Standort |
| — | Zweisprachig (DE/EN), Impressum & Datenschutz (DE-Pflicht), Kontaktformular mit Budget-Auswahl |

## 5. Was für „wirklich auf Referenz-Niveau“ noch fehlt (Iteration 2+)

- **Echtes Porträt** (Foto oder kurzes Video) – größter visueller Hebel.
- **Echte Projektbilder/-videos** – die generierten Cover sind nur Platzhalter.
- **Individuelle 3D-Momente pro Projekt** (z. B. ein Objekt aus dem jeweiligen Projekt
  zwischen den Screens). Dafür bräuchte ich GLB-Modelle oder Ideen pro Projekt.
- **Video-Porträt** statt Standbild (Kopf bewegt sich leicht) – technisch vorbereitet.
- **Projekt-Unterseiten** mit eigener URL (für SEO & Teilen), View Transitions.
- **Sound-Design** (optional).
