import Lenis from 'lenis';
import { site, projects, copy } from './content.js';
import { applyLang, getLang, setLangStored, t } from './ui/i18n.js';
import { createPreloader } from './ui/preloader.js';
import { createCursor } from './ui/cursor.js';
import { scramble } from './ui/scramble.js';

const BASE = import.meta.env.BASE_URL;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (x, a, b) => clamp((x - a) / (b - a));
const pad = (n) => String(n).padStart(2, '0');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => innerWidth < 860;
const debug = new URLSearchParams(location.search).has('debug');

let lang = getLang();
applyLang(lang);

const preloader = createPreloader();
const cursor = createCursor();
const imageUrls = (i) => projects[i].images.map((f) => `${BASE}projects/${projects[i].slug}/${f}`);

/* The sign he holds up at the end: black, with the invitation in pink. */
function contactSheet(mobile) {
  const c = document.createElement('canvas');
  c.width = mobile ? 900 : 1600;
  c.height = mobile ? 1500 : 1000;
  const ctx = c.getContext('2d');
  const W = c.width,
    H = c.height;
  const k = copy[lang];
  ctx.fillStyle = '#070708';
  ctx.fillRect(0, 0, W, H);
  const m = W * 0.07;
  ctx.fillStyle = '#ffccd8';
  ctx.font = `500 ${W * (mobile ? 0.03 : 0.019)}px "Geist Mono", monospace`;
  ctx.textBaseline = 'top';
  ctx.fillText(`${k.contactLabel} — ${site.logo}`.toUpperCase(), m, m);
  ctx.textAlign = 'right';
  ctx.fillText('→', W - m, m);
  ctx.textAlign = 'left';
  let size = mobile ? W * 0.15 : W * 0.105;
  const font = () => (ctx.font = `680 ${size}px "Geist Variable", sans-serif`);
  font();
  const widest = Math.max(...k.contactTitle.map((l) => ctx.measureText(l).width));
  if (widest > W - m * 2) size *= (W - m * 2) / widest;
  font();
  ctx.textBaseline = 'alphabetic';
  const y0 = H * (mobile ? 0.44 : 0.52);
  k.contactTitle.forEach((l, i) => {
    ctx.fillStyle = i === k.contactTitle.length - 1 ? '#ffccd8' : '#fde6ea';
    ctx.fillText(l, m - size * 0.04, y0 + i * size * 1.02);
  });
  ctx.fillStyle = '#fde6ea';
  ctx.globalAlpha = 0.7;
  ctx.font = `400 ${W * (mobile ? 0.042 : 0.022)}px "Geist Variable", sans-serif`;
  ctx.fillText(k.contactSub, m, H - m - W * 0.01);
  ctx.globalAlpha = 1;
  return c;
}

/* ---------------------------------------------------------------------------
   Layout: section lengths follow the amount of content
   --------------------------------------------------------------------------- */
const N = projects.length;
const counts = { sectors: copy[lang].sectors.length, process: copy[lang].process.length };
$('.sec--work').style.setProperty('--len', 40 + N * 190);
$('.sec--sectors').style.setProperty('--len', 60 + counts.sectors * 62);
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
const shownIndex = { sectors: -2, process: -2 };
const progress = { hero: 0, pitch: 0, work: 0, sectors: 0, process: 0, contact: 0 };

const fade = (p, a, b, edge = 0.05) => clamp((p - a) / edge) * clamp((b - p) / edge);
function reveal(el, o, dist = 20) {
  if (!el) return;
  el.style.opacity = o.toFixed(3);
  el.style.transform = o >= 0.999 ? '' : `translate3d(0, ${((1 - o) * dist).toFixed(1)}px, 0)`;
  el.style.visibility = o < 0.01 ? 'hidden' : '';
}

