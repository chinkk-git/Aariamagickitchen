(() => {
  'use strict';

  const STORAGE_KEY = 'aaria.accessibility.textSize.v1';
  const SIZES = [100, 125, 150, 175, 200];
  const SCALE_ATTR = 'data-aaria-text-size';
  const STYLE_ID = 'aaria-accessibility-text-size-style';
  let scale = 1;

  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (SIZES.includes(saved)) scale = saved / 100;
  } catch (_) {
    // Private browsing or storage restrictions: use the default for this session.
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = [
    'html:not([data-aaria-text-size-measuring]) [' + SCALE_ATTR + '] {',
    '  font-size: calc(var(--aaria-base-font-size) * var(--aaria-text-scale, 1)) !important;',
    '  line-height: var(--aaria-scaled-line-height, normal) !important;',
    '  overflow-wrap: break-word;',
    '}',
    '[' + SCALE_ATTR + '][data-aaria-button="true"] {',
    '  min-height: 44px;',
    '  white-space: normal;',
    '}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(style);

  function applyScale(next, persist) {
    const value = Number(next);
    if (!SIZES.includes(value)) return;
    scale = value / 100;
    let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const root = document.documentElement;
      const current = scale;
      root.dataset.aariaTextSizeMeasuring = 'true';
      const pending = Array.from(document.querySelectorAll('[' + SCALE_ATTR + ']')).map(element => {
        const computed = getComputedStyle(element);
        const font = parseFloat(computed.fontSize);
        const line = computed.lineHeight && computed.lineHeight !== 'normal' ? parseFloat(computed.lineHeight) : null;
        return {element,font,line};
      }).filter(item => Number.isFinite(item.font) && item.font > 0);
      for (const {element,font,line} of pending) {
        element.style.setProperty('--aaria-base-font-size', font + 'px');
        if (Number.isFinite(line) && line > 0) element.style.setProperty('--aaria-scaled-line-height', 'calc(' + line + 'px * var(--aaria-text-scale, 1))');
        else element.style.removeProperty('--aaria-scaled-line-height');
      }
      delete root.dataset.aariaTextSizeMeasuring;
      applyScale(Math.round(current * 100), false);
    }, 120);
  }, {passive: true});

  document.documentElement.style.setProperty('--aaria-text-scale', String(scale));
    document.documentElement.dataset.aariaTextSizeActive = scale > 1 ? 'true' : 'false';
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, String(value)); } catch (_) {}
    }
    document.querySelectorAll('[data-aaria-text-size-option]').forEach(button => {
      const selected = Number(button.dataset.aariaTextSizeOption) === value;
      button.setAttribute('aria-pressed', String(selected));
    });
    const valueNode = document.querySelector('[data-aaria-text-size-value]');
    if (valueNode) valueNode.textContent = value + '%';
  }

  function excluded(element) {
    return !element ||
      /^(SCRIPT|STYLE|NOSCRIPT|SVG|PATH|IMG|PICTURE|CANVAS|VIDEO|AUDIO|SOURCE|BR|HR|TEMPLATE)$/.test(element.tagName) ||
      Boolean(element.closest('svg,[aria-hidden="true"],script,style,noscript,template,[data-aaria-text-size-ui-icon]'));
  }

  function hasReadableText(element) {
    if (excluded(element)) return false;
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A|LABEL|OPTION|SUMMARY)$/.test(element.tagName)) {
      const type = (element.getAttribute('type') || '').toLowerCase();
      if (element.tagName === 'INPUT' && /^(checkbox|radio|range|color|file|image|hidden|submit|reset|button)$/.test(type)) return false;
      return true;
    }
    return Array.from(element.childNodes).some(node =>
      node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
    );
  }

  function markText(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    const candidates = [];
    if (root.matches && root.matches('body *')) candidates.push(root);
    if (root.querySelectorAll) candidates.push(...root.querySelectorAll('body *'));

    // Read computed values in a first pass, then mutate in a second pass. This
    // avoids forcing style/layout recalculation for every text node in a screen.
    const pending = [];
    for (const element of candidates) {
      if (element.hasAttribute(SCALE_ATTR) || !hasReadableText(element)) continue;
      const computed = getComputedStyle(element);
      const px = parseFloat(computed.fontSize);
      if (!Number.isFinite(px) || px <= 0) continue;
      const inheritedScaledAncestor = Boolean(element.parentElement?.closest('[' + SCALE_ATTR + ']'));
      const divisor = inheritedScaledAncestor ? scale : 1;
      const line = computed.lineHeight && computed.lineHeight !== 'normal' ? parseFloat(computed.lineHeight) : null;
      pending.push({element,base:px/divisor,line:Number.isFinite(line)&&line>0?line/divisor:null});
    }
    for (const {element,base,line} of pending) {
      element.style.setProperty('--aaria-base-font-size', base + 'px');
      if (line) element.style.setProperty('--aaria-scaled-line-height', 'calc(' + line + 'px * var(--aaria-text-scale, 1))');
      if (element.tagName === 'BUTTON') element.dataset.aariaButton = 'true';
      element.setAttribute(SCALE_ATTR, '');
    }
  }

  function localeIsPortuguese() {
    return (document.querySelector('#languageSelect')?.value || document.documentElement.lang || '').toLowerCase().startsWith('pt');
  }

  function installSettingsPanel() {
    const screen = document.querySelector('#screen');
    const page = screen?.querySelector('.home-subpage');
    if (!page) return;
    const previous = page.querySelector('[data-aaria-text-size-panel]');
    const pt = localeIsPortuguese();
    if (previous && previous.dataset.aariaLocale === (pt ? 'pt-BR' : 'en-GB')) return;
    previous?.remove();
    const heading = page.querySelector('h1');
    const headingText = (heading?.textContent || '').toLowerCase();
    if (!headingText.includes('settings') && !headingText.includes('configura')) return;

    const section = document.createElement('section');
    section.className = 'aaria-text-size-panel';
    section.dataset.aariaTextSizePanel = '';
    section.setAttribute('aria-labelledby', 'aaria-text-size-heading');

    const title = pt ? 'Acessibilidade' : 'Accessibility';
    const controlTitle = pt ? 'Tamanho do texto' : 'Text Size';
    const description = pt
      ? 'Ajuste o tamanho do texto em todo o aplicativo. A alteração é salva neste aparelho.'
      : 'Adjust text size throughout the app. Your choice is saved on this device.';
    const preview = pt ? 'Prévia: O texto fica maior para facilitar a leitura.' : 'Preview: Text grows here to make reading easier.';
    const reset = pt ? 'Redefinir para o padrão' : 'Reset to Default';
    const sizes = SIZES.map(value =>
      '<button type="button" class="aaria-text-size-option" data-aaria-text-size-option="' + value + '" aria-pressed="' + (value === scale * 100) + '">' + value + '%</button>'
    ).join('');

    section.innerHTML =
      '<h2 id="aaria-text-size-heading">' + title + '</h2>' +
      '<fieldset class="aaria-text-size-fieldset">' +
        '<legend>' + controlTitle + '</legend>' +
        '<p>' + description + '</p>' +
        '<div class="aaria-text-size-options" role="group" aria-label="' + controlTitle + '">' + sizes + '</div>' +
        '<p class="aaria-text-size-preview" aria-live="polite">' + preview + ' <strong data-aaria-text-size-value>' + Math.round(scale * 100) + '%</strong></p>' +
        '<button type="button" class="aaria-text-size-reset" data-aaria-text-size-reset>' + reset + '</button>' +
      '</fieldset>';
    const actions = page.querySelector('.home-subpage-actions');
    if (actions) page.insertBefore(section, actions);
    else page.appendChild(section);
    markText(section);
    applyScale(Math.round(scale * 100), false);
  }

  document.addEventListener('change', event => {
    if (event.target?.id === 'languageSelect') installSettingsPanel();
  });

  document.addEventListener('click', event => {
    const option = event.target.closest?.('[data-aaria-text-size-option]');
    if (option) {
      applyScale(Number(option.dataset.aariaTextSizeOption), true);
      return;
    }
    const reset = event.target.closest?.('[data-aaria-text-size-reset]');
    if (reset) applyScale(100, true);
  });

  const screenObserver = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) markText(node);
      }
    }
    installSettingsPanel();
  });
  screenObserver.observe(document.documentElement, {childList: true, subtree: true});

  document.documentElement.style.setProperty('--aaria-text-scale', String(scale));
  document.documentElement.dataset.aariaTextSizeActive = scale > 1 ? 'true' : 'false';
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      markText(document.body);
      installSettingsPanel();
    }, {once: true});
  } else {
    markText(document.body);
    installSettingsPanel();
  }
})();
