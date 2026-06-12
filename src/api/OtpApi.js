// otpApi.js
const BASE_URL = "https://www.haatza.com/_functions";
const SELLER_BASE_URL = "https://www.haatzaseller.com/_functions";

// ─── Generate OTP ────────────────────────────────────────────────────────────
// Called when OTP screen mounts. Sends OTP to the registered phone number.
// Returns: { status, message }
export const generateOtp = async (phone) => {
  const res = await fetch(`${SELLER_BASE_URL}/generateotp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });

  if (!res.ok) {
    throw new Error("Failed to generate OTP. Please try again.");
  }

  const data = await res.json();

  if (data?.status !== "success") {
    throw new Error(data?.message || "Could not send OTP. Please try again.");
  }

  return data;
};

// ─── Verify OTP ──────────────────────────────────────────────────────────────
// Called when user clicks "Verify OTP". Validates the entered OTP.
// Returns: { status, message }
export const verifyOtp = async (phone, otp) => {
  const res = await fetch(`${SELLER_BASE_URL}/verifyotp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp }),
  });

  if (!res.ok) {
    throw new Error("Verification failed. Please try again.");
  }

  const data = await res.json();

  if (data?.status !== "success") {
    throw new Error(data?.message || "Invalid OTP. Please try again.");
  }

  console.log("verifyOtp raw response:", JSON.stringify(data)); // ← add this temporarily

  return data; // ← ensure full object is returned, not just status
};

// ─── Resend OTP ──────────────────────────────────────────────────────────────
// Called when user clicks "Resend OTP" after the 30-second timer expires.
// Resends the same OTP to the registered phone number.
// Returns: { status, message }
export const resendOtp = async (phone) => {
  const res = await fetch(`${SELLER_BASE_URL}/resendotp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });

  if (!res.ok) {
    throw new Error("Failed to resend OTP. Please try again.");
  }

  const data = await res.json();

  if (data?.status !== "success") {
    throw new Error(data?.message || "Could not resend OTP. Please try again.");
  }

  return data;
};