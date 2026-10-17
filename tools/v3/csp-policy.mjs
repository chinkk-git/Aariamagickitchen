export function validateCspPolicy(csp) {
  if (typeof csp !== 'string' || !csp.trim()) throw new Error('The generated V3 document has no Content Security Policy.');
  const directives = {};
  for (const part of csp.split(';')) {
    const [name, ...sources] = part.trim().split(/\\s+/);
    if (!name) continue;
    if (Object.hasOwn(directives, name)) throw new Error(`V3 CSP contains duplicate ${name} directive.`);
    directives[name] = sources;
  }
  if (!directives['script-src']?.includes("'self'") || directives['script-src'].some(source => !["'self'", "'unsafe-inline'"].includes(source))) {
    throw new Error('V3 CSP must allow only packaged-origin and required inline scripts.');
  }
  if (!directives['connect-src'] || directives['connect-src'].some(source => source !== "'self'")) {
    throw new Error('V3 CSP must restrict script network connections to the packaged origin.');
  }
  for (const directive of ['frame-src', 'child-src', 'object-src']) {
    if (!directives[directive]?.includes("'none'")) throw new Error(`V3 CSP must disable ${directive}.`);
  }
  if (!directives['base-uri']?.includes("'self'")) throw new Error('V3 CSP must restrict base-uri to the packaged origin.');
  if (!directives['form-action']?.includes("'self'")) throw new Error('V3 CSP must restrict form-action to the packaged origin.');
}
