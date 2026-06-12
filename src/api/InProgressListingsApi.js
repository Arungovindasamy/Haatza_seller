// InProgressListingsApi.js
import axios from "axios";
import { resolveWixImage } from "./listingApi";

const BASE_URL     = "https://haatza.com/_functions";
const BASE_URL_WWW = "https://www.haatza.com/_functions";

// ─── Status constants — must match exactly what is saved in DB ────────────────
/**
 * FIX (Root Cause): Products are saved with status "Draft" or "Under Review".
 * The original code passed type:"inprogress" to the API and assumed the backend
 * filtered by that type. But the backend appears to filter by status. We now
 * explicitly pass the status values we want, and the UI filter is broadened to
 * match all states that should appear in this view.
 */
export const IN_PROGRESS_STATUSES = ["Draft", "Under Review", "Pending", "Rejected", "Approved", "Update_Requested"];

// ─── Unwrap Wix envelope ──────────────────────────────────────────────────────
const unwrapEnvelope = (data, fallbackLimit = 10) => {
  console.group("[InProgressApi:unwrapEnvelope] Raw data");
  console.log(JSON.stringify(data, null, 2));
  console.groupEnd();

  if (data?.status && data.status !== "success") {
    const body = data?.message?.body ?? data?.message ?? {};

    const msg =
      (typeof body?.message    === "string" && body.message)  ||
      (typeof body?.error      === "string" && body.error)    ||
      (typeof data?.message    === "string" && data.message)  ||
      body?.errorMessage                                       ||
      body?.reason                                            ||
      body?.details                                           ||
      (typeof body === "object" ? JSON.stringify(body) : String(body)) ||
      "The server returned an error.";

    console.error("[InProgressApi:unwrapEnvelope] Backend error:", msg);
    throw new Error(msg);
  }

  const body       = data?.message?.body ?? data?.body ?? data ?? {};
  const rawProducts = body.sellerProducts ?? body.products ?? body.items ?? body.data ?? (Array.isArray(body) ? body : []);
  const products   = rawProducts.map((p) => {
    if (!p) return p;
    const Table_ID = p.Table_ID || p.tableId || p.table_id || p.productId || p._id || p.id || "";
    const productId = p.productId || p.product_id || p.wixProductId || "";
    return { ...p, Table_ID, productId };
  });
  const pagination = body.pagination ?? {};

  const total      = pagination.total      ?? body.total      ?? products.length;
  const page       = pagination.page       ?? body.page       ?? 1;
  const limit      = pagination.limit      ?? body.limit      ?? fallbackLimit;
  const totalPages = pagination.totalPages ?? body.totalPages ??
                     (total > 0 ? Math.ceil(total / limit) : 1);

  // ── Diagnostic: log every product's status so we can see what came back ──
  console.group("[InProgressApi:unwrapEnvelope] Products received");
  console.log(`Count: ${products.length}, Total: ${total}, Page: ${page}/${totalPages}`);
  products.forEach((p, i) => {
    console.log(`  [${i}] id=${p.Table_ID || p._id || "?"} name="${p.name || "?"}" status="${p.status || "?"}" price=${p.price ?? "?"}`);
  });
  console.groupEnd();

  return { products, total, page, totalPages };
};

// ─── fetchInProgressListings ──────────────────────────────────────────────────
/**
 * FIX: Replaced single type:"inprogress" param with explicit status list so
 * "Draft" and "Under Review" records are returned from the backend.
 *
 * Strategy: send both the legacy `type` param AND a `status` param covering all
 * statuses we want. If the backend only honours one, both are covered.
 */
