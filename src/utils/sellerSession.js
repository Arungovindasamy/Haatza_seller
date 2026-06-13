const CANONICAL_SELLER_KEY = "__haatza_sellerId";

/**
 * Resolves the logged-in seller's ID from session/local storage, or
 * falls back to HS1380 for local development/testing.
 * @returns {string} The active seller ID.
 */
export const getSellerId = () => {
  if (typeof window === "undefined") return "HS1380";

  const keys = [
    CANONICAL_SELLER_KEY,
    "sellerId",
    "seller_id",
    "user",
    "authUser",
    "currentUser",
  ];

  for (const key of keys) {
    // 1. Session Storage
    const sessionVal = sessionStorage.getItem(key);
    if (sessionVal && sessionVal.trim().length >= 2) {
      const val = sessionVal.trim();
      if (!val.startsWith("{") && !val.startsWith("[")) {
        return val;
      }
      try {
        const obj = JSON.parse(val);
        const id = obj?.sellerId || obj?.id || obj?.uid || obj?.userEmail;
        if (id && typeof id === "string" && id.length >= 2) return id;
      } catch {}
    }

    // 2. Local Storage
    const localVal = localStorage.getItem(key);
    if (localVal && localVal.trim().length >= 2) {
      const val = localVal.trim();
      if (!val.startsWith("{") && !val.startsWith("[")) {
        return val;
      }
      try {
        const obj = JSON.parse(val);
        const id = obj?.sellerId || obj?.id || obj?.uid || obj?.userEmail;
        if (id && typeof id === "string" && id.length >= 2) return id;
      } catch {}
    }
  }

  // 3. Fallback for testing only
  return "HS1380";
};
