/**
 * Utilities for storing and validating credentials using localStorage.
 * This simulates a `login.json` database as requested.
 */

const STORAGE_KEY = 'login.json';

/**
 * Safely read and parse the stored JSON object.
 * @returns {Record<string, string>} map of email -> password
 */
function readStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    // If storage is corrupted or non-JSON, treat as empty.
    return {};
  }
}

/**
 * Safely write the store object back to localStorage.
 * @param {Record<string, string>} obj
 */
function writeStore(obj) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

// PUBLIC_INTERFACE
export function saveCredentials(email, password) {
  /**
   * Save credentials into localStorage under key `login.json` using email as the key.
   * This overwrites any existing password for the same email.
   */
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const pwd = String(password || '');

  if (!normalizedEmail) throw new Error('Email is required.');
  if (!pwd) throw new Error('Password is required.');

  const store = readStore();
  store[normalizedEmail] = pwd;
  writeStore(store);
}

// PUBLIC_INTERFACE
export function validateCredentials(email, password) {
  /**
   * Validate credentials against the localStorage `login.json` store.
   * Returns { ok, reason } for UX-friendly messaging.
   */
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const pwd = String(password || '');

  if (!normalizedEmail || !pwd) {
    return { ok: false, reason: 'Email and password are required.' };
  }

  const store = readStore();
  if (!(normalizedEmail in store)) {
    return { ok: false, reason: 'No account found for this email. Please sign up.' };
  }

  if (store[normalizedEmail] !== pwd) {
    return { ok: false, reason: 'Incorrect password.' };
  }

  return { ok: true, reason: 'Successful login.' };
}

// PUBLIC_INTERFACE
export function hasAnyUsers() {
  /** Returns true if there is at least one user in the localStorage store. */
  const store = readStore();
  return Object.keys(store).length > 0;
}
