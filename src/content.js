/* ==========================================================================
   CONTENT — alles, was du ändern willst, steht hier.
   --------------------------------------------------------------------------
   • Texte sind zweisprachig (de / en). Nur eine Sprache? → `languages: ['de']`
   • ⟨TODO⟩ = bitte prüfen / ersetzen (siehe BRIEFING.md)
   • Projektbilder liegen unter /public/projects/<slug>/
       01.jpg = Blatt am Desktop (quer) · m.jpg = Blatt am Handy (hoch)
   ========================================================================== */

export const site = {
  name: 'KEBRON', // ⟨TODO⟩ steht riesig hinter der Figur – kurz ist besser
  fullName: 'Kebron K.', // ⟨TODO⟩
  email: 'hello@example.com', // ⟨TODO⟩
  // Formular-Backend (z. B. https://formspree.io). Leer = Formular öffnet das Mailprogramm.
  formEndpoint: '',
  year: new Date().getFullYear(),
  languages: ['de', 'en'],
  defaultLanguage: 'de',
  timezone: 'Europe/Berlin',
  socials: [
    { label: 'Instagram', url: 'https://www.instagram.com/' }, // ⟨TODO⟩
    { label: 'LinkedIn', url: '' },
    { label: 'GitHub', url: 'https://github.com/kebronkg-cmyk' },
  ],
};

export const copy = {
  de: {
    metaTitle: `${site.fullName} — Webdesign, das Anfragen bringt`,
    metaDescription:
      'Webdesign & Entwicklung aus München. Maßgeschneiderte Websites für Gastronomie, Salons, Praxen, Kunst und Tech – eigenständig im Auftritt, gebaut für Anfragen.',
    skip: 'Zum Inhalt springen',
    cta: 'Projekt anfragen',
    menu: 'Menü',
    close: 'Schließen',
    role: 'Webdesign & Entwicklung — München', // ⟨TODO⟩ Standort prüfen
    heroTitle: 'Ich baue Websites, die man sich merkt. Und die Kundschaft bringen.',
    heroText: 'Kein Baukasten, keine Vorlage. Jede Seite entsteht für genau ein Geschäft – und für das, was sie dort leisten soll.',
    scrollHint: 'Scrollen',

    workLabel: 'Arbeiten',
    workHint: 'Blatt antippen zum Ansehen',
    view: 'Ansehen',
    visit: 'Live ansehen',
    image: 'Bild',

    aboutLabel: ['Ansatz', 'Für wen', 'Ablauf'],
    approachTitle: 'Schön allein verkauft nichts. Schnell allein vergisst man.',
    approachText: 'Ich baue beides in eine Seite: einen Auftritt, der nach dir aussieht, Technik, die auf jedem Handy sofort da ist, und einen klaren Weg zur Anfrage.',
    sectorsTitle: 'Für jedes Geschäft eine eigene Seite.',
    sectors: [
      ['Gastronomie', 'Tische füllen, nicht nur die Karte zeigen.'],
      ['Salons & Beauty', 'Termine, bevor jemand weiterscrollt.'],
      ['Praxis & Coaching', 'Vertrauen, noch vor dem ersten Gespräch.'],
      ['Kunst & Kultur', 'Eine Bühne, die nach dir aussieht.'],
      ['Tech & Start-ups', 'Ein komplexes Produkt, in Sekunden verstanden.'],
    ],
    processTitle: 'In drei Schritten online.',
    process: [
      ['Kennenlernen', 'Ein kurzes Gespräch: Ziel, Zielgruppe, Rahmen.'],
      ['Entwurf', 'Du siehst früh eine klickbare Richtung und redest mit.'],
      ['Launch', 'Die Seite geht live – und ich bleibe ansprechbar.'],
    ],

    contactTitle: ['Erzähl mir von', 'deinem Projekt.'],
    contactSub: 'Ein paar Angaben genügen. Ich antworte persönlich.',
    contactHint: 'Blatt antippen',
    orEmail: 'Oder direkt per Mail:',
    scrollBack: 'Nach oben',
    imprint: 'Impressum',
    privacy: 'Datenschutz',
    nav: ['Start', 'Arbeiten', 'Ansatz', 'Kontakt'],
    statusLabel: 'Status',
    status: 'Nimmt Projekte an', // ⟨TODO⟩
    timeLabel: 'Ortszeit',
    form: {
      title: 'Projekt anfragen',
      name: 'Name',
      email: 'E-Mail',
      company: 'Unternehmen / Marke (optional)',
      need: 'Was brauchst du?',
      needs: ['Neue Website', 'Relaunch', 'Online-Shop', 'Branding', 'Noch unklar'],
      budget: 'Budget',
      budgets: ['bis 2.000 €', '2.000–5.000 €', '5.000–10.000 €', '10.000 € +', 'noch offen'], // ⟨TODO⟩
      message: 'Worum geht es?',
      send: 'Anfrage senden',
      sending: 'Wird gesendet …',
      thanks: 'Danke! Ich melde mich in Kürze.',
      error: 'Das hat nicht geklappt. Schreib mir gern direkt per Mail.',
    },
    sensors: { text: 'Darf sich die Figur mit deinem Handy mitbewegen?', allow: 'Ja', decline: 'Nein' },
  },

  en: {
    metaTitle: `${site.fullName} — Web design that brings in enquiries`,
    metaDescription:
      'Web design & development from Munich. Tailor-made websites for restaurants, salons, practices, art and tech – distinctive to look at, built for enquiries.',
    skip: 'Skip to content',
    cta: 'Start a project',
    menu: 'Menu',
    close: 'Close',
    role: 'Web design & development — Munich',
    heroTitle: 'I build websites people remember. And that bring in customers.',
    heroText: 'No site builder, no template. Every site is made for exactly one business – and for what it has to do there.',
    scrollHint: 'Scroll',

    workLabel: 'Work',
    workHint: 'Tap the sheet to view',
    view: 'View',
    visit: 'Visit live',
    image: 'Image',

    aboutLabel: ['Approach', 'Who for', 'Process'],
    approachTitle: 'Pretty alone sells nothing. Fast alone is forgotten.',
    approachText: 'I build both into one site: a presence that looks like you, engineering that is instantly there on every phone, and a clear path to the enquiry.',
    sectorsTitle: 'A site of its own for every business.',
    sectors: [
      ['Restaurants', 'Fill tables, don’t just show the menu.'],
      ['Salons & beauty', 'Appointments before anyone scrolls on.'],
      ['Practice & coaching', 'Trust, before the first conversation.'],
      ['Art & culture', 'A stage that looks like you.'],
      ['Tech & start-ups', 'A complex product, understood in seconds.'],
    ],
    processTitle: 'Online in three steps.',
    process: [
      ['Intro', 'A short call: goal, audience, frame.'],
      ['Draft', 'You see a clickable direction early and have a say.'],
      ['Launch', 'The site goes live – and I stay reachable.'],
    ],

    contactTitle: ['Tell me about', 'your project.'],
    contactSub: 'A few details are enough. I reply personally.',
    contactHint: 'Tap the sheet',
    orEmail: 'Or email me directly:',
    scrollBack: 'Back to top',
    imprint: 'Imprint',
    privacy: 'Privacy',
    nav: ['Home', 'Work', 'Approach', 'Contact'],
    statusLabel: 'Status',
    status: 'Taking on projects',
    timeLabel: 'Local time',
    form: {
      title: 'Start a project',
      name: 'Name',
      email: 'Email',
      company: 'Company / brand (optional)',
      need: 'What do you need?',
      needs: ['New website', 'Relaunch', 'Online shop', 'Branding', 'Not sure yet'],
      budget: 'Budget',
      budgets: ['up to €2,000', '€2,000–5,000', '€5,000–10,000', '€10,000 +', 'open'],
      message: 'What’s it about?',
      send: 'Send enquiry',
      sending: 'Sending …',
      thanks: 'Thank you! I’ll be in touch shortly.',
      error: 'That didn’t work. Feel free to email me directly.',
    },
    sensors: { text: 'May the figure move with your phone?', allow: 'Yes', decline: 'No' },
  },
};

