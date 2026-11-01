export function parseHash(hash, allowedRoutes) {
  const [name='home',id='']=hash.replace(/^#\/?/,'').split('/');
  return allowedRoutes.has(name)?{name,id}:{name:'home',id:''};
}
