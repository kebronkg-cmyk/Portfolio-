import Lenis from 'lenis';
import { site, projects, copy } from './content.js';
import { applyLang, getLang, setLangStored, t } from './ui/i18n.js';
import { createPreloader } from './ui/preloader.js';
import { createCursor } from './ui/cursor.js';
import { setupSensors } from './ui/sensors.js';
import { bindScramble, scramble } from './ui/scramble.js';
import { generateCovers, canvasToUrl } from './gl/covers.js';

const BASE = import.meta.env.BASE_URL;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => innerWidth < 860;
const debug = new URLSearchParams(location.search).has('debug');

let lang = getLang();
applyLang(lang);
bindScramble();

const preloader = createPreloader();
const cursor = createCursor();
preloader.line('power on');
preloader.line('init display @ ' + innerWidth + 'x' + innerHeight);

/* ---------------------------------------------------------------------------
   Project media: real images if present, generated covers otherwise
   --------------------------------------------------------------------------- */
const media = projects.map((p) => ({
  urls: p.images.map((f) => `${BASE}projects/${p.slug}/${f}`),
  covers: null,
}));

function coversFor(i) {
  if (!media[i].covers) media[i].covers = generateCovers(projects[i]);
  return media[i].covers;
}

async function imageUrlsFor(i) {
  if (media[i].urls.length) return media[i].urls;
  if (!media[i].generatedUrls) media[i].generatedUrls = await Promise.all(coversFor(i).map(canvasToUrl));
  return media[i].generatedUrls;
}

/* ---------------------------------------------------------------------------
   Layout: work section length depends on number of projects
   --------------------------------------------------------------------------- */
const secWork = $('.sec--work');
secWork.style.setProperty('--len', 120 + projects.length * 95);
$('.js-card-total').textContent = String(projects.length).padStart(2, '0');

/* ---------------------------------------------------------------------------
   Smooth scroll + section progress
   --------------------------------------------------------------------------- */
const lenis = new Lenis({ lerp: reduced ? 1 : 0.09, wheelMultiplier: 0.9, touchMultiplier: 1.4, smoothWheel: !reduced });
lenis.stop();
if (debug) window.__lenis = lenis;
const sections = $$('.sec').map((el) => ({ el, name: el.dataset.section, top: 0, len: 1 }));
function measure() {
  const vh = innerHeight;
  sections.forEach((s) => {
    s.top = s.el.offsetTop;
    s.len = Math.max(1, s.el.offsetHeight - vh);
  });
}
measure();
addEventListener('resize', () => {
  measure();
  update(lenis.scroll, 0);
});

let stage = null;
let current = 'hero';
let activeProject = 0;
const progress = { hero: 0, work: 0, about: 0, contact: 0 };

function fade(p, a, b, edge = 0.06) {
  // 1 inside [a, b], fading at both ends
  return clamp((p - a) / edge) * clamp((b - p) / edge);
}
function setReveal(el, o, dir = 1) {
  if (!el) return;
  el.style.setProperty('--o', o.toFixed(3));
  el.style.setProperty('--y', ((1 - o) * 24 * dir).toFixed(1) + 'px');
  el.style.setProperty('--b', ((1 - o) * 6).toFixed(1) + 'px');
  el.style.visibility = o < 0.01 ? 'hidden' : '';
}

