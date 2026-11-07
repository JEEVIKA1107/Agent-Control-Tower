/**
 * Canonical JSON Serializer for Cryptographic Hash Chains
 * Recursively sorts keys alphabetically so that object key order does not alter SHA-256 digests.
 */
const canonicalJson = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (obj instanceof Date) {
    return JSON.stringify(obj.toISOString());
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJson).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  return '{' + sortedKeys.map(key => JSON.stringify(key) + ':' + canonicalJson(obj[key])).join(',') + '}';
};

module.exports = canonicalJson;
