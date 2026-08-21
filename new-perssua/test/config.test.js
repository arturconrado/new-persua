const assert = require('node:assert/strict');
const { resolveConfigValue } = require('../src/utils/config');

assert.equal(resolveConfigValue('', 'env-key'), 'env-key');
assert.equal(resolveConfigValue('stored-key', 'env-key'), 'stored-key');
assert.equal(resolveConfigValue(undefined, undefined), '');

console.log('config: ok');
