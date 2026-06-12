// ─── Keys ────────────────────────────────────────────────────────────────────
const KEY = 'haatza_user';

/**
 * Save user details to sessionStorage.
 * Call this after registration, login, or OTP verification.
 */
export function saveUser({ name, email, phone }) {
  const user = {
    name:  name  || '',
    email: email || '',
    phone: phone || '',
  };
  sessionStorage.setItem(KEY, JSON.stringify(user));
}

/**
 * Retrieve the logged-in user. Returns null if not found.
 */
export function getUser() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clear user on logout.
 */
export function clearUser() {
  sessionStorage.removeItem(KEY);
  sessionStorage.removeItem('pendingEmail');
}