const BLOCKED_SCREEN_STATUSES = new Set(['denied', 'restricted']);

function isScreenAccessBlocked(status) {
  return BLOCKED_SCREEN_STATUSES.has(status);
}

function canRetryScreenCapture(status) {
  return status === 'granted';
}

if (typeof window !== 'undefined') {
  window.ScreenAccess = { isScreenAccessBlocked, canRetryScreenCapture };
}

if (typeof module !== 'undefined') {
  module.exports = { isScreenAccessBlocked, canRetryScreenCapture };
}
