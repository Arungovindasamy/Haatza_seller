import axios from "axios";
import { resolveWixImage } from "./listingApi";

const isDev = process.env.NODE_ENV === "development";
const BASE_URL = isDev ? "/api/_functions" : "https://www.haatza.com/_functions";

// ─── 1. INVENTORY ENDPOINTS ──────────────────────────────────────────────────

// Fetch inventory list for the seller
export const fetchInventoryData = async (sellerId, page = 1, searchText = "") => {
  if (!sellerId) throw new Error("Seller ID is required.");
  
  try {
    const response = await axios.get(`${BASE_URL}/sellerproductInventory`, {
      params: { sellerId, page, searchText },
      timeout: 15_000,
    });
    
    const data = response.data;
    
    // safe nested resolver for possible response shapes:
    const rawItems =
      data?.inventoryItems ||
      data?.message?.inventoryItems ||
      data?.message?.body?.inventoryItems ||
      data?.message?.data ||
      data?.data ||
      [];
      
    // Print temporary debug console logs as requested
    console.log("SELLER ID:", sellerId);
    console.log("INVENTORY API RESPONSE:", response.data);
    console.log("RAW INVENTORY ITEMS:", rawItems);

    // Map backend items to frontend schema by flattening products & their variants
    const mappedItems = [];
    rawItems.forEach((product, prodIndex) => {
      if (!product) return;
      const pId = product.productId || product.externalId || "";
      const pName = product.productName || product.name || "Unnamed Product";
      
      const media = product.mainMedia || product.mainmedia || product.mainImage || product.image || "";
      const pImg = resolveWixImage(media) || media || "";
      
      const pCat = product.category || product.categoryName || "General";
      const variants = product.variants || [];

      if (variants.length === 0) {
        // Fallback if the product object represents a flat product without variants list
        const id = product.id || product._id || product.variantId || `inv-${prodIndex}-${Date.now()}`;
        const variantName = product.variant || product.variantName || product.size || product.choices?.Size || "Standard";
        const sku = product.sku || `SKU-${id}`;
        const stock = Number(
          product.quantity !== undefined
            ? product.quantity
            : (product.stock?.quantity !== undefined
                ? product.stock.quantity
                : (product.stock !== undefined ? product.stock : (product.inventoryQuantity !== undefined ? product.inventoryQuantity : 0)))
        );
        mappedItems.push({
          id,
          productId: pId,
          name: pName,
          variant: variantName,
          sku,
          stock,
          category: pCat,
          image: pImg,
        });
      } else {
        variants.forEach((v, vIndex) => {
          if (!v) return;
          const id = v.variantId || v.id || v._id || `var-${prodIndex}-${vIndex}-${Date.now()}`;
          // Get size/variant name from choices
          const variantName =
            v.choices?.Size ||
            v.choices?.size ||
            v.variant ||
            v.size ||
            v.variantName ||
            (v.choices ? Object.values(v.choices).join(" / ") : "") ||
            "Standard";
          
          const sku = v.sku || product.sku || `SKU-${id}`;
          const stock = Number(
            v.quantity !== undefined
              ? v.quantity
              : (v.stock?.quantity !== undefined
                  ? v.stock.quantity
                  : (v.stock !== undefined ? v.stock : (v.inventoryQuantity !== undefined ? v.inventoryQuantity : 0)))
          );
          
          mappedItems.push({
            id,
            productId: pId,
            name: pName,
            variant: variantName,
            sku,
            stock,
            category: pCat,
            image: pImg,
          });
        });
      }
    });

    return {
      inventoryItems: mappedItems,
      totalItems: Number(data?.totalItems || mappedItems.length),
    };
  } catch (err) {
    console.error("[fetchInventoryData] Error fetching inventory:", err);
    throw new Error(err.response?.data?.message || "Failed to load inventory from server.");
  }
};

// Update stock count (using increment/decrement endpoint based on delta)
export const updateInventoryStock = async (sellerId, item, newQty) => {
  const delta = newQty - item.stock;
  if (delta === 0) return item;

  const endpoint = delta > 0 ? "incrementInventory" : "decrementInventory";
  const absQty = Math.abs(delta);

  try {
    const response = await axios.post(`${BASE_URL}/${endpoint}`, {
      sellerId,
      productId: item.productId,
      variantId: item.id, // backend variant/inventory row ID
      quantity: absQty,
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
    });

    if (response.data?.status === "error") {
      throw new Error(response.data?.message || "Action failed on server.");
    }

    return {
      ...item,
      stock: newQty,
    };
  } catch (err) {
    console.error(`[updateInventoryStock] Error on ${endpoint}:`, err);
    throw new Error(err.response?.data?.message || `Failed to update quantity on server.`);
  }
};

