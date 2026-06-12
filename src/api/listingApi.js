const BASE = "https://haatza.com/_functions";
const BASE_WWW = "https://www.haatza.com/_functions";

// ── Helpers ────────────────────────────────────────────────────────────────

const getSellerPinCode = () => {
  const CACHE_KEY = "__haatza_sellerPinCode";
  const cached =
    sessionStorage.getItem(CACHE_KEY) ||
    localStorage.getItem(CACHE_KEY);
  if (cached && /^\d{6}$/.test(cached.trim())) {
    console.log("[listingApi:getSellerPinCode] ✅ From profile cache:", cached.trim());
    return cached.trim();
  }

  const plainKeys = ["sellerPinCode", "pinCode", "pincode", "seller_pincode"];
  for (const key of plainKeys) {
    const val = sessionStorage.getItem(key);
    if (val && /^\d{6}$/.test(val.trim())) return val.trim();
  }
  for (const key of plainKeys) {
    const val = localStorage.getItem(key);
    if (val && /^\d{6}$/.test(val.trim())) return val.trim();
  }

  const jsonKeys   = ["user", "authUser", "currentUser", "userData", "sellerData"];
  const pinFields  = ["pinCode", "pincode", "sellerPinCode", "seller_pincode"];
  for (const store of [sessionStorage, localStorage]) {
    for (const key of jsonKeys) {
      const raw = store.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        for (const field of pinFields) {
          const val = parsed?.[field] || parsed?.user?.[field] || parsed?.data?.[field];
          if (val && /^\d{6}$/.test(String(val).trim())) return String(val).trim();
        }
      } catch { /* not JSON */ }
    }
  }

  console.error("[listingApi:getSellerPinCode] ❌ pinCode not found — using fallback 000000");
  return "000000";
};

const getSellerId = () => {
  const CACHE_KEY = "__haatza_sellerId";
  const cached =
    sessionStorage.getItem(CACHE_KEY) ||
    localStorage.getItem(CACHE_KEY);
  if (cached && cached.trim().length > 2) {
    console.log("[listingApi:getSellerId] ✅ From profile cache:", cached.trim());
    return cached.trim();
  }

  const plainKeys = ["sellerId", "seller_id", "userId", "user_id"];
  for (const key of plainKeys) {
    const val = sessionStorage.getItem(key);
    if (val && val.trim().length > 2 && !val.startsWith("{")) return val.trim();
  }
  for (const key of plainKeys) {
    const val = localStorage.getItem(key);
    if (val && val.trim().length > 2 && !val.startsWith("{")) return val.trim();
  }

  const jsonKeys       = ["user", "authUser", "currentUser", "userData", "sellerData", "auth", "session"];
  const sellerIdFields = ["sellerId", "seller_id", "userId", "user_id"];
  for (const store of [sessionStorage, localStorage]) {
    for (const key of jsonKeys) {
      const raw = store.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        for (const field of sellerIdFields) {
          const found = parsed?.[field] || parsed?.user?.[field] || parsed?.data?.[field];
          if (found && String(found).trim().length > 2) return String(found).trim();
        }
      } catch { /* not JSON */ }
    }
  }

  console.error("[listingApi:getSellerId] ❌ sellerId not found");
  return "";
};

export const resolveSellerEmailForApi = () => {
  const keys = [
    "pendingEmail", "userEmail", "email", "sellerEmail",
    "user_email", "seller_email", "currentUserEmail",
    "user", "authUser", "currentUser", "userData", "sellerData",
    "auth", "session", "loginData", "accountData",
  ];
  const emailFields = [
    "email", "userEmail", "sellerEmail", "user_email",
    "seller_email", "emailAddress", "loginEmail",
  ];
  const isValidEmail = (v) => v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

  for (const key of keys) {
    const sessionVal = sessionStorage.getItem(key);
    if (sessionVal) {
      if (isValidEmail(sessionVal)) return sessionVal.trim().toLowerCase();
      try {
        const parsed = JSON.parse(sessionVal);
        for (const field of emailFields) {
          if (isValidEmail(parsed?.[field])) return String(parsed[field]).trim().toLowerCase();
        }
      } catch { /* not JSON */ }
    }

    const localVal = localStorage.getItem(key);
    if (localVal) {
      if (isValidEmail(localVal)) return localVal.trim().toLowerCase();
      try {
        const parsed = JSON.parse(localVal);
        for (const field of emailFields) {
          if (isValidEmail(parsed?.[field])) return String(parsed[field]).trim().toLowerCase();
        }
        for (const nest of ["user", "data", "account", "seller", "profile"]) {
          if (parsed?.[nest] && typeof parsed[nest] === "object") {
            for (const field of emailFields) {
              if (isValidEmail(parsed[nest][field])) {
                return String(parsed[nest][field]).trim().toLowerCase();
              }
            }
          }
        }
      } catch { /* not JSON */ }
    }
  }
  console.warn("[listingApi:resolveSellerEmailForApi] email not found in storage");
  return "";
};

