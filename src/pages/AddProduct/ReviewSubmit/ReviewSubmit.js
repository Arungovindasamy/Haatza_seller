import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./ReviewSubmit.css";
import {
  fetchSettlementSummary,
  createListing,
  updateListing,
  buildCreatePayload,
  buildUpdatePayload,
  resolveWixImage,
  getCachedSellerId,
  getCachedSellerPinCode,
} from "../../../services/sellerService";

/* ── SVG ICONS ── */
const ArrowLeftIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const CheckCircleIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const AlertIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const LoaderIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="rsp-spin">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="30" strokeLinecap="round"/>
  </svg>
);
const ReceiptIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const TagIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="7" y1="7" x2="7.01" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const ImageIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
    <polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const EditIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SaveIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SendIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── STEP INDICATOR ── */
const STEPS = [
  { label: "Pick Category" },
  { label: "Product Info" },
  { label: "Review & Submit" },
];
const StepIndicator = ({ currentStep }) => (
  <div className="rsp-steps">
    {STEPS.map((step, i) => {
      const isActive = i === currentStep;
      const isDone   = i < currentStep;
      return (
        <div key={i} className={`rsp-step ${isActive ? "rsp-step--active" : ""} ${isDone ? "rsp-step--done" : ""}`}>
          <div className="rsp-step-bubble">
            {isDone ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <span>{i + 1}</span>
            )}
          </div>
          <span className="rsp-step-label">{step.label}</span>
          {i < STEPS.length - 1 && (
            <div className={`rsp-step-line ${isDone ? "rsp-step-line--done" : ""}`}/>
          )}
        </div>
      );
    })}
  </div>
);

/* ── DATA ROW ── */
const DataRow = ({ label, value, highlight }) => (
  <div className="rsp-data-row">
    <span className="rsp-data-label">{label}</span>
    <span className={`rsp-data-value ${highlight ? "rsp-data-value--highlight" : ""}`}>{value || "—"}</span>
  </div>
);

/* ── SETTLEMENT ROW ── */
const SettlementRow = ({ label, value, type = "neutral", bold }) => (
  <div className={`rsp-settle-row ${bold ? "rsp-settle-row--bold" : ""}`}>
    <span className="rsp-settle-label">{label}</span>
    <span className={`rsp-settle-value rsp-settle-value--${type}`}>{value}</span>
  </div>
);

/* ── IMAGE GALLERY ── */
const resolveImageSrc = (img) => {
  if (!img) return "";
  return img.preview || img.mediaUrl || img.url || img.src || img.fileUrl || "";
};

