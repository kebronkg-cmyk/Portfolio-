/* ==========================================================================
   CONTENT — alles, was du ändern willst, steht hier.
   --------------------------------------------------------------------------
   • Texte sind zweisprachig (de / en). Wenn du nur eine Sprache willst,
     setze `languages: ['de']`.
   • Alles, was mit  ⟨TODO⟩  markiert ist, sind Platzhalter, die ich von dir
     brauche (siehe BRIEFING.md).
   • Projektbilder: lege sie unter /public/projects/<slug>/ ab und trage die
     Dateinamen bei `images` ein. Solange `images` leer ist, generiert die
     Seite automatisch Platzhalter-Cover im passenden Stil.
   • Porträt: lege ein Foto als /public/portrait.jpg ab (siehe BRIEFING.md).
     Solange keins da ist, wird eine generierte 3D-Büste angezeigt.
   ========================================================================== */

export const site = {
  // ⟨TODO⟩ Dein Name, so wie er groß auf der Seite stehen soll
  name: 'KEBRON K.',
  shortName: 'KEBRON',
  // ⟨TODO⟩ echte Adresse
  email: 'hello@example.com',
  // Falls du ein Formular-Backend willst (z. B. https://formspree.io → kostenlos),
  // trage hier die Endpoint-URL ein. Leer = Formular öffnet das Mailprogramm.
  formEndpoint: '',
  year: new Date().getFullYear(),
  languages: ['de', 'en'],
  defaultLanguage: 'de',
  // ⟨TODO⟩ deine Profile – leere Einträge werden ausgeblendet
  socials: [
    { label: 'instagram', url: 'https://www.instagram.com/' },
    { label: 'linkedin', url: 'https://www.linkedin.com/' },
    { label: 'behance', url: '' },
    { label: 'github', url: 'https://github.com/' },
  ],
  // ⟨TODO⟩ Zeitzone für die Uhr im Menü
  timezone: 'Europe/Berlin',
  // Porträt (Hero). Wenn die Datei fehlt, wird die generierte Büste genutzt.
  portrait: 'portrait.jpg',
  // Optional: Hintergrund des Fotos automatisch entfernen (nur sinnvoll, wenn
  // das Foto vor einem ruhigen, dunklen ODER hellen Hintergrund gemacht wurde)
  portraitKeyOut: 'auto', // 'auto' | 'dark' | 'light' | 'none'
};

export const copy = {
  de: {
    metaTitle: `${site.name} — Design & Entwicklung`,
    metaDescription:
      'Unabhängiger Designer & Creative Developer. Websites mit Haltung – Motion, 3D und Details, die hängen bleiben.',
    skip: 'Zum Inhalt springen',
    letsTalk: 'let’s talk',
    menu: 'menü',
    close: 'schließen',
    loading: 'lädt',
    portfolio: '// portfolio',
    heroLine:
      'Unabhängiger Designer & Creative Developer. Ich baue Websites, die man nicht wegscrollt.',
    scrollHint: 'scrollen',
    selectedWork: 'Ausgewählte Arbeiten',
    info: 'Info',
    role: 'Rolle',
    year: 'Jahr',
    openProject: 'Projekt öffnen',
    project: 'Projekt',
    visit: 'live ansehen',
    aboutLabel: 'über mich',
    aboutTitle: 'Ich gestalte Websites, an die man sich erinnert.',
    aboutText:
      'Die meisten Websites sehen entweder gut aus oder laufen gut. Ich baue welche, die beides können – mit Motion, 3D und einer Liebe zum Detail, die man auf jedem Gerät spürt.',
    clientsLabel: 'mit wem ich arbeite',
    clientsTitle: 'Gründer:innen, Studios, Künstler:innen.',
    clientsText:
      'Ob Start-up, Agentur oder Solo-Künstler:in – jede Seite wird um ihren Markt und das Problem herum gebaut, das sie lösen soll. Kein Template. Keine Abkürzung.',
    servicesLabel: 'was ich mache',
    services: ['Webdesign', 'Creative Development', 'Motion & Interaction', 'WebGL / 3D', 'Art Direction', 'Branding'],
    learnMore: 'mehr erfahren',
    contactLabel: 'kontakt',
    contactTitle: ['lass uns über', 'dein nächstes', 'projekt reden.'],
    contactSub: 'Kurzes Formular ausfüllen – ich melde mich innerhalb von 24 Stunden.',
    contactCta: 'projekt anfragen',
    orEmail: 'oder schreib direkt an',
    scrollBack: 'nach oben',
    rights: 'alle rechte vorbehalten',
    imprint: 'impressum',
    privacy: 'datenschutz',
    nav: ['start', 'arbeiten', 'über mich', 'kontakt'],
    statusLabel: 'status',
    status: 'offen für neue projekte', // ⟨TODO⟩
    timeLabel: 'ortszeit',
    basedLabel: 'standort',
    based: 'Deutschland · weltweit remote', // ⟨TODO⟩
    form: {
      title: 'Projekt anfragen',
      name: 'Name',
      email: 'E-Mail',
      company: 'Firma / Marke (optional)',
      budget: 'Budget',
      budgets: ['< 3k €', '3–8k €', '8–15k €', '15k € +', 'weiß ich noch nicht'],
      message: 'Worum geht’s?',
      send: 'absenden',
      sending: 'sendet …',
      thanks: 'Danke! Ich melde mich in den nächsten 24 Stunden.',
      error: 'Das hat nicht geklappt. Schreib mir gerne direkt per Mail.',
    },
    sensors: {
      text: 'Diese Seite würde gern deine',
      strong: 'Bewegungs- & Lagesensoren',
      text2: 'nutzen.',
      allow: 'erlauben',
      decline: 'ablehnen',
    },
  },

  en: {
    metaTitle: `${site.name} — Design & Development`,
    metaDescription:
      'Independent designer & creative developer. Websites with an attitude – motion, 3D and details that stick.',
    skip: 'Skip to content',
    letsTalk: 'let’s talk',
    menu: 'menu',
    close: 'close',
    loading: 'loading',
    portfolio: '// portfolio',
    heroLine: 'Independent designer & creative developer. I build websites people don’t scroll past.',
    scrollHint: 'scroll',
    selectedWork: 'Selected work',
    info: 'Info',
    role: 'Role',
    year: 'Year',
    openProject: 'Open project',
    project: 'Project',
    visit: 'visit live',
    aboutLabel: 'about me',
    aboutTitle: 'I design websites people remember.',
    aboutText:
      'Most websites either look stunning or run well. I build ones that do both – packed with motion, 3D and a love for detail you can feel on every device.',
    clientsLabel: 'who i work with',
    clientsTitle: 'Founders, studios, artists.',
    clientsText:
      'Start-up, agency or solo artist – every site is shaped around its market and the problem it needs to solve. No templates. No shortcuts.',
    servicesLabel: 'what i do',
    services: ['Web Design', 'Creative Development', 'Motion & Interaction', 'WebGL / 3D', 'Art Direction', 'Branding'],
    learnMore: 'learn more',
    contactLabel: 'contact',
    contactTitle: ['let’s talk about', 'your next', 'project.'],
    contactSub: 'Fill in a quick form and I’ll get back to you within 24 hours.',
    contactCta: 'start a project',
    orEmail: 'or write directly to',
    scrollBack: 'scroll back',
    rights: 'all rights reserved',
    imprint: 'imprint',
    privacy: 'privacy',
    nav: ['home', 'work', 'about', 'contact'],
    statusLabel: 'status',
    status: 'available for new projects',
    timeLabel: 'local time',
    basedLabel: 'based in',
    based: 'Germany · remote worldwide',
    form: {
      title: 'Start a project',
      name: 'Name',
      email: 'Email',
      company: 'Company / brand (optional)',
      budget: 'Budget',
      budgets: ['< 3k €', '3–8k €', '8–15k €', '15k € +', 'not sure yet'],
      message: 'What’s it about?',
      send: 'send',
      sending: 'sending …',
      thanks: 'Thanks! I’ll get back to you within 24 hours.',
      error: 'That didn’t work. Feel free to email me directly.',
    },
    sensors: {
      text: 'This website would like to use your',
      strong: 'motion & orientation',
      text2: 'sensors.',
      allow: 'allow',
      decline: 'decline',
    },
  },
};

