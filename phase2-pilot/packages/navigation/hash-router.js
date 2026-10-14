export function parseHash(hash, allowedRoutes) {
  const [name='home',id='']=hash.replace(/^#\/?/,'').split('/');
  return allowedRoute