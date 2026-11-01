(() => {
  'use strict';

  const STORAGE_KEY = 'aaria.magicalUpdates.read.v1';
  const RECIPE_ROUTE = '#aria/recipe/112/0';
  const ANNOUNCEMENTS = Object.freeze([
    Object.freeze({
      id: 'vietnam-pho-recipe-112',
      type: 'recipe',
      recipeId: 112,
      title: 'A Magical Trip to Vietnam! 🇻🇳🍜',
      body: 'Ready for a tasty adventure? Discover the new Tofu & Vegetable Phở recipe! ✨'
    })
  ]);
  const messages = {
    'en-GB': {
      label: 'Magical Updates', unread: count => `${count} unread update${count === 1 ? '' : 's'}`,
      open: count => `Open Magical Updates${count ? `, ${count} unread` : ''}`,
      back: 'Back to Home', subtitle: 'A little sparkle from Aaria’s kitchen.',
      newRecipe: 'NEW RECIPE', read: 'Read', unreadState: 'Unread', markRead: 'Mark as read', markUnread: 'Mark as unread',
      openRecipe: 'Discover Recipe 112', empty: 'You’re all caught up. New magical updates will appear here.'
    },
    'pt-BR': {
      label: 'Novidades Mágicas', unread: count => `${count} novidade${count === 1 ? '' : 's'} não lida${count === 1 ? '' : 's'}`,
      open: count => `Abrir Novidades Mágicas${count ? `, ${count} não lida${count === 1 ? '' : 's'}` : ''}`,
      back: 'Voltar ao início', subtitle: 'Um pouco de magia da cozinha da Aaria.',
      newRecipe: 'NOVA RECEITA', read: 'Lida', unreadState: 'Não lida', markRead: 'Marcar como lida', markUnread: 'Marcar como não lida',
      openRecipe: 'Conhecer a receita 112', empty: 'Você está em dia. Novidades mágicas aparecerão aqui.'
    }
  };

  const app = () => document.querySelector('.app');
  const screen = () => document.querySelector('#screen');
  const locale = () => document.documentElement.lang === 'pt-BR' || document.querySelector('#languageSelect')?.value === 'pt-BR' ? 'pt-BR' : 'en-GB';
  const strings = () => messages[locale()];
  const isUpdatesRoute = () => location.hash === '#aria/updates';

  function readState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return new Set(Array.isArray(stored) ? stored.filter(id => ANNOUNCEMENTS.some(item => item.id === id)) : []);
    } catch {
      return new Set();
    }
  }

  function writeState(readIds) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...readIds])); } catch {}
    updateBadges();
    window.dispatchEvent(new CustomEvent('magicalupdates:statechange'));
  }

  function unreadCount() {
    const read = readState();
    return ANNOUNCEMENTS.reduce((count, item) => count + (read.has(item.id) ? 0 : 1), 0);
  }

  function bellMarkup() {
    return `<button class="mu-bell-button" type="button" data-magical-updates-open aria-label="${strings().open(unreadCount())}" title="${strings().label}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>
      <span class="mu-unread-badge" data-magical-updates-badge aria-live="polite"${unreadCount() ? '' : ' hidden'}>${unreadCount() > 9 ? '9+' : unreadCount()}</span>
    </button>`;
  }

  function ensureHomeBell() {
    if (isUpdatesRoute()) return;
    const root = screen();
    if (!root) return;
    const buttonMarkup = bellMarkup();

    if (root.querySelector('.fw-shell')) {
      const tools = root.querySelector('.fw-more');
      const toggle = tools?.querySelector('.fw-utility-toggle');
      if (tools && toggle && !tools.querySelector('[data-magical-updates-open]')) {
        const settings = document.createElement('button');
        settings.className = 'mu-home-settings';
        settings.type = 'button';
        settings.dataset.fw = 'settings';
        settings.dataset.effect = 'sparkle';
        settings.setAttribute('aria-label', locale() === 'pt-BR' ? 'Configurações' : 'Settings');
        settings.title = locale() === 'pt-BR' ? 'Configurações' : 'Settings';
        settings.textContent = '⚙️';
        toggle.insertAdjacentElement('beforebegin', settings);
        toggle.insertAdjacentHTML('afterend', buttonMarkup);
      }
      return;
    }

    const settings = root.querySelector('.v34-home-utility .v34-settings, .v31-approved-header .v3-settings, .v31-approved-header [data-nav="settings"]');
    if (settings && !settings.parentElement.querySelector('[data-magical-updates-open]')) {
      settings.insertAdjacentHTML('afterend', buttonMarkup);
    }
  }

  function updateBadges() {
    const count = unreadCount();
    const t = strings();
    document.querySelectorAll('[data-magical-updates-open]').forEach(button => {
      button.setAttribute('aria-label', t.open(count));
      const badge = button.querySelector('[data-magical-updates-badge]');
      if (!badge) return;
      badge.hidden = count === 0;
      badge.textContent = count > 9 ? '9+' : String(count);
    });
  }

  function renderUpdates() {
    const root = screen();
    if (!root) return;
    const t = strings();
    const read = readState();
    const items = ANNOUNCEMENTS;
    app()?.classList.add('magical-updates-screen');
    root.classList.remove('home-page');
    root.innerHTML = `<main class="mu-page" aria-labelledby="mu-page-title">
      <header class="mu-page-header">
        <button class="mu-back" type="button" data-mu-action="home" aria-label="${t.back}" title="${t.back}">‹</button>
        <img class="mu-page-mark" src="./aaria-pwa-icon-192.png" alt="Aaria’s Magical Kitchen">
        <div><h1 class="mu-page-title" id="mu-page-title">${t.label}</h1><p class="mu-page-subtitle">${t.subtitle}</p></div>
      </header>
      ${items.length ? items.map(item => {
        const isRead = read.has(item.id);
        return `<article class="mu-announcement" data-announcement-id="${item.id}" aria-label="${item.title}">
          <div class="mu-announcement-top"><div class="mu-announcement-copy"><span class="mu-announcement-kicker">${t.newRecipe}</span><h2 class="mu-announcement-title">${item.title}</h2><p class="mu-announcement-body">${item.body}</p></div></div>
          <p class="mu-announcement-state" data-mu-read-state>${isRead ? t.read : t.unreadState}</p>
          <div class="mu-announcement-actions"><button type="button" data-mu-action="toggle-read" data-announcement-id="${item.id}">${isRead ? t.markUnread : t.markRead}</button><button class="mu-open-recipe" type="button" data-mu-action="open-recipe" data-announcement-id="${item.id}">${t.openRecipe}</button></div>
        </article>`;
      }).join('') : `<p class="mu-empty">${t.empty}</p>`}
    </main>`;
    updateBadges();
  }

  function goHome() {
    if (location.hash !== '#aria/home') location.hash = '#aria/home';
    else {
      app()?.classList.remove('magical-updates-screen');
      window.render?.();
      ensureHomeBell();
    }
  }

  document.addEventListener('click', event => {
    const bell = event.target.closest('[data-magical-updates-open]');
    if (bell) {
      event.preventDefault();
      if (location.hash !== '#aria/updates') location.hash = '#aria/updates';
      else renderUpdates();
      return;
    }

    const action = event.target.closest('[data-mu-action]')?.dataset.muAction;
    if (!action) return;
    event.preventDefault();
    if (action === 'home') { goHome(); return; }
    const item = ANNOUNCEMENTS.find(entry => entry.id === event.target.closest('[data-announcement-id]')?.dataset.announcementId);
    if (!item) return;
    const read = readState();
    if (action === 'toggle-read') {
      if (read.has(item.id)) read.delete(item.id); else read.add(item.id);
      writeState(read);
      renderUpdates();
    } else if (action === 'open-recipe') {
      read.add(item.id);
      writeState(read);
      location.hash = RECIPE_ROUTE;
    }
  });

  window.addEventListener('hashchange', () => {
    if (isUpdatesRoute()) renderUpdates();
    else {
      app()?.classList.remove('magical-updates-screen');
      ensureHomeBell();
      updateBadges();
    }
  });
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY) return;
    updateBadges();
    if (isUpdatesRoute()) renderUpdates();
  });
  window.addEventListener('magicalupdates:statechange', updateBadges);

  const root = screen();
  if (root && window.MutationObserver) new MutationObserver(() => {
    if (!isUpdatesRoute()) ensureHomeBell();
  }).observe(root, { childList: true, subtree: true });

  if (isUpdatesRoute()) renderUpdates();
  else ensureHomeBell();
  updateBadges();
})();
