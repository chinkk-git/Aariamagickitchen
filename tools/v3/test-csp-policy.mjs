import assert from 'node:assert/strict';
import { validateCspPolicy } from './csp-policy.mjs';

const valid = "script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'none'; child-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'";
assert.doesNotThrow(() => validateCspPolicy(valid));
assert.throws(() => validateCspPolicy(''), /no Content Security Policy/);
assert.throws(() => validateCspPolicy(valid.replace("script-src 'self' 'unsafe-inline'", "script-src *")), /script-src/);
assert.throws(() => validateCspPolicy(valid.replace("script-src 'self' 'unsafe-inline'", "script-src 'self' data:")), /script-src/);
assert.throws(() => validateCspPolicy(valid.replace("connect-src 'self'", "connect-src https://example.com")), /connect-src/);
assert.throws(() => validateCspPolicy(valid.replace("frame-src 'none'", "frame-src https://example.com")), /frame-src/);
assert.throws(() => validateCspPolicy(valid.replace("; child-src 'none'", "")), /child-src/);
assert.throws(() => validateCspPolicy(valid + "; object-src 'none'"), /duplicate object-src/);
console.log('CSP policy validation checks passed.');
