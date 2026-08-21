function resolveConfigValue(storedValue, environmentValue) {
  return String(storedValue || '').trim() || String(environmentValue || '').trim();
}

module.exports = { resolveConfigValue };
