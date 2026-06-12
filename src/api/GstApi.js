// ─── gstApi.js ───────────────────────────────────────────────
// GSTIN verification API
// Usage: import { checkGSTINExists } from './gstApi';
// ─────────────────────────────────────────────────────────────

const GST_API_URL = 'https://www.haatzaseller.com/_functions/checksellergst';

/**
 * Checks whether a seller with the given GSTIN is already registered.
 *
 * @param {string} gstin - Valid 15-character GSTIN string
 * @returns {Promise<boolean>} - true if already registered, false if not
 * @throws {Error} - throws on network failure or non-200 response
 */
export async function checkGSTINExists(gstin) {
  const url = `${GST_API_URL}?gstin=${encodeURIComponent(gstin)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const data = await res.json();

  // Normalise: support multiple possible response shapes
  if (typeof data.exists === 'boolean')     return data.exists;
  if (typeof data.registered === 'boolean') return data.registered;
  if (typeof data.found === 'boolean')      return data.found;
  if (data.status === 'exists')             return true;
  if (data.status === 'not_found')          return false;

  // Fallback — unknown shape, don't block the user
  return false;
}