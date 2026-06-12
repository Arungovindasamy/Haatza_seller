// MyListings.js
import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Eye, Edit2, Copy, Trash2, RefreshCw, Search, Package,
  AlertTriangle, Plus, ChevronLeft, ChevronRight, MoreVertical, ArrowLeft,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { fetchSellerListings, fetchProductDetails } from "../../../api/MyListingsApi";
import "./MyListings.css";

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

  const rows = [];
  for (const product of products) {
    const variants = Array.isArray(product?.variantInfo) ? product.variantInfo : [];
    for (const variant of variants) {
      const { choices = {}, ...rest } = variant;
      const filtered = Object.fromEntries(
        Object.entries({ ...choices, ...rest }).filter(([k]) => k.toLowerCase() !== "weight")
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
      if (typeof item === "object") {
        const raw = item.src || item.url || item.image || item.imageUrl || null;
        if (raw) return resolveWixImage(raw);
        return null;
      }
      return resolveWixImage(item);
    })
    .filter(Boolean);
};

// ─── helpers ──────────────────────────────────────────────────────────────────
const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23f1f3f6' rx='8'/%3E%3Ctext x='30' y='35' text-anchor='middle' fill='%23b0b7c3' font-size='22'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E";
const FALLBACK_IMG_SMALL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23f1f3f6' rx='8'/%3E%3Ctext x='30' y='35' text-anchor='middle' fill='%23b0b7c3' font-size='22'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E";

const getSellerEmail = (locationState) => {
  if (locationState?.email) return locationState.email;

  const sessionKeys = ["pendingEmail", "userEmail", "email", "sellerEmail",
                       "user_email", "seller_email", "currentUserEmail"];
  for (const key of sessionKeys) {
    const val = sessionStorage.getItem(key);
    if (val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return val;
    try {
      const parsed = JSON.parse(val);
      const found  = parsed?.email || parsed?.userEmail || parsed?.sellerEmail;
      if (found && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(found)) return found;
    } catch { /* not JSON */ }
  }

  const localKeys = [
    "userEmail", "email", "sellerEmail", "user_email", "seller_email",
    "user", "authUser", "currentUser", "seller", "userData",
    "sellerData", "auth", "session", "loginData", "accountData",
  ];
  for (const key of localKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())) return raw.trim();
    try {
      const parsed = JSON.parse(raw);
      const emailFields = ["email", "userEmail", "sellerEmail", "user_email",
                           "seller_email", "emailAddress", "loginEmail"];
      for (const field of emailFields) {
        const found = parsed?.[field];
        if (found && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(found)) return found;
      }
      const nestedPaths = ["user", "data", "account", "seller", "profile"];
      for (const nest of nestedPaths) {
        const nested = parsed?.[nest];
        if (nested && typeof nested === "object") {
          for (const field of emailFields) {
            const found = nested[field];
            if (found && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(found)) return found;
          }
        }
      }
    } catch { /* not JSON */ }
  }
  return null;
};

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
  if (s === "approved")          return "ml-badge ml-badge--approved";
  if (s === "pending")           return "ml-badge ml-badge--pending";
  if (s === "under review")      return "ml-badge ml-badge--pending";
  if (s === "rejected")          return "ml-badge ml-badge--rejected";
  if (s === "update_requested" || s === "update requested") return "ml-badge ml-badge--update";
  return "ml-badge ml-badge--draft";
};

const resolveKeywords = (kw) => {
  if (!kw) return [];
  if (Array.isArray(kw)) return kw.map(k => (typeof k === "string" ? k : String(k))).filter(Boolean);
  if (typeof kw === "string") return kw.split(",").map(k => k.trim()).filter(Boolean);
  return [];
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const CollapseSection = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ml-modal-section">
      <button className="ml-modal-section-header" onClick={() => setOpen(v => !v)}>
        <h4 className="ml-modal-section-title">{title}</h4>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div className="ml-modal-section-body">{children}</div>}
    </div>
  );
};

