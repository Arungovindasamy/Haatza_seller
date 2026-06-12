// InProgressListings.js
import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Eye, Edit2, Copy, Trash2, RefreshCw, Search, Package,
  AlertTriangle, Plus, ChevronLeft, ChevronRight, MoreVertical, ArrowLeft,
  ChevronDown, ChevronUp,
} from "lucide-react";
import {
  fetchInProgressListings,
  fetchInProgressProductDetails,
} from "../../../api/InProgressListingsApi";
import "./InProgressListings.css";

// ─── Wix Image Utilities ──────────────────────────────────────────────────────
const resolveWixImage = (img) => {
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
const normaliseProductOptions = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "object") {
    return Object.entries(val).map(([key, opt]) => ({
      name:       opt?.name || key,
      optionType: opt?.optionType || "drop_down",
      choices:    opt?.choices || [],
    }));
  }
  return [];
};

// Helper to resolve color image from a choice object
const resolveChoiceImage = (choice) => {
  if (!choice?.mediaItems || choice.mediaItems.length === 0) return null;
  const item = choice.mediaItems[0];
  if (typeof item === "string") return resolveWixImage(item);
  return resolveWixImage(item?.src || item?.url || item);
};

const normaliseVariantRows = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) {
    if (val.length === 0) return [];
    if (!val[0]?.variantInfo && !val[0]?.products) return val;
  }
  const products = Array.isArray(val)
    ? val
    : Array.isArray(val?.products)
      ? val.products
      : [];

  const EXCLUDED_VARIANT_KEYS = new Set(["weight"]);

  const rows = [];
  for (const product of products) {
    const variants = Array.isArray(product?.variantInfo) ? product.variantInfo : [];
    for (const variant of variants) {
      const { choices = {}, ...rest } = variant;
      const filtered = Object.fromEntries(
        Object.entries({ ...choices, ...rest }).filter(([k]) => !EXCLUDED_VARIANT_KEYS.has(k.toLowerCase()))
      );
      rows.push(filtered);
    }
  }
  return rows;
};

const resolveImageList = (field) => {
  if (!field) return [];
  const arr = Array.isArray(field) ? field : [field];
  return arr
    .map((item) => {
      if (!item) return null;
      // mediaItems shape: { src, id, type }
      if (typeof item === "object") {
        const raw = item.src || item.url || item.image || item.imageUrl || null;
        if (raw) return resolveWixImage(raw);
        return null;
      }
      return resolveWixImage(item);
    })
    .filter(Boolean);
};

// ─── Email resolution — checks every known storage location ──────────────────
const resolveSellerEmail = (locationState) => {
  console.group("[InProgressListings] resolveSellerEmail");

  // 0. Check pendingEmail in sessionStorage first (most reliable after navigation)
  const pending = sessionStorage.getItem("pendingEmail");
  if (pending && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pending.trim())) {
    console.log("✅ Found in sessionStorage pendingEmail:", pending);
    console.groupEnd();
    return pending.trim().toLowerCase();
  }

  // 1. location.state.email (passed explicitly by navigate)
  const stateEmail = locationState?.email;
  if (stateEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stateEmail.trim())) {
    console.log("✅ Found in location.state.email:", stateEmail);
    console.groupEnd();
    return stateEmail.trim().toLowerCase();
  }

  // 2. sessionStorage — plain string keys
  const sessionKeys = [
    "userEmail", "email", "sellerEmail",
    "user_email", "seller_email", "currentUserEmail",
  ];
  for (const key of sessionKeys) {
    const val = sessionStorage.getItem(key);
    if (!val) continue;
    const trimmed = val.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      console.log(`✅ Found in sessionStorage["${key}"]:`, trimmed);
      console.groupEnd();
      return trimmed.toLowerCase();
    }
    try {
      const parsed = JSON.parse(trimmed);
      const found  =
        parsed?.email || parsed?.userEmail || parsed?.sellerEmail ||
        parsed?.user_email || parsed?.seller_email;
      if (found && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(found.trim())) {
        console.log(`✅ Found in sessionStorage["${key}"] (JSON).email:`, found);
        console.groupEnd();
        return found.trim().toLowerCase();
      }
    } catch { /* not JSON */ }
  }

  // 3. localStorage — plain string keys and nested JSON
  const localKeys = [
    "userEmail", "pendingEmail", "email", "sellerEmail",
    "user_email", "seller_email", "user", "authUser",
    "currentUser", "seller", "userData", "sellerData",
    "auth", "session", "loginData", "accountData",
  ];
  const emailFields = [
    "email", "userEmail", "sellerEmail", "user_email",
    "seller_email", "emailAddress", "loginEmail",
  ];

  for (const key of localKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    const trimmed = raw.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      console.log(`✅ Found in localStorage["${key}"]:`, trimmed);
      console.groupEnd();
      return trimmed.toLowerCase();
    }

    try {
      const parsed = JSON.parse(trimmed);
      for (const field of emailFields) {
        const found = parsed?.[field];
        if (found && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(found).trim())) {
          console.log(`✅ Found in localStorage["${key}"].${field}:`, found);
          console.groupEnd();
          return String(found).trim().toLowerCase();
        }
      }
      // nested one level deep
      const nestedPaths = ["user", "data", "account", "seller", "profile"];
      for (const nest of nestedPaths) {
        const nested = parsed?.[nest];
        if (nested && typeof nested === "object") {
          for (const field of emailFields) {
            const found = nested[field];
            if (found && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(found).trim())) {
              console.log(`✅ Found in localStorage["${key}"].${nest}.${field}:`, found);
              console.groupEnd();
              return String(found).trim().toLowerCase();
            }
          }
        }
      }
    } catch { /* not JSON */ }
  }

  console.warn("❌ Email not found in location.state, sessionStorage, or localStorage.");
  console.log("sessionStorage keys:", Object.keys(sessionStorage));
  console.log("localStorage keys:", Object.keys(localStorage));
  console.groupEnd();
  return null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23f1f3f6' rx='8'/%3E%3Ctext x='30' y='35' text-anchor='middle' fill='%23b0b7c3' font-size='22'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E";
