const assert = require('node:assert/strict');
const { isScreenAccessBlocked, canRetryScreenCapture } = require('../src/utils/screenAccess');

assert.equal(isScreenAccessBlocked('denied'), true);
assert.equal(isScreenAccessBlocked('restricted'), true);
assert.equal(isScreenAccessBlocked('granted'), false);
assert.equal(canRetryScreenCapture('granted'), true);
assert.equal(canRetryScreenCapture('not-determined'), false);
assert.equal(canRetryScreenCapture('unknown'), false);

console.log('screenAccess: ok');