const SkeletonRow = () => (
  <tr>
    <td><div className="ml-skeleton ml-skeleton-img" /></td>
    <td><div className="ml-skeleton ml-skeleton-text" style={{ width: "80%" }} /></td>
    <td><div className="ml-skeleton ml-skeleton-text" style={{ width: 50 }} /></td>
    <td><div className="ml-skeleton ml-skeleton-text" style={{ width: 90 }} /></td>
    <td><div className="ml-skeleton ml-skeleton-text" style={{ width: 50 }} /></td>
    <td><div className="ml-skeleton ml-skeleton-badge" /></td>
    <td><div className="ml-skeleton ml-skeleton-text" style={{ width: 80 }} /></td>
  </tr>
);

const SkeletonCard = () => (
  <div className="ml-mobile-card ml-mobile-card--skeleton">
    <div className="ml-skeleton ml-skeleton-img" style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0 }} />
    <div className="ml-mobile-card__info">
      <div className="ml-skeleton ml-skeleton-text" style={{ width: "60%", marginBottom: 8 }} />
      <div className="ml-skeleton ml-skeleton-text" style={{ width: "35%" }} />
    </div>
    <div className="ml-skeleton ml-skeleton-badge" style={{ flexShrink: 0 }} />
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
    <div className="ml-dot-menu">
      <button ref={btnRef} className="ml-dot-btn" onClick={handleToggle} aria-label="More actions">
        <MoreVertical size={16} />
      </button>
      {open && (
        <div ref={menuRef} className="ml-dropdown" style={{ top: coords.top, right: coords.right }}>
          <button onClick={() => { onView();      setOpen(false); }}><Eye size={14} /> View</button>
          <button onClick={() => { onEdit();      setOpen(false); }}><Edit2 size={14} /> Edit</button>
          <button onClick={() => { onDuplicate(); setOpen(false); }}><Copy size={14} /> Duplicate</button>
          <button className="ml-dd-delete" onClick={() => { onDelete(); setOpen(false); }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MyListings = ({ embedded = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const sellerEmail = useMemo(() => getSellerEmail(location.state), [location.state]);

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

  const fetchAllProducts = useCallback(async () => {
    if (!sellerEmail) return;
    setIsFetchingAll(true);
    try {
      const first = await fetchSellerListings({ email: sellerEmail, page: 1, limit: 100, type: "mylisting" });
      let all = [...first.products];
      const pages = first.totalPages;
      if (pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            fetchSellerListings({ email: sellerEmail, page: i + 2, limit: 100, type: "mylisting" })
          )
        );
        rest.forEach(r => { all = all.concat(r.products); });
      }
      setAllProducts(all);
    } catch (err) {
      console.error("[MyListings] fetchAll error:", err);
    } finally {
      setIsFetchingAll(false);
    }
  }, [sellerEmail]);

  const loadListings = useCallback(async (pageNum = 1) => {
    if (!sellerEmail) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSellerListings({
        email: sellerEmail, page: pageNum, limit: LIMIT, type: "mylisting",
      });
      setProducts(result.products);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err.message || "Unable to load listings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [sellerEmail]);

  useEffect(() => {
    if (sellerEmail) loadListings(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sellerEmail]);

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

  // ── view details — opens modal ────────────────────────────────────────────
  const handleViewDetails = async (tableId) => {
    if (!tableId) return;
    setSelectedProductId(tableId);
    setDetailsLoading(true);
    setDetailsError(null);
    setSelectedProductDetails(null);
    setActiveImage(null);
    try {
      const res = await fetch(
        `https://www.haatza.com/_functions/sellerProductDetails?Table_ID=${tableId}`
      );
      if (!res.ok) throw new Error(`Failed to fetch product details (${res.status})`);
      const data = await res.json();
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
      if (!details || typeof details !== "object") {
        throw new Error("Product not found or response format changed.");
      }
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

  const handleEditListing = async (tableId) => {
    if (!tableId) return;
    try {
      const res = await fetch(
        `https://www.haatza.com/_functions/sellerProductDetails?Table_ID=${tableId}`
      );
      if (!res.ok) throw new Error(`Failed to fetch product details (${res.status})`);
      const editData = await res.json();
      navigate(`/dashboard/listing/edit/${tableId}/product-info`, {
        state: { editData, tableId, isEditMode: true },
      });
    } catch (err) {
      console.error("[MyListings] Edit fetch error:", err);
      alert("Failed to load product for editing. Please try again.");
    }
  };

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
        name:          duplicateData.subCategory    || "",
        _id:           duplicateData.subCategoryId  || duplicateData.SubCategoryID || duplicateData.subcategoryId || "",
        subcategoryId: duplicateData.subCategoryId  || duplicateData.SubCategoryID || duplicateData.subcategoryId || "",
        SubCategoryID: duplicateData.SubCategoryID  || "",
      };

      navigate(`/dashboard/listing/select-category/product-info`, {
        state: {
          category,
          subcategory,
          editData:        duplicateData,
          isEditMode:      false,
          isDuplicateMode: true,
          tableId:         null,
        },
      });
    } catch (err) {
      console.error("[MyListings] Duplicate fetch error:", err);
      alert("Failed to load product for duplication. Please try again.");
    }
  };

  const filtered = useMemo(() => {
    let list = search ? [...allProducts] : [...products];
    if (search) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        String(p.Table_ID || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
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
    return list;
  }, [products, allProducts, search, statusFilter, priceFilter]);

  const fromItem = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const toItem   = Math.min(page * LIMIT, total);

  if (!sellerEmail) {
    return (
      <div className="ml-root">
        <div className="ml-card">
          <div className="ml-error">
            <div className="ml-error-icon"><AlertTriangle size={32} /></div>
            <h3>Session Not Found</h3>
            <p>Unable to retrieve your account information. Please sign in again.</p>
            <div className="ml-error-btns">
              <button className="ml-btn-primary" onClick={() => navigate("/signin")}>Go to Sign In</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-root">

      <div className="ml-header">
        <div className="ml-header-left">
          {!embedded && (
            <button className="ml-back-btn" onClick={() => navigate("/dashboard/listing")}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <h1>My Listings</h1>
          <p>Manage all your listed products</p>
        </div>

        <div className="ml-controls">
          <div className="ml-search-wrap">
            <Search size={14} />
            <input
              className="ml-search"
              type="text"
              placeholder="Search product or ID..."
              value={searchRaw}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </div>

          <select className="ml-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="under review">Under Review</option>
            <option value="rejected">Rejected</option>
            <option value="draft">Draft</option>
            <option value="update_requested">Update Requested</option>
          </select>

          <select className="ml-select" value={priceFilter} onChange={e => { setPriceFilter(e.target.value); setPage(1); }}>
            <option value="all">All Prices</option>
            <option value="0-500">₹0 - ₹500</option>
            <option value="500-1000">₹500 - ₹1000</option>
            <option value="1000-5000">₹1000 - ₹5000</option>
            <option value="5000+">₹5000+</option>
          </select>

          <button className="ml-btn-refresh" onClick={() => loadListings(page)} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="ml-card">
        {error && !loading && (
          <div className="ml-error">
            <div className="ml-error-icon"><AlertTriangle size={32} /></div>
            <h3>Unable to load listings</h3>
            <p>{error}</p>
            <div className="ml-error-btns">
              <button className="ml-btn-primary" onClick={() => loadListings(page)}>Retry</button>
              <button className="ml-btn-outline" onClick={() => { setPage(1); setTimeout(() => loadListings(1), 0); }}>
                <RefreshCw size={14} /> Refresh Listings
              </button>
            </div>
          </div>
        )}

        {!error && (
          <>
            {/* ── Desktop table ── */}
            <div className="ml-table-wrap">
              <table className="ml-table">
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
                            className="ml-img"
                            src={resolveWixImage(product.mainmedia) || FALLBACK_IMG_SMALL}
                            alt={product.name || "Product"}
                            onError={e => { e.target.onerror = null; e.target.src = FALLBACK_IMG_SMALL; }}
                          />
                        </td>
                        <td>
                          <button className="ml-name-btn" title={product.name || "-"} onClick={() => handleViewDetails(product.Table_ID)}>
                            {product.name || "-"}
                          </button>
                        </td>
                        <td><span className="ml-price">₹{price.toFixed(2)}</span></td>
                        <td>
                          {discountLabel
                            ? <span className="ml-discount">{discountLabel}</span>
                            : <span className="ml-no-discount">—</span>}
                        </td>
                        <td><span className="ml-final-price">₹{finalPrice.toFixed(2)}</span></td>
                        <td>
                          <span className={statusClass(product.status)}>{product.status || "Draft"}</span>
                        </td>
                        <td>
                          <div className="ml-actions ml-actions-desktop">
                            <button className="ml-action-btn" title="View Details" onClick={() => handleViewDetails(product.Table_ID)}>
                              <Eye size={15} />
                            </button>
                            <button className="ml-action-btn" title="Edit" onClick={() => handleEditListing(product.Table_ID)}>
                              <Edit2 size={15} />
                            </button>
                            <button className="ml-action-btn" title="Duplicate" onClick={() => handleDuplicateListing(product.Table_ID)}>
                              <Copy size={15} />
                            </button>
                            <button className="ml-action-btn ml-action-btn--delete" title="Delete" onClick={() => console.log("Delete:", product.Table_ID)}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <div className="ml-actions ml-actions-mobile">
                            <DotMenu
                              onView={()      => handleViewDetails(product.Table_ID)}
                              onEdit={()      => handleEditListing(product.Table_ID)}
                              onDuplicate={() => handleDuplicateListing(product.Table_ID)}
                              onDelete={()    => console.log("Delete:", product.Table_ID)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <div className="ml-mobile-list">
              {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}

              {!loading && filtered.map(product => {
                const price      = Number(product.price) || 0;
                const finalPrice = computeFinalPrice(price, product.discount || {});
                return (
                  <div className="ml-mobile-card" key={product.Table_ID || product._id || Math.random()}>
                    <img
                      className="ml-mobile-card__img"
                      src={resolveWixImage(product.mainmedia) || FALLBACK_IMG_SMALL}
                      alt={product.name || "Product"}
                      onError={e => { e.target.onerror = null; e.target.src = FALLBACK_IMG_SMALL; }}
                    />
                    <div className="ml-mobile-card__info">
                      <button className="ml-mobile-card__name" onClick={() => handleViewDetails(product.Table_ID)}>
                        {product.name || "-"}
                      </button>
                      <span className="ml-mobile-card__price">₹{finalPrice.toFixed(2)}</span>
                    </div>
                    <div className="ml-mobile-card__right">
                      <span className={statusClass(product.status)}>{product.status || "Draft"}</span>
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
              <div className="ml-empty">
                <div className="ml-empty-icon"><Package size={32} /></div>
                <h3>No Listings Found</h3>
                <p>
                  {search || statusFilter !== "all" || priceFilter !== "all"
                    ? "No products match your current filters."
                    : "You haven't created any listings yet."}
                </p>
                <button className="ml-btn-primary" onClick={() => navigate("/dashboard/listing/select-category")}>
                  <Plus size={15} /> Create Listing
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="ml-pagination">
            <div className="ml-pagination-info">
              Showing <span>{fromItem}–{toItem}</span> of <span>{total}</span> products
            </div>
            <div className="ml-pagination-controls">
              <button className="ml-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="ml-page-indicator">
                Page <span>{page}</span> of <span>{totalPages}</span>
              </span>
              <button className="ml-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Details Modal ── */}
      {(detailsLoading || selectedProductDetails || detailsError) && (
        <div className="ml-modal-overlay" onClick={handleCloseModal}>
          <div className="ml-modal-card" onClick={e => e.stopPropagation()}>
            <button className="ml-modal-close" onClick={handleCloseModal} aria-label="Close">&times;</button>

            {detailsLoading && (
              <div className="ml-modal-loading">
                <div className="ml-spinner" />
                <p>Fetching product details...</p>
              </div>
            )}

            {detailsError && (
              <div className="ml-modal-error">
                <div className="ml-error-icon"><AlertTriangle size={32} /></div>
                <h3>Failed to load product details</h3>
                <p>{detailsError}</p>
                <button className="ml-btn-primary" onClick={() => handleViewDetails(selectedProductId)}>Retry</button>
              </div>
            )}

            {!detailsLoading && selectedProductDetails && (() => {
              const d = selectedProductDetails;

              const mainResolved = resolveWixImage(d.mainmedia);
              const productImgList = [
                ...(mainResolved ? [mainResolved] : []),
                ...resolveImageList(d.productImages),
...resolveImageList(d.mediaItems),
];
              const uniqueImgList = [...new Set(productImgList.filter(Boolean))];
              const promoPhotos   = resolveImageList(d.promotionPhotos);

              const variantRows    = normaliseVariantRows(d.varientPrice).length > 0
                ? normaliseVariantRows(d.varientPrice) : null;
              const variantHeaders = variantRows ? Object.keys(variantRows[0] || {}) : [];

              const productOptions = normaliseProductOptions(d.productOptions).length > 0
  ? normaliseProductOptions(d.productOptions) : null;

              const additionalSections =
                Array.isArray(d.additionalInfoSections) && d.additionalInfoSections.length > 0
                  ? d.additionalInfoSections : null;

              const keywords = resolveKeywords(d.search_keywords);

              const sizeChartUrl = (() => {
                const raw = d.sizeChart;
                if (!raw || raw === "__PENDING_FILE__") return null;
                if (typeof raw === "string" && raw.startsWith("http")) return raw;
                if (typeof raw === "object") return raw.url || raw.mediaUrl || raw.src || null;
                return resolveWixImage(raw);
              })();

              return (
                <div className="ml-modal-content">
                  <h2 className="ml-modal-title">Product Details</h2>

                  <div className="ml-modal-body">

                    {/* Gallery Column */}
                    <div className="ml-modal-gallery-col">
                      <div className="ml-modal-gallery">
                        <img
                          className="ml-modal-img"
                          src={activeImage || resolveWixImage(d.mainmedia) || FALLBACK_IMG}
                          alt={d.name || "Product"}
                          onError={e => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }}
                        />
                        <div className="ml-modal-status">
                          <span className={statusClass(d.status)}>{d.status || "Draft"}</span>
                        </div>
                      </div>

                      {uniqueImgList.length > 1 && (
                        <div className="ml-modal-thumbnails">
                          {uniqueImgList.map((url, idx) => (
                            <img
                              key={idx}
                              className={`ml-modal-thumb${activeImage === url ? " ml-modal-thumb--active" : ""}`}
                              src={url}
                              alt={`${d.name || "Product"} ${idx + 1}`}
                              onClick={() => setActiveImage(url)}
                              onError={e => { e.target.src = FALLBACK_IMG_SMALL; }}
                            />
                          ))}
                        </div>
                      )}

                      {promoPhotos.length > 0 && (
                        <div className="ml-modal-promo-section">
                          <p className="ml-modal-promo-label">Promotion Photos</p>
                          <div className="ml-modal-thumbnails">
                            {promoPhotos.map((url, idx) => (
                              <img
                                key={idx}
                                className="ml-modal-thumb ml-modal-thumb--promo"
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

                    {/* Info Column */}
                    <div className="ml-modal-info">
                      <h3 className="ml-modal-name">{d.name || "—"}</h3>
                      {d.brand && <p className="ml-modal-brand">{d.brand}</p>}

                      <CollapseSection title="Identification">
                        <div className="ml-modal-grid">
                          <div className="ml-modal-field">
                            <span className="ml-modal-label">Product ID</span>
                            <span className="ml-modal-value ml-modal-value--id">
                              {d.Table_ID || d.productId || d.tableId || d._id || "Not Available"}
                            </span>
                          </div>
                          <div className="ml-modal-field">
                            <span className="ml-modal-label">Seller ID</span>
                            <span className="ml-modal-value">{d.sellerId || "Not Available"}</span>
                          </div>
                          <div className="ml-modal-field">
                            <span className="ml-modal-label">Status</span>
                            <span className="ml-modal-value">{d.status || "Draft"}</span>
                          </div>
                          <div className="ml-modal-field">
                            <span className="ml-modal-label">Manage Variants</span>
                            <span className="ml-modal-value">
                              {d.manageVariants === true ? "Yes"
                                : d.manageVariants === false ? "No"
                                : "Not Available"}
                            </span>
                          </div>
                        </div>
                      </CollapseSection>

                      <CollapseSection title="Pricing">
                        <div className="ml-modal-grid">
                          <div className="ml-modal-field">
                            <span className="ml-modal-label">Original Price</span>
                            <span className="ml-modal-value">₹{Number(d.price || 0).toFixed(2)}</span>
                          </div>
                          <div className="ml-modal-field">
                            <span className="ml-modal-label">Discount</span>
                            <span className="ml-modal-value ml-modal-value--discount">
                              {formatDiscount(d.discount) || "Not Applicable"}
                            </span>
                          </div>
                          <div className="ml-modal-field">
                            <span className="ml-modal-label">Final Price</span>
                            <span className="ml-modal-value ml-modal-value--final">
                              ₹{computeFinalPrice(Number(d.price || 0), d.discount).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CollapseSection>

                      <CollapseSection title="Category">
                        <div className="ml-modal-grid">
                          <div className="ml-modal-field">
                            <span className="ml-modal-label">Category Name</span>
                            <span className="ml-modal-value">
                              {Array.isArray(d.categoryName)
                                ? d.categoryName.join(", ")
                                : d.categoryName || "Not Available"}
                            </span>
                          </div>
                          <div className="ml-modal-field">
                            <span className="ml-modal-label">Sub Category</span>
                            <span className="ml-modal-value">{d.subCategory || "Not Available"}</span>
                          </div>
                        </div>
                      </CollapseSection>

                      <CollapseSection title="Inventory & Shipping">
                        <div className="ml-modal-grid">
                          <div className="ml-modal-field">
                            <span className="ml-modal-label">Total Quantity</span>
                            <span className="ml-modal-value">
                              {d.totalQuantity ?? d.inventory ?? d.stock ?? "Not Available"}
                            </span>
                          </div>
                          <div className="ml-modal-field">
                            <span className="ml-modal-label">Shipping Weight</span>
                            <span className="ml-modal-value">
                              {d.shippingWeight ? `${d.shippingWeight} g` : "Not Available"}
                            </span>
                          </div>
                          <div className="ml-modal-field">
                            <span className="ml-modal-label">Delivery Charges</span>
                            <span className="ml-modal-value">
                              {d.deliveryCharges === false ? "Not Applicable"
                                : d.deliveryCharges ? `₹${d.deliveryCharges}`
                                : "Not Available"}
                            </span>
                          </div>
                        </div>
                      </CollapseSection>

                      {productOptions && (
                        <CollapseSection title="Product Options">
                          {productOptions.map((opt, idx) => {
                            const choices = opt.choices || opt.values || opt.options || [];
                            const isColor = (opt.name || "").toLowerCase().includes("color") ||
                                            (opt.name || "").toLowerCase().includes("colour");
                            return (
                              <div key={idx} className="ml-modal-option-group">
                                <span className="ml-modal-option-name">
                                  {opt.name || `Option ${idx + 1}`}
                                </span>
                                <div className="ml-modal-option-chips">
                                  {choices.map((choice, ci) => {
                                    const label = typeof choice === "object"
                                      ? choice.description || choice.value || choice.name || ""
                                      : String(choice);
                                    return (
                                      <span key={ci} className="ml-modal-option-chip"
                                        style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                        {isColor && choice?.value && /^#[0-9a-f]{3,6}/i.test(choice.value) && (
                                          <span style={{
                                            width: 10, height: 10, borderRadius: "50%",
                                            background: choice.value,
                                            border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0,
                                          }} />
                                        )}
                                        {label}
                                      </span>
                                    );
                                  })}
                                  {choices.length === 0 && <span className="ml-modal-value">—</span>}
                                </div>
                              </div>
                            );
                          })}
                        </CollapseSection>
                      )}

                      <CollapseSection title="Additional Information" defaultOpen={false}>
                        {additionalSections && additionalSections.length > 0 ? (
                          additionalSections.map((section, idx) => {
                            const skipKeys = new Set(["title", "description"]);
                            const otherEntries = Object.entries(section).filter(
                              ([key, val]) => !skipKeys.has(key) && val != null && val !== ""
                            );
                            return (
                              <div key={idx} className="ml-modal-info-block">
                                {section.title && (
                                  <p className="ml-modal-info-block-title">{section.title}</p>
                                )}
                                {section.description && (
                                  <div
                                    className="ml-modal-info-block-body"
                                    dangerouslySetInnerHTML={{ __html: section.description }}
                                  />
                                )}
                                {otherEntries.length > 0 && (
                                  <div className="ml-modal-grid">
                                    {otherEntries.map(([key, val]) => (
                                      <div key={key} className="ml-modal-field">
                                        <span className="ml-modal-label">
                                          {key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).replace(/_/g, " ")}
                                        </span>
                                        <span className="ml-modal-value">
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
                          <p className="ml-modal-value">Not Applicable</p>
                        )}
                      </CollapseSection>

                      {variantRows && variantRows.length > 0 && (
                        <CollapseSection title="Product Variants">
                          <div className="ml-modal-variant-table-wrap">
                            <div className="ml-modal-table-scroll">
                              <table className="ml-modal-variant-table">
                                <thead>
                                  <tr>{variantHeaders.map(h => <th key={h}>{h}</th>)}</tr>
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
                        {sizeChartUrl ? (
                          <img
                            className="ml-modal-size-chart"
                            src={sizeChartUrl}
                            alt="Size Chart"
                            style={{ maxWidth: "100%", borderRadius: 8 }}
                            onError={e => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }}
                          />
                        ) : (
                          <p className="ml-modal-value">Not Available</p>
                        )}
                      </CollapseSection>

                      <CollapseSection title="Payment & Return Policy">
                        <div className="ml-modal-grid">
                          <div className="ml-modal-field">
                            <span className="ml-modal-label">Payment Type</span>
                            <span className="ml-modal-value">{d.paymentType || "Not Applicable"}</span>
                          </div>
                        </div>
                        <div className="ml-modal-policy-section">
                          <span className="ml-modal-label">Return Policy</span>
                          {d.productReturn ? (
                            <p className="ml-modal-return-text">
                              {typeof d.productReturn === "object"
                                ? d.productReturn.policy || d.productReturn.description || "Not Applicable"
                                : d.productReturn}
                            </p>
                          ) : (
                            <p className="ml-modal-value">Not Applicable</p>
                          )}
                        </div>
                      </CollapseSection>

                      <CollapseSection title="Search Keywords" defaultOpen={false}>
                        {keywords.length > 0 ? (
                          <div className="ml-modal-keywords">
                            {keywords.map((kw, idx) => (
                              <span key={idx} className="ml-modal-keyword-chip">{kw}</span>
                            ))}
                          </div>
                        ) : (
                          <p className="ml-modal-value">Not Available</p>
                        )}
                      </CollapseSection>

                      <CollapseSection title="Promotion" defaultOpen={false}>
                        {promoPhotos.length > 0 ? (
                          <div className="ml-modal-thumbnails">
                            {promoPhotos.map((url, idx) => (
                              <img
                                key={idx}
                                className="ml-modal-thumb ml-modal-thumb--promo"
                                src={url}
                                alt={`Promotion ${idx + 1}`}
                                onClick={() => setActiveImage(url)}
                                onError={e => { e.target.src = FALLBACK_IMG_SMALL; }}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="ml-modal-value">Not Available</p>
                        )}
                      </CollapseSection>

                      <div className="ml-modal-desc">
                        <span className="ml-modal-label">Description</span>
                        <p>{d.description || "No description available for this product."}</p>
                      </div>
                    </div>
                  </div>

                  <div className="ml-modal-footer">
                    <button
                      className="ml-btn-outline"
                      onClick={() => {
                        const id = d.Table_ID || d.tableId || d.table_id || d.productId || d.id || d._id || selectedProductId;
                        const capturedData = selectedProductDetails;
                        handleCloseModal();
                        if (!id) { alert("Unable to determine product ID. Please try again."); return; }
                        navigate(`/dashboard/listing/edit/${id}/product-info`, {
                          state: { editData: capturedData, tableId: id, isEditMode: true },
                        });
                      }}
                    >
                      <Edit2 size={14} /> Edit Listing
                    </button>
                    <button className="ml-btn-primary" onClick={handleCloseModal}>Close</button>
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

export default MyListings;