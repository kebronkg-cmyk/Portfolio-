import { site, copy, projects } from '../content.js';

const KEY = 'portfolio-lang';
const pad = (n) => String(n).padStart(2, '0');

export function getLang() {
  let l = null;
  try {
    l = localStorage.getItem(KEY);
  } catch {}
  if (!l) {
    const nav = (navigator.language || '').slice(0, 2);
    l = site.languages.includes(nav) ? nav : site.defaultLanguage;
  }
  return site.languages.includes(l) ? l : site.defaultLanguage;
}

export function setLangStored(l) {
  try {
    localStorage.setItem(KEY, l);
  } catch {}
}

const get = (obj, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);

export function t(lang, key) {
  return get(copy[lang], key) ?? get(copy[site.defaultLanguage], key) ?? '';
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* Fill every text of the page for a language. */
export function applyLang(lang) {
  const c = copy[lang];
  const $ = (s) => document.querySelector(s);
  const all = (s, fn) => document.querySelectorAll(s).forEach(fn);
  document.documentElement.lang = lang;
  document.title = c.metaTitle;
  $('meta[name="description"]')?.setAttribute('content', c.metaDescription);

  all('[data-i18n]', (el) => (el.textContent = t(lang, el.dataset.i18n)));
  all('.js-name, .js-fullname', (el) => (el.textContent = site.fullName));
  all('.js-year', (el) => (el.textContent = site.year));
  all('.js-about-label', (el, i) => (el.textContent = c.aboutLabel[i]));

  const email = $('.js-email');
  email.textContent = site.email;
  email.href = 'mailto:' + site.email;

  $('.js-work-list').innerHTML = projects
    .map((p, i) => `<li data-index="${i}"><button data-index="${i}"><span>${pad(i + 1)}&ensp;${esc(p.title)}</span></button></li>`)
    .join('');
  $('.js-sectors').innerHTML = c.sectors.map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('');
  $('.js-process').innerHTML = c.process.map(([a, b], i) => `<li><i>${pad(i + 1)}</i><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('');
  $('.js-contact-title').textContent = c.contactTitle.join(' ');

  const targets = ['#top', '#work', '#about', '#contact'];
  $('.js-menu-nav').innerHTML = c.nav
    .map((label, i) => `<li><a href="${targets[i]}" style="--i:${i}">${esc(label)}<small>${pad(i + 1)}</small></a></li>`)
    .join('');

  const socials = [...site.socials.filter((s) => s.url), { label: 'E-Mail', url: 'mailto:' + site.email }];
  const socialHtml = socials
    .map((s) => `<li><a href="${s.url}" ${s.url.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${esc(s.label)}</a></li>`)
    .join('');
  all('.js-socials, .js-menu-social', (el) => (el.innerHTML = socialHtml));

  const chips = (name, list, checked) =>
    list.map((x, i) => `<label><input type="radio" name="${name}" value="${esc(x)}" ${i === checked ? 'checked' : ''}/><span>${esc(x)}</span></label>`).join('');
  $('.js-needs').innerHTML = chips('need', c.form.needs, -1);
  $('.js-budgets').innerHTML = chips('budget', c.form.budgets, c.form.budgets.length - 1);

  all('.js-step-title', (el, i) => (el.textContent = c.form.steps[i]));

  const ls = $('.js-lang');
  ls.hidden = site.languages.length < 2;
  ls.innerHTML = site.languages.map((l) => `<button data-lang="${l}" aria-pressed="${l === lang}">${l}</button>`).join('');
}
