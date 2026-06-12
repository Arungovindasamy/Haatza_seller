// MyListingsApi.js
import axios from "axios";
import { resolveWixImage } from "./listingApi";

const MY_LISTINGS_BASE     = "https://haatza.com/_functions";
const PRODUCT_DETAILS_BASE = "https://www.haatza.com/_functions";

// ─── Unwrap Wix envelope ──────────────────────────────────────────────────────
const unwrapEnvelope = (data, fallbackLimit = 10) => {
  console.log("[unwrapEnvelope] Raw data:", JSON.stringify(data, null, 2));

  if (data?.status && data.status !== "success") {
    const body = data?.message?.body ?? data?.message ?? {};
    const msg =
      (typeof body?.message === "string" && body.message)     ||
      (typeof body?.error   === "string" && body.error)       ||
      (typeof data?.message === "string" && data.message)     ||
      body?.errorMessage                                       ||
      body?.reason                                            ||
      body?.details                                           ||
      (typeof body === "object" ? JSON.stringify(body) : String(body)) ||
      "The server returned an error.";
    console.error("[unwrapEnvelope] Backend error:", msg, "| Full body:", body);
    throw new Error(msg);
  }

  const body       = data?.message?.body ?? data?.body ?? data ?? {};
  const rawProducts = body.sellerProducts ?? body.products ?? body.items ?? [];
  const products   = rawProducts.map((p) => {
    if (!p) return p;
    const Table_ID = p.Table_ID || p.tableId || p.table_id || p.productId || p._id || p.id || "";
    return {
      ...p,
      Table_ID,
      mainmedia: resolveWixImage(p.mainmedia || p.main_media || p.mainMedia || p.mainImage || "") || "",
    };
  });
  const pagination = body.pagination ?? {};

  const total      = pagination.total      ?? body.total      ?? products.length;
  const page       = pagination.page       ?? body.page       ?? 1;
  const limit      = pagination.limit      ?? body.limit      ?? fallbackLimit;
  const totalPages = pagination.totalPages ?? body.totalPages ??
                     (total > 0 ? Math.ceil(total / limit) : 1);

  console.log("[unwrapEnvelope] Success:", { products: products.length, total, page, totalPages });
  return { products, total, page, totalPages };
};

// ─── fetchSellerListings ──────────────────────────────────────────────────────
export const fetchSellerListings = async ({
  email,
  page  = 1,
  limit = 10,
  type,
} = {}) => {
  if (!email?.trim()) {
    throw new Error("Seller email is required to fetch listings.");
  }

  const params = {
    email: email.trim(),
    page:  Number(page)  || 1,
    limit: Number(limit) || 10,
  };
  if (type) params.type = type;

  console.log("[fetchSellerListings] Params:", params);

  try {
    const response = await axios.get(
      `${MY_LISTINGS_BASE}/seller_products`,
      { params, timeout: 15_000 }
    );
    console.log("[fetchSellerListings] HTTP status:", response.status);
    return unwrapEnvelope(response.data, params.limit);

  } catch (err) {
    if (!err.response) {
      console.error("[fetchSellerListings] Network error:", err.message);
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
      err.message                                               ||
      "Unable to load listings. Please try again.";
    throw new Error(message);
  }
};

// ─── fetchProductDetails ──────────────────────────────────────────────────────
export const fetchProductDetails = async (tableId) => {
  if (!tableId) throw new Error("Product Table_ID is required.");

  try {
    const response = await axios.get(
      `${PRODUCT_DETAILS_BASE}/sellerProductDetails`,
      { params: { Table_ID: tableId }, timeout: 15_000 }
    );

    const data = response.data;
    console.log("[fetchProductDetails] Raw response:", JSON.stringify(data, null, 2));

    const candidates = [
      data?.message?.body?.product,
      data?.message?.body,
      data?.body?.product,
      data?.body,
      data,
    ];

    const details = candidates.find(
      (c) =>
        c &&
        typeof c === "object" &&
        !Array.isArray(c) &&
        (c.name || c.price != null || c.status || c.Table_ID)
    ) ?? data;

    console.log("[fetchProductDetails] Resolved details:", details);

    if (!details || typeof details !== "object") {
      throw new Error("Product not found or response format changed.");
    }

    const normalised = { ...details };

    normalised.Table_ID = normalised.Table_ID || normalised.tableId
      || normalised.table_id || normalised.productId || normalised._id || "";

    normalised.mainmedia = normalised.mainmedia || normalised.main_media
      || normalised.mainMedia || normalised.mainImage || "";

    normalised.productImages = normalised.productImages || normalised.product_images
      || normalised.images || normalised.mediaItems || [];

    const rawSizeChart = normalised.sizeChart || normalised.size_chart
      || normalised.sizeChartUrl || normalised.size_chart_url
      || normalised.sizeChartImage || "";
    normalised.sizeChart = resolveWixImage(rawSizeChart) || "";

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