const toWixSrc = (url) => {
  if (!url) return null;
  if (url.startsWith("wix:image://")) return url;
  if (!url.startsWith("http")) return null;
  const wixMatch = url.match(/\/media\/([a-zA-Z0-9_~.-]+)/);
  if (!wixMatch) return null;
  const fileId = wixMatch[1];
  const parts = url.split("/");
  const fileName = parts[parts.length - 1].split("?")[0] || "image.jpg";
  return `wix:image://v1/${fileId}/${fileName}#originWidth=800&originHeight=800`;
};

export const resolveWixImage = (img) => {
  if (!img) return null;
  const raw =
    typeof img === "string"
      ? img
      : img.src || img.url || img.image || img.imageUrl || null;
  if (!raw) return null;
  if (raw.startsWith("data:")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    if (raw.includes("static.wixstatic.com/media/")) {
      const parts = raw.split("static.wixstatic.com/media/");
      if (parts.length > 1) {
        const pathPart = parts[1].split("?")[0].split("#")[0];
        const pathSegments = pathPart.split("/");
        let fileId = pathSegments[0];
        if (pathSegments.length > 1) {
          if (!fileId.includes(".") && pathSegments[1].includes(".")) {
            const ext = pathSegments[1].split(".").pop();
            fileId = `${fileId}.${ext}`;
          }
        }
        return `https://static.wixstatic.com/media/${fileId}`;
      }
    }
    return raw;
  }
  if (raw.startsWith("wix:image://")) {
    const withoutScheme  = raw.replace(/^wix:image:\/\//, "");
    const withoutVersion = withoutScheme.replace(/^v1\//, "");
    const hashIdx  = withoutVersion.indexOf("#");
    const pathPart = hashIdx !== -1 ? withoutVersion.substring(0, hashIdx) : withoutVersion;
    const pathSegments = pathPart.split("/");
    let fileId   = pathSegments[0];
    let fileName = pathSegments[1] || "";
    if (!fileId || fileId.length > 200 || fileId.includes(" ")) return null;
    if (fileId.includes(".")) {
      return `https://static.wixstatic.com/media/${fileId}`;
    }
    if (fileName && fileName.includes(".")) {
      const ext = fileName.split(".").pop();
      return `https://static.wixstatic.com/media/${fileId}.${ext}`;
    }
    return `https://static.wixstatic.com/media/${fileId}~mv2.jpg`;
  }
  return null;
};

export const buildMediaItems = (images = []) => {
  return images
    .filter((img) => img.mediaUrl || img.url || img.src)
    .map((img) => {
      const url = img.mediaUrl || img.url || img.src || "";
      
      let parsedWixResponse = null;
      if (img.wixResponse) {
        if (typeof img.wixResponse === "object") {
          parsedWixResponse = img.wixResponse;
        } else if (typeof img.wixResponse === "string") {
          try {
            parsedWixResponse = JSON.parse(img.wixResponse);
          } catch {
            // Not a JSON string
          }
        }
      }

      const wixSrc =
        img.wixSrc ||
        parsedWixResponse?.src ||
        (url.startsWith("wix:image://") ? url : toWixSrc(url));
      
      let fileId = "";
      if (wixSrc && wixSrc.startsWith("wix:image://")) {
        const withoutScheme = wixSrc.replace(/^wix:image:\/\//, "");
        const withoutVersion = withoutScheme.replace(/^v1\//, "");
        fileId = withoutVersion.split("/")[0] || "";
      }
      
      if (!fileId) {
        const parts = url.split("/");
        fileId = parts[parts.length - 1].split("?")[0] || "image.jpg";
      }

      return {
        description: "",
        id: fileId,
        src: wixSrc || url,
        type: "image",
      };
    });
};

export const buildPromotionPhotos = (promotionImage) => {
  if (!promotionImage) return [];
  const url = promotionImage.url || promotionImage.mediaUrl || promotionImage.src || "";
  if (!url) return [];

  console.log("[buildPromotionPhotos] Input URL type:", url.startsWith("data:") ? "base64" : url.startsWith("wix:") ? "wix" : "https");

  if (url.startsWith("data:")) {
    const fileName = promotionImage.name || "promo.jpg";
    return [
      {
        description: "",
        id: fileName,
        src: url,
        type: "image",
      },
    ];
  }

  let parsedWixResponse = null;
  if (promotionImage.wixResponse) {
    if (typeof promotionImage.wixResponse === "object") {
      parsedWixResponse = promotionImage.wixResponse;
    } else if (typeof promotionImage.wixResponse === "string") {
      try {
        parsedWixResponse = JSON.parse(promotionImage.wixResponse);
      } catch {
        // Not a JSON string
      }
    }
  }

  const wixSrc =
    promotionImage.wixSrc ||
    parsedWixResponse?.src ||
    (url.startsWith("wix:image://") ? url : toWixSrc(url));

  let fileId = "";
  if (wixSrc && wixSrc.startsWith("wix:image://")) {
    const withoutScheme = wixSrc.replace(/^wix:image:\/\//, "");
    const withoutVersion = withoutScheme.replace(/^v1\//, "");
    fileId = withoutVersion.split("/")[0] || "";
  }

  if (!fileId) {
    const parts = url.split("/");
    fileId = parts[parts.length - 1].split("?")[0] || "promo.jpg";
  }

  return [
    {
      description: "",
      id: fileId,
      src: wixSrc || url,
      type: "image",
    },
  ];
};

export const buildDiscount = (formData, discountType = "percent") => {
  if (!formData.onSale || !formData.discountPercent) return {};
  const val = parseFloat(formData.discountPercent);
  if (isNaN(val) || val <= 0) return {};
  if (discountType === "flat") {
    return {
      type: "AMOUNT",
      value: val,
    };
  } else {
    const price = parseFloat(formData.price) || 0;
    const amount = (price * val) / 100;
    return {
      type: "AMOUNT",
      value: amount,
    };
  }
};

export const resolveProductReturn = (val) => {
  if (!val) return "7 Days Easy Return";
  const mapped = {
    return:             "7 Days Easy Return",
    no_return:          "No Return",
    exchange:           "7 Days Exchange",
    return_or_exchange: "7 Days Return or Exchange",
  }[val] || val;
  return mapped.replace(/\breturn\b/g, "Return");
};

export const buildAdditionalInfoSections = (specValues = {}, optionKeys = new Set(), specFieldsList = []) => {
  const sections = [];
  if (specFieldsList && specFieldsList.length > 0) {
    for (const field of specFieldsList) {
      const key = field.fieldId || field.title;
      const value = specValues[key];
      if (value === undefined || value === null || value === "") continue;
      if (value instanceof File) continue;
      if (typeof value === "object" && (value.isExisting || value.url || value.mediaUrl || value.src)) continue;
      const keyLower = key.toLowerCase();
      if (
        keyLower.includes("sizechart") || keyLower.includes("size_chart") ||
        keyLower.includes("size chart") || keyLower.includes("upload")
      ) continue;
      if (value === "__PENDING_FILE__") continue;
      const display = Array.isArray(value) ? value.join(", ") : String(value);
      if (!display) continue;
      sections.push({ [field.title]: display });
    }
    console.group("[listingApi:buildAdditionalInfoSections] === STORED IN DB (via specFieldsList) ===");
    console.log("Input specValues:", specValues);
    console.log("Result (DB format):", JSON.stringify(sections, null, 2));
    console.groupEnd();
    return sections;
  }

  // Fallback: original logic
  for (const [key, value] of Object.entries(specValues)) {
    if (optionKeys.has(key)) continue;
    if (value === undefined || value === null || value === "") continue;
    if (value instanceof File) continue;
    // Skip size chart objects (they go into sizeChart field, not additionalInfoSections)
    if (typeof value === "object" && (value.isExisting || value.url || value.mediaUrl || value.src)) continue;
    const keyLower = key.toLowerCase();
    if (
      keyLower.includes("sizechart") || keyLower.includes("size_chart") ||
      keyLower.includes("size chart") || keyLower.includes("upload")
    ) continue;
    if (value === "__PENDING_FILE__") continue;
    const display = Array.isArray(value) ? value.join(", ") : String(value);
    if (!display) continue;
    sections.push({ [key]: display });
  }
  console.group("[listingApi:buildAdditionalInfoSections] === STORED IN DB (fallback) ===");
  console.log("Input specValues:", specValues);
  console.log("Skipped optionKeys:", [...optionKeys]);
  console.log("Result (DB format):", JSON.stringify(sections, null, 2));
  console.groupEnd();
  return sections;
};

export const buildProductOptions = (optionFields = [], specValues = {}, colourImages = {}, confirmedColors = []) => {
  const options = {};
  for (const field of optionFields) {
    const key = field.fieldId || field.title;
    const val = specValues[key];
    const isColour = field.title.toLowerCase() === "color" || 
                     field.title.toLowerCase() === "colour" ||
                     (field.elementType || "").toLowerCase() === "color picker";

    if (isColour) {
      const colorList = confirmedColors.length > 0 ? confirmedColors : [];
      const selected = Array.isArray(val) ? val : (val ? [val] : []);
      const finalList = colorList.length > 0 ? colorList : selected.map(v => ({ name: v, hex: v }));
      if (finalList.length === 0) continue;

      options[field.title] = {
        optionType: "color",
        name:       field.title,
        choices: finalList.map(c => {
          const colorName = c.name || c;
          const colorHex  = c.hex  || c;
          const choice = {
            description: colorName,
            value:       colorHex,
          };
          const img = colourImages[colorName];
          if (img) {
            const urls = Array.isArray(img)
              ? img.filter(Boolean)
              : typeof img === "string"
                ? [img]
                : img instanceof File
                  ? []
                  : [(img?.url || img?.mediaUrl || img?.src || "")].filter(Boolean);
            if (urls.length > 0) {
              choice.mediaItems = urls.map(url => ({
                id:   url.split("/").pop()?.split("?")[0] || colorName,
                src:  url,
                type: "image",
              }));
            }
          }
          return choice;
        }),
      };
    } else {
      if (!val) continue;
      const selected = Array.isArray(val) ? val : [val];
      if (selected.length === 0) continue;
      options[field.title] = {
        optionType: "drop_down",
        name:       field.title,
        choices: selected.map(v => ({
          description: String(v),
          value:       String(v),
        })),
      };
    }
  }

  console.group("[listingApi:buildProductOptions] === STORED IN DB ===");
  console.log("optionFields:", optionFields.map(f => ({ title: f.title, fieldId: f.fieldId })));
  console.log("confirmedColors:", confirmedColors);
  console.log("colourImages keys:", Object.keys(colourImages));
  console.log("Result (DB format):", JSON.stringify(options, null, 2));
  console.groupEnd();
  return options;
};

export const buildVarientPrice = (variants = [], variantPrices = {}, basePrice = 0) => {
  if (variants.length === 0) return {};
  const base = parseFloat(basePrice) || 0;
  const products = variants.map((v) => {
    const priceData = variantPrices[v.key];
    const finalPrice = base + (parseFloat(priceData?.appliedDiff ?? 0) || 0);
    const choices = {};
    if (v.color) choices["Color"] = v.color;
    if (v.optionLabel) choices[v.optionField] = v.optionLabel;
    return {
      variantInfo: [
        {
          choices,
          price: finalPrice,
        },
      ],
    };
  });
  return { products };
};

export const resolveSizeChartUrl = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    if (value.trim() === "__PENDING_FILE__" || value.trim() === "") return "";
    return value.trim();
  }

  if (value instanceof File) {
    console.warn("[resolveSizeChartUrl] Raw File object reached payload builder — skipping gracefully");
    return "";
  }

  if (typeof value === "object") {
    const candidateUrl =
      value.url ||
      value.mediaUrl ||
      value.src ||
      value.imageUrl ||
      value.fileUrl ||
      (value.preview && !value.preview.startsWith("blob:") ? value.preview : "");

    if (typeof candidateUrl === "string" && candidateUrl.trim() !== "__PENDING_FILE__") {
      return candidateUrl.trim();
    }
  }

  return "";
};

// ── Settlement Summary ──────────────────────────────────────────────────────

export const fetchSettlementSummary = async ({
  orderAmount,
  categoryId,
  deliveryCharges,
  shippingWeight,
  sellerPinCode,
}) => {
  const resolvedPin = sellerPinCode || getSellerPinCode();
  console.group("[fetchSettlementSummary] Params diagnostics");
  console.log("orderAmount    :", orderAmount,     "→", String(orderAmount || 0));
  console.log("categoryId     :", categoryId,      "→", String(categoryId || ""));
  console.log("deliveryCharges:", deliveryCharges, "→", String(deliveryCharges || false));
  console.log("shippingWeight :", shippingWeight,  "→", String(shippingWeight || 0));
  console.log(
    "sellerPinCode  :", resolvedPin,
    resolvedPin === "000000" ? "⚠️  USING FALLBACK" : "✓"
  );
  console.groupEnd();

  const params = new URLSearchParams({
    orderAmount:     String(orderAmount || 0),
    categoryId:      String(categoryId || ""),
    deliveryCharges: String(deliveryCharges || false),
    shippingWeight:  String(shippingWeight || 0),
    sellerPinCode:   resolvedPin,
  });

  const url = `${BASE_WWW}/settlementsummary?${params.toString()}`;
  console.log("[fetchSettlementSummary] Request URL:", url);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Settlement API error (${res.status})`);
  const data = await res.json();
  console.log("[fetchSettlementSummary] Raw response:", data);

  const body =
    data?.message?.body ??
    data?.message?.data ??
    data?.body          ??
    data?.data          ??
    (typeof data?.message === "object" ? data.message : null) ??
    data               ??
    {};
  console.log("[fetchSettlementSummary] Resolved body:", body);

  const toNum = (v) => (v != null && !isNaN(Number(v)) ? Number(v) : 0);

  console.log("Settlement Summary Response", { status: data?.status, message: body });
  console.log("[fetchSettlementSummary] Raw body keys:", Object.keys(body));
  console.log("[fetchSettlementSummary] Raw body values:", body);

  const result = {
    sellingPrice:     toNum(body.sellingPrice     ?? body.sellingprice     ?? body.selling_price  ?? body.orderAmount),
    productGST:       toNum(body.productGST       ?? body.gst              ?? body.product_gst    ?? body.GST ?? body.gstAmount ?? body.gst_amount),
    tcs:              toNum(body.tcsAmount        ?? body.tcs              ?? body.TCS            ?? body.tax_collected ?? body.TCSAmount),
    tds:              toNum(body.tdsAmount        ?? body.tds              ?? body.TDS            ?? body.tds_amount ?? body.TDSAmount),
    commission:       toNum(body.commission       ?? body.Commission       ?? body.platformCommission ?? body.platform_commission ?? body.haatzaCommission),
    gstOnCommission:  toNum(body.gstOnCommission  ?? body.gstOnPlatformCommission ?? body.commissionGst ?? body.platformCommissionGst ?? body.gstOnPlatformCommission ?? body.gst_on_commission),
    pgCharges:        toNum(body.pgCharges        ?? body.paymentGatewayCharges ?? body.pgChargesAmount ?? body.pg_charges ?? body.pgFee ?? body.pg_fee ?? body.paymentGatewayFee),
    gstOnPgCharges:   toNum(body.gstOnPgCharges   ?? body.gstOnPaymentGatewayCharges ?? body.pgChargesGst ?? body.gst_on_pg_charges),
    shippingFee:      toNum(body.approxShippingFee ?? body.shippingFee     ?? body.shipping        ?? body.shippingCharge ?? body.shipping_fee ?? body.approxShipping),
    gstOnShippingFee: toNum(body.gstOnShippingFee ?? body.gst_on_shipping_fee ?? body.shippingFeeGst ?? body.gstOnShipping),
    fixedFee:         toNum(body.fixedFee         ?? body.fixed_fee        ?? body.fixedCharges   ?? body.fixed_charges),
    handlingFee:      toNum(body.handlingFee      ?? body.handling_fee     ?? body.handlingCharges ?? body.handling_charges),
    totalDebit:       toNum(body.totalDebit       ?? body.debit            ?? body.totalDeductions ?? body.total_debit ?? body.totalDeductions),
    settlementAmount: toNum(body.settlementAmount ?? body.approxSettlementAmount ?? body.netAmount ?? body.netSettlement ?? body.approxSettlement ?? body.settlement_amount),
    note:             body.note ?? body.message_note ?? body.noteText ?? "",
    raw: body,
  };

  console.log("[fetchSettlementSummary] Parsed result:", result);
  return result;
};

// ── Create Listing ──────────────────────────────────────────────────────────

export const createListing = async (payload) => {
  const safePayload = typeof payload === "string" ? JSON.parse(payload) : payload;

  console.group("[createListing] Request diagnostics");
  console.log("Seller Listing Payload", JSON.parse(JSON.stringify(safePayload)));
  console.log("Saved Seller ID", safePayload.sellerId);
  console.log("Status being sent:", safePayload.status);
  console.log("Seller email (from storage):", resolveSellerEmailForApi());
  console.groupEnd();

  console.log("mediaItems length:", safePayload.mediaItems?.length);
  console.log("promotionPhotos length:", safePayload.promotionPhotos?.length);
  console.log("sizeChart:", safePayload.sizeChart);

  const res = await fetch(`${BASE}/sellerlisting`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(safePayload),
  });

  let data = {};
  try { data = await res.json(); } catch { /* non-JSON */ }

  console.group("[createListing] Response diagnostics");
  console.log("HTTP status:", res.status);
  console.log("Seller Listing Response", JSON.parse(JSON.stringify(data)));
  console.log("Response status field:", data?.status);
  console.log("Response _id:", data?.message?.data?._id ?? data?.data?._id ?? data?._id ?? "NOT FOUND");
  console.log("Response saved status:", data?.message?.data?.status ?? data?.data?.status ?? data?.status ?? "NOT FOUND");
  console.log("Response sellerId:", data?.message?.data?.sellerId ?? data?.data?.sellerId ?? "NOT FOUND");
  console.groupEnd();

  if (!res.ok) {
    const errBody = data?.message?.body ?? data?.message ?? data ?? {};
    const msg = errBody?.message || errBody?.error || `Create listing failed (${res.status})`;
    console.error("[createListing] API FAILED:", msg, "| Full error body:", JSON.stringify(errBody));
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  const body =
    data?.message?.data ??
    data?.message?.body ??
    data?.body          ??
    data               ??
    {};

  if (data?.status && data.status !== "success") {
    const msg = body?.message || body?.error || "Create listing failed.";
    console.error("[createListing] Backend returned non-success:", data.status, msg);
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  console.log("[createListing] Resolved body:", body);
  console.log("[createListing] Created record _id:", body?._id ?? "MISSING");
  console.log("[createListing] Created record status:", body?.status ?? "MISSING");
  console.log("[createListing] Created record sellerId:", body?.sellerId ?? "MISSING");

  return body;
};

// ── Update Listing ──────────────────────────────────────────────────────────

export const updateListing = async (payload) => {
  const safePayload = typeof payload === "string" ? JSON.parse(payload) : payload;

  console.group("[updateListing] Request diagnostics");
  console.log("Update Listing Payload", JSON.parse(JSON.stringify(safePayload)));
  console.log("Saved Seller ID", safePayload.sellerId || safePayload.Id);
  console.log("Status being sent:", safePayload.status);
  console.groupEnd();

  console.log("mediaItems length:", safePayload.mediaItems?.length);
  console.log("promotionPhotos length:", safePayload.promotionPhotos?.length);
  console.log("sizeChart:", safePayload.sizeChart);

  const res = await fetch(`${BASE}/updateSellerProduct`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(safePayload),
  });

  let data = {};
  try { data = await res.json(); } catch { /* non-JSON */ }

  console.group("[updateListing] Response diagnostics");
  console.log("HTTP status:", res.status);
  console.log("Update Listing Response", data);
  console.log("Response status field:", data?.status);
  console.groupEnd();

  if (!res.ok) {
    const errBody = data?.message?.body ?? data?.message ?? data ?? {};
    const msg = errBody?.message || errBody?.error || `Update listing failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  const body = data?.message?.body ?? data?.body ?? data ?? {};
  if (data?.status && data.status !== "success") {
    const msg = body?.message || body?.error || "Update listing failed.";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return body;
};

// ── Payload Builders ────────────────────────────────────────────────────────

export const buildCreatePayload = ({
  formData,
  images = [],
  category,
  subcategory,
  specifications = {},
  optionFields = [],
  variants = [],
  variantPrices = {},
  promotionImage = null,
  keywords = [],
  discountType = "percent",
  statusOverride = "Under Review",
  colourImages = {},
  confirmedColors = [],
  specFieldsList = [],
}) => {
  const successImages = images.filter((i) => i.mediaUrl || i.url || i.src);
  const rawMainmedia = successImages[0]?.mediaUrl || successImages[0]?.url || successImages[0]?.src || "";
  const mainmedia = resolveWixImage(rawMainmedia) || rawMainmedia;
  const mediaItems = buildMediaItems(successImages);
  const productImages = mediaItems;
  const promoPhotosArr = buildPromotionPhotos(promotionImage);
  const promotionPhotos = promoPhotosArr;
  const discount = buildDiscount(formData, discountType);
  const optionKeys = new Set(optionFields.map((f) => f.fieldId || f.title));
  const additionalInfoSections = buildAdditionalInfoSections(specifications, optionKeys, specFieldsList);
  const productOptions = buildProductOptions(optionFields, specifications, colourImages, confirmedColors);
  const base = parseFloat(formData.price) || 0;
  const effectivePrice = formData.onSale && formData.salePrice
    ? parseFloat(formData.salePrice) || base
    : base;
  const varientPrice = buildVarientPrice(variants, variantPrices, effectivePrice);

  // ── Size chart: find by value shape (any uploaded URL object or https string) ──
  const sizeChartEntry = Object.entries(specifications).find(([, v]) => {
    if (!v || v === "__PENDING_FILE__" || v instanceof File) return false;
    if (typeof v === "object" && v.url && (v.url.startsWith("http://") || v.url.startsWith("https://") || v.url.startsWith("wix:image://")) && !v.url.includes("__PENDING")) return true;
    if (typeof v === "object" && (v.mediaUrl || v.src)) return true;
    if (typeof v === "string" && (v.startsWith("https://") || v.startsWith("http://") || v.startsWith("wix:image://"))) return true;
    return false;
  });
  const sizeChartVal = sizeChartEntry?.[1];
  console.log("[sizeChart] Entry found:", sizeChartEntry?.[0], "val:", sizeChartVal);
  const sizeChart = sizeChartVal ? (resolveWixImage(resolveSizeChartUrl(sizeChartVal)) || "") : "";
  console.log("[buildCreatePayload] sizeChart resolved:", sizeChart);

  const sellerId = getSellerId();
  const sellerPinCode = getSellerPinCode();
  const sellerEmail = resolveSellerEmailForApi();

  console.group("[buildCreatePayload] Identity diagnostics");
  console.log("Seller ID before payload:", getSellerId());
  console.log("Payload Seller ID", sellerId);
  if (!sellerId) {
    console.error("[buildCreatePayload] ❌ sellerId is EMPTY — check registration stored it correctly");
    console.log("All sessionStorage:", Object.fromEntries(Object.keys(sessionStorage).map(k => [k, sessionStorage.getItem(k)])));
    console.log("All localStorage:", Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  }
  console.log("Payload Seller PinCode", sellerPinCode);
  console.log("Payload Seller Email", sellerEmail);
  console.log("Payload Status", statusOverride);
  if (!sellerEmail) console.warn("[buildCreatePayload] ⚠️ sellerEmail is EMPTY");
  console.groupEnd();

  const subCatId =
    subcategory?.SubCategoryID ||
    subcategory?.subcategoryId ||
    subcategory?._id ||
    subcategory?.id ||
    "";

  const catId =
    category?.CategoryID ||
    category?._id ||
    category?.id ||
    "";

  console.log("[buildCreatePayload] sizeChart value:", sizeChart);
  console.log("[buildCreatePayload] promotionPhotos:", promotionPhotos);
  console.log("[buildCreatePayload] keywords:", keywords);

  return {
    sellerId,
    sellerEmail,
    sellerPinCode: parseInt(sellerPinCode, 10) || 0,
    categoryName: [category?.name || ""],
    categoryId: [catId],
    mediaItems,
    productImages,
    mainCategory: catId,
    subCategory: subcategory?.name || "",
    subCategoryId: subCatId,
    promotionPhotos,
    paymentType: formData.acceptCOD === "yes" ? "Cash on Delivery Available" : "prepaid",
    productReturn: resolveProductReturn(formData.productReturn),
    deliveryCharges: formData.deliveryCharge === "yes",
    shippingWeight: parseFloat(formData.shippingWeight) || 0,
    totalQuantity: parseInt(formData.availableStock, 10) || 5,
    brand: formData.brand || "",
    status: statusOverride,
    mainmedia,
    name: formData.productName || "",
    price: base,
    sku: formData.sku || "",
    productType: "physical",
    haatzaverified: false,
    sizeChart: sizeChart || "",
    discount,
    manageVariants: Object.keys(productOptions).length > 0,
    search_keywords: keywords || [],
    keywords: keywords || [],
    resellingProfit: parseFloat(formData.resellingProfit) || 0,
    sellAndEarnCommission: parseFloat(formData.resellingProfit) || 0,
    sellAndEarn: !!formData.resellingProfit,
    productOptions,
    varientPrice,
    additionalInfoSections,
  };
};

export const buildUpdatePayload = ({
  tableId,
  formData,
  images = [],
  category,
  subcategory,
  specifications = {},
  optionFields = [],
  variants = [],
  variantPrices = {},
  promotionImage = null,
  keywords = [],
  discountType = "percent",
  editData = {},
  statusOverride = "Under Review",
  colourImages = {},
  confirmedColors = [],
  specFieldsList = [],
}) => {
  const successImages = images.filter((i) => i.mediaUrl || i.url || i.src);
  const rawMainmedia = successImages[0]?.mediaUrl || successImages[0]?.url || successImages[0]?.src || editData?.mainmedia || "";
  const mainmedia = resolveWixImage(rawMainmedia) || rawMainmedia;
  const mediaItems = buildMediaItems(successImages);
  const promoPhotosArr = buildPromotionPhotos(promotionImage);
  const promotionPhotos = promoPhotosArr;
  const discount = buildDiscount(formData, discountType);
  const optionKeys = new Set(optionFields.map((f) => f.fieldId || f.title));
  const additionalInfoSections = buildAdditionalInfoSections(specifications, optionKeys, specFieldsList);
  const productOptions = buildProductOptions(optionFields, specifications, colourImages, confirmedColors);
  const base = parseFloat(formData.price) || 0;
  const effectivePrice = formData.onSale && formData.salePrice
    ? parseFloat(formData.salePrice) || base
    : base;
  const varientPrice = buildVarientPrice(variants, variantPrices, effectivePrice);

  // ── Size chart: find by value shape (any uploaded URL object or https string) ──
  const sizeChartEntry = Object.entries(specifications).find(([, v]) => {
    if (!v || v === "__PENDING_FILE__" || v instanceof File) return false;
    if (typeof v === "object" && v.url && (v.url.startsWith("http://") || v.url.startsWith("https://") || v.url.startsWith("wix:image://")) && !v.url.includes("__PENDING")) return true;
    if (typeof v === "object" && (v.mediaUrl || v.src)) return true;
    if (typeof v === "string" && (v.startsWith("https://") || v.startsWith("http://") || v.startsWith("wix:image://"))) return true;
    return false;
  });
  const sizeChartVal = sizeChartEntry?.[1];
  console.log("[sizeChart] Entry found:", sizeChartEntry?.[0], "val:", sizeChartVal);
  const sizeChart = sizeChartVal ? (resolveWixImage(resolveSizeChartUrl(sizeChartVal)) || "") : "";
  console.log("[buildUpdatePayload] sizeChart resolved:", sizeChart);

  const productImages = mediaItems;

  const sellerId = getSellerId();
  const sellerPinCode = getSellerPinCode();
  const sellerEmail = resolveSellerEmailForApi();
  console.log("[listingApi] Resolved identity →", { sellerId, sellerPinCode, sellerEmail });

  console.group("[buildUpdatePayload] Identity diagnostics");
  console.log("Saved Seller ID", sellerId);
  console.log("Seller PinCode", sellerPinCode);
  console.log("Seller Email", sellerEmail);
  console.log("Status override:", statusOverride);
  console.groupEnd();

  console.log("[buildUpdatePayload] mainmedia:", mainmedia);
  console.log("[buildUpdatePayload] mediaItems:", mediaItems);
  console.log("[buildUpdatePayload] promotionPhotos:", promotionPhotos);

  const catId =
    category?.CategoryID ||
    category?._id ||
    category?.id ||
    editData?.categoryId?.[0] ||
    editData?.mainCategory ||
    "";

  const subCatId =
    subcategory?.SubCategoryID ||
    subcategory?.subcategoryId ||
    subcategory?._id ||
    subcategory?.id ||
    editData?.subCategoryId ||
    editData?.SubCategoryID ||
    "";

  return {
    Id: tableId,
    sellerId,
    sellerEmail,
    sellerPinCode: parseInt(sellerPinCode, 10) || 0,
    name: formData.productName || "",
    productImages,
    description: editData?.description || "",
    shippingWeight: parseFloat(formData.shippingWeight) || 0,
    brand: formData.brand || "",
    status: statusOverride,
    mainmedia,
    productOptions,
    price: base,
    discount,
    manageVariants: Object.keys(productOptions).length > 0,
    ribbon: editData?.ribbon || "",
    varientPrice,
    additionalInfoSections,
    paymentType: formData.acceptCOD === "yes" ? "Cash on Delivery Available" : "prepaid",
    productReturn: resolveProductReturn(formData.productReturn),
    deliveryCharges: formData.deliveryCharge === "yes",
    totalQuantity: parseInt(formData.availableStock, 10) || editData?.totalQuantity || 5,
    resellingProfit: parseFloat(formData.resellingProfit) || 0,
    sellAndEarn: !!formData.resellingProfit,
    sellAndEarnCommission: parseFloat(formData.resellingProfit) || 0,
    search_keywords: keywords,
    promotionPhotos,
    sizeChart: sizeChart || "",
    mediaItems,
    categoryName: category?.name ? [category.name] : (editData?.categoryName || []),
    categoryId: catId ? [catId] : (editData?.categoryId || []),
    mainCategory: catId,
    subCategory: subcategory?.name || editData?.subCategory || "",
    subCategoryId: subCatId,
    sku: formData.sku || editData?.sku || "",
    productType: "physical",
  };
};