// ─── 2. WALLET ENDPOINTS ─────────────────────────────────────────────────────

// Fetch wallet balance
export const fetchWalletBalance = async (sellerId) => {
  if (!sellerId) throw new Error("Seller ID is required.");
  
  try {
    const response = await axios.get(`${BASE_URL}/checkWalletBalance`, {
      params: { sellerId },
      timeout: 10_000,
    });
    
    if (response.data?.status === "success") {
      return Number(response.data?.message?.RemainingBalance || 0);
    }
    return 0;
  } catch (err) {
    console.error("[fetchWalletBalance] Error fetching balance:", err);
    throw new Error("Unable to fetch wallet balance.");
  }
};

// Fetch wallet transaction history
export const fetchWalletTransactions = async (sellerId) => {
  if (!sellerId) throw new Error("Seller ID is required.");
  
  try {
    const response = await axios.get(`${BASE_URL}/transactionHistory`, {
      params: { sellerId },
      timeout: 15_000,
    });
    
    const rawTx = response.data?.message?.transactions || [];
    
    // Map to frontend transactions list format
    return rawTx.map((tx) => {
      const isCredit =
        String(tx.type || "").toLowerCase() === "credit" ||
        String(tx.type || "").toLowerCase() === "deposit" ||
        String(tx.type || "").toLowerCase() === "add_funds";

      // Safely parse createdDate/date/createdAt
      let displayDate = "Recent";
      const dateVal = tx.createdDate || tx.date || tx.createdAt;
      if (dateVal) {
        try {
          const d = new Date(dateVal);
          if (!isNaN(d.getTime())) {
            const options = { day: '2-digit', month: 'short', year: 'numeric' };
            displayDate = d.toLocaleDateString('en-GB', options);
          }
        } catch (e) {
          displayDate = String(dateVal);
        }
      }

      return {
        id: tx._id || tx.id || String(Math.random()),
        date: displayDate,
        type: tx.type || "Transaction",
        amount: Number(tx.amount || 0),
        isCredit,
        status: tx.status || "Completed",
      };
    });
  } catch (err) {
    console.error("[fetchWalletTransactions] Error fetching transactions:", err);
    throw new Error("Unable to load transaction records.");
  }
};

// Add funds to wallet balance
export const addFundsToWallet = async (sellerId, amount) => {
  try {
    const response = await axios.post(`${BASE_URL}/addFunds`, {
      sellerId,
      amount: Number(amount),
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
    });
    
    if (response.data?.status === "success") {
      return response.data;
    }
    throw new Error(response.data?.message || "Failed to credit funds.");
  } catch (err) {
    console.error("[addFundsToWallet] Error adding funds:", err);
    throw new Error(err.response?.data?.message || "Failed to complete transaction.");
  }
};

// ─── 3. NOTIFICATIONS ENDPOINTS ──────────────────────────────────────────────

// Fetch notification items
export const fetchNotificationsList = async (sellerId) => {
  if (!sellerId) throw new Error("Seller ID is required.");
  
  try {
    const response = await axios.get(`${BASE_URL}/notifications`, {
      params: { sellerId },
      timeout: 10_000,
    });
    
    const rawNotif = response.data?.message?.data || [];
    
    return rawNotif.map((n) => ({
      id: n._id || n.id || String(Math.random()),
      title: n.title || "Notification Alert",
      message: n.message || n.body || "",
      time: n.time || "Recently",
      read: Boolean(n.read || n.status === "read"),
      type: n.type || "system",
    }));
  } catch (err) {
    console.error("[fetchNotificationsList] Error loading alerts:", err);
    throw new Error("Unable to fetch notifications.");
  }
};

// Mark notification as read or update status
export const updateNotificationStatus = async (sellerId, notificationId, status = "read") => {
  try {
    const response = await axios.post(`${BASE_URL}/updateNotification`, {
      sellerId,
      notificationId,
      status,
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
    });
    return response.data;
  } catch (err) {
    console.error("[updateNotificationStatus] Error updating alert:", err);
    throw new Error("Failed to update notification state.");
  }
};
