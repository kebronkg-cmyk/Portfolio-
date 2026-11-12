import Lenis from 'lenis';
import { site, projects, copy } from './content.js';
import { applyLang, getLang, setLangStored, t } from './ui/i18n.js';
import { createPreloader } from './ui/preloader.js';
import { createCursor } from './ui/cursor.js';
import { setupSensors } from './ui/sensors.js';

const BASE = import.meta.env.BASE_URL;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const pad = (n) => String(n).padStart(2, '0');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => innerWidth < 860;
const debug = new URLSearchParams(location.search).has('debug');

let lang = getLang();
applyLang(lang);

const preloader = createPreloader();
const cursor = createCursor();

const imageUrls = (i) => projects[i].images.map((f) => `${BASE}projects/${projects[i].slug}/${f}`);

/* The last sheet the giant holds up: the invitation to get in touch. */
function contactSheet(mobile) {
  const c = document.createElement('canvas');
  c.width = mobile ? 900 : 1600;
  c.height = mobile ? 1500 : 1000;
  const ctx = c.getContext('2d');
  const W = c.width,
    H = c.height;
  const k = copy[lang];
  ctx.fillStyle = '#0b0b0c';
  ctx.fillRect(0, 0, W, H);
  const m = W * 0.07;
  ctx.fillStyle = '#f3c3d0';
  ctx.font = `500 ${W * 0.019}px "Geist Mono", monospace`;
  ctx.textBaseline = 'top';
  ctx.fillText((k.nav[3] || 'Kontakt').toUpperCase() + ' — ' + site.fullName.toUpperCase(), m, m);
  ctx.textAlign = 'right';
  ctx.fillText('→', W - m, m);
  ctx.textAlign = 'left';
  let size = mobile ? W * 0.135 : W * 0.098;
  ctx.font = `640 ${size}px "Geist Variable", sans-serif`;
  const widest = Math.max(...k.contactTitle.map((l) => ctx.measureText(l).width));
  if (widest > W - m * 2) size *= (W - m * 2) / widest;
  ctx.font = `640 ${size}px "Geist Variable", sans-serif`;
  ctx.textBaseline = 'alphabetic';
  const y0 = H * (mobile ? 0.42 : 0.5);
  k.contactTitle.forEach((l, i) => {
    ctx.fillStyle = i === k.contactTitle.length - 1 ? '#f3c3d0' : '#fbf7f5';
    ctx.fillText(l, m - size * 0.04, y0 + i * size * 1.02);
  });
  ctx.fillStyle = '#fbf7f5';
  ctx.globalAlpha = 0.7;
  ctx.font = `400 ${W * (mobile ? 0.04 : 0.021)}px "Geist Variable", sans-serif`;
  ctx.fillText(k.contactSub, m, H - m - W * 0.01);
  ctx.globalAlpha = 1;
  return c;
}

/* ---------------------------------------------------------------------------
   Layout
   --------------------------------------------------------------------------- */
const N = projects.length;
$('.sec--work').style.setProperty('--len', 40 + N * 150);
$('.js-card-total').textContent = pad(N);

/* ---------------------------------------------------------------------------
   Smooth scroll + section progress
   --------------------------------------------------------------------------- */
const lenis = new Lenis({ lerp: reduced ? 1 : 0.1, wheelMultiplier: 0.9, smoothWheel: !reduced });
lenis.stop();
const sections = $$('.sec').map((el) => ({ el, name: el.dataset.section, top: 0, len: 1 }));
if (debug) {
  window.__lenis = lenis;
  window.__goto = (name, p) => {
    const s = sections.find((x) => x.name === name);
    lenis.scrollTo(s.top + s.len * p, { immediate: true });
  };
}
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
let aboutStep = -1;
const progress = { hero: 0, work: 0, about: 0, contact: 0 };