function update(scroll, velocity) {
  const vh = innerHeight;
  const mid = scroll + vh * 0.5;
  for (const s of sections) {
    progress[s.name] = clamp((scroll - s.top) / s.len);
    if (mid >= s.top && mid < s.top + s.el.offsetHeight) current = s.name;
  }
  // hero
  const h = progress.hero;
  const heroO = 1 - clamp((h - 0.18) / 0.22);
  $$('.sec--hero .reveal').forEach((el) => setReveal(el, heroO, -1));
  // work: index + card visible only while in section
  const w = progress.work;
  const inWork = current === 'work' ? fade(w, 0.02, 0.98, 0.04) : 0;
  setReveal($('.work__index'), inWork);
  setReveal($('.work__card'), inWork);
  $('.js-work-progress').parentElement.style.opacity = inWork;
  $('.js-work-progress').style.setProperty('--p', w.toFixed(3));
  // about steps
  const a = progress.about;
  const steps = [fade(a, 0.08, 0.4), fade(a, 0.46, 0.7), fade(a, 0.76, 1.2)];
  $$('.sec--about [data-step]').forEach((el) => setReveal(el, steps[+el.dataset.step]));
  // contact
  const c = progress.contact;
  const cO = clamp((c - 0.18) / 0.25);
  $$('.contact > *').forEach((el, i) => setReveal(el, clamp(cO * 1.4 - i * 0.12)));
  setReveal($('.footer'), clamp((c - 0.35) / 0.2));

  // theme for the DOM (header, colors)
  const light = stage ? stage.invert > 0.5 : current === 'work' || current === 'about';
  const theme = light ? 'light' : 'dark';
  if (document.documentElement.dataset.theme !== theme) {
    document.documentElement.dataset.theme = theme;
    $('meta[name="theme-color"]').setAttribute('content', light ? '#f3f4f1' : '#000000');
  }

  stage?.setProgress({ ...progress, section: current, velocity });
}

lenis.on('scroll', (l) => update(l.scroll, l.velocity));
function raf(time) {
  lenis.raf(time);
  // keep theme in sync with the GL crossfade even when not scrolling
  if (stage) {
    const light = stage.invert > 0.5 ? 'light' : 'dark';
    if (document.documentElement.dataset.theme !== light) update(lenis.scroll, 0);
  }
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

/* anchors */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"], [data-scroll-to]');
  if (!a) return;
  const href = a.getAttribute('href');
  e.preventDefault();
  closeMenu();
  let target = href === '#top' || a.dataset.scrollTo === '0' ? 0 : $(href);
  // land a bit inside sections so the content is already revealed
  if (target && target !== 0) {
    const s = sections.find((x) => x.el === target);
    if (s) target = s.top + (s.name === 'contact' ? s.len * 0.75 : s.name === 'work' ? s.len * 0.12 : s.len * 0.2);
  }
  lenis.scrollTo(target ?? 0, { duration: 2.2 });
  stage?.glitch(0.8);
});
$('.js-back').addEventListener('click', () => {
  lenis.scrollTo(0, { duration: 3 });
  stage?.glitch(1);
});

/* ---------------------------------------------------------------------------
   Work card + list
   --------------------------------------------------------------------------- */
function setActive(i) {
  activeProject = i;
  const p = projects[i];
  $$('.js-work-list li').forEach((li) => li.classList.toggle('is-active', +li.dataset.index === i));
  const card = $('.js-work-card');
  $('.js-card-num').textContent = String(i + 1).padStart(2, '0');
  $('.js-card-title').textContent = p.title;
  $('.js-card-year').textContent = p.year;
  $('.js-card-info').textContent = p.info[lang] ?? p.info.de;
  $('.js-card-role').textContent = p.role.join(', ');
  card.classList.remove('is-switching');
  void card.offsetWidth;
  card.classList.add('is-switching');
  scramble($('.js-card-title'), { duration: 380, text: p.title });
}
setActive(0);

document.addEventListener('click', (e) => {
  const b = e.target.closest('.js-work-list button');
  if (!b) return;
  const i = +b.dataset.index;
  const s = sections.find((x) => x.name === 'work');
  const lead = 0.1;
  const p = projects.length > 1 ? lead + (i / (projects.length - 1)) * (1 - lead) : lead;
  lenis.scrollTo(s.top + s.len * p, { duration: 1.6 });
});
$('.js-card-open').addEventListener('click', () => openProject(activeProject));

/* ---------------------------------------------------------------------------
   Overlays: menu, project, form
   --------------------------------------------------------------------------- */