const ImageGallery = ({ images }) => {
  const [active, setActive] = useState(0);
  const validImages = (images || []).filter(img => resolveImageSrc(img));

  if (validImages.length === 0) {
    return (
      <div className="rsp-gallery-empty">
        <ImageIcon size={40} />
        <span>No images uploaded</span>
      </div>
    );
  }
  return (
    <div className="rsp-gallery">
      <div className="rsp-gallery-main">
        <img
          src={resolveImageSrc(validImages[active])}
          alt="Main product"
          className="rsp-gallery-main-img"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "";
            e.target.style.display = "none";
          }}
        />
      </div>
      {validImages.length > 1 && (
        <div className="rsp-gallery-thumbs">
          {validImages.map((img, idx) => (
            <button
              key={idx}
              className={`rsp-gallery-thumb ${active === idx ? "rsp-gallery-thumb--active" : ""}`}
              onClick={() => setActive(idx)}
            >
              <img
                src={resolveImageSrc(img)}
                alt={`Thumb ${idx + 1}`}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── SECTION HEADER ── */
const SectionHeader = ({ icon, title }) => (
  <div className="rsp-section-header">
    {icon}
    <h3 className="rsp-section-title">{title}</h3>
  </div>
);

/* ════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════ */
const ReviewSubmitPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    category,
    subcategory,
    formData,
    images = [],
    specifications = {},
    promotionImage,
    keywords = [],
    isEditMode,
    isDuplicateMode,
    isViewMode,
    editData,
    tableId,
    optionFields: rawOptionFields = [],
    specFieldsList = [],
    variants = [],
    variantPrices = {},
    discountType = "percent",
    colourImages = {},
    confirmedColors = [],
  } = location.state || {};

  useEffect(() => {
    console.group("[ReviewSubmitPage] === STATE RECEIVED ===");
    console.log("optionFields:", optionFields);
    console.log("specFieldsList:", specFieldsList);
    console.log("variants:", variants);
    console.log("variantPrices:", variantPrices);
    console.log("confirmedColors:", confirmedColors);
    console.log("colourImages:", colourImages);
    console.log("specifications:", specifications);
    console.log("formData:", formData);
    // Debug: log all spec values to find size chart
    console.log("=== SPECIFICATIONS ENTRIES ===");
    Object.entries(specifications).forEach(([k, v]) => {
      console.log(`  [${k}]:`, typeof v === "object" ? JSON.stringify(v) : v);
    });
    console.groupEnd();
  }, []);

  const rawOptionFieldsFiltered = (rawOptionFields || []).length > 0
    ? rawOptionFields
    : (specFieldsList || []).filter((f) => f.type === "Product Options");

  const hasColorField = rawOptionFieldsFiltered.some(f => {
    const t = (f.title || "").toLowerCase().trim();
    const et = (f.elementType || "").toLowerCase().trim();
    return t === "color" || t === "colour" || et === "color picker";
  });

  const optionFields = [...rawOptionFieldsFiltered];
  if (!hasColorField && (confirmedColors || []).length > 0) {
    optionFields.push({
      fieldId: "Color",
      title: "Color",
      type: "Product Options",
      elementType: "Color Picker",
    });
  }

  const [settlement,        setSettlement]        = useState(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementError,   setSettlementError]   = useState("");
  const [submitting,        setSubmitting]         = useState(false);
  const [submitError,       setSubmitError]        = useState("");
  const [submitSuccess,     setSubmitSuccess]      = useState(false);
  const [mounted,           setMounted]            = useState(false);

  const [draftLoading,  setDraftLoading]  = useState(false);
  const [draftSuccess,  setDraftSuccess]  = useState(false);
  const [draftError,    setDraftError]    = useState("");
  const [qcLoading,     setQcLoading]     = useState(false);
  const [qcSuccess,     setQcSuccess]     = useState(false);
  const [qcError,       setQcError]       = useState("");

  useEffect(() => { setMounted(true); }, []);

const isUpdate = !!(isEditMode && !isDuplicateMode && tableId && !isViewMode);
  // ── DIRECT size chart extractor — scans specifications for any uploaded URL ──
  const extractSizeChartUrl = (specs) => {
    if (!specs || typeof specs !== "object") return "";
    for (const [, v] of Object.entries(specs)) {
      if (!v || v === "__PENDING_FILE__" || v instanceof File) continue;
      // Object with url property (from SpecificationPage upload: { url, isExisting: true })
      if (typeof v === "object") {
        const url = v.url || v.mediaUrl || v.src || v.imageUrl || v.fileUrl || "";
        if (url && typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://") || url.startsWith("wix:image://")) && !url.includes("__PENDING")) {
          console.log("[ReviewSubmitPage] ✅ extractSizeChartUrl found:", url);
          return url;
        }
      }
      // Plain string URL
      if (typeof v === "string" && (v.startsWith("https://") || v.startsWith("http://") || v.startsWith("wix:image://")) && !v.includes("__PENDING")) {
        console.log("[ReviewSubmitPage] ✅ extractSizeChartUrl found string:", v);
        return v;
      }
    }
    return "";
  };

  // Upload a raw File (size chart) to Wix media and return its HTTPS URL
  const uploadSizeChartFile = async (file) => {
    if (!file || !(file instanceof File)) return null;
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("mediaType", "image");
      const res = await fetch("https://www.haatza.com/_functions/uploadMedia", {
        method: "POST",
        body: formDataUpload,
      });
      if (!res.ok) {
        console.warn("[ReviewSubmitPage] ⚠️ uploadMedia returned", res.status, "— skipping size chart");
        return null;
      }
      const data = await res.json();
      const url =
        data?.url || data?.mediaUrl || data?.src ||
        data?.message?.data?.url || data?.message?.body?.url ||
        data?.message?.data?.mediaUrl || data?.message?.body?.mediaUrl || "";
      console.log("[ReviewSubmitPage] ✅ Size chart uploaded:", url);
      return resolveWixImage(url) || url || null;
    } catch (err) {
      console.warn("[ReviewSubmitPage] ⚠️ Size chart upload failed:", err.message);
      return null;
    }
  };

  /* ── Settlement Summary ── */
  useEffect(() => {
    if (!formData) return;

    const price = formData.onSale && formData.salePrice
      ? parseFloat(formData.salePrice) || parseFloat(formData.price) || 0
      : parseFloat(formData.price) || 0;

    const catId =
      subcategory?.SubCategoryID  ||
      subcategory?.subcategoryId  ||
      subcategory?.subCategoryId  ||
      subcategory?.subCategoryID  ||
      subcategory?._id            ||
      subcategory?.id             ||
      category?.CategoryID        ||
      category?._id               ||
      category?.id                ||
      "";

    const resolveSellerPinCode = () => {
      const canonicalPin =
        sessionStorage.getItem("__haatza_sellerPinCode") ||
        localStorage.getItem("__haatza_sellerPinCode");
      if (canonicalPin && /^\d{6}$/.test(canonicalPin.trim())) {
        return canonicalPin.trim();
      }
      const legacyKeys = ["sellerPinCode", "pinCode", "pincode", "seller_pincode"];
      for (const key of legacyKeys) {
        const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
        if (raw && /^\d{6}$/.test(raw.trim())) return raw.trim();
      }
      return "000000";
    };

    setSettlementLoading(true);
    setSettlementError("");

    const settlementParams = {
      orderAmount:     price,
      categoryId:      subcategory?.SubCategoryID || subcategory?.subcategoryId || subcategory?.subCategoryId || subcategory?.subCategoryID || subcategory?._id || subcategory?.id || catId,
      deliveryCharges: formData.deliveryCharge === "yes",
      shippingWeight:  Math.min(parseFloat(formData.shippingWeight) || 0, 5000),
      sellerPinCode:   resolveSellerPinCode(),
      sellerId:        getCachedSellerId(),
    };

    fetchSettlementSummary(settlementParams)
      .then(setSettlement)
      .catch((err) => setSettlementError(err.message || "Could not load settlement summary."))
      .finally(() => setSettlementLoading(false));
  }, [formData, category, subcategory]);

  /* ── Shared payload builder ── */
  const buildPayload = useCallback(async (statusOverride) => {
    const resolvedStatus = statusOverride || "Under Review";

    const sellerId      = getCachedSellerId();
    const sellerPinCode = getCachedSellerPinCode();

    console.group("[ReviewSubmitPage:buildPayload] Building payload");
    console.log("isUpdate:", isUpdate);
    console.log("resolvedStatus:", resolvedStatus);
    console.log("sellerId:", sellerId || "❌ MISSING");
    console.log("sellerPinCode:", sellerPinCode || "❌ MISSING");
    console.groupEnd();

    // ── Step 1: resolve specifications — upload any raw File size chart ──
    let resolvedSpecifications = { ...specifications };

    // Find any raw File in specs and upload it
    const rawFileEntry = Object.entries(resolvedSpecifications).find(
      ([, v]) => v instanceof File
    );
    if (rawFileEntry) {
      const [fileKey, fileVal] = rawFileEntry;
      console.log("[ReviewSubmitPage:buildPayload] Found raw File for key:", fileKey, "— uploading now");
      const uploadedUrl = await uploadSizeChartFile(fileVal);
      if (uploadedUrl) {
        resolvedSpecifications = {
          ...resolvedSpecifications,
          [fileKey]: { url: uploadedUrl, isExisting: true },
        };
        console.log("[ReviewSubmitPage:buildPayload] ✅ Raw file uploaded:", uploadedUrl);
      } else {
        resolvedSpecifications = { ...resolvedSpecifications, [fileKey]: null };
        console.warn("[ReviewSubmitPage:buildPayload] ⚠️ Raw file upload failed — clearing");
      }
    }

    // Remove sentinel values
    Object.keys(resolvedSpecifications).forEach(k => {
      if (resolvedSpecifications[k] === "__PENDING_FILE__") {
        resolvedSpecifications[k] = null;
      }
    });

    // ── Step 2: extract size chart URL directly ──
    const sizeChartUrl = extractSizeChartUrl(resolvedSpecifications);
    console.log("[ReviewSubmitPage:buildPayload] Extracted sizeChartUrl:", sizeChartUrl);

    // ── Step 3: build the payload ──
    let payload;
    if (isUpdate) {
      payload = buildUpdatePayload({
        tableId,
        formData,
        images,
        category,
        subcategory,
        specifications: resolvedSpecifications,
        optionFields,
        variants,
        variantPrices,
        promotionImage,
        keywords,
        discountType,
        editData: editData || {},
        statusOverride: resolvedStatus,
        colourImages,
        confirmedColors,
        specFieldsList,
      });
    } else {
      payload = buildCreatePayload({
        formData,
        images,
        category,
        subcategory,
        specifications: resolvedSpecifications,
        optionFields,
        variants,
        variantPrices,
        promotionImage,
        keywords,
        discountType,
        statusOverride: resolvedStatus,
        colourImages,
        confirmedColors,
        specFieldsList,
      });
    }

    // ── Step 4: force-apply sellerId, sellerPinCode, and sizeChart ──
    payload.sellerId      = sellerId;
    payload.sellerPinCode = Number(sellerPinCode) || 0;

    // Always force sizeChart — this is the critical fix
    // sizeChartUrl extracted directly from specs takes priority over whatever buildCreatePayload set
    if (sizeChartUrl) {
      payload.sizeChart = resolveWixImage(sizeChartUrl) || sizeChartUrl;
      console.log("[ReviewSubmitPage:buildPayload] ✅ sizeChart FORCE SET:", payload.sizeChart);
    } else if (!payload.sizeChart) {
      payload.sizeChart = "";
      console.log("[ReviewSubmitPage:buildPayload] sizeChart is empty — no size chart uploaded");
    }

    // Final guard: never send sentinel to DB
    if (!payload.sizeChart || payload.sizeChart === "__PENDING_FILE__") {
      payload.sizeChart = "";
    }

    console.group("[ReviewSubmitPage:buildPayload] === FINAL PAYLOAD ===");
    console.log("Status:", payload.status);
    console.log("sizeChart:", payload.sizeChart);
    console.log("additionalInfoSections:", JSON.stringify(payload.additionalInfoSections, null, 2));
    console.log("productOptions:", JSON.stringify(payload.productOptions, null, 2));
    console.groupEnd();

    console.log("Media Items Before Save:", payload.mediaItems);
    console.log("Promotion Photos Before Save:", payload.promotionPhotos);
    console.log("Size Chart Before Save:", payload.sizeChart);
    console.log("Complete Payload:", payload);

    return payload;

  }, [isUpdate, tableId, formData, images, specifications, optionFields, variants, variantPrices, promotionImage, keywords, discountType, category, subcategory, editData, colourImages, confirmedColors]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Shared post-save navigation ── */
  const navigateToInProgress = useCallback((email) => {
    const resolvedEmail =
      email                                     ||
      location.state?.email                     ||
      sessionStorage.getItem("pendingEmail")    ||
      localStorage.getItem("userEmail")         ||
      localStorage.getItem("pendingEmail")      ||
      "";
    if (resolvedEmail) {
      sessionStorage.setItem("pendingEmail", resolvedEmail);
      localStorage.setItem("userEmail", resolvedEmail);
    }
    navigate("/dashboard/listing", {
      replace: true,
      state: {
        refresh:   true,
        timestamp: Date.now(),
        email:     resolvedEmail,
        tab:       "inprogress",
      },
    });
  }, [navigate, location.state?.email]);

  /* ── Submit handler ── */
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = await buildPayload("Under Review");
      if (isUpdate) {
        await updateListing(payload);
      } else {
        await createListing(payload);
      }
      setSubmitSuccess(true);
      setTimeout(() => navigateToInProgress(location.state?.email), 2200);
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [buildPayload, isUpdate, navigateToInProgress, location.state?.email]);

  /* ── Save as Draft handler ── */
  const handleSaveAsDraft = useCallback(async () => {
    setDraftLoading(true);
    setDraftError("");
    setDraftSuccess(false);
    try {
      const payload = await buildPayload("Draft");
      if (payload.status !== "Draft") payload.status = "Draft";

      console.group("[ReviewSubmitPage:handleSaveAsDraft] Draft payload");
      console.log("Draft Payload", JSON.parse(JSON.stringify(payload)));
      console.log("sizeChart:", payload.sizeChart);
      console.groupEnd();

      let response;
      if (isUpdate) {
        response = await updateListing(payload);
      } else {
        response = await createListing(payload);
      }

      console.log("[ReviewSubmitPage:handleSaveAsDraft] ✅ Draft saved:", response?._id ?? response?.Table_ID);
      setDraftSuccess(true);
      setTimeout(() => navigateToInProgress(location.state?.email), 1500);
    } catch (err) {
      console.error("[ReviewSubmitPage:handleSaveAsDraft] Error:", err);
      setDraftError(err.message || "Could not save draft. Please try again.");
    } finally {
      setDraftLoading(false);
    }
  }, [buildPayload, isUpdate, navigateToInProgress, location.state?.email]);

  /* ── Send for QC handler ── */
  const handleSendForQC = useCallback(async () => {
    setQcLoading(true);
    setQcError("");
    setQcSuccess(false);
    try {
      const payload = await buildPayload("Under Review");
      if (payload.status !== "Under Review") payload.status = "Under Review";

      console.group("[ReviewSubmitPage:handleSendForQC] QC payload");
      console.log("QC Payload", JSON.parse(JSON.stringify(payload)));
      console.log("sizeChart:", payload.sizeChart);
      console.groupEnd();

      let response;
      if (isUpdate) {
        response = await updateListing(payload);
      } else {
        response = await createListing(payload);
      }

      console.log("[ReviewSubmitPage:handleSendForQC] ✅ Saved:", response?._id ?? response?.Table_ID);
      setQcSuccess(true);
      setTimeout(() => navigateToInProgress(location.state?.email), 1500);
    } catch (err) {
      console.error("[ReviewSubmitPage:handleSendForQC] Error:", err);
      setQcError(err.message || "Could not send for QC. Please try again.");
    } finally {
      setQcLoading(false);
    }
  }, [buildPayload, isUpdate, navigateToInProgress, location.state?.email]);

  const handleBack = () => {
    navigate(
      isUpdate
        ? `/dashboard/listing/edit/${tableId}/product-info/specifications/promotions`
        : "/dashboard/listing/select-category/product-info/specifications/promotions",
      {
        state: {
          category, subcategory, formData, images, specifications,
          promotionImage, keywords,
          isEditMode: isUpdate,
          isDuplicateMode,
          editData,
          tableId: isDuplicateMode ? null : tableId,
          optionFields, specFieldsList, variants, variantPrices, discountType,
          confirmedColors, colourImages,
        },
      }
    );
  };

  const anyActionRunning = submitting || draftLoading || qcLoading;
  const anyActionSuccess = submitSuccess || draftSuccess || qcSuccess;

  if (!formData) {
    return (
      <div className="rsp-root">
        <div className="rsp-empty-state">
          <AlertIcon size={40} />
          <h3>No listing data found</h3>
          <p>Please start from the beginning of the listing flow.</p>
          <button className="rsp-btn-primary" onClick={() => navigate("/dashboard/listing/select-category")}>
            Start Listing
          </button>
        </div>
      </div>
    );
  }

  if (isEditMode && !isDuplicateMode && !tableId) {
    return (
      <div className="rsp-root">
        <div className="rsp-empty-state">
          <AlertIcon size={40} />
          <h3>Invalid edit session</h3>
          <p>Product ID is missing. Please return to your listings and try editing again.</p>
          <button className="rsp-btn-primary" onClick={() => navigate("/dashboard/listing")}>
            Go to Listings
          </button>
        </div>
      </div>
    );
  }

  /* Derived display values */
  const price      = parseFloat(formData.price) || 0;
  const salePrice  = formData.onSale && formData.salePrice ? parseFloat(formData.salePrice) : null;
  const isOnSale   = formData.onSale && !!salePrice;
  const displayPrice = isOnSale ? salePrice : price;

  const returnLabel = {
    return:             "7 Days Easy Return",
    no_return:          "No Return",
    exchange:           "7 Days Exchange",
    return_or_exchange: "7 Days Return or Exchange",
  }[formData.productReturn] || formData.productReturn || "—";

  const optionKeySet = new Set();
  optionFields.forEach((f) => {
    if (f.fieldId) optionKeySet.add(f.fieldId);
    if (f.title)   optionKeySet.add(f.title);
    if (f.title)   optionKeySet.add(f.title.toLowerCase());
  });

  const isColourField = (f) => {
    const t = (f.title || "").toLowerCase().trim();
    const et = (f.elementType || "").toLowerCase().trim();
    return t === "color" || t === "colour" || et === "color picker";
  };

  const productOptionDisplay = optionFields.map((f) => {
    const key = f.fieldId || f.title;
    const val = specifications[key];
    const isColour = isColourField(f);

    if (isColour && confirmedColors.length > 0) {
      return {
        title: f.title,
        selected: confirmedColors.map(c => c.name),
        colorDetails: confirmedColors.map(c => {
          const img = colourImages[c.name];
          let resolvedUrl = null;
          if (img) {
            if (img instanceof File) {
              resolvedUrl = URL.createObjectURL(img);
            } else if (Array.isArray(img)) {
              const first = img.find(Boolean);
              if (first) {
                if (first instanceof File) {
                  resolvedUrl = URL.createObjectURL(first);
                } else {
                  resolvedUrl = typeof first === "string" ? first : first.url || first.mediaUrl || first.src || null;
                }
              }
            } else if (typeof img === "object") {
              resolvedUrl = img.url || img.mediaUrl || img.src || null;
            } else if (typeof img === "string") {
              resolvedUrl = img;
            }
          }
          return {
            name:      c.name,
            hex:       c.hex,
            imageUrl:  resolvedUrl,
          };
        }),
        isColour: true,
      };
    }

    const selected = Array.isArray(val) ? val : (val ? [val] : []);
    return { title: f.title, selected, isColour: false };
  }).filter((o) => o.selected.length > 0 || (o.isColour && o.colorDetails?.length > 0));

  const specRows = (() => {
    if (specFieldsList && specFieldsList.length > 0) {
      return specFieldsList.map(f => {
        const key = f.fieldId || f.title;
        const val = specifications[key];
        return {
          title: f.title,
          value: val,
        };
      }).filter(row => {
        const val = row.value;
        if (!val || val === "") return false;
        if (val instanceof File) return false;
        if (typeof val === "object" && (val.isExisting || val.url || val.mediaUrl || val.src)) return false;
        return true;
      }).map(row => ({
        key: row.title,
        value: Array.isArray(row.value) ? row.value.join(", ") : String(row.value),
      }));
    }

    // Fallback: original logic
    return Object.entries(specifications).filter(([key, val]) => {
      if (optionKeySet.has(key)) return false;
      if (optionKeySet.has(key.toLowerCase())) return false;
      if (optionFields.some(f => (f.fieldId || "").toLowerCase() === key.toLowerCase() || (f.title || "").toLowerCase() === key.toLowerCase())) return false;
      if (!val || val === "") return false;
      if (val instanceof File) return false;
      // Skip size chart objects
      if (typeof val === "object" && (val.isExisting || val.url || val.mediaUrl || val.src)) return false;
      return true;
    }).map(([key, val]) => ({
      key,
      value: Array.isArray(val) ? val.join(", ") : String(val),
    }));
  })();

  // Size chart display URL — extracted directly
  const sizeChartDisplayUrl = extractSizeChartUrl(specifications);

  return (
    <div className={`rsp-root ${mounted ? "rsp-root--mounted" : ""}`}>

      {/* Top bar */}
      <div className="rsp-top-bar">
      <button className="rsp-back-btn" onClick={isViewMode ? () => navigate(-1) : handleBack}>
  <ArrowLeftIcon size={15} /> {isViewMode ? "Back to Listings" : "Back to Promotions"}
</button>        

        {isUpdate && !isViewMode && (
  <button
    className={`rsp-topright-update-btn ... ${submitting ? "rsp-topright-update-btn--loading" : ""}`}
            onClick={handleSubmit}
            disabled={anyActionRunning || anyActionSuccess}
          >
            {submitting ? (
              <><LoaderIcon size={15} /> Updating…</>
            ) : submitSuccess ? (
              <><CheckCircleIcon size={15} /> Updated!</>
            ) : (
              <><EditIcon size={15} /> Update Listing</>
            )}
          </button>
        )}
      </div>

      {/* Header */}
      <div className="rsp-header">
        <h1 className="rsp-title">Review &amp; Submit</h1>
        <p className="rsp-subtitle">Review your listing before submitting</p>
      </div>

      <StepIndicator currentStep={2} />

      {/* Category pill */}
      {(category || subcategory) && (
        <div className="rsp-category-pill">
          <TagIcon size={16} />
          <span>
            {category?.name}
            {category && subcategory && <span className="rsp-sep"> › </span>}
            {subcategory?.name}
          </span>
        </div>
      )}

      {/* Success banners */}
      {submitSuccess && (
        <div className="rsp-success-banner">
          <CheckCircleIcon size={22} />
          <div>
            <strong>{isUpdate ? "Listing updated!" : "Listing submitted!"}</strong>
            <p>Your product is under review. Redirecting…</p>
          </div>
        </div>
      )}
      {draftSuccess && (
        <div className="rsp-success-banner">
          <CheckCircleIcon size={22} />
          <div>
            <strong>Draft saved!</strong>
            <p>Your product has been saved as a draft. Redirecting to In Progress…</p>
          </div>
        </div>
      )}
      {qcSuccess && (
        <div className="rsp-success-banner">
          <CheckCircleIcon size={22} />
          <div>
            <strong>Sent for QC!</strong>
            <p>Your product is now under review. Redirecting to In Progress…</p>
          </div>
        </div>
      )}

      {/* Error banners */}
      {submitError && (
        <div className="rsp-error-banner">
          <AlertIcon size={20} />
          <span>{submitError}</span>
          <button className="rsp-error-dismiss" onClick={() => setSubmitError("")}>✕</button>
        </div>
      )}
      {draftError && (
        <div className="rsp-error-banner">
          <AlertIcon size={20} />
          <span>{draftError}</span>
          <button className="rsp-error-dismiss" onClick={() => setDraftError("")}>✕</button>
        </div>
      )}
      {qcError && (
        <div className="rsp-error-banner">
          <AlertIcon size={20} />
          <span>{qcError}</span>
          <button className="rsp-error-dismiss" onClick={() => setQcError("")}>✕</button>
        </div>
      )}

      <div className="rsp-layout">
        <div className="rsp-main">

          {/* PRODUCT IMAGES */}
          <div className="rsp-card">
            <ImageGallery images={images} />
          </div>

          {/* PRODUCT DETAILS */}
          <div className="rsp-card">
            <SectionHeader icon={<TagIcon size={18} />} title="Product Details" />
            <DataRow label="Product Name"  value={formData.productName} />
            <DataRow label="Brand"         value={formData.brand} />
            <DataRow label="SKU"           value={formData.sku || "Not provided"} />
            <div className="rsp-divider" />
            <DataRow label="Price"         value={`₹ ${price.toFixed(2)}`} />
            {isOnSale && (
              <>
                <DataRow
                  label="Discount"
                  value={discountType === "flat"
                    ? `₹ ${formData.discountPercent}`
                    : `${formData.discountPercent}%`}
                />
                <DataRow label="On Sale Price" value={`₹ ${salePrice.toFixed(2)}`} highlight />
              </>
            )}
            <div className="rsp-divider" />
            <DataRow
              label="Accept COD"
              value={formData.acceptCOD === "yes" ? "Cash on Delivery Available" : "Prepaid Only"}
            />
            <DataRow label="Product Return" value={returnLabel} />
            <DataRow
              label="Delivery Charge Applicable"
              value={formData.deliveryCharge === "yes" ? "Yes" : "No"}
            />
            <DataRow label="Shipping Weight" value={`${formData.shippingWeight} g`} />
            <DataRow label="Available Stock" value={formData.availableStock} />
            {formData.resellingProfit && (
              <DataRow
                label="Reseller Profit (₹)"
                value={`₹ ${parseFloat(formData.resellingProfit).toFixed(2)}`}
              />
            )}
          </div>

          {/* PRODUCT OPTIONS */}
          {productOptionDisplay.length > 0 && (
            <div className="rsp-card">
              <SectionHeader icon={<TagIcon size={18} />} title="Product Options" />
              {productOptionDisplay.map((opt) => (
                <div key={opt.title} className="rsp-option-group">
                  <span className="rsp-option-name">{opt.title}:</span>
                  {opt.isColour && opt.colorDetails ? (
                    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                      {/* Simple chip list first */}
                      <div className="rsp-option-chips" style={{ marginBottom: 12 }}>
                        {opt.colorDetails.map((c) => (
                          <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{
                              width: 14, height: 14, borderRadius: "50%",
                              background: c.hex, border: "1.5px solid rgba(0,0,0,0.15)",
                              display: "inline-block", flexShrink: 0,
                            }}/>
                            <span className="rsp-option-chip">{c.name}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Detailed Color Variants gallery grid */}
                      <div style={{ marginTop: 8 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 700,
                          color: "var(--rsp-text-muted)",
                          marginBottom: 10, textTransform: "uppercase",
                          letterSpacing: "0.5px", fontFamily: "var(--ff-display)"
                        }}>
                          Color Variants
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12 }}>
                          {opt.colorDetails.map((c) => (
                            <div key={c.name} style={{
                              border: "1px solid rgba(0,0,0,0.06)", borderRadius: 10, padding: "10px 8px",
                              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                              background: "#f8f9fa", boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                            }}>
                              {c.imageUrl ? (
                                <img
                                  src={c.imageUrl}
                                  alt={c.name}
                                  style={{
                                    width: 80, height: 80, objectFit: "cover",
                                    borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)",
                                    background: "white"
                                  }}
                                  onError={(e) => { e.target.style.display = "none"; }}
                                />
                              ) : (
                                <div style={{
                                  width: 80, height: 80, borderRadius: 8,
                                  border: "1px dashed rgba(0,0,0,0.1)", background: "white",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 10, color: "#64748b", fontWeight: 600
                                }}>
                                  No Image
                                </div>
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{
                                  width: 10, height: 10, borderRadius: "50%",
                                  background: c.hex, border: "1px solid rgba(0,0,0,0.15)",
                                  display: "inline-block", flexShrink: 0,
                                }}/>
                                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--rsp-text)", fontFamily: "var(--ff-display)" }}>
                                  {c.name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rsp-option-chips">
                      {opt.selected.map((v) => (
                        <span key={v} className="rsp-option-chip">{v}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* VARIANT PRICE TABLE */}
          {variants && variants.length > 0 && (() => {
            const base = isOnSale ? (salePrice ?? price) : price;
            const hasColor = variants.some(v => v.color);
            const hasOption = variants.some(v => v.optionLabel);

            if (hasColor && hasOption) {
              const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
              const optionLabels = [...new Set(variants.map(v => v.optionLabel).filter(Boolean))];
              const optionFieldName = variants.find(v => v.optionField)?.optionField || "Option";
              const priceMap = {};
              variants.forEach(v => {
                const diff = parseFloat(variantPrices[v.key]?.appliedDiff ?? 0) || 0;
                priceMap[`${v.color}__${v.optionLabel}`] = base + diff;
              });

              return (
                <div className="rsp-card">
                  <SectionHeader icon={<ReceiptIcon size={18} />} title="Variant Price Difference" />
                  <div className="rsp-variant-table-wrap">
                    <table className="rsp-variant-table">
                      <thead>
                        <tr>
                          <th>Color</th>
                          {optionLabels.map(label => (
                            <th key={label}>{optionFieldName}: {label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {colors.map(color => {
                          const colorObj = confirmedColors.find(c => c.name === color);
                          return (
                            <tr key={color}>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  {colorObj && (
                                    <span style={{
                                      width: 12, height: 12, borderRadius: "50%",
                                      background: colorObj.hex,
                                      border: "1.5px solid rgba(0,0,0,0.15)",
                                      display: "inline-block", flexShrink: 0,
                                    }}/>
                                  )}
                                  {color}
                                </div>
                              </td>
                              {optionLabels.map(label => {
                                const fp = priceMap[`${color}__${label}`] ?? base;
                                return (
                                  <td key={label} className="rsp-variant-price">
                                    ₹{fp.toFixed(0)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }

            return (
              <div className="rsp-card">
                <SectionHeader icon={<ReceiptIcon size={18} />} title="Variant Price Difference" />
                <div className="rsp-variant-table-wrap">
                  <table className="rsp-variant-table">
                    <thead>
                      <tr>
                        {hasColor && <th>Color</th>}
                        {hasOption && <th>{variants[0]?.optionField || "Option"}</th>}
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v) => {
                        const diff = parseFloat(variantPrices[v.key]?.appliedDiff ?? 0) || 0;
                        const finalPrice = base + diff;
                        return (
                          <tr key={v.key}>
                            {v.color && <td>{v.color}</td>}
                            {v.optionLabel && <td>{v.optionLabel}</td>}
                            <td className="rsp-variant-price">₹{finalPrice.toFixed(0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* PRODUCT SPECIFICATIONS */}
          {specRows.length > 0 && (
            <div className="rsp-card">
              <SectionHeader icon={<TagIcon size={18} />} title="Product Specification" />
              <table className="rsp-spec-table">
                <tbody>
                  {specRows.map(({ key, value }) => (
                    <tr key={key}>
                      <td className="rsp-spec-key">{key}</td>
                      <td className="rsp-spec-val">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SIZE CHART */}
          {sizeChartDisplayUrl && (
            <div className="rsp-card">
              <SectionHeader icon={<ImageIcon size={18} />} title="Size Chart" />
              <div className="rsp-size-chart-wrap">
                <img
                  src={sizeChartDisplayUrl}
                  alt="Size Chart"
                  className="rsp-size-chart-img"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
            </div>
          )}

          {/* KEYWORDS */}
          {keywords && keywords.length > 0 && (
            <div className="rsp-card">
              <SectionHeader icon={<TagIcon size={18} />} title="Keywords" />
              <div className="rsp-keywords">
                {keywords.map((kw) => (
                  <span key={kw} className="rsp-keyword-chip">{kw}</span>
                ))}
              </div>
            </div>
          )}

          {/* PROMOTION IMAGE */}
          {promotionImage?.url && (
            <div className="rsp-card">
              <SectionHeader icon={<ImageIcon size={18} />} title="Promotion Image" />
              <div className="rsp-promo-img-wrap">
                <img
                  src={promotionImage.url}
                  alt="Promotion"
                  className="rsp-promo-img"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
            </div>
          )}

          {/* SETTLEMENT SUMMARY */}
          <div className="rsp-card rsp-card--settlement">
            <SectionHeader icon={<ReceiptIcon size={18} />} title="Settlement Summary" />

            {settlementLoading && (
              <div className="rsp-settlement-loading">
                <LoaderIcon size={20} />
                <span>Calculating settlement…</span>
              </div>
            )}

            {settlementError && !settlementLoading && (
              <div className="rsp-settlement-error">
                <AlertIcon size={15} />
                <span>{settlementError}</span>
              </div>
            )}

            {!settlementLoading && settlement && (
              <div className="rsp-settlement-body">
                <SettlementRow label="Product MRP"          value={`₹ ${price.toFixed(0)}`} />
                <SettlementRow label="Selling Price"        value={`₹ ${Number(settlement.sellingPrice || displayPrice).toFixed(0)}`} />
                <div className="rsp-settle-divider" />
                {settlement.commission > 0 && (
                  <SettlementRow label="Platform Commission" value={`- ₹${Number(settlement.commission).toFixed(0)}`} type="red" />
                )}
                {settlement.gstOnCommission > 0 && (
                  <SettlementRow label="GST on Platform Commission" value={`- ₹${Number(settlement.gstOnCommission).toFixed(0)}`} type="red" />
                )}
                {settlement.pgCharges > 0 && (
                  <SettlementRow label="PG Charges" value={`- ₹${Number(settlement.pgCharges).toFixed(0)}`} type="red" />
                )}
                {settlement.gstOnPgCharges > 0 && (
                  <SettlementRow label="GST on PG Charges" value={`- ₹${Number(settlement.gstOnPgCharges).toFixed(0)}`} type="red" />
                )}
                {settlement.productGST > 0 && (
                  <SettlementRow label="Product GST" value={`- ₹${Number(settlement.productGST).toFixed(0)}`} type="red" />
                )}
                {settlement.tcs > 0 && (
                  <SettlementRow label="TCS" value={`- ₹${Number(settlement.tcs).toFixed(0)}`} type="red" />
                )}
                {settlement.tds > 0 && (
                  <SettlementRow label="TDS" value={`- ₹${Number(settlement.tds).toFixed(0)}`} type="red" />
                )}
                {settlement.shippingFee > 0 && (
                  <SettlementRow label="Approx Shipping Fee" value={`- ₹${Number(settlement.shippingFee).toFixed(0)}`} type="red" />
                )}
                {settlement.gstOnShippingFee > 0 && (
                  <SettlementRow label="GST on Shipping Fee" value={`- ₹${Number(settlement.gstOnShippingFee).toFixed(0)}`} type="red" />
                )}
                {settlement.fixedFee > 0 && (
                  <SettlementRow label="Fixed Fee" value={`- ₹${Number(settlement.fixedFee).toFixed(0)}`} type="red" />
                )}
                {settlement.handlingFee > 0 && (
                  <SettlementRow label="Handling Fee" value={`- ₹${Number(settlement.handlingFee).toFixed(0)}`} type="red" />
                )}
                <SettlementRow label="Total Debit" value={`- ₹${Number(settlement.totalDebit).toFixed(0)}`} type="red" />
                {settlement.note && (
                  <div className="rsp-settle-note">{settlement.note}</div>
                )}
                <div className="rsp-settle-divider" />
                <SettlementRow
                  label="Approx Settlement Amount:"
                  value={`₹ ${Number(settlement.settlementAmount).toFixed(0)}`}
                  bold
                />
              </div>
            )}
          </div>

       </div>
      </div>

      {/* INLINE ACTION BUTTONS — visible above fixed bar on create mode */}
      {!isUpdate && !isViewMode && (
        <div className="rsp-inline-actions">
          <button
            className={`rsp-action-btn rsp-action-btn--draft ${draftLoading ? "rsp-action-btn--loading" : ""} ${draftSuccess ? "rsp-action-btn--success" : ""}`}
            onClick={handleSaveAsDraft}
            disabled={anyActionRunning || anyActionSuccess}
          >
            {draftLoading ? (
              <><LoaderIcon size={15} /> Saving…</>
            ) : draftSuccess ? (
              <><CheckCircleIcon size={15} /> Saved!</>
            ) : (
              <><SaveIcon size={15} /> Save as Draft</>
            )}
          </button>
          <button
            className={`rsp-action-btn rsp-action-btn--qc ${qcLoading ? "rsp-action-btn--loading" : ""} ${qcSuccess ? "rsp-action-btn--success" : ""}`}
            onClick={handleSendForQC}
            disabled={anyActionRunning || anyActionSuccess}
          >
            {qcLoading ? (
              <><LoaderIcon size={15} /> Sending…</>
            ) : qcSuccess ? (
              <><CheckCircleIcon size={15} /> Sent!</>
            ) : (
              <><SendIcon size={15} /> Send for QC</>
            )}
          </button>
        </div>
      )}

      
    </div>
  );
};

export default ReviewSubmitPage;