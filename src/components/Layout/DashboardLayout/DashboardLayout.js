// DashboardLayout.js  (updated — added ReviewSubmitPage routes)
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import HaatzaNavbar  from "../Navbar/Navbar";
import Sidebar       from "../Sidebar/Sidebar";

import AddListing           from "../../../pages/AddProduct/AddListing/AddListing";
import SelectCategory       from "../../../pages/AddProduct/SelectCategory/SelectCategory";
import ProductInfo          from "../../../pages/AddProduct/ProductInfo/ProductInfo";
import SpecificationPage    from "../../../pages/AddProduct/Specificationpage/SpecificationPage";
import PromotionPage        from "../../../pages/AddProduct/Promotionpage/PromotionPage";
import ReviewSubmitPage     from "../../../pages/AddProduct/ReviewSubmit/ReviewSubmit";
import MyListings           from "../../../pages/AddProduct/MyListings/MyListings";
import InProgressListings   from "../../../pages/AddProduct/InProgressListings/InProgressListings";
import "./DashboardLayout.css";

// ─── Read the real seller email from auth sources ─────────────────────────────
const resolveSellerEmail = (locationState) => {
  if (locationState?.email &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(locationState.email)) {
    const e = locationState.email.trim().toLowerCase();
    console.log("[DashboardLayout] ✅ Email from location.state:", e);
    sessionStorage.setItem("pendingEmail", e);
    localStorage.setItem("userEmail",      e);
    return e;
  }

  const sessionKeys = ["pendingEmail", "userEmail", "email", "sellerEmail"];
  for (const key of sessionKeys) {
    const val = sessionStorage.getItem(key);
    if (val && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
      const e = val.trim().toLowerCase();
      console.log(`[DashboardLayout] ✅ Email from sessionStorage[${key}]:`, e);
      return e;
    }
  }

  const localKeys = ["userEmail", "email", "sellerEmail",
                     "user", "authUser", "currentUser", "seller"];
  for (const key of localKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())) {
      const e = raw.trim().toLowerCase();
      console.log(`[DashboardLayout] ✅ Email from localStorage[${key}]:`, e);
      return e;
    }
    try {
      const parsed = JSON.parse(raw);
      const found  = parsed?.email || parsed?.userEmail || parsed?.sellerEmail;
      if (found && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(found)) {
        const e = found.trim().toLowerCase();
        console.log(`[DashboardLayout] ✅ Email from localStorage[${key}].email:`, e);
        return e;
      }
    } catch { /* not JSON */ }
  }

  console.warn("[DashboardLayout] ⚠️ No seller email found in any storage.");
  return null;
};

// ─── Seller display data ───────────────────────────────────────────────────────
const useSellerDisplayData = (resolvedEmail) => {
  const [seller, setSeller] = useState(null);

  useEffect(() => {
    if (!resolvedEmail) return;
    const displayData = {
      name:          "Seller",
      email:         resolvedEmail,
      role:          "Seller",
      avatarInitial: resolvedEmail[0].toUpperCase(),
      logoUrl:       null,
    };
    console.log("[DashboardLayout] Seller display data:", displayData);
    setSeller(displayData);
  }, [resolvedEmail]);

  return { seller };
};

// ─── Placeholder ───────────────────────────────────────────────────────────────
const PlaceholderPage = ({ title }) => (
  <div className="page-placeholder">
    <div className="placeholder-card">
      <h1>{title}</h1>
      <p>This page is coming soon.</p>
    </div>
  </div>
);