const fade = (p, a, b, edge = 0.05) => clamp((p - a) / edge) * clamp((b - p) / edge);
function reveal(el, o, dist = 20) {
  if (!el) return;
  el.style.opacity = o.toFixed(3);
  el.style.transform = o >= 0.999 ? '' : `translate3d(0, ${((1 - o) * dist).toFixed(1)}px, 0)`;
  el.style.visibility = o < 0.01 ? 'hidden' : '';
}

function update(scroll, velocity) {
  const mid = scroll + innerHeight * 0.5;
  for (const s of sections) {
    progress[s.name] = clamp((scroll - s.top) / s.len);
    if (mid >= s.top && mid < s.top + s.el.offsetHeight) current = s.name;
  }
  const is = (n) => current === n;

  $$('.sec--hero .js-reveal').forEach((el) => reveal(el, is('hero') ? 1 - clamp((progress.hero - 0.25) / 0.25) : 0, -20));

  const inWork = is('work') ? fade(progress.work, 0.015, 0.985, 0.025) : 0;
  $$('.js-work-ui').forEach((el) => reveal(el, inWork));

  const a = progress.about;
  const step = is('about') && a > 0.06 && a < 0.97 ? Math.min(2, Math.floor(((a - 0.06) / 0.91) * 3)) : -1;
  if (step !== aboutStep) {
    aboutStep = step;
    $$('.about__step').forEach((el) => el.classList.toggle('is-active', +el.dataset.step === step));
  }

  const cO = is('contact') ? clamp((progress.contact - 0.55) / 0.2) : 0;
  reveal($('.js-contact'), cO);
  reveal($('.js-footer'), clamp((progress.contact - 0.7) / 0.2) * (is('contact') ? 1 : 0), 0);

  stage?.setProgress({ ...progress, section: current, velocity });
  syncScene();
}

/* the DOM takes its colours from the scene the giant is in */
function syncScene() {
  const scene = { hero: 'white', work: 'rose', about: 'white', contact: 'black' }[current];
  if (document.documentElement.dataset.scene !== scene) {
    document.documentElement.dataset.scene = scene;
    $('meta[name="theme-color"]').setAttribute('content', { white: '#fbf7f5', rose: '#f3c3d0', black: '#0b0b0c' }[scene]);
  }
}

lenis.on('scroll', (l) => update(l.scroll, l.velocity));
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

/* anchors: land inside each section where its content is up */
const LAND = { hero: 0, work: 0.1, about: 0.12, contact: 0.85 };
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  e.preventDefault();
  closeMenu();
  const el = $(a.getAttribute('href'));
  const s = sections.find((x) => x.el === el) || sections[0];
  lenis.scrollTo(a.getAttribute('href') === '#top' ? 0 : s.top + s.len * (LAND[s.name] ?? 0.2), { duration: 2.2 });
});
$('.js-back').addEventListener('click', () => lenis.scrollTo(0, { duration: 3 }));

/* ---------------------------------------------------------------------------
   Work card + list
   --------------------------------------------------------------------------- */
function setActive(i) {
  activeProject = i;
  const p = projects[i];
  $$('.js-work-list li').forEach((li) => li.classList.toggle('is-active', +li.dataset.index === i));
  $('.js-card-num').textContent = pad(i + 1);
  $('.js-card-title').textContent = p.title;
  $('.js-card-kind').textContent = `${p.kind?.[lang] ?? ''} — ${p.year}`;
  $('.js-card-info').textContent = p.info[lang] ?? p.info.de;
  const card = $('.js-work-card');
  card.classList.remove('is-switching');
  void card.offsetWidth;
  card.classList.add('is-switching');
}
setActive(0);

document.addEventListener('click', (e) => {
  const b = e.target.closest('.js-work-list button');
  if (!b) return;
  const s = sections.find((x) => x.name === 'work');
  // land where this project's sheet is held out
  lenis.scrollTo(s.top + s.len * ((+b.dataset.index + 0.8) / N), { duration: 1.8 });
});
$('.js-card-open').addEventListener('click', () => openProject(activeProject));