/* --------------------------------------------------------------------------
   PROJEKTE
   • slug: Ordnername unter /public/projects/
   • images: z. B. ['01.jpg', '02.jpg'] – erstes Bild = Cover im 3D-Raum
   • palette: Farben für die generierten Platzhalter (solange keine Bilder da sind)
   -------------------------------------------------------------------------- */
export const projects = [
  {
    slug: 'nocturne',
    title: 'NOCTURNE RECORDS',
    year: '2026',
    url: '',
    role: ['Design', 'Development', 'Motion'],
    images: [],
    palette: ['#0b0b0f', '#ff4d2e', '#f2efe9'],
    kicker: 'LISTEN AFTER DARK',
    info: {
      de: '⟨TODO⟩ Platzhalter. Independent-Label mit einem Webauftritt, der sich wie Plattendrehen anfühlt – WebGL-Vinyl, Scroll-Scratching und ein Shop, der verkauft.',
      en: '⟨TODO⟩ Placeholder. Independent label with a site that feels like spinning records – WebGL vinyl, scroll scratching and a shop that sells.',
    },
  },
  {
    slug: 'atelier-mono',
    title: 'ATELIER MONO',
    year: '2026',
    url: '',
    role: ['Art Direction', 'Design'],
    images: [],
    palette: ['#e9e6df', '#121212', '#2f5bff'],
    kicker: 'OBJECTS FOR QUIET ROOMS',
    info: {
      de: '⟨TODO⟩ Platzhalter. Möbel-Atelier aus Berlin. Ein ruhiges, editoriales Design mit taktilen Mikro-Interaktionen und 3D-Objektansichten.',
      en: '⟨TODO⟩ Placeholder. Furniture atelier from Berlin. A calm, editorial design with tactile micro-interactions and 3D object views.',
    },
  },
  {
    slug: 'helio',
    title: 'HELIO ENERGY',
    year: '2025',
    url: '',
    role: ['Design', 'Development', 'WebGL'],
    images: [],
    palette: ['#06140f', '#c6ff3d', '#e8fff0'],
    kicker: 'POWER THAT GROWS',
    info: {
      de: '⟨TODO⟩ Platzhalter. Climate-Tech-Start-up. Interaktive Datenvisualisierung eines Solarparks in Echtzeit, gebaut für die Series-A-Präsentation.',
      en: '⟨TODO⟩ Placeholder. Climate-tech start-up. Interactive real-time data visualisation of a solar farm, built for the Series A pitch.',
    },
  },
  {
    slug: 'kollektiv',
    title: 'KOLLEKTIV 19',
    year: '2025',
    url: '',
    role: ['Development', 'Motion'],
    images: [],
    palette: ['#14002e', '#ff5cf0', '#ffe14d'],
    kicker: 'ART IS A VERB',
    info: {
      de: '⟨TODO⟩ Platzhalter. Künstler:innen-Kollektiv mit wechselnden Ausstellungen. Eine Website, die sich mit jeder Show neu einfärbt.',
      en: '⟨TODO⟩ Placeholder. Artist collective with rotating exhibitions. A website that recolours itself with every show.',
    },
  },
];
