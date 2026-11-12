import { site, copy, projects } from '../content.js';

const KEY = 'portfolio-lang';

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

/* Fill every static text of the page for a language. */
export function applyLang(lang) {
  const c = copy[lang];
  document.documentElement.lang = lang;
  document.title = c.metaTitle;
  document.querySelector('meta[name="description"]')?.setAttribute('content', c.metaDescription);

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(lang, el.dataset.i18n);
  });

  document.querySelectorAll('.js-name').forEach((el) => {
    el.textContent = site.name;
    el.dataset.text = site.name;
  });
  document.querySelectorAll('.js-name-plain').forEach((el) => (el.textContent = site.name));
  document.querySelectorAll('.js-year').forEach((el) => (el.textContent = site.year));
  const yc = document.querySelector('.js-year-code');
  if (yc) yc.textContent = '0' + site.year;

  const email = document.querySelector('.js-email');
  if (email) {
    email.textContent = site.email;
    email.href = 'mailto:' + site.email;
  }

  // services chips
  const svc = document.querySelector('.js-services');
  if (svc) svc.innerHTML = c.services.map((s) => `<li>${s}</li>`).join('');

  // contact headline (one line per entry)
  const ct = document.querySelector('.js-contact-title');
  if (ct) ct.innerHTML = c.contactTitle.map((l) => `<span>${l}</span>`).join('');

  // work list
  const list = document.querySelector('.js-work-list');
  if (list)
    list.innerHTML = projects
      .map(
        (p, i) =>
          `<li data-index="${i}"><button data-index="${i}">[${String(i + 1).padStart(2, '0')}] ${p.title}</button></li>`,
      )
      .join('');

  // menu nav
  const nav = document.querySelector('.js-menu-nav');
  const targets = ['#top', '#work', '#about', '#contact'];
  if (nav)
    nav.innerHTML = c.nav
      .map(
        (label, i) =>
          `<li><a href="${targets[i]}" style="--i:${i}" data-nav="${targets[i]}">${label}<small>${String(i + 1).padStart(2, '0')}</small></a></li>`,
      )
      .join('');

  // socials
  const socials = site.socials.filter((s) => s.url);
  const mail = { label: 'mail', url: 'mailto:' + site.email };
  const socialHtml = [...socials, mail]
    .map(
      (s) =>
        `<li><a href="${s.url}" ${s.url.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="glitch-hover">${s.label}</a></li>`,
    )
    .join('');
  document.querySelectorAll('.js-socials, .js-menu-social').forEach((el) => (el.innerHTML = socialHtml));

  // budget chips
  const b = document.querySelector('.js-budgets');
  if (b)
    b.innerHTML = c.form.budgets
      .map((x, i) => `<label><input type="radio" name="budget" value="${x}" ${i === 1 ? 'checked' : ''}/><span>${x}</span></label>`)
      .join('');

  // language switch
  const ls = document.querySelector('.js-lang');
  if (ls) {
    ls.hidden = site.languages.length < 2;
    ls.innerHTML = site.languages
      .map((l) => `<button data-lang="${l}" aria-pressed="${l === lang}">${l}</button>`)
      .join('');
  }
}