/* ---------------------------------------------------------------------------
   Overlays: menu, project, form
   --------------------------------------------------------------------------- */
let lastFocus = null;
const overlays = [];
function makeOverlay(el, focus) {
  const o = {
    el,
    open() {
      if (el.classList.contains('is-open')) return;
      overlays.forEach((x) => x !== o && x.close(true));
      lastFocus = document.activeElement;
      el.classList.add('is-open');
      el.setAttribute('aria-hidden', 'false');
      lenis.stop();
      setTimeout(() => $(focus, el)?.focus?.(), 60);
    },
    close(silent) {
      if (!el.classList.contains('is-open')) return;
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
      if (!silent) {
        lenis.start();
        lastFocus?.focus?.();
      }
    },
  };
  overlays.push(o);
  return o;
}

const menuBtn = $('.js-menu-open');
const menu = makeOverlay($('#menu'), '.js-menu-close');
const closeMenu = () => {
  menu.close();
  menuBtn.setAttribute('aria-expanded', 'false');
};
menuBtn.addEventListener('click', () => {
  menu.open();
  menuBtn.setAttribute('aria-expanded', 'true');
});
$('.js-menu-close').addEventListener('click', closeMenu);
const clock = $('.js-clock');
const tick = () => {
  try {
    clock.textContent = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', timeZone: site.timezone }).format(new Date()) + ' · ' + site.timezone.split('/').pop().replace('_', ' ');
  } catch {
    clock.textContent = new Date().toLocaleTimeString();
  }
};
tick();
setInterval(tick, 10000);

const pov = makeOverlay($('.project'), '.js-p-close');
let pIndex = 0,
  pImg = 0,
  pUrls = [];
function openProject(i) {
  pIndex = i;
  const p = projects[i];
  $('.js-p-title').textContent = p.title;
  $('.js-p-kind').textContent = `${p.kind?.[lang] ?? ''} — ${p.year}`;
  $('.js-p-info').textContent = p.info[lang] ?? p.info.de;
  const visit = $('.js-p-visit');
  visit.hidden = !p.url;
  if (p.url) visit.href = p.url;
  pUrls = imageUrls(i);
  $('.js-p-count').textContent = pUrls.length;
  $('.js-p-dots').innerHTML = pUrls.map((_, k) => `<button aria-label="${k + 1}" data-k="${k}"></button>`).join('');
  showImg(0);
  pov.open();
}
function showImg(k) {
  pImg = (k + pUrls.length) % pUrls.length;
  const img = $('.js-p-img');
  img.src = pUrls[pImg];
  img.alt = `${projects[pIndex].title} – ${pImg + 1}`;
  $('.js-p-index').textContent = pImg + 1;
  $$('.js-p-dots button').forEach((b, i) => b.setAttribute('aria-current', i === pImg));
  pov.el.classList.remove('is-switching');
  void pov.el.offsetWidth;
  pov.el.classList.add('is-switching');
}
$('.js-p-close').addEventListener('click', () => pov.close());
$('.js-p-prev').addEventListener('click', () => showImg(pImg - 1));
$('.js-p-next').addEventListener('click', () => showImg(pImg + 1));
$('.js-p-dots').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) showImg(+b.dataset.k);
});
let sx = null;
$('.project__frame').addEventListener('pointerdown', (e) => (sx = e.clientX));
$('.project__frame').addEventListener('pointerup', (e) => {
  if (sx === null) return;
  const d = e.clientX - sx;
  if (Math.abs(d) > 40) showImg(pImg + (d < 0 ? 1 : -1));
  sx = null;
});

