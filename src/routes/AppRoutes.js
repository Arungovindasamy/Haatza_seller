import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Public pages
const SignInPage = lazy(() => import("../pages/auth/SignInPage"));
const SignUpPage = lazy(() => import("../pages/auth/SignUpPage"));
const OtpPage = lazy(() => import("../pages/auth/OtpPage"));
const OnboardingPage = lazy(() => import("../pages/Onboarding/Onboarding"));

// Main Shell Layout
const DashboardLayout = lazy(() => import("../components/Layout/DashboardLayout/DashboardLayout"));

// Dashboard pages
const InventoryPage = lazy(() => import("../pages/Inventory/InventoryPage"));
const WalletPage = lazy(() => import("../pages/Wallet/WalletPage"));
const NotificationsPage = lazy(() => import("../pages/Notifications/NotificationsPage"));
const SettingsPage = lazy(() => import("../pages/Settings/SettingsPage"));
const SettlementsPage = lazy(() => import("../pages/Settlements/SettlementsPage"));

// Listings page flow
const AddListing = lazy(() => import("../pages/AddProduct/AddListing/AddListing"));
const SelectCategory = lazy(() => import("../pages/AddProduct/SelectCategory/SelectCategory"));
const ProductInfo = lazy(() => import("../pages/AddProduct/ProductInfo/ProductInfo"));
const SpecificationPage = lazy(() => import("../pages/AddProduct/Specificationpage/SpecificationPage"));
const PromotionPage = lazy(() => import("../pages/AddProduct/Promotionpage/PromotionPage"));
const ReviewSubmitPage = lazy(() => import("../pages/AddProduct/ReviewSubmit/ReviewSubmit"));
const MyListings = lazy(() => import("../pages/AddProduct/MyListings/MyListings"));
const InProgressListings = lazy(() => import("../pages/AddProduct/InProgressListings/InProgressListings"));

// Loading spinner
const PageLoader = () => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
    width: "100%",
  }}>
    <div style={{
      width: 36,
      height: 36,
      border: "3px solid #e5e7eb",
      borderTopColor: "#2962ff",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// Placeholder view
const PlaceholderPage = ({ title }) => (
  <div className="page-placeholder" style={{ padding: "40px" }}>
    <div className="placeholder-card" style={{
      background: "#fff",
      padding: "40px",
      borderRadius: "14px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      border: "1px solid #f1f3f6"
    }}>
      <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#1a1d23", margin: "0 0 8px 0" }}>{title}</h1>
      <p style={{ color: "#6b7280", margin: 0, fontSize: "14px" }}>This page is coming soon.</p>
    </div>
  </div>
);

const DashboardIndex = () => (
  <div className="dashboard-index-container" style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "65vh",
    width: "100%",
    background: "radial-gradient(circle, rgba(41, 98, 255, 0.25) 0%, rgba(245, 247, 255, 0) 70%)"
  }}>
    <div style={{ textAlign: "center" }}>
      <h1 style={{
        fontSize: "36px",
        fontWeight: "700",
        color: "#ffffff",
        marginBottom: "12px",
        textShadow: "0 4px 20px rgba(0, 0, 0, 0.08), 0 0 30px rgba(41, 98, 255, 0.4)"
      }}>
        Welcome back, Teezaa! ✨
      </h1>
      <p style={{
        color: "rgba(255, 255, 255, 0.8)",
        fontSize: "18px",
        fontWeight: "500",
        margin: 0,
        textShadow: "0 2px 10px rgba(0, 0, 0, 0.08)"
      }}>
        This page is coming soon.
      </p>
    </div>
  </div>
);

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/otp" element={<OtpPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Dashboard Shell Parent Route */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardIndex />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/settlements" element={<SettlementsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Fallback mock placeholder pages */}
          <Route path="/orders" element={<PlaceholderPage title="Orders" />} />
          <Route path="/return-exchange" element={<PlaceholderPage title="Return / Exchange" />} />
          <Route path="/help" element={<PlaceholderPage title="Help" />} />
          <Route path="/advertisement" element={<PlaceholderPage title="Advertisement" />} />
          <Route path="/haatzup" element={<PlaceholderPage title="HaatzUp" />} />
          <Route path="/growplan" element={<PlaceholderPage title="Grow Plan" />} />
          <Route path="/productinsight" element={<PlaceholderPage title="Product Insight" />} />
          <Route path="/warehouse" element={<PlaceholderPage title="Warehouse" />} />
          <Route path="/influencer" element={<PlaceholderPage title="Influencer Branding" />} />
          <Route path="/growthcentral" element={<PlaceholderPage title="Growth Central" />} />
          <Route path="/qualityinsights" element={<PlaceholderPage title="Quality Insights" />} />
          <Route path="/referandearn" element={<PlaceholderPage title="Refer & Earn" />} />

          {/* Listings Creation Steps */}
          <Route path="/listing" element={<AddListing />} />
          <Route path="/listing/select-category" element={<SelectCategory />} />
          <Route path="/listing/select-category/product-info" element={<ProductInfo />} />
          <Route path="/listing/select-category/product-info/specifications" element={<SpecificationPage />} />
          <Route path="/listing/select-category/product-info/specifications/promotions" element={<PromotionPage />} />
          <Route path="/listing/promotions" element={<ReviewSubmitPage />} />

          {/* Listings Edit Steps */}
          <Route path="/listing/edit/:tableId/product-info" element={<ProductInfo />} />
          <Route path="/listing/edit/:tableId/product-info/specifications" element={<SpecificationPage />} />
          <Route path="/listing/edit/:tableId/product-info/specifications/promotions" element={<PromotionPage />} />
          <Route path="/listing/edit/:tableId/product-info/specifications/promotions/review" element={<ReviewSubmitPage />} />

          {/* Listing Views */}
          <Route path="/listing/my-listings" element={<MyListings />} />
          <Route path="/listing/view-details" element={<ReviewSubmitPage />} />
          <Route path="/listing/in-progress" element={<InProgressListings />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/inprogress-listings" element={<InProgressListings />} />
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;