// ─── Main Layout ───────────────────────────────────────────────────────────────
function DashboardLayout() {
  const location = useLocation();

  const sellerEmail = resolveSellerEmail(location.state);
  const { seller }  = useSellerDisplayData(sellerEmail);

  const [sidebarOpen,      setSidebarOpen]      = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile,         setIsMobile]         = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const handleSidebarToggle  = () => setSidebarOpen(prev => !prev);
  const handleSidebarClose   = () => { if (isMobile) setSidebarOpen(false); };
  const handleCollapseChange = (collapsed) => setSidebarCollapsed(collapsed);

  return (
    <div
      className={[
        "app-container",
        sidebarOpen      ? "sidebar-open"      : "",
        sidebarCollapsed ? "sidebar-collapsed" : "",
      ].filter(Boolean).join(" ")}
    >
      <HaatzaNavbar seller={seller || {}} />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={handleSidebarClose}
        onToggle={handleSidebarToggle}
        sellerName={seller?.name  || ""}
        sellerEmail={sellerEmail  || ""}
        onCollapseChange={handleCollapseChange}
        isMobile={isMobile}
      />

      <main className="main-content">
        <Routes>
          <Route
            index
            element={
              <PlaceholderPage
                title={
                  seller
                    ? `Welcome back, ${seller.name}! ✨`
                    : "Welcome to Haatza Seller Dashboard ✨"
                }
              />
            }
          />

          <Route path="dashboard"     element={<PlaceholderPage title="Dashboard" />} />
          <Route path="listing"       element={<AddListing />} />

          {/* ── CREATE FLOW ── */}
          <Route path="listing/select-category"                                                         element={<SelectCategory />} />
          <Route path="listing/select-category/product-info"                                            element={<ProductInfo />} />
          <Route path="listing/select-category/product-info/specifications"                             element={<SpecificationPage />} />
          <Route path="listing/select-category/product-info/specifications/promotions"                  element={<PromotionPage />} />
          <Route path="listing/promotions"                                                               element={<ReviewSubmitPage />} />

          {/* ── EDIT FLOW ── */}
          <Route path="listing/edit/:tableId/product-info"                                              element={<ProductInfo />} />
          <Route path="listing/edit/:tableId/product-info/specifications"                               element={<SpecificationPage />} />
          <Route path="listing/edit/:tableId/product-info/specifications/promotions"                    element={<PromotionPage />} />
          <Route path="listing/edit/:tableId/product-info/specifications/promotions/review"             element={<ReviewSubmitPage />} />

          {/* ── LISTINGS ── */}
          {/* ── LISTINGS ── */}
<Route path="listing/my-listings"              element={<MyListings />} />
<Route path="listing/view-details"             element={<ReviewSubmitPage />} />
<Route path="listing/in-progress"              element={<InProgressListings />} />
<Route path="my-listings"                      element={<MyListings />} />
<Route path="inprogress-listings"              element={<InProgressListings />} />

          {/* ── OTHER PAGES ── */}
          <Route path="orders"          element={<PlaceholderPage title="Orders" />} />
          <Route path="returns"         element={<PlaceholderPage title="Return / Exchange" />} />
          <Route path="inventory"       element={<PlaceholderPage title="Inventory" />} />
          <Route path="settlements"     element={<PlaceholderPage title="Settlements" />} />
          <Route path="help"            element={<PlaceholderPage title="Help" />} />
          <Route path="advertisement"   element={<PlaceholderPage title="Advertisement" />} />
          <Route path="haatzup"         element={<PlaceholderPage title="HaatzUp" />} />
          <Route path="growplan"        element={<PlaceholderPage title="Grow Plan" />} />
          <Route path="productinsight"  element={<PlaceholderPage title="Product Insight" />} />
          <Route path="warehouse"       element={<PlaceholderPage title="Warehouse" />} />
          <Route path="influencer"      element={<PlaceholderPage title="Influencer Branding" />} />
          <Route path="growthcentral"   element={<PlaceholderPage title="Growth Central" />} />
          <Route path="qualityinsights" element={<PlaceholderPage title="Quality Insights" />} />
          <Route path="referandearn"    element={<PlaceholderPage title="Refer & Earn" />} />
          <Route path="settings"        element={<PlaceholderPage title="Settings" />} />
          <Route path="*"               element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default DashboardLayout;