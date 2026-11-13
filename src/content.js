/* ==========================================================================
   CONTENT — alles, was du ändern willst, steht hier.
   --------------------------------------------------------------------------
   • Texte sind zweisprachig (de / en). Nur eine Sprache? → `languages: ['de']`
   • ⟨TODO⟩ = bitte prüfen
   • Projektbilder: /public/projects/<slug>/
       01.jpg = Plakat am Desktop (quer) · m.jpg = Plakat am Handy (hoch)
   • Avatar: /public/avatar.jpg (dein Bild, als Helligkeitskarte)
   ========================================================================== */

export const site = {
  // Die großen Wörter an der Wand hinter dir
  wallWords: ['KEBRON', 'DEVELOPER', 'DESIGNER'],
  logo: 'Kebron.g',
  email: 'kebron.kg@gmail.com',
  // Formular-Backend (z. B. https://formspree.io). Leer = Formular öffnet das Mailprogramm.
  formEndpoint: '',
  year: new Date().getFullYear(),
  languages: ['de', 'en'],
  defaultLanguage: 'de',
  timezone: 'Europe/Berlin',
  socials: [
    { label: 'Instagram', url: 'https://www.instagram.com/' }, // ⟨TODO⟩ dein Profil
    { label: 'LinkedIn', url: '' },
    { label: 'GitHub', url: 'https://github.com/kebronkg-cmyk' },
  ],
};

