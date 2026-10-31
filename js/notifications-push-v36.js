(() => {
  'use strict';

  const SETTINGS_KEY = 'aaria.notifications.settings.v1';
  const DEVICE_ID_KEY = 'aaria.notifications.device-id.v1';
  const locale = () => document.documentElement.lang === 'pt-BR' || document.querySelector('#languageSelect')?.value === 'pt-BR' ? 'pt-BR' : 'en-GB';
  const copy = {
    'en-GB': {
      statusOff:'Remote push is off until the approved guardian-consent service and Worker are configured.',
      statusUnsupported:'Push is not supported in this browser. Use a supported browser; on iPhone or iPad, add Aaria to the Home Screen and open the installed app.',
      statusInApp:'Open Aaria in Safari or Chrome to manage installation and notifications.',
      statusNeedConsent:'A parent or guardian must complete the approved consent step before device permission can be requested.',
      consent:'Continue to parent or guardian consent',
      enable:'Enable or update push notifications',
      disable:'Disable notifications on this device',
      active:'This device is subscribed to push notifications.',
      verified:'Guardian consent was verified. Select Enable to continue to the browser permission prompt.',
      denied:'Notifications are blocked in browser settings. Change that setting before trying again.',
      noCategories:'Choose at least one announcement category before enabling push.',
      saved:'Subscription updated.',
      disabled:'Notifications are off on this device.',
      serverDeleteFailed:'Device notifications are off, but server-side removal could not be confirmed. Retry while online.',
      refresh:'This subscription needs renewal. A parent or guardian must verify consent again.',
      failed:'Notifications could not be updated. Check your connection and try again.',
      retry:'Retry server removal',
      preferencesChanged:'Notification preferences changed. Push is paused until a parent or guardian reviews the updated choices.',
      test:'Send test notification',testDestination:'Test destination',testInbox:'Notifications',testRecipes:'New recipes 111–116',testTextSize:'Accessibility · Text Size',testWhatsNew:'What’s New',testSent:'A test notification was sent to this device.',testCooldown:'Please wait before sending another test notification.',deviceName:'Guardian-assigned device name',deviceNameHint:'Use a short label; do not include a child’s name.',deviceNameRequired:'Enter a short guardian-assigned device name before enabling notifications.',platform:'Platform',platformAndroid:'Android',platformIos:'iPhone or iPad',platformDesktop:'Desktop browser',platformOther:'Other',manageDevices:'Guardian device management',loadDevices:'Load authorized devices',firstMagical:'Send first magical notification to this device',recordResult:'Record observed result',opened112:'Received; recipe 112 opened',fallbackVnm:'Received; Vietnam list opened',notOpened:'Not received or did not open',deviceSaved:'Device registered with guardian consent.'
    },
    'pt-BR': {
      statusOff:'O push remoto fica desativado até que o serviço aprovado de consentimento dos responsáveis e o Worker sejam configurados.',
      statusUnsupported:'Este navegador não oferece push. Use um navegador compatível; no iPhone ou iPad, adicione Aaria à Tela de Início e abra o app instalado.',
      statusInApp:'Abra Aaria no Safari ou Chrome para gerenciar instalação e notificações.',
      statusNeedConsent:'Um responsável precisa concluir a etapa de consentimento aprovada antes de solicitar a permissão do dispositivo.',
      consent:'Continuar para o consentimento dos responsáveis',
      enable:'Ativar ou atualizar notificações push',
      disable:'Desativar notificações neste dispositivo',
      active:'Este dispositivo está inscrito para receber notificações push.',
      verified:'O consentimento do responsável foi verificado. Toque em Ativar para continuar à permissão do navegador.',
      denied:'As notificações estão bloqueadas nas configurações do navegador. Altere essa configuração antes de tentar novamente.',
      noCategories:'Escolha pelo menos uma categoria de avisos antes de ativar o push.',
      saved:'Assinatura atualizada.',
      disabled:'As notificações estão desativadas neste dispositivo.',
      serverDeleteFailed:'As notificações do dispositivo foram desativadas, mas não foi possível confirmar a remoção no servidor. Tente novamente quando estiver online.',
      refresh:'Esta assinatura precisa ser renovada. Um responsável precisa verificar o consentimento novamente.',
      failed:'Não foi possível atualizar as notificações. Verifique a conexão e tente novamente.',
      retry:'Tentar remover do servidor novamente',
      preferencesChanged:'As preferências mudaram. O push foi pausado até que um responsável revise as escolhas atualizadas.',
      test:'Enviar notificação de teste',testDestination:'Destino do teste',testInbox:'Notificações',testRecipes:'Novas receitas 111–116',testTextSize:'Acessibilidade · Tamanho do texto',testWhatsNew:'Novidades',testSent:'Uma notificação de teste foi enviada para este dispositivo.',testCooldown:'Aguarde antes de enviar outra notificação de teste.',deviceName:'Nome do dispositivo definido pelo responsável',deviceNameHint:'Use um nome curto; não inclua o nome da criança.',deviceNameRequired:'Informe um nome curto para o dispositivo antes de ativar as notificações.',platform:'Plataforma',platformAndroid:'Android',platformIos:'iPhone ou iPad',platformDesktop:'Navegador de computador',platformOther:'Outra',manageDevices:'Gerenciamento de dispositivos pelo responsável',loadDevices:'Carregar dispositivos autorizados',firstMagical:'Enviar a primeira notificação mágica para este dispositivo',recordResult:'Registrar resultado observado',opened112:'Recebida; receita 112 aberta',fallbackVnm:'Recebida; lista do Vietnã aberta',notOpened:'Não recebida ou não aberta',deviceSaved:'Dispositivo registrado com consentimento do responsável.'
    }
  };
  const t = key => copy[locale()][key] || copy['en-GB'][key];
  let verifiedReceipt = null;
  let verifiedAt = 0;
  let cachedVapidKey = null;
  let pendingRemovalEndpoint = null;
  let busy = false;

  function settings() {
    try { return {...{recipes:true,features:true,countries:true,updates:true,push:false},...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}; }
    catch { return {recipes:true,features:true,countries:true,updates:true,push:false}; }
  }
  function saveSettings(value) {
    try { localStorage.setItem(SETTINGS_KEY,JSON.stringify(value)); } catch {}
  }
  function runtime() {
    const cfg=window.AARIA_NOTIFICATION_CONFIG;
    const bridge=window.AariaGuardianConsent;
    if(!cfg||cfg.enabled!==true||typeof cfg.workerUrl!=='string'||!bridge||typeof bridge.requestConsentReceipt!=='function')return null;
    try {
      const url=new URL(cfg.workerUrl);
      if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)return null;
      return {base:url.href.replace(/\/+$/,''),bridge};
    } catch { return null; }
  }
  function inApp() { return /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|Twitter|LinkedInApp|TikTok|; wv/i.test(navigator.userAgent); }
  function iosNeedsInstall() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
      !(navigator.standalone===true||matchMedia('(display-mode: standalone)').matches);
  }
  function supported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }
  function endpoint() {
    const r=runtime();
    return r?.base||null;
  }
  async function api(path, body) {
    const base=endpoint();
    if(!base)throw new Error('not_configured');
    const response=await fetch(base+path,{
      method:body===undefined?'GET':'POST',
      headers:body===undefined?{}:{'Content-Type':'application/json'},
      body:body===undefined?undefined:JSON.stringify(body),
      credentials:'omit',cache:'no-store',redirect:'error',mode:'cors'
    });
    let data={};
    try { data=await response.json(); } catch {}
    if(!response.ok)throw new Error(data.error||'request_failed');
    return data;
  }
  function decodeVapid(value) {
    const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length/4)*4,'='));
    return Uint8Array.from(raw,c=>c.charCodeAt(0));
  }
  function categories() {
    const prefs=settings();
    return ['recipes','features','countries','updates'].filter(key=>prefs[key]===true);
  }
  function localDeviceId(){
    try{let id=localStorage.getItem(DEVICE_ID_KEY);if(!/^[A-Za-z0-9_-]{20,80}$/.test(id||'')){id=crypto.randomUUID().replace(/-/g,'');localStorage.setItem(DEVICE_ID_KEY,id);}return id;}catch{return crypto.randomUUID().replace(/-/g,'');}
  }
  function deviceInfo(section){
    const deviceName=section.querySelector('[data-device-name]')?.value.trim()||'';
    const ua=navigator.userAgent;
    const detected=/Android/i.test(ua)?'android':/iPhone|iPad|iPod/i.test(ua)?'ios':/Win|Mac|Linux/i.test(ua)?'desktop':'other';
    const platform=section.querySelector('[data-device-platform]')?.value||detected;
    return {deviceId:localDeviceId(),deviceName,platform,permissionStatus:Notification.permission};
  }
  async function currentSubscription() {
    if(!supported())return null;
    const reg=await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }
  async function heartbeat(){
    if(!runtime()||!settings().push)return;
    try{const sub=await currentSubscription();if(sub)await api('/v1/device/heartbeat',{subscription:sub.toJSON(),permissionStatus:Notification.permission});}catch{}
  }
  async function render(section) {
    if(!section||section.dataset.pushLifecycleMounted==='true')return;
    section.dataset.pushLifecycleMounted='true';
    const h=section.querySelector('h2');
    section.replaceChildren(h||document.createElement('h2'));
    const status=document.createElement('p');
    status.id='aaria-push-status';
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    const actions=document.createElement('div');
    actions.className='an-push-actions';
    const consent=document.createElement('button');
    consent.type='button';consent.dataset.pushLifecycle='consent';consent.textContent=t('consent');
    const enable=document.createElement('button');
    enable.type='button';enable.dataset.pushLifecycle='enable';enable.textContent=t('enable');enable.disabled=true;
    const disable=document.createElement('button');
    disable.type='button';disable.dataset.pushLifecycle='disable';disable.textContent=t('disable');disable.disabled=true;
    const retry=document.createElement('button');
    retry.type='button';retry.dataset.pushLifecycle='retry';retry.textContent=t('retry');retry.hidden=true;
    const testDestination=document.createElement('label');
    testDestination.textContent=t('testDestination');
    const select=document.createElement('select');
    select.dataset.pushTestRoute='true';
    for(const [route,label] of [['/notifications','testInbox'],['/recipes/new/111,112,113,114,115,116','testRecipes'],['/settings/accessibility/text-size','testTextSize'],['/whats-new','testWhatsNew']]){
      const option=document.createElement('option');option.value=route;option.textContent=t(label);select.append(option);
    }
    testDestination.append(select);
    const test=document.createElement('button');
    test.type='button';test.dataset.pushLifecycle='test';test.textContent=t('test');test.hidden=true;test.disabled=true;
    const deviceNameLabel=document.createElement('label');deviceNameLabel.textContent=t('deviceName');
    const deviceName=document.createElement('input');deviceName.type='text';deviceName.maxLength=32;deviceName.required=true;deviceName.autocomplete='off';deviceName.dataset.deviceName='true';deviceName.value=localStorage.getItem(DEVICE_ID_KEY+'-name')||'';deviceNameLabel.append(deviceName);const deviceHint=document.createElement('small');deviceHint.textContent=t('deviceNameHint');deviceNameLabel.append(deviceHint);
    const platformLabel=document.createElement('label');platformLabel.textContent=t('platform');
    const platform=document.createElement('select');platform.dataset.devicePlatform='true';
    const ua=navigator.userAgent;const detected=/Android/i.test(ua)?'android':/iPhone|iPad|iPod/i.test(ua)?'ios':/Win|Mac|Linux/i.test(ua)?'desktop':'other';
    for(const [value,key] of [['android','platformAndroid'],['ios','platformIos'],['desktop','platformDesktop'],['other','platformOther']]){const option=document.createElement('option');option.value=value;option.textContent=t(key);platform.append(option);}platform.value=detected;platformLabel.append(platform);
    const manage=document.createElement('button');manage.type='button';manage.textContent=t('manageDevices');manage.dataset.pushLifecycle='manage';manage.hidden=true;
    const dashboard=document.createElement('div');dashboard.dataset.guardianDevices='true';dashboard.hidden=true;
    actions.append(consent,enable,disable,retry,testDestination,test);
    section.append(status,deviceNameLabel,platformLabel,actions,manage,dashboard);
    await refresh(section);
  }
  async function refresh(section) {
    if(!section)return;
    const status=section.querySelector('#aaria-push-status');
    const consent=section.querySelector('[data-push-lifecycle="consent"]');
    const enable=section.querySelector('[data-push-lifecycle="enable"]');
    const disable=section.querySelector('[data-push-lifecycle="disable"]');
    const retry=section.querySelector('[data-push-lifecycle="retry"]');
    const test=section.querySelector('[data-push-lifecycle="test"]');
    const testDestination=section.querySelector('[data-push-test-route]');
    const manage=section.querySelector('[data-push-lifecycle="manage"]');
    const deviceName=section.querySelector('[data-device-name]')?.closest('label');
    const platform=section.querySelector('[data-device-platform]')?.closest('label');
    const configured=runtime();
    if(!supported())status.textContent=t('statusUnsupported');
    else if(inApp())status.textContent=t('statusInApp');
    else if(iosNeedsInstall())status.textContent=t('statusUnsupported');
    else if(!configured)status.textContent=t('statusOff');
    else if(settings().renewRequired||settings().push)status.textContent=t('refresh');
    else status.textContent=t('statusNeedConsent');
    consent.disabled=!configured||!supported()||inApp()||iosNeedsInstall()||busy;
    enable.disabled=!configured||!supported()||!verifiedReceipt||Date.now()-verifiedAt>5*60*1000||busy||Notification.permission==='denied';
    disable.disabled=busy;
    retry.hidden=!pendingRemovalEndpoint;
    retry.disabled=busy||!configured;
    testDestination.hidden=!configured;
    test.hidden=!configured;
    manage.hidden=!configured||typeof runtime()?.bridge.requestGuardianManagementReceipt!=='function';
    if(deviceName)deviceName.hidden=!configured;
    if(platform)platform.hidden=!configured;
    test.disabled=true;
    try {
      const sub=await currentSubscription();
      disable.disabled=busy||!sub;
      testDestination.hidden=!sub||!configured;
      test.hidden=!sub||!configured;
      test.disabled=busy||!sub||!configured||Notification.permission!=='granted'||!settings().push;
      if(sub&&configured)status.textContent=t('active');
      else if(configured&&(settings().renewRequired||settings().push))status.textContent=t('refresh');
    } catch {}
  }
  async function verifyConsent(section) {
    const configured=runtime();
    if(!configured)throw new Error('not_configured');
    const chosen=categories();
    const result=await configured.bridge.requestConsentReceipt({locale:locale(),categories:chosen});
    const receipt=typeof result==='string'?result:result?.consentReceipt;
    if(typeof receipt!=='string'||receipt.length>4096)throw new Error('consent_unavailable');
    const conf=await api('/v1/config');
    if(typeof conf.vapidPublicKey!=='string'||!conf.vapidPublicKey)throw new Error('push_service_unavailable');
    await api('/v1/consent/verify',{locale:locale(),consentReceipt:receipt});
    verifiedReceipt=receipt;
    verifiedAt=Date.now();
    cachedVapidKey=conf.vapidPublicKey;
    const status=section.querySelector('#aaria-push-status');
    if(status)status.textContent=t('verified');
    await refresh(section);
    section.querySelector('[data-push-lifecycle="enable"]')?.focus();
  }
  async function enablePush(section) {
    if(!verifiedReceipt||Date.now()-verifiedAt>5*60*1000)throw new Error('consent_expired');
    const selected=categories();
    if(!selected.length)throw new Error('no_categories');
    const device=deviceInfo(section);
    if(!device.deviceName||device.deviceName.length>32)throw new Error('device_name_required');
    if(Notification.permission==='denied')throw new Error('permission_denied');
    const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(permission!=='granted')throw new Error('permission_not_granted');
    const reg=await navigator.serviceWorker.ready;
    localStorage.setItem(DEVICE_ID_KEY+'-name',device.deviceName);
    let sub=await reg.pushManager.getSubscription();
    const created=!sub;
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeVapid(cachedVapidKey)});
    try {
      await api('/v1/subscribe',{subscription:sub.toJSON(),locale:locale(),categories:selected,consentReceipt:verifiedReceipt,device});
    } catch(error) {
      if(created)await sub.unsubscribe().catch(()=>{});
      throw error;
    }
    verifiedReceipt=null;verifiedAt=0;cachedVapidKey=null;
    const prefs=settings();prefs.push=true;prefs.renewRequired=false;saveSettings(prefs);
    const status=section.querySelector('#aaria-push-status');if(status)status.textContent=t('saved');
    await refresh(section);
  }
  async function sendTest(section) {
    if(Notification.permission!=='granted')throw new Error('permission_not_granted');
    const route=section.querySelector('[data-push-test-route]')?.value;
    if(!['/notifications','/recipes/new/111,112,113,114,115,116','/settings/accessibility/text-size','/whats-new'].includes(route))throw new Error('invalid_test_route');
    const sub=await currentSubscription();
    if(!sub)throw new Error('subscription_required');
    if(!categories().length)throw new Error('no_categories');
    await verifyConsent(section);
    if(!verifiedReceipt||Date.now()-verifiedAt>5*60*1000)throw new Error('consent_expired');
    const device=deviceInfo(section);if(!device.deviceName)throw new Error('device_name_required');
    await api('/v1/subscribe',{subscription:sub.toJSON(),locale:locale(),categories:categories(),consentReceipt:verifiedReceipt,device});
    await api('/v1/test',{endpoint:sub.endpoint,locale:locale(),consentReceipt:verifiedReceipt,route});
    verifiedReceipt=null;verifiedAt=0;cachedVapidKey=null;
    const status=section.querySelector('#aaria-push-status');if(status)status.textContent=t('testSent');
    await refresh(section);
  }
  async function managementReceipt(){
    const bridge=runtime()?.bridge;if(!bridge||typeof bridge.requestGuardianManagementReceipt!=='function')throw new Error('guardian_management_unavailable');
    const result=await bridge.requestGuardianManagementReceipt({locale:locale(),purpose:'device-management'});
    const consentReceipt=typeof result==='string'?result:result?.consentReceipt;
    if(typeof consentReceipt!=='string'||consentReceipt.length>4096)throw new Error('consent_unavailable');
    return consentReceipt;
  }
  async function loadDevices(section){
    const consentReceipt=await managementReceipt();
    const data=await api('/v1/guardian/devices',{locale:locale(),consentReceipt});
    const dashboard=section.querySelector('[data-guardian-devices]');dashboard.replaceChildren();dashboard.hidden=false;
    const heading=document.createElement('h3');heading.textContent=t('manageDevices');dashboard.append(heading);
    for(const row of data.devices||[]){
      const card=document.createElement('article');card.className='an-device';
      const title=document.createElement('h4');title.textContent=row.device_name+' · '+row.platform;card.append(title);
      const details=document.createElement('p');details.textContent=`${row.permission_status}; ${row.subscription_status}; consent expires ${new Date(row.consent_expires_at).toLocaleDateString(locale())}; last contact ${new Date(row.last_contact_at).toLocaleString(locale())}`;card.append(details);
      const first=document.createElement('button');first.type='button';first.textContent=t('firstMagical');first.addEventListener('click',async()=>{const receipt=await managementReceipt();await api('/v1/guardian/device/first-magical',{deviceId:row.device_id,locale:locale(),consentReceipt:receipt});first.disabled=true;first.textContent=t('testSent');});card.append(first);
      const resultLabel=document.createElement('label');resultLabel.textContent=t('recordResult');const result=document.createElement('select');
      for(const [value,key] of [['opened_recipe_112','opened112'],['fallback_vietnam_list','fallbackVnm'],['did_not_open','notOpened']]){const option=document.createElement('option');option.value=value;option.textContent=t(key);result.append(option);}resultLabel.append(result);card.append(resultLabel);
      const record=document.createElement('button');record.type='button';record.textContent=t('recordResult');record.addEventListener('click',async()=>{const receipt=await managementReceipt();await api('/v1/guardian/device/first-magical-result',{deviceId:row.device_id,locale:locale(),result:result.value,consentReceipt:receipt});record.disabled=true;});card.append(record);
      const revoke=document.createElement('button');revoke.type='button';revoke.textContent=t('disable');revoke.addEventListener('click',async()=>{const receipt=await managementReceipt();await api('/v1/guardian/device/revoke',{deviceId:row.device_id,locale:locale(),consentReceipt:receipt});card.remove();});card.append(revoke);dashboard.append(card);
    }
  }
  async function unsubscribe(section) {
    let sub=null;
    try { sub=await currentSubscription(); } catch {}
    if(!sub) {
      const prefs=settings();prefs.push=false;prefs.renewRequired=false;saveSettings(prefs);
      const status=section.querySelector('#aaria-push-status');if(status)status.textContent=t('disabled');
      await refresh(section);return;
    }
    const ep=sub.endpoint;
    let serverRemoved=false;
    const base=endpoint();
    if(base) {
      try { await api('/v1/unsubscribe',{endpoint:ep});serverRemoved=true; }
      catch { pendingRemovalEndpoint=ep; }
    } else pendingRemovalEndpoint=ep;
    await sub.unsubscribe().catch(()=>{});
    const prefs=settings();prefs.push=false;prefs.renewRequired=false;saveSettings(prefs);
    verifiedReceipt=null;verifiedAt=0;cachedVapidKey=null;
    const status=section.querySelector('#aaria-push-status');
    if(status)status.textContent=serverRemoved?t('disabled'):t('serverDeleteFailed');
    await refresh(section);
  }
  async function retryRemoval(section) {
    if(!pendingRemovalEndpoint)return;
    await api('/v1/unsubscribe',{endpoint:pendingRemovalEndpoint});
    pendingRemovalEndpoint=null;
    const status=section.querySelector('#aaria-push-status');if(status)status.textContent=t('disabled');
    await refresh(section);
  }
  function showError(section,error) {
    const key=error?.message==='permission_denied'?'denied':error?.message==='no_categories'?'noCategories':error?.message==='test_rate_limited'?'testCooldown':error?.message==='device_name_required'?'deviceNameRequired':'failed';
    const status=section.querySelector('#aaria-push-status');if(status)status.textContent=t(key);
    refresh(section).catch(()=>{});
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest?.('[data-push-lifecycle]');
    if(!button)return;
    const section=button.closest('.an-push');
    if(!section)return;
    event.preventDefault();
    if(busy)return;
    busy=true;refresh(section).catch(()=>{});
    try {
      if(button.dataset.pushLifecycle==='consent')await verifyConsent(section);
      else if(button.dataset.pushLifecycle==='enable')await enablePush(section);
      else if(button.dataset.pushLifecycle==='disable')await unsubscribe(section);
      else if(button.dataset.pushLifecycle==='retry')await retryRemoval(section);
      else if(button.dataset.pushLifecycle==='test')await sendTest(section);
      else if(button.dataset.pushLifecycle==='manage')await loadDevices(section);
    } catch(error) { showError(section,error); }
    finally { busy=false;await refresh(section); }
  });
  async function pauseForPreferenceChange(section) {
    let sub=null;
    try { sub=await currentSubscription(); } catch {}
    let removed=true;
    if(sub) {
      try {
        await api('/v1/unsubscribe',{endpoint:sub.endpoint});
        if(pendingRemovalEndpoint===sub.endpoint)pendingRemovalEndpoint=null;
      } catch {
        pendingRemovalEndpoint=sub.endpoint;
        removed=false;
      }
      await sub.unsubscribe().catch(()=>{});
    }
    const prefs=settings();prefs.push=false;prefs.renewRequired=Boolean(sub);saveSettings(prefs);
    verifiedReceipt=null;verifiedAt=0;cachedVapidKey=null;
    const status=section?.querySelector('#aaria-push-status');
    if(status)status.textContent=removed?t('preferencesChanged'):t('serverDeleteFailed');
    await refresh(section);
  }
  document.addEventListener('change',event=>{
    if(!event.target.matches?.('[data-pref]'))return;
    verifiedReceipt=null;verifiedAt=0;cachedVapidKey=null;
    const section=document.querySelector('.an-push');
    if(section&&settings().push)pauseForPreferenceChange(section).catch(error=>showError(section,error));
  });
  const screen=document.querySelector('#screen');
  if(screen&&'MutationObserver'in window) new MutationObserver(()=>{
    const section=screen.querySelector('.an-push');if(section)render(section).catch(()=>{});
  }).observe(screen,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>{const section=document.querySelector('#screen .an-push');if(section)render(section).catch(()=>{});heartbeat();});
  window.addEventListener('online',heartbeat);
  navigator.serviceWorker?.addEventListener('message',event=>{
    if(event.data?.type!=='AARIA_PUSH_SUBSCRIPTION_REFRESH_REQUIRED')return;
    const prefs=settings();prefs.renewRequired=true;prefs.push=false;saveSettings(prefs);
    verifiedReceipt=null;verifiedAt=0;cachedVapidKey=null;
    const section=document.querySelector('#screen .an-push');
    if(section){const status=section.querySelector('#aaria-push-status');if(status)status.textContent=t('refresh');refresh(section).catch(()=>{});}
  });
  window.AariaNotificationPush={supported,refresh:()=>refresh(document.querySelector('#screen .an-push'))};
})();