const FALLBACK_IMG_SMALL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23f1f3f6' rx='8'/%3E%3Ctext x='30' y='35' text-anchor='middle' fill='%23b0b7c3' font-size='22'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E";

const computeFinalPrice = (price, discount) => {
  if (!discount?.type || discount.value == null) return price;
  if (discount.type === "AMOUNT")     return Math.max(0, price - discount.value);
  if (discount.type === "PERCENTAGE") return Math.max(0, price - (price * discount.value) / 100);
  return price;
};

const formatDiscount = (discount) => {
  if (!discount?.type || discount.value == null) return null;
  if (discount.type === "AMOUNT")     return `₹${discount.value} Off`;
  if (discount.type === "PERCENTAGE") return `${discount.value}% Off`;
  return null;
};

const statusClass = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "approved")          return "ip-badge ip-badge--approved";
  if (s === "pending")           return "ip-badge ip-badge--pending";
  if (s === "rejected")          return "ip-badge ip-badge--rejected";
  if (s === "under review")      return "ip-badge ip-badge--pending";
  if (s === "update_requested" || s === "update requested") return "ip-badge ip-badge--update";
  if (s === "draft")             return "ip-badge ip-badge--draft";
  return "ip-badge ip-badge--draft";
};

const resolveKeywords = (kw) => {
  if (!kw) return [];
  if (Array.isArray(kw)) return kw.map(k => (typeof k === "string" ? k : String(k))).filter(Boolean);
  if (typeof kw === "string") return kw.split(",").map(k => k.trim()).filter(Boolean);
  return [];
};

/**
 * FIX: Broadened status filter to include all statuses saved by the listing flow.
 * Original code had no explicit frontend filter, but the backend `type:"inprogress"`
 * param may only return one subset. Now we also client-side allow all these statuses.
 *
 * "Draft"            — saved via Save as Draft
 * "Under Review"     — saved via Send for QC or Update Listing
 * "Pending"          — legacy / alternate spelling
 * "Approved"         — admin-approved listings
 * "Rejected"         — admin-rejected listings
 * "Update_Requested" — admin requested seller update
 */
const VISIBLE_STATUSES = new Set([
  "draft",
  "under review",
  "pending",
  "approved",
  "rejected",
  "update_requested",
  "update requested",
]);

// ─── Sub-components ───────────────────────────────────────────────────────────
const CollapseSection = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ip-modal-section">
      <button className="ip-modal-section-header" onClick={() => setOpen(v => !v)}>
        <h4 className="ip-modal-section-title">{title}</h4>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div className="ip-modal-section-body">{children}</div>}
    </div>
  );
};

const SkeletonRow = () => (
  <tr>
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i}>
        <div
          className={
            i === 0 ? "ip-skeleton ip-skeleton-img"
            : i === 5 ? "ip-skeleton ip-skeleton-badge"
            : "ip-skeleton ip-skeleton-text"
          }
          style={i !== 0 && i !== 5 ? { width: `${50 + (i % 3) * 20}%` } : {}}
        />
      </td>
    ))}
  </tr>
);

const SkeletonCard = () => (
  <div className="ip-mobile-card ip-mobile-card--skeleton">
    <div className="ip-skeleton ip-skeleton-img" style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0 }} />
    <div className="ip-mobile-card__info">
      <div className="ip-skeleton ip-skeleton-text" style={{ width: "60%", marginBottom: 8 }} />
      <div className="ip-skeleton ip-skeleton-text" style={{ width: "35%" }} />
    </div>
    <div className="ip-skeleton ip-skeleton-badge" style={{ flexShrink: 0 }} />
  </div>
);

