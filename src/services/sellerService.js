import axios from "axios";

// Safely check environment for both Vite and Webpack/CRA compatibility
const checkDev = () => {
  try {
    if (import.meta.env && import.meta.env.DEV !== undefined) {
      return import.meta.env.DEV;
    }
  } catch {}
  try {
    if (process.env && process.env.NODE_ENV === "development") {
      return true;
    }
  } catch {}
  return typeof window !== "undefined" && window.location.hostname === "localhost";
};

const API_BASE_URL = checkDev()
  ? "/api/_functions"
  : "https://www.haatza.com/_functions";

// ─── SELLER SERVICE API ENDPOINTS ────────────────────────────────────────────
const SELLER_PRODUCT_INVENTORY_API = `${API_BASE_URL}/sellerproductInventory`;
const INCREMENT_INVENTORY_API = `${API_BASE_URL}/incrementInventory`;
const DECREMENT_INVENTORY_API = `${API_BASE_URL}/decrementInventory`;
const CHECK_WALLET_BALANCE_API = `${API_BASE_URL}/checkWalletBalance`;
const TRANSACTION_HISTORY_API = `${API_BASE_URL}/transactionHistory`;
const ADD_FUNDS_API = `${API_BASE_URL}/addFunds`;
const NOTIFICATIONS_API = `${API_BASE_URL}/notifications`;
const UPDATE_NOTIFICATION_API = `${API_BASE_URL}/updateNotification`;

export const sellerService = {
  fetchInventoryData: async (sellerId, page = 1, searchText = "") => {
    const response = await axios.get(SELLER_PRODUCT_INVENTORY_API, {
      params: { sellerId, page, searchText },
      timeout: 15000,
    });
    return response.data;
  },

  incrementInventory: async (sellerId, productId, variantId, quantity) => {
    const response = await axios.post(
      INCREMENT_INVENTORY_API,
      { sellerId, productId, variantId, quantity },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    return response.data;
  },

  decrementInventory: async (sellerId, productId, variantId, quantity) => {
    const response = await axios.post(
      DECREMENT_INVENTORY_API,
      { sellerId, productId, variantId, quantity },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    return response.data;
  },

  checkWalletBalance: async (sellerId) => {
    const response = await axios.get(CHECK_WALLET_BALANCE_API, {
      params: { sellerId },
      timeout: 10000,
    });
    return response.data;
  },

  getTransactionHistory: async (sellerId) => {
    const response = await axios.get(TRANSACTION_HISTORY_API, {
      params: { sellerId },
      timeout: 15000,
    });
    return response.data;
  },

  addFunds: async (sellerId, amount) => {
    const response = await axios.post(
      ADD_FUNDS_API,
      { sellerId, amount: Number(amount) },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    return response.data;
  },

  getNotifications: async (sellerId) => {
    const response = await axios.get(NOTIFICATIONS_API, {
      params: { sellerId },
      timeout: 10000,
    });
    return response.data;
  },

  updateNotificationStatus: async (sellerId, notificationId, status = "read") => {
    const response = await axios.post(
      UPDATE_NOTIFICATION_API,
      { sellerId, notificationId, status },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    return response.data;
  },
};

export {
  SELLER_PRODUCT_INVENTORY_API,
  INCREMENT_INVENTORY_API,
  DECREMENT_INVENTORY_API,
  CHECK_WALLET_BALANCE_API,
  TRANSACTION_HISTORY_API,
  ADD_FUNDS_API,
  NOTIFICATIONS_API,
  UPDATE_NOTIFICATION_API,
};
