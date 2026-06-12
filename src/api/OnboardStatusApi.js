const ONBOARD_STATUS_API_URL =
  "https://www.haatzaseller.com/_functions/onboardStatus";

export async function checkOnboardStatus(contact) {
  if (!contact) {
    throw new Error("checkOnboardStatus: contact is required.");
  }

  const trimmed = contact.trim();

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  const isPhone = /^[6-9]\d{9}$/.test(trimmed);

  let queryParam = "";

  if (isEmail) {
    queryParam = `email=${encodeURIComponent(trimmed)}`;
  } else if (isPhone) {
    queryParam = `phone=${encodeURIComponent(trimmed)}`;
  } else {
    throw new Error("Invalid email or phone number.");
  }

  const url = `${ONBOARD_STATUS_API_URL}?${queryParam}`;

  // Always log before fetch so a 400 is immediately diagnosable
  console.log("checkOnboardStatus — contact:", JSON.stringify(trimmed));
  console.log("checkOnboardStatus — detected as:", isEmail ? "email" : isPhone ? "phone" : "UNKNOWN");
  console.log("checkOnboardStatus — calling URL:", url);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(
      `Onboard status API error: ${res.status} ${res.statusText}`
    );
  }


  const data = await res.json();
  console.log("RAW Onboard API Response:", JSON.stringify(data)); // ADD THIS

  // ─── Normalise to a single lowercase string ───────────────────────────────
  // The API may return the status in several different shapes.
  // We extract whatever field carries it, then decide true/false once.

  // Priority 1 – explicit "status" field  e.g. { status: "active" }
  const rawStatus =
  data.message ??          // ← move this FIRST — carries "Active"/"Inactive"
  data.status ??           // ← "success" is not a status value, skip for routing
  data.onboardingStatus ??
  data.sellerStatus ??
  data.onboardStatus ??
  null;

  if (typeof rawStatus === "string") {
    const s = rawStatus.toLowerCase().trim();

    const ACTIVE_VALUES   = new Set(["active", "completed", "complete", "done"]);
    const INACTIVE_VALUES = new Set(["inactive", "incomplete", "pending", "not_completed"]);

    if (ACTIVE_VALUES.has(s))   return true;
    if (INACTIVE_VALUES.has(s)) return false;

    // Unknown string — log it so you can catch new values quickly
    console.warn("checkOnboardStatus: unrecognised status string:", s, "| full response:", data);
    return false;   // treat unknown as incomplete (safer default)
  }

  // Priority 2 – boolean shorthand fields
  if (typeof data.active    === "boolean") return data.active;
  if (typeof data.completed === "boolean") return data.completed;
  if (typeof data.onboarded === "boolean") return data.onboarded;

  // Truly unknown shape
  console.warn("checkOnboardStatus: unknown response shape:", data);
  return false;   // treat unknown as incomplete (safer default)
}