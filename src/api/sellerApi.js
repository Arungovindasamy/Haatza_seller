import axios from "axios";

const BASE_URL = "https://www.haatzaseller.com/_functions";

// ─── Check Seller (Login) ────────────────────────────────────────────────────
// Checks if a seller exists by email or phone
// Returns: { userExists, contactType, email, phone }
// sellerApi.js

export const checkSeller = async (contact) => {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const isPhone = /^[6-9]\d{9}$/.test(contact);

  if (!isEmail && !isPhone) {
    throw new Error("Enter a valid email address or 10-digit mobile number.");
  }

  const contactType = isEmail ? "email" : "phone";
  const param = `${contactType}=${encodeURIComponent(contact)}`;

  const res = await fetch(`${BASE_URL}/checkseller?${param}`);

  // ✅ Always read body first — Wix can return 400 with a valid payload
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Server error. Please try again.");
  }

  // ✅ Trust body status, not HTTP status code
  if (data?.status !== "success") {
    throw new Error(data?.message || "Unexpected response from server.");
  }

  return {
    userExists: data.message.userExists,
    contactType,
    email: data.message.email || "",
    phone: data.message.phone || "",
  };
};

// ─── Fetch Seller Details ────────────────────────────────────────────────────
// Fetches the seller profile data by email
export const fetchSellerDetails = async (email) => {
  if (!email) throw new Error("Email is required.");
  try {
    const response = await axios.get(`${BASE_URL}/sellerdata`, {
      params: { email },
      timeout: 10000,
    });
    return response.data;
  } catch (err) {
    console.error("[fetchSellerDetails] Error:", err);
    throw new Error(err.response?.data?.message || "Failed to fetch seller details.");
  }
};