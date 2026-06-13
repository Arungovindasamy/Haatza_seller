// DashboardLayout.js  (updated — added ReviewSubmitPage routes)
import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import HaatzaNavbar  from "../Navbar/Navbar";
import Sidebar       from "../Sidebar/Sidebar";
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

  console.warn("[DashboardLayout] ⚠️ No seller email found in any storage. Defaulting to teezaastyleyourtees@gmail.com.");
  return "teezaastyleyourtees@gmail.com";
};

// ─── Seller display data ───────────────────────────────────────────────────────
const useSellerDisplayData = (resolvedEmail) => {
  const [seller, setSeller] = useState(null);

  useEffect(() => {
    const email = resolvedEmail || "teezaastyleyourtees@gmail.com";
    const isTeezaa = email.toLowerCase().includes("teezaa");
    const name = isTeezaa ? "Teezaa" : "Seller";
    const displayData = {
      name:          name,
      email:         email,
      role:          "Seller",
      avatarInitial: name[0].toUpperCase(),
      logoUrl:       null,
    };
    console.log("[DashboardLayout] Seller display data:", displayData);
    setSeller(displayData);
  }, [resolvedEmail]);

  return { seller };
};

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
        sellerEmail={seller?.email || sellerEmail || ""}
        onCollapseChange={handleCollapseChange}
        isMobile={isMobile}
      />

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;