/* --------------------------------------------------------------------------
   PROJEKTE — nur die stärksten Ausschnitte.
   ⟨TODO⟩ Bitte bestätigen, dass du diese Seiten öffentlich zeigen darfst.
   -------------------------------------------------------------------------- */
export const projects = [
  {
    slug: 'antica',
    title: 'Antica',
    kind: { de: 'Caffè · Pizza · Bar', en: 'Caffè · Pizza · Bar' },
    year: '2026',
    url: 'https://antica-pizza.pages.dev/',
    images: ['01.jpg', '02.jpg', '03.jpg'],
    info: {
      de: 'Die Pizza spielt die Hauptrolle: Sie dreht sich durchs Sortiment, Karte und Anruf bleiben immer einen Tipp entfernt.',
      en: 'The pizza plays the lead: it spins through the range while menu and phone stay one tap away.',
    },
  },
  {
    slug: 'vierwinde',
    title: 'Weg der vier Winde',
    kind: { de: 'Praxis für Energiearbeit', en: 'Energy work practice' },
    year: '2026',
    url: 'https://wegdervierwinde.de/',
    images: ['01.jpg', '02.jpg', '03.jpg'],
    info: {
      de: 'Hell, ruhig, persönlich. Die Seite nimmt sich Zeit zum Erklären und führt Schritt für Schritt zum Kennenlern-Gespräch.',
      en: 'Bright, calm, personal. The site takes its time to explain and leads step by step to the first conversation.',
    },
  },
  {
    slug: 'irmonhair',
    title: 'Irmonhair',
    kind: { de: 'Friseur & Extensions', en: 'Hair salon & extensions' },
    year: '2026',
    url: 'https://imronhair.pages.dev/',
    images: ['01.jpg', '02.jpg', '03.jpg'],
    info: {
      de: 'Zwei Salons, ein Auftritt: Extensions-Berater, Preise und Terminbuchung ohne Umwege – im Look des Salons.',
      en: 'Two salons, one presence: an extensions guide, prices and booking without detours – in the look of the salon.',
    },
  },
  {
    slug: 'omer',
    title: 'Omer’s Hair',
    kind: { de: 'Fünf Salons', en: 'Five salons' },
    year: '2026',
    url: 'https://kebronkg-cmyk.github.io/Omer-s-Hair/',
    images: ['01.jpg', '02.jpg', '03.jpg'],
    info: {
      de: 'Fünf Standorte unter einer Marke: Salonfinder mit Karte, Öffnungszeiten in Echtzeit, Termin pro Salon.',
      en: 'Five locations under one brand: salon finder with map, live opening hours, booking per salon.',
    },
  },
];