/* Which item of a "one at a time" section is up — same timing as the swarm in gl/stage.js */
function slot(p, n, inAt, outAt) {
  const u = ramp(p, inAt, outAt) * (n + 1);
  const i = Math.min(n, Math.floor(u));
  const f = u - i;
  if (i === n) return f < 0.2 ? n - 1 : -1; // last one leaves
  return f > 0.2 ? i : i - 1;
}
function setItems(key, root, idx) {
  if (shownIndex[key] === idx) return;
  shownIndex[key] = idx;
  $$(`${root} [data-index]`).forEach((el) => el.classList.toggle('is-active', +el.dataset.index === idx));
  $$(`${root} .steps__dots li`).forEach((el, i) => el.classList.toggle('is-active', i === idx));
  const dots = $(`${root} .steps__dots`);
  if (dots) dots.style.opacity = idx < 0 ? 0 : 1;
  // the big pixel word scrambles into the new one
  const big = $(`${root} .js-bigword`);
  if (big) {
    big.classList.toggle('is-on', idx >= 0);
    if (idx >= 0) scramble(big, copy[lang][key][idx].word);
  }
}

function update(scroll, velocity) {
  const mid = scroll + innerHeight * 0.5;
  for (const s of sections) {
    progress[s.name] = clamp((scroll - s.top) / s.len);
    if (mid >= s.top && mid < s.top + s.el.offsetHeight) current = s.name;
  }
  const is = (n) => current === n;

  $$('.sec--hero .js-reveal').forEach((el) => reveal(el, is('hero') ? 1 - clamp((progress.hero - 0.3) / 0.25) : 0, -20));

  setItems('sectors', '.js-sectors', is('sectors') ? slot(progress.sectors, counts.sectors, 0.03, 1) : -1);
  setItems('process', '.js-process', is('process') ? slot(progress.process, counts.process, 0.03, 1) : -1);

  const inWork = is('work') ? fade(progress.work, 0.012, 0.988, 0.02) : 0;
  $$('.js-work-ui').forEach((el) => reveal(el, inWork));

  const cO = is('contact') ? clamp((progress.contact - 0.5) / 0.15) : 0;
  reveal($('.js-contact'), cO);
  reveal($('.js-footer'), is('contact') ? clamp((progress.contact - 0.6) / 0.2) : 0, 0);

  stage?.setProgress({ ...progress, section: current, velocity });
}

lenis.on('scroll', (l) => update(l.scroll, l.velocity));
const pitchLine = $('.js-statement-text');
function raf(time) {
  lenis.raf(time);
  // the sentence appears once the swarm has written the words (or right away without WebGL)
  const on = current === 'pitch' && (stage ? stage.formed : progress.pitch > 0.1 && progress.pitch < 0.9);
  if (pitchLine.classList.contains('is-active') !== on) pitchLine.classList.toggle('is-active', on);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

/* anchors: land inside each section where its content is up */
const LAND = { hero: 0, work: 0.02, sectors: 0.14, process: 0.2, contact: 0.8 };
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  e.preventDefault();
  closeMenu();
  const el = $(a.getAttribute('href'));
  const s = sections.find((x) => x.el === el) || sections[0];
  lenis.scrollTo(a.getAttribute('href') === '#top' ? 0 : s.top + s.len * (LAND[s.name] ?? 0.2), { duration: 2.4 });
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
  if (!stage) $('.js-card-thumb').src = imageUrls(i)[0];
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
  // land where this project's poster is held out
  lenis.scrollTo(s.top + s.len * ((+b.dataset.index + 0.78) / N), { duration: 2 });
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
      stage?.glitch(0.7);
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
function closeMenu() {
  menu.close();
  menuBtn.setAttribute('aria-expanded', 'false');
}
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

// enquiry form — every button on the page leads here
const form = $('.js-form');
const modal = makeOverlay($('.js-form-modal'), '.js-form-close');
document.addEventListener('click', (e) => {
  if (e.target.closest('.js-form-open, .js-p-ask')) {
    menuBtn.setAttribute('aria-expanded', 'false');
    modal.open();
  }
});
$('.js-form-close').addEventListener('click', () => modal.close());
modal.el.addEventListener('click', (e) => e.target === modal.el && modal.close());

/* one thing at a time: need → idea & budget → contact details */
let step = 0;
function showStep(n, focus = true) {
  step = Math.max(0, Math.min(2, n));
  $$('.step', form).forEach((el) => el.classList.toggle('is-active', +el.dataset.step === step));
  $$('.form__bar i', form).forEach((el, i) => el.classList.toggle('is-on', i <= step));
  $('.js-step-num').textContent = step + 1;
  $('.js-step-back').style.visibility = step === 0 ? 'hidden' : '';
  $('.js-step-next').hidden = step === 2;
  $('.js-step-send').hidden = step !== 2;
  $('.js-form-status').textContent = '';
  if (focus && step > 0) setTimeout(() => $('.step.is-active textarea, .step.is-active input:not([type=radio])', form)?.focus(), 80);
}
showStep(0, false);
$('.js-step-next').addEventListener('click', () => showStep(step + 1));
$('.js-step-back').addEventListener('click', () => showStep(step - 1));
$('.js-needs').addEventListener('change', () => setTimeout(() => showStep(1), 180));
form.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && step < 2) {
    e.preventDefault();
    showStep(step + 1);
  }
});
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('.js-form-status');
  if (step < 2) return showStep(step + 1);
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const data = { need: '', budget: '', message: '', ...Object.fromEntries(new FormData(form)) };
  const f = copy[lang].form;
  if (!site.formEndpoint) {
    const body = `${data.message}\n\n${f.steps[0]} ${data.need}\n${f.budget}: ${data.budget}\n\n— ${data.name}${data.company ? ' (' + data.company + ')' : ''}\n${data.email}`;
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
    setTimeout(() => showStep(0, false), 2500);
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
  Object.keys(shownIndex).forEach((k) => (shownIndex[k] = -2));
  tick();
  showStep(step, false);
  stage?.setContactSheet(contactSheet(isMobile()));
  stage?.setStatement(copy[lang].statement.words);
  stage?.glitch(1);
  update(lenis.scroll, 0);
});