export const copy = {
  de: {
    metaTitle: 'Kebron — Developer & Designer. Websites, an denen man hängen bleibt.',
    metaDescription:
      'Kebron baut Websites aus einer Hand: Design, Code und ein klarer Weg zur Anfrage. Für Gastronomie, Salons, Praxen, Kunst und Tech. München.',
    skip: 'Zum Inhalt springen',
    cta: 'Projekt anfragen',
    menu: 'Menü',
    close: 'Schließen',
    role: 'Developer & Designer — München', // ⟨TODO⟩ Standort prüfen
    heroTitle: 'Websites, an denen man hängen bleibt.',
    heroText: 'Design und Code aus einer Hand. Für Marken, die im Netz mehr wollen, als bloß vorhanden zu sein.',
    heroSecondary: 'Arbeiten ansehen',
    scrollHint: 'Scrollen',

    // Aussage: Partikel formen die Wörter, darunter steht je ein Satz
    pitch: [
      { words: ['SCHÖN', 'REICHT NICHT.'], line: 'Eine hübsche Seite, die keiner findet, verkauft nichts.' },
      { words: ['SCHNELL', 'AUCH NICHT.'], line: 'Eine schnelle Seite, an die sich keiner erinnert, auch nicht.' },
      { words: ['ICH BAUE', 'BEIDES.'], line: 'Auftritt, Technik und ein klarer Weg zur Anfrage – in einer Seite.' },
    ],

    workLabel: 'Arbeiten',
    view: 'Ansehen',
    visit: 'Live ansehen',
    image: 'Bild',

    sectorsLabel: 'Für wen',
    sectors: [
      { word: 'GASTRO', name: 'Gastronomie', title: 'Tische füllen, nicht nur die Karte zeigen.', text: 'Reservierung und Anruf mit einem Tipp, Karte und Öffnungszeiten ohne Suchen. Gebaut für Gäste, die jetzt Hunger haben.' },
      { word: 'BEAUTY', name: 'Salons & Beauty', title: 'Termine, bevor jemand weiterscrollt.', text: 'Leistungen, Preise und Standorte auf einen Blick, die Buchung direkt daneben. Der Look deines Salons, übersetzt ins Netz.' },
      { word: 'PRAXIS', name: 'Praxis & Coaching', title: 'Vertrauen, noch vor dem ersten Gespräch.', text: 'Ruhige, klare Seiten für Therapie, Heilarbeit und Beratung, die den Schritt zum Kennenlernen leicht machen.' },
      { word: 'KUNST', name: 'Kunst & Kultur', title: 'Eine Bühne, die nach dir aussieht.', text: 'Für Künstler:innen, Musik und Kollektive: Seiten mit eigener Handschrift, Bewegung und Raum fürs Werk.' },
      { word: 'TECH', name: 'Tech & Start-ups', title: 'Ein komplexes Produkt, in Sekunden verstanden.', text: 'Landingpages mit Motion und 3D, die erklären, überzeugen und zur Demo führen.' },
    ],

    processLabel: 'Ablauf',
    process: [
      { word: '01', title: 'Kennenlernen', text: 'Ein kurzes Gespräch: Was soll die Seite erreichen, für wen, in welchem Rahmen?' },
      { word: '02', title: 'Entwurf', text: 'Du siehst früh eine klickbare Richtung und redest mit, bevor etwas fertig ist.' },
      { word: '03', title: 'Launch', text: 'Die Seite geht online: schnell, mobil sauber, bereit für Anfragen. Ich bleibe ansprechbar.' },
    ],

    contactLabel: 'Kontakt',
    contactTitle: ['Erzähl mir von', 'deinem Projekt.'],
    contactSub: 'Ein paar Angaben genügen. Ich antworte persönlich.',
    scrollBack: 'Nach oben',
    imprint: 'Impressum',
    privacy: 'Datenschutz',
    nav: ['Start', 'Arbeiten', 'Für wen', 'Ablauf', 'Kontakt'],
    statusLabel: 'Status',
    status: 'Nimmt Projekte an', // ⟨TODO⟩
    timeLabel: 'Ortszeit',
    form: {
      title: 'Projekt anfragen',
      steps: ['Was brauchst du?', 'Worum geht es?', 'Wohin darf ich antworten?'],
      next: 'Weiter',
      back: 'Zurück',
      name: 'Name',
      email: 'E-Mail',
      company: 'Unternehmen / Marke (optional)',
      needs: ['Neue Website', 'Relaunch', 'Online-Shop', 'Branding', 'Noch unklar'],
      budget: 'Budget',
      budgets: ['bis 2.000 €', '2.000–5.000 €', '5.000–10.000 €', '10.000 € +', 'noch offen'], // ⟨TODO⟩
      message: 'Ein, zwei Sätze genügen',
      send: 'Anfrage senden',
      sending: 'Wird gesendet …',
      thanks: 'Danke! Ich melde mich in Kürze.',
      error: 'Das hat nicht geklappt. Schreib mir gern direkt per Mail.',
    },
  },

  en: {
    metaTitle: 'Kebron — Developer & Designer. Websites people get stuck on.',
    metaDescription:
      'Kebron builds websites end to end: design, code and a clear path to the enquiry. For restaurants, salons, practices, art and tech. Munich.',
    skip: 'Skip to content',
    cta: 'Start a project',
    menu: 'Menu',
    close: 'Close',
    role: 'Developer & Designer — Munich',
    heroTitle: 'Websites people get stuck on.',
    heroText: 'Design and code from one hand. For brands that want more from the web than simply being there.',
    heroSecondary: 'See the work',
    scrollHint: 'Scroll',

    pitch: [
      { words: ['PRETTY', 'IS NOT ENOUGH.'], line: 'A pretty site nobody finds sells nothing.' },
      { words: ['NEITHER', 'IS FAST.'], line: 'A fast site nobody remembers doesn’t either.' },
      { words: ['I BUILD', 'BOTH.'], line: 'Presence, engineering and a clear path to the enquiry – in one site.' },
    ],

    workLabel: 'Work',
    view: 'View',
    visit: 'Visit live',
    image: 'Image',

    sectorsLabel: 'Who for',
    sectors: [
      { word: 'FOOD', name: 'Restaurants', title: 'Fill tables, don’t just show the menu.', text: 'Booking and calling in one tap, menu and opening hours without searching. Built for guests who are hungry now.' },
      { word: 'BEAUTY', name: 'Salons & beauty', title: 'Appointments before anyone scrolls on.', text: 'Services, prices and locations at a glance, booking right next to them. The look of your salon, translated to the web.' },
      { word: 'CARE', name: 'Practice & coaching', title: 'Trust, before the first conversation.', text: 'Calm, clear sites for therapy, healing work and consulting that make the first step easy.' },
      { word: 'ART', name: 'Art & culture', title: 'A stage that looks like you.', text: 'For artists, music and collectives: sites with their own signature, motion and room for the work.' },
      { word: 'TECH', name: 'Tech & start-ups', title: 'A complex product, understood in seconds.', text: 'Landing pages with motion and 3D that explain, convince and lead to the demo.' },
    ],

    processLabel: 'Process',
    process: [
      { word: '01', title: 'Intro', text: 'A short call: what should the site achieve, for whom, within what frame?' },
      { word: '02', title: 'Draft', text: 'You see a clickable direction early and have a say before anything is finished.' },
      { word: '03', title: 'Launch', text: 'The site goes online: fast, clean on mobile, ready for enquiries. I stay reachable.' },
    ],

    contactLabel: 'Contact',
    contactTitle: ['Tell me about', 'your project.'],
    contactSub: 'A few details are enough. I reply personally.',
    scrollBack: 'Back to top',
    imprint: 'Imprint',
    privacy: 'Privacy',
    nav: ['Home', 'Work', 'Who for', 'Process', 'Contact'],
    statusLabel: 'Status',
    status: 'Taking on projects',
    timeLabel: 'Local time',
    form: {
      title: 'Start a project',
      steps: ['What do you need?', 'What’s it about?', 'Where can I reply?'],
      next: 'Next',
      back: 'Back',
      name: 'Name',
      email: 'Email',
      company: 'Company / brand (optional)',
      needs: ['New website', 'Relaunch', 'Online shop', 'Branding', 'Not sure yet'],
      budget: 'Budget',
      budgets: ['up to €2,000', '€2,000–5,000', '€5,000–10,000', '€10,000 +', 'open'],
      message: 'One or two sentences are enough',
      send: 'Send enquiry',
      sending: 'Sending …',
      thanks: 'Thank you! I’ll be in touch shortly.',
      error: 'That didn’t work. Feel free to email me directly.',
    },
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
      de: 'Die Pizza spielt die Hauptrolle: Sie dreht sich durchs Sortiment, Karte und Anruf bleiben einen Tipp entfernt.',
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
