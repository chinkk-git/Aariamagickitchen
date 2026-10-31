const ALLOWED_CATEGORIES = new Set(['recipes','features','countries','updates']);

function isPublicHttpsEndpoint(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return false;
    if (url.port && url.port !== '443') return false;
    if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.includes(':')) return false;
    if (/^(?:\\d{1,3}\\.){3}\\d{1,3}$/.test(host)) return false;
    if (!host.includes('.') || host.length > 253) return false;
    return host.split('.').every(label => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));
  } catch {
    return false;
  }
}

function base64UrlBytes(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) return -1;
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    return atob(normalized + '='.repeat((4 - normalized.length % 4) % 4)).length;
  } catch {
    return -1;
  }
}

export function isValidSubscriptionInput(value) {
  if (!value || typeof value !== 'object' || !value.subscription || typeof value.subscription !== 'object') return false;
  const sub = value.subscription;
  if (!isPublicHttpsEndpoint(sub.endpoint)) return false;
  if (!sub.keys || base64UrlBytes(sub.keys.p256dh) !== 65 || base64UrlBytes(sub.keys.auth) !== 16) return false;
  if (!['en-GB','pt-BR'].includes(value.locale)) return false;
  if (!Array.isArray(value.categories) || value.categories.length < 1 || value.categories.length > 4) return false;
  if (new Set(value.categories).size !== value.categories.length) return false;
  return value.categories.every(category => ALLOWED_CATEGORIES.has(category));
}

export { isPublicHttpsEndpoint };