const menu = $('#menu');
const menuBtn = $('.js-menu-open');
let lastFocus = null;
function openMenu() {
  lastFocus = document.activeElement;
  menu.classList.add('is-open');
  menu.setAttribute('aria-hidden', 'false');
  menuBtn.setAttribute('aria-expanded', 'true');
  lenis.stop();
  stage?.glitch(0.7);
  setTimeout(() => $('.js-menu-close').focus(), 50);
}
function closeMenu() {
  if (!menu.classList.contains('is-open')) return;
  menu.classList.remove('is-open');
  menu.setAttribute('aria-hidden', 'true');
  menuBtn.setAttribute('aria-expanded', 'false');
  lenis.start();
  lastFocus?.focus?.();
}
menuBtn.addEventListener('click', openMenu);
$('.js-menu-close').addEventListener('click', closeMenu);

// project overlay
const pov = $('.project');
let pIndex = 0,
  pImg = 0,
  pUrls = [];
async function openProject(i) {
  pIndex = i;
  pImg = 0;
  const p = projects[i];
  $('.js-p-title').textContent = p.title;
  $('.js-p-info').textContent = p.info[lang] ?? p.info.de;
  $('.js-p-role').textContent = p.role.join(', ');
  $('.js-p-year').textContent = p.year;
  const visit = $('.js-p-visit');
  visit.hidden = !p.url;
  if (p.url) visit.href = p.url;
  pUrls = await imageUrlsFor(i);
  $('.js-p-count').textContent = String(pUrls.length).padStart(2, '0');
  $('.js-p-dots').innerHTML = pUrls.map((_, k) => `<button aria-label="${k + 1}" data-k="${k}"></button>`).join('');
  showImg(0);
  lastFocus = document.activeElement;
  pov.classList.add('is-open');
  pov.setAttribute('aria-hidden', 'false');
  lenis.stop();
  stage?.glitch(0.9);
  setTimeout(() => $('.js-p-close').focus(), 50);
}
function showImg(k) {
  pImg = (k + pUrls.length) % pUrls.length;
  const img = $('.js-p-img');
  img.src = pUrls[pImg];
  img.alt = `${projects[pIndex].title} – ${pImg + 1}`;
  $('.js-p-index').textContent = String(pImg + 1).padStart(2, '0');
  $$('.js-p-dots button').forEach((b, i) => b.setAttribute('aria-current', i === pImg));
  pov.classList.remove('is-switching');
  void pov.offsetWidth;
  pov.classList.add('is-switching');
}
function closeProject() {
  if (!pov.classList.contains('is-open')) return;
  pov.classList.remove('is-open');
  pov.setAttribute('aria-hidden', 'true');
  lenis.start();
  lastFocus?.focus?.();
}
$('.js-p-close').addEventListener('click', closeProject);
$('.js-p-prev').addEventListener('click', () => showImg(pImg - 1));
$('.js-p-next').addEventListener('click', () => showImg(pImg + 1));
$('.js-p-dots').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) showImg(+b.dataset.k);
});
// swipe
let sx = null;
$('.project__frame').addEventListener('pointerdown', (e) => (sx = e.clientX));
$('.project__frame').addEventListener('pointerup', (e) => {
  if (sx === null) return;
  const d = e.clientX - sx;
  if (Math.abs(d) > 40) showImg(pImg + (d < 0 ? 1 : -1));
  sx = null;
});

// contact form
const modal = $('.js-form-modal');
const form = $('.js-form');
function openForm() {
  lastFocus = document.activeElement;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  lenis.stop();
  stage?.glitch(0.6);
  setTimeout(() => form.querySelector('input').focus(), 60);
}
function closeForm() {
  if (!modal.classList.contains('is-open')) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  lenis.start();
  lastFocus?.focus?.();
}
$('.js-form-open').addEventListener('click', openForm);
$('.js-form-close').addEventListener('click', closeForm);
modal.addEventListener('click', (e) => e.target === modal && closeForm());
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('.js-form-status');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const data = Object.fromEntries(new FormData(form));
  const f = copy[lang].form;
  if (!site.formEndpoint) {
    const body = `${data.message}\n\n— ${data.name}${data.company ? ' (' + data.company + ')' : ''}\n${data.email}\nBudget: ${data.budget}`;
    location.href = `mailto:${site.email}?subject=${encodeURIComponent('Projektanfrage – ' + data.name)}&body=${encodeURIComponent(body)}`;
    return;
  }
  status.textContent = f.sending;
  try {
    const r = await fetch(site.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(r.status);
    status.textContent = f.thanks;
    form.reset();
  } catch {
    status.textContent = f.error;
  }
});

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeMenu();
    closeProject();
    closeForm();
  }
  if (pov.classList.contains('is-open')) {
    if (e.key === 'ArrowRight') showImg(pImg + 1);
    if (e.key === 'ArrowLeft') showImg(pImg - 1);
  }
});

