(() => {
  if (location.protocol === 'file:' || !('serviceWorker' in navigator)) return;
  let wasControlled = Boolean(navigator.serviceWorker.controller);
  function showUpdatePrompt() {
    if (!wasControlled || document.querySelector('#aaria-sw-update')) return;
    const banner = document.createElement('aside');
    banner.id = 'aaria-sw-update';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    Object.assign(banner.style, {position:'fixed',inset:'auto 1rem 1rem',zIndex:'10000',maxWidth:'36rem',margin:'auto',padding:'1rem',borderRadius:'1rem',background:'#fff9ed',boxShadow:'0 2px 16px #0004',color:'#24183a'});
    const pt = document.documentElement.lang === 'pt-BR' || document.querySelector('#languageSelect')?.value === 'pt-BR';
    const text = document.createElement('span');
    text.textContent = pt ? 'Aaria foi atualizada. Reinicie quando for conveniente para ativar as novidades.' : 'Aaria has updated. Restart when convenient to activate the new features.';
    const reload = document.createElement('button');
    reload.type = 'button';
    reload.textContent = pt ? 'Reiniciar agora' : 'Restart now';
    reload.addEventListener('click', () => location.reload());
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = pt ? 'Depois' : 'Later';
    dismiss.addEventListener('click', () => banner.remove());
    banner.append(text, document.createTextNode(' '), reload, dismiss);
    document.body.append(banner);
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (wasControlled) showUpdatePrompt();
    wasControlled = true;
  });
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(registration => {
    const update = () => registration.update().catch(() => {});
    window.addEventListener('online', update);
    window.addEventListener('focus', update);
  }).catch(() => {});
})();
