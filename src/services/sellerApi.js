import axios from "axios";

const PROFILE_BASE_URL = "https://www.haatzaseller.com/_functions";

/**
 * Checks if a seller profile exists by email or mobile.
 * @param {string} contact 
 * @returns {Promise<any>}
 */
export const checkSeller = async (contact) => {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const isPhone = /^[6-9]\d{9}$/.test(contact);

  if (!isEmail && !isPhone) {
    throw new Error("Enter a valid email address or 10-digit mobile number.");
  }

  const contactType = isEmail ? "email" : "phone";
  const param = `${contactType}=${encodeURIComponent(contact)}`;

  try {
    const response = await axios.get(`${PROFILE_BASE_URL}/checkseller?${param}`, {
      timeout: 10000,
    });
    const data = response.data;

    if (data?.status !== "success") {
      throw new Error(data?.message || "Unexpected response from server.");
    }

    return {
      userExists: data.message.userExists,
      contactType,
      email: data.message.email || "",
      phone: data.message.phone || "",
    };
  } catch (err) {
    console.error("[checkSeller] Error checking contact existence:", err);
    throw new Error(
      err.response?.data?.message || err.message || "Server connection issues. Please try again."
    );
  }
};

/**
 * Fetches the seller metadata profile by email.
 * @param {string} email 
 * @returns {Promise<any>}
 */
export const fetchSellerDetails = async (email) => {
  if (!email) throw new Error("Email is required.");
  try {
    const response = await axios.get(`${PROFILE_BASE_URL}/sellerdata`, {
      params: { email },
      timeout: 10000,
    });
    return response.data;
  } catch (err) {
    console.error("[fetchSellerDetails] Error:", err);
    throw new Error(err.response?.data?.message || "Failed to fetch seller details.");
  }
};