/* language switch */
$('.js-lang').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-lang]');
  if (!b || b.dataset.lang === lang) return;
  lang = b.dataset.lang;
  setLangStored(lang);
  applyLang(lang);
  setActive(activeProject);
  stage?.glitch(1);
});

/* ---------------------------------------------------------------------------
   Pointer → WebGL (parallax, portrait, screen hover)
   --------------------------------------------------------------------------- */
const coords = $('.js-coords');
const fpsEl = $('.js-fps');
let hovered = null;
addEventListener('pointermove', (e) => {
  if (!stage) return;
  const x = (e.clientX / innerWidth) * 2 - 1;
  const y = -(e.clientY / innerHeight) * 2 + 1;
  if (e.pointerType === 'mouse') stage.setPointer(x, y);
  coords.textContent = `x ${x.toFixed(3)} · y ${y.toFixed(3)}`;
  const overUi = e.target.closest('a, button, input, textarea, .work__card, .menu, .project, .modal');
  hovered = overUi ? null : stage.pick(x, y);
  stage.setHovered(hovered);
  cursor.setLabel(hovered !== null ? t(lang, 'openProject') : '');
});
addEventListener('click', (e) => {
  if (hovered === null || e.target.closest('a, button, input, textarea, .menu, .project, .modal')) return;
  openProject(hovered);
});

/* ---------------------------------------------------------------------------
   Boot
   --------------------------------------------------------------------------- */
function hasWebGL2() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

async function boot() {
  preloader.set(0.05, 'loading fonts');
  await document.fonts.ready;
  preloader.set(0.12, 'fonts ok');

  if (!hasWebGL2()) {
    document.documentElement.classList.add('no-webgl');
    preloader.line('webgl unavailable → fallback');
  } else {
    try {
      const { createStage } = await import('./gl/stage.js');
      // screen textures: first image of each project or its generated cover
      const textures = projects.map((p, i) => (media[i].urls[0] ? media[i].urls[0] : coversFor(i)[0]));
      preloader.set(0.2, 'generating covers');
      stage = await createStage({
        canvas: $('#gl'),
        projects,
        textures,
        portraitUrl: site.portrait ? BASE + site.portrait : '',
        keyOut: site.portraitKeyOut,
        mobile: isMobile(),
        reducedMotion: reduced,
        onProgress: (p, msg) => preloader.set(0.2 + p * 0.75, msg),
      });
      stage.onActive = (i) => setActive(i);
      stage.start();
      if (!stage.portraitIsPhoto) preloader.line('portrait.jpg missing → procedural bust');
      const gyro = setupSensors((x, y) => {
        stage.gyro = true;
        stage.setPointer(x, y);
      });
      if (debug) setInterval(() => (fpsEl.textContent = Math.round(stage.fps) + ' fps'), 500);
      else fpsEl.textContent = 'signal ok';
      void gyro;
    } catch (err) {
      console.error(err);
      document.documentElement.classList.add('no-webgl');
      preloader.line('render error → fallback');
    }
  }
  measure();
  update(0, 0);
  await preloader.done(reduced ? 300 : 1800);
  stage?.boot();
  lenis.start();
  $$('.sec--hero .reveal').forEach((el, i) => {
    el.animate(
      [
        { opacity: 0, transform: 'translateY(16px)', filter: 'blur(8px)' },
        { opacity: 1, transform: 'none', filter: 'blur(0)' },
      ],
      { duration: 900, delay: 500 + i * 140, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' },
    );
  });
  scramble($('.hero__name'), { duration: 900 });
}

boot();