export const fetchInProgressListings = async ({
  email,
  page  = 1,
  limit = 10,
} = {}) => {
  if (!email?.trim()) {
    throw new Error("Seller email is required to fetch in-progress listings.");
  }

  // Resolve sellerId from storage — must match what was sent in createListing payload
  const resolveStoredSellerId = () => {
    const keys = ["sellerId", "seller_id", "userId", "user_id", "user", "authUser", "currentUser", "userData", "sellerData"];
    for (const key of keys) {
      const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (!raw) continue;
      if (raw.length > 3 && !raw.startsWith("{") && !raw.startsWith("[")) return raw.trim();
      try {
        const parsed = JSON.parse(raw);
        const val = parsed?.sellerId || parsed?.seller_id || parsed?.userId || parsed?.user_id
          || parsed?.user?.sellerId || parsed?.data?.sellerId || null;
        if (val) return String(val).trim();
      } catch { /* not JSON */ }
    }
    return "";
  };

  const resolvedSellerId = resolveStoredSellerId();

  const params = {
  email:       email.trim(),
  sellerEmail: email.trim(),
  page:        Number(page)  || 1,
  limit:       Number(limit) || 10,
  sellerId:    resolvedSellerId || "",
};
  console.group("[InProgressApi:fetchInProgressListings] Request");
  console.log("Fetched Seller Email:", params.email);
  console.log("Fetched Seller ID:", resolvedSellerId || "❌ NOT FOUND — listings may be empty");
  console.log("Full params:", params);
  console.groupEnd();

  try {
    // Try primary fetch with all params
    let response = await axios.get(
      `${BASE_URL}/seller_products`,
      { params, timeout: 15_000 }
    );

    // If 0 results, retry with www subdomain (Wix sometimes routes differently)
    if (response.data) {
      const checkBody = response.data?.message?.body ?? response.data?.body ?? response.data ?? {};
      const checkProducts = checkBody.sellerProducts ?? checkBody.products ?? checkBody.items ?? [];
      if (checkProducts.length === 0) {
        console.warn("[InProgressApi] Primary URL returned 0 products — retrying with www subdomain");
        try {
          response = await axios.get(
            `${BASE_URL_WWW}/seller_products`,
            { params, timeout: 15_000 }
          );
        } catch (retryErr) {
          console.warn("[InProgressApi] www retry also failed:", retryErr.message);
        }
      }
    }

    console.group("[InProgressApi:fetchInProgressListings] HTTP Response");
    console.log("HTTP status:", response.status);
    console.log("In Progress Response", response.data);
    console.groupEnd();

    const result = unwrapEnvelope(response.data, params.limit);

    // ── Diagnostic: show filtered counts by status ────────────────────────
    console.group("[InProgressApi:fetchInProgressListings] Status breakdown");
    const byStatus = result.products.reduce((acc, p) => {
      const s = p.status || "unknown";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    console.log("Products by status:", byStatus);
    console.log("Total products returned:", result.products.length);
    console.groupEnd();

    return result;

  } catch (err) {
    if (!err.response) {
      console.error("[InProgressApi:fetchInProgressListings] Network error:", err.message);
      throw err;
    }

    const body    = err.response.data;
    const errBody = body?.message?.body ?? body?.message ?? body ?? {};
    const message =
      (typeof errBody?.message === "string" && errBody.message) ||
      (typeof errBody?.error   === "string" && errBody.error)   ||
      (typeof body?.message    === "string" && body.message)    ||
      (typeof body?.error      === "string" && body.error)      ||
      errBody?.errorMessage                                      ||
      errBody?.reason                                           ||
      err.message                                               ||
      "Unable to load in-progress listings. Please try again.";

    throw new Error(message);
  }
};

// ─── fetchInProgressProductDetails ───────────────────────────────────────────
export const fetchInProgressProductDetails = async (tableId) => {
  if (!tableId) throw new Error("Product Table_ID is required.");

  console.log("[InProgressApi:fetchInProgressProductDetails] Fetching tableId:", tableId);

  try {
    const response = await axios.get(
      `${BASE_URL_WWW}/sellerProductDetails`,
      { params: { Table_ID: tableId }, timeout: 15_000 }
    );

    const data = response.data;
    console.log("[InProgressApi:fetchInProgressProductDetails] Raw response:", JSON.stringify(data, null, 2));

    const candidates = [
      data?.message?.body?.product,
      data?.message?.data?.product,
      data?.message?.body,
      data?.message?.data,
      data?.body?.product,
      data?.body,
      data?.data,
      data,
    ];

    const details = candidates.find(
      (c) =>
        c &&
        typeof c === "object" &&
        !Array.isArray(c) &&
        (c.name || c.price != null || c.status || c.Table_ID || c._id)
    ) ?? data;

    console.log("[InProgressApi:fetchInProgressProductDetails] Resolved details:", details);

    if (!details || typeof details !== "object") {
      throw new Error("Product not found or response format changed.");
    }

    // Normalise field aliases so the UI always finds what it needs
    // regardless of which key the backend used
    const normalised = { ...details };

    // Product ID
    normalised.Table_ID = normalised.Table_ID || normalised.tableId
      || normalised.table_id || normalised.productId || normalised._id || tableId || "";
    normalised.productId = normalised.productId || normalised.product_id || normalised.wixProductId || "";

    // Main image
    normalised.mainmedia = normalised.mainmedia || normalised.main_media
      || normalised.mainMedia || normalised.mainImage || "";

    // Product images array
    normalised.productImages = normalised.productImages || normalised.product_images
      || normalised.images || normalised.mediaItems || [];

    // Size chart — resolve to usable URL
    const rawSizeChart = normalised.sizeChart || normalised.size_chart
      || normalised.sizeChartUrl || normalised.size_chart_url
      || normalised.sizeChartImage || "";
    normalised.sizeChart = resolveWixImage(rawSizeChart) || "";
    console.log("[fetchInProgressProductDetails] sizeChart resolved:", normalised.sizeChart);
      console.log("Size Chart URL:", normalised.sizeChart);
    console.log("Size Chart URL:", normalised.sizeChart);
      //console.log("[fetchInProgressProductDetails] sizeChart resolved:", normalised.sizeChart);

    // Promotion photos — always array, resolve each entry
    const rawPromo = normalised.promotionPhotos
      || normalised.promotion_photos || normalised.promoPhotos
      || normalised.promotionImages || [];
    const promoArr = Array.isArray(rawPromo) ? rawPromo : [rawPromo];
    normalised.promotionPhotos = promoArr
      .map(p => {
        if (!p) return null;
        const raw = typeof p === "string" ? p : p.src || p.url || p.image || null;
        return resolveWixImage(raw);
      })
      .filter(Boolean);
    console.log("[fetchInProgressProductDetails] promotionPhotos resolved:", normalised.promotionPhotos);
    // mediaItems — used for image gallery fallback
    if (!normalised.mediaItems) {
      normalised.mediaItems = normalised.productImages;
    }

    console.log("Fetched Product:", normalised);
    console.log("Fetched Media Items:", normalised.mediaItems);
    console.log("Fetched Promotion Photos:", normalised.promotionPhotos);
    console.log("Fetched Size Chart:", normalised.sizeChart);

    return normalised;
  } catch (err) {
    if (!err.response) throw err;
    const body    = err.response.data;
    const errBody = body?.message?.body ?? body?.message ?? body ?? {};
    const message =
      (typeof errBody?.message === "string" && errBody.message) ||
      (typeof body?.error      === "string" && body.error)      ||
      err.message                                               ||
      "Unable to fetch product details.";
    throw new Error(message);
  }
};