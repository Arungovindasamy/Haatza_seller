import { checkSeller } from "./sellerApi";

const BASE_URL = "https://www.haatzaseller.com/_functions";

// ─── Register User ────────────────────────────────────────────────────────────
// Validates uniqueness of email + phone, then registers the new seller.
//
// @param {Object} sellerData
//   - fullName  {string}  Seller's full name
//   - phone     {string}  10-digit Indian mobile number
//   - email     {string}  Valid email address
//   - password  {string}  Minimum 8 characters
//
// Returns: { success: true, message: string } on success
// Throws:  Error with a user-friendly message on any failure
// ─────────────────────────────────────────────────────────────────────────────
export const registerUser = async ({ fullName, phone, email, password }) => {

  // ── 1. Client-side field validation ────────────────────────────────────────
  if (!fullName?.trim()) {
    throw new Error("Please enter your full name.");
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isValidEmail) {
    throw new Error("Please enter a valid email address.");
  }

  const isValidPhone = /^[6-9]\d{9}$/.test(phone);
  if (!isValidPhone) {
    throw new Error("Please enter a valid 10-digit mobile number.");
  }

  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  // ── 2. Check if email is already registered ─────────────────────────────────
  const emailCheck = await checkSeller(email);
  if (emailCheck.userExists) {
    throw new Error("This email is already registered. Please sign in instead.");
  }

  // ── 3. Check if phone is already registered ──────────────────────────────────
  const phoneCheck = await checkSeller(phone);
  if (phoneCheck.userExists) {
    throw new Error("This phone number is already registered. Please sign in instead.");
  }

  // ── 4. Register the new seller ───────────────────────────────────────────────


  const res = await fetch(`${BASE_URL}/registeruser`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: fullName.trim(),
      phone,
      email: email.toLowerCase().trim(),
      password,
    }),
  });

  // ✅ Always read the body first — Wix often returns 400 with a success payload
  let data;
try {
  data = await res.json();
} catch {
  throw new Error("Registration failed. Please try again.");
}

console.log("[RegisterApi] HTTP status:", res.status);
console.log("[RegisterApi] Raw response:", JSON.stringify(data, null, 2));
  // ✅ Trust the body's status field, not the HTTP status code
 // ✅ Trust the body's status field, not the HTTP status code
  if (data?.status === "success") {
    // Response shape: { status: "success", message: { message: "...", sellerId: "HS1476" } }
   const resolvedSellerId =
  data?.message?.sellerId ||
  data?.message?.body?.sellerId ||
  data?.message?.data?.sellerId ||
  data?.message?.SellerID ||
  data?.message?.body?.SellerID ||
  data?.data?.sellerId ||
  data?.data?.SellerID ||
  data?.seller?.sellerId ||
  data?.SellerID ||
  data?.sellerId ||
  "";

    console.group("[RegisterApi] Registration response");
console.log("Full API response:", JSON.stringify(data, null, 2));
console.log("What is being saved to DB:", JSON.stringify({
  fullName: fullName.trim(),
  phone,
  email: email.toLowerCase().trim(),
  password: "***hidden***",
}, null, 2));
console.log("Resolved sellerId:", resolvedSellerId || "❌ NOT FOUND");
console.groupEnd();

    if (resolvedSellerId) {
      localStorage.setItem("sellerId", String(resolvedSellerId));
      sessionStorage.setItem("sellerId", String(resolvedSellerId));
      localStorage.setItem("__haatza_sellerId", String(resolvedSellerId));
      sessionStorage.setItem("__haatza_sellerId", String(resolvedSellerId));
      console.log("[RegisterApi] ✅ sellerId stored:", resolvedSellerId);
    } else {
      console.warn("[RegisterApi] ⚠️ sellerId not in response — will be empty in listing payload");
    }

    return {
      success: true,
      message: data?.message?.message || data?.message || "Account created successfully!",
      sellerId: resolvedSellerId,
    };
  }

  // Only throw if the body also indicates failure
  throw new Error(data?.message || "Registration failed. Please try again.");
};