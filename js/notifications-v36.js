(() => {
  'use strict';
  const BASE = new URL('./', location.href);
  const DB_NAME = 'aaria-notifications-v1';
  const STORE = 'items';
  const SETTINGS_KEY = 'aaria.notifications.settings.v1';
  const labels = {
    'en-GB': { title:'Notifications', empty:'No announcements yet.', back:'Back to kitchen', settings:'Notification settings', mark:'Mark as read', all:'Mark all as read', recipes:'New recipes', features:'New features', countries:'New countries', updates:'Major updates', push:'Enable push notifications', permission:'Permission status', supported:'This browser can request push permission.', install:'For notifications on iPhone or iPad, add Aaria to the Home Screen and open it from there.', inApp:'This in-app browser may not support installation or background notifications. Open this page in Safari or Chrome.', unavailable:'Remote notifications are not configured yet.', subscribe:'Continue to parent consent', parent:'A parent or guardian must review and enable notifications. I am the parent or guardian and consent to relevant, occasional cooking and app announcements.', accept:'I agree', cancel:'Cancel', unsupported:'Push notifications are not supported in this browser.', whatsNew:'What’s New', published:'Published', read:'Read', unread:'Unread', open:'Open', noRoute:'This announcement is no longer available.', test:'Send test notification', consentNeeded:'Parent or guardian consent is required before push can be enabled.' },
    'pt-BR': { title:'Notificações', empty:'Ainda não há avisos.', back:'Voltar à cozinha', settings:'Configurações de notificações', mark:'Marcar como lida', all:'Marcar todas como lidas', recipes:'Novas receitas', features:'Novos recursos', countries:'Novos países', updates:'Atualizações importantes', push:'Ativar notificações push', permission:'Status da permissão', supported:'Este navegador pode solicitar permissão para notificações push.', install:'Para receber notificações no iPhone ou iPad, adicione Aaria à Tela de Início e abra o app por lá.', inApp:'Este navegador interno pode não oferecer instalação ou notificações em segundo plano. Abra esta página no Safari ou Chrome.', unavailable:'As notificações remotas ainda não estão configuradas.', subscribe:'Continuar para consentimento dos responsáveis', parent:'Um responsável deve revisar e ativar as notificações. Sou responsável e concordo com avisos ocasionais e relevantes sobre culinária e atualizações do app.', accept:'Concordo', cancel:'Cancelar', unsupported:'Este navegador não oferece notificações push.', whatsNew:'Novidades', published:'Publicado em', read:'Lida', unread:'Não lida', open:'Abrir', noRoute:'Este aviso não está mais disponível.', test:'Enviar notificação de teste', consentNeeded:'É necessário o consentimento de um responsável antes de ativar notificações push.' }
  };
  const locale = () => document.documentElement.lang === 'pt-BR' || document.querySelector('#languageSelect')?.value === 'pt-BR' ? 'pt-BR' : 'en-GB';
  const t = key => labels[locale()][key] || labels['en-GB'][key] || key;
  const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const inAppBrowser = () => /FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(navigator.userAgent);
  let dbPromise;
  function db() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    return dbPromise ||= new Promise(resolve => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath:'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }
  async function list() {
    const database = await db(); if (!database) return [];
    return new Promise(resolve => { const req=database.transaction(STORE).objectStore(STORE).getAll(); req.onsuccess=()=>resolve(req.result||[]); req.onerror=()=>resolve([]); });
  }
  async function write(item) {
    const database=await db(); if(!database)return;
    return new Promise(resolve=>{const req=database.transaction(STORE,'readwrite').objectStore(STORE).put(item);req.onsuccess=()=>resolve();req.onerror=()=>resolve();});
  }
  const defaultSettings = { recipes:true, features:true, countries:true, updates:true, push:false };
  const settings = () => { try{return {...defaultSettings,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{return {...defaultSettings}} };
  const saveSettings = value => { try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(value))}catch{} };
  const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeRoute = route => {
    if(typeof route!=='string'||route.length>180)return null;
    if(/^\/notifications(?:\/new)?$/.test(route))return route;
    if(/^\/recipes\/new\/(?:[1-9]\d{0,2})(?:,(?:[1-9]\d{0,2})){0,49}$/.test(route))return route;

    if(/^\/recipe\/(?:[1-9]\d{0,2})$/.test(route))return route;
    if(/^\/world\/(?:IND|ITA|CHN|JPN|MEX|VNM|BRA|USA|FRA|ESP|THA|GBR|MAR)$/.test(route))return route;
    if(route==='/settings/notifications'||route==='/settings/accessibility/text-size'||route==='/whats-new')return route;
    return null;
  };
  const basePath = BASE.pathname.endsWith('/')?BASE.pathname:BASE.pathname+'/';
  function routeUrl(route) {
    const safe=safeRoute(route); if(!safe)return null;
    return BASE.origin+basePath+'?notice='+encodeURIComponent(safe);
  }
  function button(text, action, attrs='') { return '<button type="button" '+attrs+' data-notice-action="'+action+'">'+esc(text)+'</button>'; }
  async function renderInbox() {
    const items=(await list()).sort((a,b)=>b.publishedAt-a.publishedAt);
    const unread=items.filter(x=>!x.readAt).length;
    const badge=document.querySelector('#notification-unread-count');if(badge)badge.textContent=unread?String(unread):'';
    const bell=document.querySelector('#notification-bell');if(bell)bell.setAttribute('aria-label',locale()==='pt-BR'?`Notificações, ${unread} não lidas`:`Notifications, ${unread} unread`);
    const card=items.map(item=>'<article class="an-card '+(item.readAt?'':'is-unread')+'"><div><h2>'+esc(item.title)+'</h2><p>'+esc(item.body)+'</p><small>'+esc(t('published'))+' · '+esc(new Date(item.publishedAt).toLocaleDateString(locale()))+' · '+t(item.readAt?'read':'unread')+'</small></div><div class="an-actions">'+button(t('open'),'open','data-id="'+esc(item.id)+'"')+(item.readAt?'':button(t('mark'),'read','data-id="'+esc(item.id)+'"'))+'</div></article>').join('');
    showPage('<header class="an-header"><h1>'+t('whatsNew')+'</h1><span class="an-count" aria-label="'+unread+' unread">'+unread+'</span></header><div class="an-toolbar">'+button(t('all'),'read-all')+button(t('settings'),'settings')+'</div><section aria-live="polite">'+(card||'<p>'+t('empty')+'</p>')+'</section>'+button(t('back'),'back','class="an-back"'));
  }
  function showPage(html) {
    const screen=document.querySelector('#screen'); if(!screen)return;
    screen.dataset.aariaNotificationScreen='true';
    screen.innerHTML='<section class="an-page" aria-labelledby="an-title">'+html+'</section>';
    screen.querySelector('h1')?.setAttribute('id','an-title');
    screen.querySelector('h1')?.setAttribute('tabindex','-1');
    screen.querySelector('h1')?.focus?.({preventScroll:true});
  }
  function permissionText() {
    if(!supported())return t('unsupported');
    return t('supported')+' '+String(Notification.permission);
  }
  function renderSettings() {
    const prefs=settings();
    const rows=[['recipes','recipes'],['features','features'],['countries','countries'],['updates','updates']].map(([key,label])=>'<label class="an-pref"><input type="checkbox" data-pref="'+key+'" '+(prefs[key]?'checked':'')+'><span>'+t(label)+'</span></label>').join('');
    const ua=inAppBrowser()?'<p role="note">'+t('inApp')+'</p>':'';
    showPage('<h1>'+t('settings')+'</h1><p>'+esc(permissionText())+'</p>'+ua+'<fieldset><legend>'+t('title')+'</legend>'+rows+'</fieldset><section class="an-push"><h2>'+t('push')+'</h2><p>'+t(supported()?'unavailable':'unsupported')+'</p><p>'+t('consentNeeded')+'</p><button type="button" disabled aria-disabled="true">'+t('subscribe')+'</button></section>'+button(t('back'),'back','class="an-back"'));
  }
  async function updateBadge(){const items=await list(),unread=items.filter(x=>!x.readAt).length,badge=document.querySelector('#notification-unread-count'),bell=document.querySelector('#notification-bell');if(badge)badge.textContent=unread?String(unread):'';if(bell)bell.setAttribute('aria-label',locale()==='pt-BR'?`Notificações, ${unread} não lidas`:`Notifications, ${unread} unread`);}
  async function markRead(id) { const item=(await list()).find(x=>x.id===id); if(item){item.readAt=Date.now();await write(item);} }
  async function go(route) {
    const safe=safeRoute(route); if(!safe){showPage('<p role="status">'+t('noRoute')+'</p>');return;}
    if(safe==='/notifications'||safe==='/notifications/new'||safe==='/whats-new'){await renderInbox();return;}
    if(safe==='/settings/notifications'){renderSettings();return;}
    if(safe==='/settings/accessibility/text-size'){
      const event=new CustomEvent('aaria:open-text-size',{cancelable:true});
      const handled=!window.dispatchEvent(event);
      if(!handled)showPage('<p role="status">'+t('noRoute')+'</p>');
      return;
    }
    if(safe.startsWith('/recipes/new/')){
      const ids=safe.split('/').pop().split(',').map(Number);
      const catalog=typeof RECIPES!=='undefined'?RECIPES:[];
      const found=ids.map(id=>catalog.find(r=>Number(r.id)===id)).filter(Boolean);
      const title=locale()==='pt-BR'?'Novas receitas':'New recipes';
      const cards=found.map(r=>'<article class=\"an-card\"><div><h2>'+esc(r.emoji||'🍽️')+' '+esc(r.title)+'</h2></div><button type=\"button\" data-open=\"'+Number(r.id)+'\">'+t('open')+'</button></article>').join('');
      showPage('<h1>'+title+'</h1><p>'+ids.length+' · '+(locale()==='pt-BR'?'receitas recém-publicadas':'newly published recipes')+'</p>'+(cards||'<p>'+t('noRoute')+'</p>')+button(t('back'),'back','class=\"an-back\"'));return;
    }
    if(safe.startsWith('/recipe/')){
      if(typeof window.goto==='function')window.goto('library');
      setTimeout(()=>{if(safe.startsWith('/recipe/')&&typeof window.openRecipe==='function')window.openRecipe(Number(safe.split('/')[2]));},150);
      return;
    }
    if(safe.startsWith('/world/')){
      if(typeof window.v34EnterGlobeFirst==='function')window.v34EnterGlobeFirst(true); else if(typeof window.goto==='function')window.goto('world');
      const code=safe.split('/')[2], names={IND:['India','Índia'],ITA:['Italy','Itália'],CHN:['China','China'],JPN:['Japan','Japão'],MEX:['Mexico','México'],VNM:['Vietnam','Vietnã'],BRA:['Brazil','Brasil'],USA:['United States','Estados Unidos'],FRA:['France','França'],ESP:['Spain','Espanha'],THA:['Thailand','Tailândia'],GBR:['United Kingdom','Reino Unido'],MAR:['Morocco','Marrocos']};
      setTimeout(()=>{const n=names[code]?.[locale()==='pt-BR'?1:0];[...document.querySelectorAll('#screen button')].find(b=>b.textContent.trim()===n)?.click();},450);
      return;
    }
  }
  function openNotice(route) {
    const path=safeRoute(route); if(!path)return false;
    history.replaceState(null,'',BASE.pathname+'?notice='+encodeURIComponent(path));
    go(path); return true;
  }
  window.AariaNotifications={openInbox:()=>openNotice('/notifications'),openRoute:openNotice,saveAnnouncement:async item=>{if(!item||typeof item.id!=='string'||!safeRoute(item.route))return false;const existing=(await list()).some(x=>x.id===item.id);if(existing)return false;await write({...item,readAt:null,publishedAt:Number(item.publishedAt)||Date.now()});return true;}};
  document.addEventListener('change',event=>{const input=event.target.closest('[data-pref]');if(input){const prefs=settings();prefs[input.dataset.pref]=Boolean(input.checked);saveSettings(prefs);}});
  document.addEventListener('click',async event=>{
    const control=event.target.closest('[data-notice-action]');
    if(control){const action=control.dataset.noticeAction,id=control.dataset.id;
      if(action==='open'){const item=(await list()).find(x=>x.id===id);if(item){await markRead(id);if(!openNotice(item.route))showPage('<p>'+t('noRoute')+'</p>');}return;}
      if(action==='read'){await markRead(id);await renderInbox();return;}
      if(action==='read-all'){for(const item of await list())if(!item.readAt){item.readAt=Date.now();await write(item);}await renderInbox();return;}
      if(action==='settings'){openNotice('/settings/notifications');return;}
      if(action==='back'){screenHome();return;}
    }
    if(event.target.closest('#notification-bell')){event.preventDefault();openNotice('/notifications');}
  });
  function screenHome(){const screen=document.querySelector('#screen');if(screen)delete screen.dataset.aariaNotificationScreen;pendingStartupRoute=null;history.replaceState(null,'',BASE.pathname);if(typeof window.goto==='function')window.goto('home');}
  let pendingStartupRoute=null;
  if(typeof window.goto==='function'&&!window.__aariaNotificationGotoPatched){const previous=window.goto;window.goto=function(route,...args){if(route==='notifications'||route==='whats-new')return openNotice(route==='whats-new'?'/whats-new':'/notifications');const result=previous.call(this,route,...args);if(route==='home'&&pendingStartupRoute){setTimeout(()=>{const pending=pendingStartupRoute;pendingStartupRoute=null;if(pending)go(pending);},180);}return result};window.__aariaNotificationGotoPatched=true;}
  const screen=document.querySelector('#screen');if(screen&&'MutationObserver'in window)new MutationObserver(()=>{const h=screen.querySelector('h1,h2');if(!h||screen.dataset.aariaNotificationScreen)return;const heading=h.textContent.trim();if(!/^(Settings|Configurações)$/i.test(heading)||screen.querySelector('[data-open-notification-settings]'))return;const link=document.createElement('button');link.type='button';link.textContent=locale()==='pt-BR'?'Notificações':'Notifications';link.dataset.openNotificationSettings='true';link.addEventListener('click',()=>openNotice('/settings/notifications'));h.insertAdjacentElement('afterend',link);}).observe(screen,{childList:true,subtree:true});
  navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='AARIA_NOTIFICATION_OPEN'&&safeRoute(event.data.route))openNotice(event.data.route);if(event.data?.type==='AARIA_NOTIFICATION_RECEIVED')renderInbox().catch(()=>{});});
  window.addEventListener('DOMContentLoaded',()=>{updateBadge().catch(()=>{});const route=new URL(location.href).searchParams.get('notice');if(route&&safeRoute(route)){pendingStartupRoute=route;setTimeout(()=>{if(pendingStartupRoute)go(pendingStartupRoute);},1400);}});
  document.querySelector('#languageSelect')?.addEventListener('change',()=>{if(document.querySelector('#screen')?.dataset.aariaNotificationScreen)go(new URL(location.href).searchParams.get('notice')||'/notifications');});
})();