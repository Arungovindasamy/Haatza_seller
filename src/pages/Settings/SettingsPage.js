import React, { useState, useEffect, useCallback, useMemo } from "react";
import { User, Building, Landmark, AlertCircle, RefreshCw } from "lucide-react";
import { resolveSellerEmailForApi } from "../../api/listingApi";
import { fetchSellerDetails } from "../../services/sellerApi";
import "./SettingsPage.css";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [sellerData, setSellerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sellerEmail = useMemo(() => resolveSellerEmailForApi() || "", []);

  const loadSellerData = useCallback(async () => {
    if (!sellerEmail) {
      setError("No logged in seller email found. Please sign in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetchSellerDetails(sellerEmail);
      console.log("[SettingsPage] Fetched seller data:", response);
      
      if (response && response.status === "success") {
        const data = response.message || response.data || response.body || response;
        setSellerData(data);
      } else {
        setSellerData(response || null);
      }
    } catch (err) {
      console.error("[SettingsPage] Error fetching details:", err);
      setError("Failed to fetch store settings from server. Showing placeholders.");
      setSellerData(null);
    } finally {
      setLoading(false);
    }
  }, [sellerEmail]);

  useEffect(() => {
    loadSellerData();
  }, [loadSellerData]);

  // Safe mapping helper
  const getField = (keys, fallback = "—") => {
    if (!sellerData) return fallback;
    for (const key of keys) {
      if (
        sellerData[key] !== undefined &&
        sellerData[key] !== null &&
        String(sellerData[key]).trim() !== ""
      ) {
        return String(sellerData[key]).trim();
      }
    }
    return fallback;
  };

  const getProfileName = () => {
    return getField(["fullName", "name", "sellerName"], "Store Owner");
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "SO";
  };

  return (
    <div className="settings-page-root">
      <div className="settings-page-header">
        <div className="settings-header-left">
          <h1>Store Settings</h1>
          <p>View and manage store profile, business info, and billing settlements.</p>
        </div>
        <button
          type="button"
          className="settings-refresh-btn"
          onClick={loadSellerData}
          disabled={loading}
          title="Refresh Settings"
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="settings-alert-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            type="button"
            className="settings-alert-close"
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}

      {loading ? (
        <div className="settings-loading-wrap">
          <div className="settings-loading-spinner" />
          <p>Loading your profile and business settings...</p>
        </div>
      ) : (
        <div className="settings-grid">
          {/* Left Panel: Profile Quick View */}
          <div className="settings-sidebar">
            <div className="settings-card profile-summary-card">
              <div className="profile-summary-avatar">
                {getInitials(getProfileName())}
              </div>
              <h3 className="profile-summary-name">{getProfileName()}</h3>
              <p className="profile-summary-email">{getField(["email", "sellerEmail"], sellerEmail)}</p>
              <span className="profile-summary-badge">Haatza Verified Seller</span>
            </div>

            {/* Vertically Styled Navigation Tabs */}
            <div className="settings-nav-list">
              <button
                type="button"
                className={`settings-nav-item ${activeTab === "profile" ? "active" : ""}`}
                onClick={() => setActiveTab("profile")}
              >
                <User size={18} />
                <span>Profile Info</span>
              </button>
              <button
                type="button"
                className={`settings-nav-item ${activeTab === "business" ? "active" : ""}`}
                onClick={() => setActiveTab("business")}
              >
                <Building size={18} />
                <span>Business Details</span>
              </button>
              <button
                type="button"
                className={`settings-nav-item ${activeTab === "bank" ? "active" : ""}`}
                onClick={() => setActiveTab("bank")}
              >
                <Landmark size={18} />
                <span>Bank & Settlement</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Content Card */}
          <div className="settings-content">
            <div className="settings-card content-card">
              <div className="settings-card-body">
                {activeTab === "profile" && (
                  <div className="settings-section">
                    <h2>Personal Information</h2>
                    <p className="section-subtitle">Your seller account registration details.</p>
                    
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Full Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={getProfileName()}
                          readOnly
                        />
                      </div>
                      <div className="form-group">
                        <label>Email Address</label>
                        <input
                          type="text"
                          className="form-control"
                          value={getField(["email", "sellerEmail"], sellerEmail)}
                          readOnly
                        />
                      </div>
                      <div className="form-group">
                        <label>Phone Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={getField(["phone", "phoneNumber", "mobile", "phoneNo"])}
                          readOnly
                        />
                      </div>
                      <div className="form-group">
                        <label>Account Role</label>
                        <input
                          type="text"
                          className="form-control"
                          value={getField(["role"], "Seller")}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "business" && (
                  <div className="settings-section">
                    <h2>Business Details</h2>
                    <p className="section-subtitle">Onboarded business name and verification details.</p>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Store / Brand Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={getField(["storeName", "businessName", "shopName", "displayName"])}
                          readOnly
                        />
                      </div>
                      <div className="form-group">
                        <label>GSTIN (GST Number)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={getField(["gst", "gstin", "gstNumber", "gstNo"])}
                          readOnly
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Business Address</label>
                        <textarea
                          className="form-control textarea"
                          rows="3"
                          value={getField(["businessAddress", "address", "storeAddress", "registeredAddress"])}
                          readOnly
                        />
                      </div>
                      <div className="form-group">
                        <label>Pincode</label>
                        <input
                          type="text"
                          className="form-control"
                          value={getField(["sellerPinCode", "pinCode", "pincode"])}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "bank" && (
                  <div className="settings-section">
                    <h2>Bank & Settlement Details</h2>
                    <p className="section-subtitle">Account where payout settlements are credited.</p>

                    <div className="form-grid">
                      <div className="form-group">
                        <label>Bank Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={getField(["bankName", "bank"])}
                          readOnly
                        />
                      </div>
                      <div className="form-group">
                        <label>Account Holder Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={getField(["accountHolderName", "holderName", "accountName"])}
                          readOnly
                        />
                      </div>
                      <div className="form-group">
                        <label>Account Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={getField(["accountNumber", "accNo", "accountNo"])}
                          readOnly
                        />
                      </div>
                      <div className="form-group">
                        <label>IFSC Code</label>
                        <input
                          type="text"
                          className="form-control"
                          value={getField(["ifscCode", "ifsc"])}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
