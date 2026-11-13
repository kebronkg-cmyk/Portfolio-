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
  all('.js-logo, .js-logo-text', (el) => (el.textContent = site.logo));
  all('.js-year', (el) => (el.textContent = site.year));

  $('.js-hero-title').innerHTML = c.heroTitle.map((l) => `<span>${esc(l)}</span>`).join('');
  $('.js-hero-meta').innerHTML = [...c.heroMeta, String(site.year)].map((l) => `<li>${esc(l)}</li>`).join('');
  // the swarm writes the words; the DOM keeps them for screen readers and shows the sentence
  $('.js-statement-words').textContent = c.statement.words.join(' ');
  $('.js-statement-text').textContent = c.statement.text;

  $('.js-work-list').innerHTML = projects
    .map((p, i) => `<li data-index="${i}"><button data-index="${i}"><span>${pad(i + 1)}&ensp;${esc(p.title)}</span></button></li>`)
    .join('');

  const items = (label, list, text) =>
    list
      .map(
        (s, i) =>
          `<article class="step-item" data-index="${i}"><p class="label"><b>${pad(i + 1)}</b> — ${esc(label(s))}</p><h3>${esc(s.title)}</h3><p>${esc(text(s))}</p></article>`,
      )
      .join('') + `<ol class="steps__dots" aria-hidden="true">${list.map(() => '<li></li>').join('')}</ol>`;
  const fill = (sel, html) => {
    const root = $(sel);
    root.querySelectorAll('.step-item, .steps__dots').forEach((el) => el.remove());
    root.insertAdjacentHTML('beforeend', html);
  };
  fill('.js-sectors', items((s) => `${c.sectorsLabel} · ${s.name}`, c.sectors, (s) => s.text));
  fill('.js-process', items(() => c.processLabel, c.process, (s) => s.text));

  $('.js-contact-title').textContent = c.contactTitle.join(' ');

  const targets = ['#top', '#work', '#sectors', '#process', '#contact'];
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
