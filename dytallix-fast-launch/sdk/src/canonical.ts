/**
 * Canonical JSON serialization with sorted keys
 * This ensures deterministic hashing for transaction signing
 */

/**
 * Recursively sort all keys in an object
 */
function sortObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  }
  
  const sorted: any = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    sorted[key] = sortObject(obj[key]);
  }
  
  return sorted;
}

/**
 * Serialize an object to canonical JSON
 * - Keys are sorted alphabetically at all levels
 * - No extra whitespace
 * - Deterministic output
 */
export function canonicalJSON(obj: any): string {
  const sorted = sortObject(obj);
  return JSON.stringify(sorted);
}

/**
 * Serialize to canonical JSON and return as Uint8Array
 */
export function canonicalJSONBytes(obj: any): Uint8Array {
  const jsonStr = canonicalJSON(obj);
  return new TextEncoder().encode(jsonStr);
}