/* ---------------------------------------------------------------------------
   Pointer → avatar (head follows, poster can be tapped)
   --------------------------------------------------------------------------- */
const UI = 'a, button, input, textarea, label, .work__card, .menu, .project, .modal';
const ndc = (x, y) => [(x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1];
const mouse = { x: -1, y: -1, on: false };
/* What is under the pointer right now? Re-checked while scrolling too, because the
   poster moves under a resting mouse. */
function refreshHover() {
  if (!stage || !mouse.on) return;
  const el = document.elementFromPoint(mouse.x, mouse.y);
  const hit = !el || el.closest(UI) ? null : stage.pick(...ndc(mouse.x, mouse.y));
  stage.setHovered(hit !== null);
  cursor.setLabel(hit === null ? '' : hit === 'contact' ? t(lang, 'cta') : t(lang, 'view'));
}
addEventListener('pointermove', (e) => {
  if (!stage) return;
  stage.setPointer(...ndc(e.clientX, e.clientY));
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.on = e.pointerType === 'mouse';
  refreshHover();
});
document.addEventListener('pointerleave', () => {
  mouse.on = false;
  stage?.setHovered(false);
  cursor.setLabel('');
});
setInterval(refreshHover, 160);
addEventListener('click', (e) => {
  if (!stage || e.target.closest(UI)) return;
  const hit = stage.pick(...ndc(e.clientX, e.clientY));
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
  await Promise.all(['900 100px "Doto"', '900 100px "Geist Variable"', '640 100px "Geist Variable"', '500 20px "Geist Mono"'].map((f) => document.fonts.load(f))).catch(() => {});
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
        words: site.wallWords,
        photo: `${BASE}avatar.jpg`,
        body: `${BASE}avatar-body.png`,
        statement: copy[lang].statement.words,
        mobile,
        reducedMotion: reduced,
        instant: debug, // ?debug: skip the print-in so screenshots are deterministic
        hq: new URLSearchParams(location.search).has('hq'),
        onProgress: (p) => preloader.set(0.2 + p * 0.78),
      });
      stage.onActive = (i) => setActive(i);
      stage.start();
      if (debug) window.__stage = stage;
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
  scramble($('.js-hero-title'), null, 1100);
  $$('.sec--hero .js-reveal').forEach((el, i) => {
    el.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], {
      duration: 900,
      delay: 1100 + i * 120,
      easing: 'cubic-bezier(.22,1,.36,1)',
      fill: 'backwards',
    });
  });
}

boot();