// contact form — every button on the page leads here
const form = $('.js-form');
const modal = makeOverlay($('.js-form-modal'), 'input[name="name"]');
document.addEventListener('click', (e) => {
  if (e.target.closest('.js-form-open, .js-p-ask')) {
    menuBtn.setAttribute('aria-expanded', 'false');
    modal.open();
  }
});
$('.js-form-close').addEventListener('click', () => modal.close());
modal.el.addEventListener('click', (e) => e.target === modal.el && modal.close());
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
    const body = `${data.message}\n\n${f.need}: ${data.need}\n${f.budget}: ${data.budget}\n\n— ${data.name}${data.company ? ' (' + data.company + ')' : ''}\n${data.email}`;
    location.href = `mailto:${site.email}?subject=${encodeURIComponent(f.title + ' – ' + data.name)}&body=${encodeURIComponent(body)}`;
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
    pov.close();
    modal.close();
  }
  if (pov.el.classList.contains('is-open')) {
    if (e.key === 'ArrowRight') showImg(pImg + 1);
    if (e.key === 'ArrowLeft') showImg(pImg - 1);
  }
});

$('.js-lang').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-lang]');
  if (!b || b.dataset.lang === lang) return;
  lang = b.dataset.lang;
  setLangStored(lang);
  applyLang(lang);
  setActive(activeProject);
  aboutStep = -2;
  tick();
  stage?.setContactSheet(contactSheet(isMobile()));
  update(lenis.scroll, 0);
});

/* ---------------------------------------------------------------------------
   Pointer → giant (head follows, sheet can be tapped)
   --------------------------------------------------------------------------- */
const UI = 'a, button, input, textarea, label, .menu, .project, .modal';
const ndc = (e) => [(e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1];
addEventListener('pointermove', (e) => {
  if (!stage) return;
  const [x, y] = ndc(e);
  if (e.pointerType === 'mouse') stage.setPointer(x, y);
  const hit = e.target.closest(UI) ? null : stage.pick(x, y);
  stage.setHovered(hit !== null);
  cursor.setLabel(hit === null ? '' : hit === 'contact' ? t(lang, 'cta') : t(lang, 'view'));
});
addEventListener('click', (e) => {
  if (!stage || e.target.closest(UI)) return;
  const hit = stage.pick(...ndc(e));
  if (hit === 'contact') modal.open();
  else if (hit !== null) openProject(hit);
});

/* ---------------------------------------------------------------------------
   Boot
   --------------------------------------------------------------------------- */
function hasWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

async function boot() {
  preloader.set(0.08);
  await document.fonts.ready;
  await Promise.all([document.fonts.load('900 100px "Doto"'), document.fonts.load('640 100px "Geist Variable"'), document.fonts.load('500 20px "Geist Mono"')]).catch(() => {});
  preloader.set(0.2);

  if (!hasWebGL2()) {
    document.documentElement.classList.add('no-webgl');
  } else {
    try {
      const { createStage } = await import('./gl/stage.js');
      const mobile = isMobile();
      stage = await createStage({
        canvas: $('#gl'),
        projects,
        sheets: projects.map((p) => `${BASE}projects/${p.slug}/${mobile ? 'm.jpg' : p.images[0]}`),
        contactSheet: contactSheet(mobile),
        name: site.name,
        mobile,
        reducedMotion: reduced,
        onProgress: (p) => preloader.set(0.2 + p * 0.78),
      });
      stage.onActive = (i) => setActive(i);
      stage.start();
      if (debug) window.__stage = stage;
      setupSensors((x, y) => {
        stage.gyro = true;
        stage.setPointer(x, y);
      });
    } catch (err) {
      console.error(err);
      stage = null;
      document.documentElement.classList.add('no-webgl');
    }
  }
  measure();
  update(0, 0);
  await preloader.done(reduced ? 300 : 1400);
  stage?.boot();
  lenis.start();
  $$('.sec--hero .js-reveal').forEach((el, i) => {
    el.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], {
      duration: 900,
      delay: 900 + i * 120,
      easing: 'cubic-bezier(.22,1,.36,1)',
      fill: 'backwards',
    });
  });
}

boot();