const DotMenu = ({ onView, onEdit, onDuplicate, onDelete }) => {
  const [open,   setOpen]   = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const btnRef  = useRef(null);
  const menuRef = useRef(null);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    const handler = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current  && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [open]);

  return (
    <div className="ip-dot-menu">
      <button ref={btnRef} className="ip-dot-btn" onClick={handleToggle} aria-label="More actions">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div ref={menuRef} className="ip-dropdown" style={{ top: coords.top, right: coords.right }}>
          <button onClick={() => { onView();      setOpen(false); }}><Eye size={14} /> View</button>
          <button onClick={() => { onEdit();      setOpen(false); }}><Edit2 size={14} /> Edit</button>
          <button onClick={() => { onDuplicate(); setOpen(false); }}><Copy size={14} /> Duplicate</button>
          <button className="ip-dd-delete" onClick={() => { onDelete(); setOpen(false); }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const InProgressListings = ({ embedded = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const sellerEmail = useMemo(
    () => resolveSellerEmail(location.state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.state?.email, location.state?.timestamp, location.state?.refresh,
     location.pathname]
  );

  useEffect(() => {
    console.group("[InProgressListings] Identity diagnostics on mount/update");
    console.log("Fetched Seller Email (resolveSellerEmail):", sellerEmail);
    console.log("location.state:", location.state);
    console.log("sessionStorage pendingEmail:", sessionStorage.getItem("pendingEmail"));
    console.log("localStorage userEmail:", localStorage.getItem("userEmail"));
    console.log("localStorage email:", localStorage.getItem("email"));
    console.groupEnd();
  }, [sellerEmail, location.state]);

  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const LIMIT = 10;

  const [selectedProductId,      setSelectedProductId]      = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [detailsLoading,         setDetailsLoading]         = useState(false);
  const [detailsError,           setDetailsError]           = useState(null);
  const [activeImage,            setActiveImage]            = useState(null);

  const [searchRaw,    setSearchRaw]    = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priceFilter,  setPriceFilter]  = useState("all");

  const [allProducts,   setAllProducts]   = useState([]);
  const [isFetchingAll, setIsFetchingAll] = useState(false);

  // ── fetch helpers ────────────────────────────────────────────────────────────
  const fetchAllProducts = useCallback(async () => {
    if (!sellerEmail) return;
    setIsFetchingAll(true);
    try {
      const first = await fetchInProgressListings({ email: sellerEmail, page: 1, limit: 100 });
      let all = [...first.products];
      if (first.totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: first.totalPages - 1 }, (_, i) =>
            fetchInProgressListings({ email: sellerEmail, page: i + 2, limit: 100 })
          )
        );
        rest.forEach(r => { all = all.concat(r.products); });
      }
      setAllProducts(all);

      // ── Diagnostic: all-products status breakdown ─────────────────────────
      console.group("[InProgressListings:fetchAllProducts] Status breakdown");
      const byStatus = all.reduce((acc, p) => {
        const s = p.status || "unknown";
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      console.log("All products by status:", byStatus);
      console.log("Total fetched:", all.length);
      console.groupEnd();
    } catch (err) {
      console.error("[InProgressListings] fetchAll error:", err);
    } finally {
      setIsFetchingAll(false);
    }
  }, [sellerEmail]);

  const loadListings = useCallback(async (pageNum = 1) => {
    if (!sellerEmail) {
      console.warn("[InProgressListings] loadListings skipped — no sellerEmail");
      return;
    }
    // Resolve sellerId the same way the API does — for cross-checking
    const resolveLocalSellerId = () => {
      const keys = ["sellerId", "seller_id", "userId", "user_id", "user", "authUser", "currentUser", "userData", "sellerData"];
      for (const key of keys) {
        const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
        if (!raw) continue;
        if (raw.length > 3 && !raw.startsWith("{") && !raw.startsWith("[")) return raw.trim();
        try {
          const parsed = JSON.parse(raw);
          const val = parsed?.sellerId || parsed?.seller_id || parsed?.userId || parsed?.user?.sellerId || parsed?.data?.sellerId || null;
          if (val) return String(val).trim();
        } catch { /* not JSON */ }
      }
      return "";
    };

    const diagSellerId = resolveLocalSellerId();
    console.group(`[InProgressListings] loadListings — page ${pageNum}`);
    console.log("Fetched Seller Email:", sellerEmail);
    console.log("Logged In Seller ID:", diagSellerId || "❌ NOT FOUND");
    console.log("Page:", pageNum);
    console.log("=== ALL STORAGE KEYS ===");
    console.log("sessionStorage.__haatza_sellerId:", sessionStorage.getItem("__haatza_sellerId"));
    console.log("sessionStorage.sellerId:", sessionStorage.getItem("sellerId"));
    console.log("localStorage.__haatza_sellerId:", localStorage.getItem("__haatza_sellerId"));
    console.log("localStorage.sellerId:", localStorage.getItem("sellerId"));
    console.log("sessionStorage.pendingEmail:", sessionStorage.getItem("pendingEmail"));
    console.log("localStorage.userEmail:", localStorage.getItem("userEmail"));
    console.groupEnd();

    setLoading(true);
    setError(null);
    try {
      const result = await fetchInProgressListings({
        email: sellerEmail, page: pageNum, limit: LIMIT,
      });

      // ── Diagnostic: what came back from the API ───────────────────────────
      console.group("[InProgressListings:loadListings] API result");
      console.log("In Progress Response — products:", result.products);
      console.log("Total:", result.total, "Pages:", result.totalPages);
      result.products.forEach((p, i) => {
        console.log(`  [${i}] name="${p.name}" status="${p.status}" id=${p.Table_ID || p._id}`);
      });

      // FIX: log if any products would be filtered out by the old "In Progress" check
      const wouldBeFilteredOut = result.products.filter(
        p => (p.status || "").toLowerCase() === "in progress"
      );
      if (wouldBeFilteredOut.length > 0) {
        console.warn(
          '[InProgressListings] NOTE: These products have status "In Progress" (old value) —',
          wouldBeFilteredOut.map(p => p.name)
        );
      }
      console.groupEnd();

      console.group("[InProgressListings:loadListings] Raw listings received");
      console.log("In Progress API Response — total:", result.total, "pages:", result.totalPages);
      console.log("Raw Listings", result.products);
      result.products.forEach((p, i) => {
        console.log(`  Raw[${i}] id=${p.Table_ID || p._id} name="${p.name}" status="${p.status}"`);
      });
      console.groupEnd();

      setProducts(result.products);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error("[InProgressListings] loadListings error:", err);
      setError(err.message || "Unable to load in-progress listings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [sellerEmail]);

  // ── initial load + page changes ──────────────────────────────────────────────
  useEffect(() => {
    if (sellerEmail) {
      loadListings(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sellerEmail]);

  // Extra: if email resolves after mount, trigger a fresh fetch
  useEffect(() => {
    if (sellerEmail) {
      loadListings(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerEmail]);

  // ── auto-refresh when navigated back from create/update flow ─────────────────
  useEffect(() => {
    if (location.state?.refresh && sellerEmail) {
      console.log("[InProgressListings] Auto-refresh triggered — timestamp:", location.state.timestamp);
      // FIX: reset to page 1 so the newest item is visible immediately
      setPage(1);
      loadListings(1);
      fetchAllProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.timestamp, sellerEmail]);

  // ── search debounce ──────────────────────────────────────────────────────────
  const debounceRef = useRef(null);
  const handleSearchChange = (val) => {
    setSearchRaw(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = val.trim().toLowerCase();
      setSearch(trimmed);
      setPage(1);
      if (trimmed && allProducts.length === 0) fetchAllProducts();
    }, 350);
  };

  // ── view details modal ───────────────────────────────────────────────────────
  const handleViewDetails = async (tableId) => {
    if (!tableId) return;
    setSelectedProductId(tableId);
    setDetailsLoading(true);
    setDetailsError(null);
    setSelectedProductDetails(null);
    setActiveImage(null);
    try {
      const details = await fetchInProgressProductDetails(tableId);
      setSelectedProductDetails(details);
      setActiveImage(resolveWixImage(details.mainmedia) || null);
    } catch (err) {
      setDetailsError(err.message || "Failed to load product details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedProductDetails(null);
    setDetailsLoading(false);
    setDetailsError(null);
    setSelectedProductId(null);
    setActiveImage(null);
  };

  // ── edit ─────────────────────────────────────────────────────────────────────
  const handleEditListing = async (tableId) => {
    if (!tableId) return;
    try {
      const res = await fetch(
        `https://www.haatza.com/_functions/sellerProductDetails?Table_ID=${tableId}`
      );
      if (!res.ok) throw new Error(`Failed to fetch product details (${res.status})`);
      const editData = await res.json();
      const isDraft = editData?.status === "Draft";
navigate(`/dashboard/listing/edit/${tableId}/product-info`, {
  state: { editData, tableId, isEditMode: true, isDraftMode: isDraft, email: sellerEmail },
});
    } catch (err) {
      console.error("[InProgressListings] Edit fetch error:", err);
      alert("Failed to load product for editing. Please try again.");
    }
  };

  // ── duplicate ────────────────────────────────────────────────────────────────
  const handleDuplicateListing = async (tableId) => {
    if (!tableId) return;
    try {
      const res = await fetch(
        `https://www.haatza.com/_functions/sellerProductDetails?Table_ID=${tableId}`
      );
      if (!res.ok) throw new Error(`Failed to fetch product details (${res.status})`);
      const rawData = await res.json();

      const duplicateData = { ...rawData };
      [
        "Table_ID", "tableId", "table_id", "productId", "product_id",
        "_id", "id", "sellerId", "seller_id", "status",
        "createdAt", "updatedAt", "created_at", "updated_at",
      ].forEach(k => delete duplicateData[k]);

      const category = {
        name: duplicateData.categoryName || "",
        _id:  duplicateData.categoryId   || duplicateData.CategoryID || "",
      };
      const subcategory = {
        name:          duplicateData.subCategory   || "",
        _id:           duplicateData.subCategoryId || duplicateData.SubCategoryID || duplicateData.subcategoryId || "",
        subcategoryId: duplicateData.subCategoryId || duplicateData.SubCategoryID || duplicateData.subcategoryId || "",
        SubCategoryID: duplicateData.SubCategoryID || "",
      };

      navigate(`/dashboard/listing/select-category/product-info`, {
        state: {
          category,
          subcategory,
          editData:        duplicateData,
          isEditMode:      false,
          isDuplicateMode: true,
          tableId:         null,
          email:           sellerEmail,
        },
      });
    } catch (err) {
      console.error("[InProgressListings] Duplicate fetch error:", err);
      alert("Failed to load product for duplication. Please try again.");
    }
  };

  // ── filtered list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = search ? [...allProducts] : [...products];

    // FIX: Broadened status filter — show Draft, Under Review, Pending,
    // Approved, Rejected, Update_Requested. Exclude nothing unless the
    // user explicitly selects a status filter.
    // NOTE: We do NOT apply VISIBLE_STATUSES as a hard filter here because
    // the backend should already return only the seller's products. If a
    // product has an unexpected status value, we still show it so the
    // seller can see it, rather than silently hiding it.

    if (search) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        String(p.Table_ID || "").toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      // FIX: case-insensitive comparison so "Under Review" vs "under review" both match
      list = list.filter(p =>
        (p.status || "").toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (priceFilter !== "all") {
      list = list.filter(p => {
        const fp = computeFinalPrice(Number(p.price) || 0, p.discount || {});
        if (priceFilter === "0-500")     return fp >= 0   && fp <= 500;
        if (priceFilter === "500-1000")  return fp > 500  && fp <= 1000;
        if (priceFilter === "1000-5000") return fp > 1000 && fp <= 5000;
        if (priceFilter === "5000+")     return fp > 5000;
        return true;
      });
      list.sort((a, b) =>
        computeFinalPrice(Number(a.price) || 0, a.discount || {}) -
        computeFinalPrice(Number(b.price) || 0, b.discount || {})
      );
    }

    // ── Diagnostic: log what's shown after filtering ──────────────────────
    console.group("[InProgressListings:filtered] Final rendered listings");
    console.log(`Filtered Listings — showing ${list.length} (statusFilter="${statusFilter}", priceFilter="${priceFilter}", search="${search}")`);
    list.forEach((p, i) => {
      console.log(`  Filtered[${i}] id=${p.Table_ID || p._id} name="${p.name}" status="${p.status}" price=${p.price}`);
    });
    if (list.length === 0) {
      console.warn("[InProgressListings:filtered] ⚠️ No listings shown — check: (1) sellerId mismatch between save/fetch, (2) status filter, (3) API returned 0 products");
    }
    console.groupEnd();

    return list;
  }, [products, allProducts, search, statusFilter, priceFilter]);

  const fromItem = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const toItem   = Math.min(page * LIMIT, total);

  // ── no email guard ───────────────────────────────────────────────────────────
  if (!sellerEmail) {
    return (
      <div className="ip-root">
        <div className="ip-card">
          <div className="ip-error">
            <div className="ip-error-icon"><AlertTriangle size={32} /></div>
            <h3>Session Not Found</h3>
            <p>Unable to retrieve your account information. Please sign in again.</p>
            <div className="ip-error-btns">
              <button className="ip-btn-primary" onClick={() => navigate("/signin")}>
                Go to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="ip-root">

      <div className="ip-header">
        <div className="ip-header-left">
          {!embedded && (
            <button className="ip-back-btn" onClick={() => navigate("/dashboard/listing")}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <h1>In Progress Listings</h1>
          <p>Products currently under review or processing</p>
        </div>

        <div className="ip-controls">
          <div className="ip-search-wrap">
            <Search size={14} />
            <input
              className="ip-search"
              type="text"
              placeholder="Search product or ID..."
              value={searchRaw}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </div>

          <select className="ip-select" value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="under review">Under Review</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="draft">Draft</option>
            <option value="update_requested">Update Requested</option>
          </select>

          <select className="ip-select" value={priceFilter}
            onChange={e => { setPriceFilter(e.target.value); setPage(1); }}>
            <option value="all">All Prices</option>
            <option value="0-500">₹0 - ₹500</option>
            <option value="500-1000">₹500 - ₹1000</option>
            <option value="1000-5000">₹1000 - ₹5000</option>
            <option value="5000+">₹5000+</option>
          </select>

          <button className="ip-btn-refresh" onClick={() => loadListings(page)} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="ip-card">
        {error && !loading && (
          <div className="ip-error">
            <div className="ip-error-icon"><AlertTriangle size={32} /></div>
            <h3>Unable to load listings</h3>
            <p>{error}</p>
            <div className="ip-error-btns">
              <button className="ip-btn-primary" onClick={() => loadListings(page)}>Retry</button>
              <button className="ip-btn-outline"
                onClick={() => { setPage(1); setTimeout(() => loadListings(1), 0); }}>
                <RefreshCw size={14} /> Refresh Listings
              </button>
            </div>
          </div>
        )}

        {!error && (
          <>
            {/* ── Desktop table ── */}
            <div className="ip-table-wrap">
              <table className="ip-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Product Name</th>
                    <th>Price</th>
                    <th>Discount</th>
                    <th>Final Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && Array.from({ length: LIMIT }).map((_, i) => <SkeletonRow key={i} />)}

                  {!loading && filtered.map(product => {
                    const price         = Number(product.price) || 0;
                    const discount      = product.discount || {};
                    const finalPrice    = computeFinalPrice(price, discount);
                    const discountLabel = formatDiscount(discount);

                    return (
                      <tr key={product.Table_ID || product._id || Math.random()}>
                        <td>
                          <img
                            className="ip-img"
                            src={resolveWixImage(product.mainmedia) || FALLBACK_IMG_SMALL}
                            alt={product.name || "Product"}
                            onError={e => { e.target.onerror = null; e.target.src = FALLBACK_IMG_SMALL; }}
                          />
                        </td>
                        <td>
                          <button
                            className="ip-name-btn"
                            title={product.name || "-"}
                            onClick={() => handleViewDetails(product.Table_ID)}
                          >
                            {product.name || "-"}
                          </button>
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                            ID: {product.productId || product.Table_ID || "-"}
                          </div>
                        </td>
                        <td><span className="ip-price">₹{price.toFixed(2)}</span></td>
                        <td>
                          {discountLabel
                            ? <span className="ip-discount">{discountLabel}</span>
                            : <span className="ip-no-discount">—</span>}
                        </td>
                        <td><span className="ip-final-price">₹{finalPrice.toFixed(2)}</span></td>
                        <td>
                          <span className={statusClass(product.status)}>
                            {product.status || "Draft"}
                          </span>
                        </td>
                        <td>
                          <div className="ip-actions">
                            <button className="ip-action-btn" title="View Details"
                              onClick={() => handleViewDetails(product.Table_ID)}>
                              <Eye size={15} />
                            </button>
                            <button className="ip-action-btn" title="Edit"
                              onClick={() => handleEditListing(product.Table_ID)}>
                              <Edit2 size={15} />
                            </button>
                            <button className="ip-action-btn" title="Duplicate"
                              onClick={() => handleDuplicateListing(product.Table_ID)}>
                              <Copy size={15} />
                            </button>
                            <button className="ip-action-btn ip-action-btn--delete" title="Delete"
                              onClick={() => console.log("Delete:", product.Table_ID)}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div className="ip-mobile-list">
              {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}

              {!loading && filtered.map(product => {
                const price      = Number(product.price) || 0;
                const finalPrice = computeFinalPrice(price, product.discount || {});

                return (
                  <div className="ip-mobile-card" key={product.Table_ID || product._id || Math.random()}>
                    <img
                      className="ip-mobile-card__img"
                      src={resolveWixImage(product.mainmedia) || FALLBACK_IMG_SMALL}
                      alt={product.name || "Product"}
                      onError={e => { e.target.onerror = null; e.target.src = FALLBACK_IMG_SMALL; }}
                    />
                    <div className="ip-mobile-card__info">
                      <button
                        className="ip-mobile-card__name"
                        onClick={() => handleViewDetails(product.Table_ID)}
                      >
                        {product.name || "-"}
                      </button>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", marginBottom: "4px" }}>
                        ID: {product.productId || product.Table_ID || "-"}
                      </div>
                      <span className="ip-mobile-card__price">₹{finalPrice.toFixed(2)}</span>
                    </div>
                    <div className="ip-mobile-card__right">
                      <span className={statusClass(product.status)}>
                        {product.status || "Draft"}
                      </span>
                      <DotMenu
                        onView={()      => handleViewDetails(product.Table_ID)}
                        onEdit={()      => handleEditListing(product.Table_ID)}
                        onDuplicate={() => handleDuplicateListing(product.Table_ID)}
                        onDelete={()    => console.log("Delete:", product.Table_ID)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {!loading && filtered.length === 0 && !error && (
              <div className="ip-empty">
                <div className="ip-empty-icon"><Package size={32} /></div>
                <h3>No In-Progress Listings</h3>
                <p>
                  {search || statusFilter !== "all" || priceFilter !== "all"
                    ? "No products match your current filters."
                    : "You have no products currently under review."}
                </p>
                <button className="ip-btn-primary"
                  onClick={() => navigate("/dashboard/listing/select-category")}>
                  <Plus size={15} /> Create Listing
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="ip-pagination">
            <div className="ip-pagination-info">
              Showing <span>{fromItem}–{toItem}</span> of <span>{total}</span> products
            </div>
            <div className="ip-pagination-controls">
              <button className="ip-page-btn" disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} /><span className="ip-page-btn-prev-label"> Previous</span>
              </button>
              <span className="ip-page-indicator">
                Page <span>{page}</span> of <span>{totalPages}</span>
              </span>
              <button className="ip-page-btn" disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Details Modal ── */}
      {(detailsLoading || selectedProductDetails || detailsError) && (
        <div className="ip-modal-overlay" onClick={handleCloseModal}>
          <div className="ip-modal-card" onClick={e => e.stopPropagation()}>
            <button className="ip-modal-close" onClick={handleCloseModal} aria-label="Close">
              &times;
            </button>

            {detailsLoading && (
              <div className="ip-modal-loading">
                <div className="ip-spinner" />
                <p>Fetching product details...</p>
              </div>
            )}

            {detailsError && (
              <div className="ip-modal-error">
                <div className="ip-error-icon"><AlertTriangle size={32} /></div>
                <h3>Failed to load product details</h3>
                <p>{detailsError}</p>
                <button className="ip-btn-primary"
                  onClick={() => handleViewDetails(selectedProductId)}>
                  Retry
                </button>
              </div>
            )}

            {!detailsLoading && selectedProductDetails && (() => {
              const d = selectedProductDetails;

              // Fields are pre-normalised by fetchInProgressProductDetails
              const mainResolved = resolveWixImage(d.mainmedia);

              // Build image list from all available sources, deduplicated
              const productImgList = [
                ...(mainResolved ? [mainResolved] : []),
                ...resolveImageList(d.productImages),
                ...resolveImageList(d.mediaItems),
              ];
              const uniqueImgList = [...new Set(productImgList.filter(Boolean))];

              const promoPhotos = resolveImageList(d.promotionPhotos);
              const variantRows   = normaliseVariantRows(d.varientPrice).length > 0
                ? normaliseVariantRows(d.varientPrice) : null;
              const variantHeaders = variantRows ? Object.keys(variantRows[0] || {}) : [];

              const productOptions = normaliseProductOptions(d.productOptions).length > 0
                ? normaliseProductOptions(d.productOptions) : null;

              const additionalSections =
                Array.isArray(d.additionalInfoSections) && d.additionalInfoSections.length > 0
                  ? d.additionalInfoSections : null;

              const keywords = resolveKeywords(d.search_keywords);

              return (
                <div className="ip-modal-content">
                  <h2 className="ip-modal-title">Product Details</h2>

                  <div className="ip-modal-body">

                    {/* Gallery */}
                    <div className="ip-modal-gallery-col">
                      <div className="ip-modal-gallery">
                        <img
                          className="ip-modal-img"
                          src={activeImage || resolveWixImage(d.mainmedia) || FALLBACK_IMG}
                          alt={d.name || "Product"}
                          onError={e => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }}
                        />
                        <div className="ip-modal-status">
                          <span className={statusClass(d.status)}>{d.status || "Draft"}</span>
                        </div>
                      </div>

                      {uniqueImgList.length > 1 && (
                        <div className="ip-modal-thumbnails">
                          {uniqueImgList.map((url, idx) => (
                            <img
                              key={idx}
                              className={`ip-modal-thumb${activeImage === url ? " ip-modal-thumb--active" : ""}`}
                              src={url}
                              alt={`${d.name || "Product"} ${idx + 1}`}
                              onClick={() => setActiveImage(url)}
                              onError={e => { e.target.src = FALLBACK_IMG_SMALL; }}
                            />
                          ))}
                        </div>
                      )}

                      {promoPhotos.length > 0 && (
                        <div className="ip-modal-promo-section">
                          <p className="ip-modal-promo-label">Promotion Photos</p>
                          <div className="ip-modal-thumbnails">
                            {promoPhotos.map((url, idx) => (
                              <img
                                key={idx}
                                className="ip-modal-thumb ip-modal-thumb--promo"
                                src={url}
                                alt={`Promotion ${idx + 1}`}
                                onClick={() => setActiveImage(url)}
                                onError={e => { e.target.src = FALLBACK_IMG_SMALL; }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="ip-modal-info">
                      <h3 className="ip-modal-name">{d.name || "—"}</h3>
                      {d.brand && <p className="ip-modal-brand">{d.brand}</p>}
                      <p className="ip-modal-brand" style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", textTransform: "none" }}>
                        Product ID: {d.productId || d.Table_ID || d._id || "Not Available"}
                      </p>

                      <CollapseSection title="Identification">
                        <div className="ip-modal-grid">
                          <div className="ip-modal-field">
                            <span className="ip-modal-label">Product ID</span>
                            <span className="ip-modal-value ip-modal-value--id">
                              {d.Table_ID || d.productId || d.tableId || d._id || "Not Available"}
                            </span>
                          </div>
                          <div className="ip-modal-field">
                            <span className="ip-modal-label">Seller ID</span>
                            <span className="ip-modal-value">{d.sellerId || "Not Available"}</span>
                          </div>
                          <div className="ip-modal-field">
                            <span className="ip-modal-label">Status</span>
                            <span className="ip-modal-value">{d.status || "Draft"}</span>
                          </div>
                          <div className="ip-modal-field">
                            <span className="ip-modal-label">Manage Variants</span>
                            <span className="ip-modal-value">
                              {d.manageVariants === true ? "Yes"
                                : d.manageVariants === false ? "No"
                                : "Not Available"}
                            </span>
                          </div>
                        </div>
                      </CollapseSection>

                      <CollapseSection title="Pricing">
                        <div className="ip-modal-grid">
                          <div className="ip-modal-field">
                            <span className="ip-modal-label">Original Price</span>
                            <span className="ip-modal-value">₹{Number(d.price || 0).toFixed(2)}</span>
                          </div>
                          <div className="ip-modal-field">
                            <span className="ip-modal-label">Discount</span>
                            <span className="ip-modal-value ip-modal-value--discount">
                              {formatDiscount(d.discount) || "Not Applicable"}
                            </span>
                          </div>
                          <div className="ip-modal-field">
                            <span className="ip-modal-label">Final Price</span>
                            <span className="ip-modal-value ip-modal-value--final">
                              ₹{computeFinalPrice(Number(d.price || 0), d.discount).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CollapseSection>

                      <CollapseSection title="Category">
                        <div className="ip-modal-grid">
                          <div className="ip-modal-field">
                            <span className="ip-modal-label">Category Name</span>
                            <span className="ip-modal-value">
                              {Array.isArray(d.categoryName)
                                ? d.categoryName.join(", ")
                                : d.categoryName || "Not Available"}
                            </span>
                          </div>
                          <div className="ip-modal-field">
                            <span className="ip-modal-label">Sub Category</span>
                            <span className="ip-modal-value">{d.subCategory || "Not Available"}</span>
                          </div>
                        </div>
                      </CollapseSection>

                      <CollapseSection title="Inventory & Shipping">
                        <div className="ip-modal-grid">
                          <div className="ip-modal-field">
                            <span className="ip-modal-label">Total Quantity</span>
                            <span className="ip-modal-value">
                              {d.totalQuantity ?? d.inventory ?? d.stock ?? "Not Available"}
                            </span>
                          </div>
                          <div className="ip-modal-field">
                            <span className="ip-modal-label">Shipping Weight</span>
                            <span className="ip-modal-value">
                              {d.shippingWeight ? `${d.shippingWeight} g` : "Not Available"}
                            </span>
                          </div>
                          <div className="ip-modal-field">
                            <span className="ip-modal-label">Delivery Charges</span>
                            <span className="ip-modal-value">
                              {d.deliveryCharges === false
                                ? "Not Applicable"
                                : d.deliveryCharges
                                  ? `₹${d.deliveryCharges}`
                                  : "Not Available"}
                            </span>
                          </div>
                        </div>
                      </CollapseSection>

                      {productOptions && (
                        <CollapseSection title="Product Options">
                          {productOptions.map((opt, idx) => {
                            const choices = opt.choices || opt.values || opt.options || [];
                            return (
                              <div key={idx} className="ip-modal-option-group">
                                <span className="ip-modal-option-name">
                                  {opt.name || `Option ${idx + 1}`}
                                </span>
                                <div className="ip-modal-option-chips">
                                  {choices.map((choice, ci) => {
                                    const label = typeof choice === "object"
                                      ? choice.description || choice.value || choice.name || ""
                                      : String(choice);
                                    const colorImg = resolveChoiceImage(choice);
                                    const isColor = opt.name?.toLowerCase() === "color" || opt.name?.toLowerCase() === "colour";
                                    return (
                                      <span key={ci} className="ip-modal-option-chip" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                        {isColor && choice?.value && /^#[0-9a-f]{3,6}/i.test(choice.value) && (
                                          <span style={{
                                            width: 10, height: 10, borderRadius: "50%",
                                            background: choice.value,
                                            border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0
                                          }}/>
                                        )}
                                        {label}
                                        {colorImg && (
                                          <img src={colorImg} alt={label}
                                            style={{ width: 18, height: 18, borderRadius: 3, objectFit: "cover", border: "1px solid rgba(0,0,0,0.1)" }}
                                            onError={e => { e.target.style.display = "none"; }}
                                          />
                                        )}
                                      </span>
                                    );
                                  })}
                                  {choices.length === 0 && <span className="ip-modal-value">—</span>}
                                </div>
                              </div>
                            );
                          })}
                        </CollapseSection>
                      )}

                      <CollapseSection title="Additional Information" defaultOpen={false}>
                        {additionalSections && additionalSections.length > 0 ? (
                          additionalSections.map((section, idx) => {
                            const skipKeys   = new Set(["title", "description"]);
                            const otherEntries = Object.entries(section).filter(
                              ([key, val]) => !skipKeys.has(key) && val != null && val !== ""
                            );
                            return (
                              <div key={idx} className="ip-modal-info-block">
                                {section.title && (
                                  <p className="ip-modal-info-block-title">{section.title}</p>
                                )}
                                {section.description && (
                                  <div
                                    className="ip-modal-info-block-body"
                                    dangerouslySetInnerHTML={{ __html: section.description }}
                                  />
                                )}
                                {otherEntries.length > 0 && (
                                  <div className="ip-modal-grid">
                                    {otherEntries.map(([key, val]) => (
                                      <div key={key} className="ip-modal-field">
                                        <span className="ip-modal-label">
                                          {key
                                            .replace(/([A-Z])/g, " $1")
                                            .replace(/^./, s => s.toUpperCase())
                                            .replace(/_/g, " ")}
                                        </span>
                                        <span className="ip-modal-value">
                                          {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="ip-modal-value">Not Applicable</p>
                        )}
                      </CollapseSection>

                      {variantRows && variantRows.length > 0 && (
                        <CollapseSection title="Product Variants">
                          <div className="ip-modal-variant-table-wrap">
                            <div className="ip-modal-table-scroll">
                              <table className="ip-modal-variant-table">
                                <thead>
                                  <tr>
                                    {variantHeaders.map(h => <th key={h}>{h}</th>)}
                                  </tr>
                                </thead>
                                <tbody>
                                  {variantRows.map((row, idx) => (
                                    <tr key={idx}>
                                      {variantHeaders.map(h => (
                                        <td key={h}>{row[h] != null ? String(row[h]) : "—"}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </CollapseSection>
                      )}

                      <CollapseSection title="Size Chart" defaultOpen={false}>
  {(() => {
    const rawSizeChart = d.sizeChart;
    // sizeChart is already fully resolved to HTTPS in fetchInProgressProductDetails
    const url = (rawSizeChart && !rawSizeChart.includes("__PENDING"))
      ? rawSizeChart
      : null;
    console.log("[SizeChart display] url:", url);
    return url ? (
                            <img
                              className="ip-modal-size-chart"
                              src={url}
                              alt="Size Chart"
                              style={{ maxWidth: "100%", borderRadius: 8 }}
                              onError={e => {
                                console.warn("[SizeChart] Failed to load:", url);
                                e.target.src = FALLBACK_IMG;
                              }}
                            />
                          ) : (
                            <p className="ip-modal-value">Not Available</p>
                          );
                        })()}
                      </CollapseSection>

                      <CollapseSection title="Payment & Return Policy">
                        <div className="ip-modal-grid">
                          <div className="ip-modal-field">
                            <span className="ip-modal-label">Payment Type</span>
                            <span className="ip-modal-value">{d.paymentType || "Not Applicable"}</span>
                          </div>
                        </div>
                        <div className="ip-modal-policy-section">
                          <span className="ip-modal-label">Return Policy</span>
                          {d.productReturn ? (
                            <p className="ip-modal-return-text">
                              {typeof d.productReturn === "object"
                                ? d.productReturn.policy || d.productReturn.description || "Not Applicable"
                                : d.productReturn}
                            </p>
                          ) : (
                            <p className="ip-modal-value">Not Applicable</p>
                          )}
                        </div>
                      </CollapseSection>

                      <CollapseSection title="Search Keywords" defaultOpen={false}>
                        {keywords.length > 0 ? (
                          <div className="ip-modal-keywords">
                            {keywords.map((kw, idx) => (
                              <span key={idx} className="ip-modal-keyword-chip">{kw}</span>
                            ))}
                          </div>
                        ) : (
                          <p className="ip-modal-value">Not Available</p>
                        )}
                      </CollapseSection>

                      <CollapseSection title="Promotion" defaultOpen={false}>
                        {promoPhotos.length > 0 ? (
                          <div className="ip-modal-thumbnails">
                            {promoPhotos.map((url, idx) => (
                              <img
                                key={idx}
                                className="ip-modal-thumb ip-modal-thumb--promo"
                                src={url}
                                alt={`Promotion ${idx + 1}`}
                                onClick={() => setActiveImage(url)}
                                onError={e => { e.target.src = FALLBACK_IMG_SMALL; }}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="ip-modal-value">Not Available</p>
                        )}
                      </CollapseSection>

                      <div className="ip-modal-desc">
                        <span className="ip-modal-label">Description</span>
                        <p>{d.description || "No description available for this product."}</p>
                      </div>
                    </div>
                  </div>

                  <div className="ip-modal-footer">
                    <button
                      className="ip-btn-outline"
                      onClick={() => {
                        const id =
                          d.Table_ID || d.tableId || d.table_id ||
                          d.productId || d.id || d._id || selectedProductId;
                        const capturedData = selectedProductDetails;
                        handleCloseModal();
                        if (!id) {
                          alert("Unable to determine product ID. Please try again.");
                          return;
                        }
                        const isDraft = capturedData?.status === "Draft";
navigate(`/dashboard/listing/edit/${id}/product-info`, {
  state: {
    editData: capturedData,
    tableId:  id,
    isEditMode: true,
    isDraftMode: isDraft,
    email: sellerEmail,
  },
});
                      }}
                    >
                      <Edit2 size={14} /> Edit Listing
                    </button>
                    <button className="ip-btn-primary" onClick={handleCloseModal}>Close</button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default InProgressListings;