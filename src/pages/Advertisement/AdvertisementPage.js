import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RefreshCw,
  Plus,
  Play,
  Pause,
  Trash2,
  TrendingUp,
  MousePointerClick,
  Eye,
  DollarSign,
  Briefcase,
  Wallet,
  Bell,
  AlertCircle,
  Package,
  ExternalLink
} from "lucide-react";
import { getSellerId } from "../../utils/sellerSession";
import { advertisementService } from "../../services/sellerService";
import "./AdvertisementPage.css";

const AdvertisementPage = () => {
  const sellerId = getSellerId();
  const navigate = useNavigate();

  // API Data States
  const [summary, setSummary] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [promotedProducts, setPromotedProducts] = useState([]);
  const [notPromotedProducts, setNotPromotedProducts] = useState([]);

  // UI Flow States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Tabs & Search
  const [activeTab, setActiveTab] = useState("promoted"); // 'promoted' | 'not_promoted'
  const [searchQuery, setSearchQuery] = useState("");

  // Toasts
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Load All Data
  const loadPageData = useCallback(async () => {
    if (!sellerId) {
      setError("Seller session not found. Please login again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Execute all fetches in parallel
      const [summaryRes, campaignsRes, promotedRes, notPromotedRes] = await Promise.all([
        advertisementService.getAdvertisementSummary(sellerId).catch(err => {
          console.warn("[AdvertisementPage] getAdvertisementSummary failed:", err);
          throw err; // propagates to trigger error state
        }),
        advertisementService.getCampaigns(sellerId).catch(err => {
          console.warn("[AdvertisementPage] getCampaigns failed:", err);
          throw err;
        }),
        advertisementService.getPromotedProducts(sellerId).catch(err => {
          console.warn("[AdvertisementPage] getPromotedProducts failed:", err);
          throw err;
        }),
        advertisementService.getNotPromotedProducts(sellerId).catch(err => {
          console.warn("[AdvertisementPage] getNotPromotedProducts failed:", err);
          throw err;
        }),
      ]);

      // Parse Summary
      const parsedSummary = summaryRes?.data || summaryRes?.message || summaryRes || {};
      setSummary({
        activeCampaigns: parsedSummary.activeCampaigns || parsedSummary.ActiveCampaignsCount || 0,
        totalSpend: parsedSummary.totalSpend || parsedSummary.TotalSpend || 0,
        impressions: parsedSummary.impressions || parsedSummary.TotalImpressions || 0,
        clicks: parsedSummary.clicks || parsedSummary.TotalClicks || 0,
        promotedProductsCount: parsedSummary.promotedProductsCount || parsedSummary.PromotedProductsCount || 0,
      });

      // Parse Campaigns
      const rawCampaigns = campaignsRes?.data || campaignsRes?.message?.campaigns || campaignsRes?.campaigns || campaignsRes || [];
      const parsedCampaigns = Array.isArray(rawCampaigns) ? rawCampaigns : [];
      setCampaigns(parsedCampaigns);

      // Parse Products
      const rawPromoted = promotedRes?.data || promotedRes?.products || promotedRes || [];
      setPromotedProducts(Array.isArray(rawPromoted) ? rawPromoted : []);

      const rawNotPromoted = notPromotedRes?.data || notPromotedRes?.products || notPromotedRes || [];
      setNotPromotedProducts(Array.isArray(rawNotPromoted) ? rawNotPromoted : []);

    } catch (err) {
      console.error("[AdvertisementPage] Error loading data:", err);
      setError("Failed to load advertising data from backend. Please verify your connection.");
      showToast("Error loading page data", "error");
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Campaign Status & Action Handlers
  const handlePauseCampaign = async (campaignId) => {
    setActionLoadingId(campaignId);
    try {
      await advertisementService.pauseCampaign(campaignId, sellerId);
      showToast("Campaign paused successfully");
      // Local status update
      setCampaigns(prev =>
        prev.map(c => (c.id === campaignId || c._id === campaignId ? { ...c, status: "paused" } : c))
      );
    } catch (err) {
      console.error("[AdvertisementPage] Pause campaign failed:", err);
      showToast("Failed to pause campaign", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResumeCampaign = async (campaignId) => {
    setActionLoadingId(campaignId);
    try {
      await advertisementService.resumeCampaign(campaignId, sellerId);
      showToast("Campaign resumed successfully");
      setCampaigns(prev =>
        prev.map(c => (c.id === campaignId || c._id === campaignId ? { ...c, status: "active" } : c))
      );
    } catch (err) {
      console.error("[AdvertisementPage] Resume campaign failed:", err);
      showToast("Failed to resume campaign", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm("Are you sure you want to delete this campaign?")) return;
    setActionLoadingId(campaignId);
    try {
      await advertisementService.deleteCampaign(campaignId, sellerId);
      showToast("Campaign deleted successfully");
      setCampaigns(prev => prev.filter(c => c.id !== campaignId && c._id !== campaignId));
    } catch (err) {
      console.error("[AdvertisementPage] Delete campaign failed:", err);
      showToast("Failed to delete campaign", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    const list = activeTab === "promoted" ? promotedProducts : notPromotedProducts;
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(p =>
      (p.name || p.productName || p.title || "").toLowerCase().includes(query) ||
      (p.sku || p.id || p._id || "").toString().toLowerCase().includes(query)
    );
  }, [activeTab, promotedProducts, notPromotedProducts, searchQuery]);

  // Render Skeleton Placeholders
  const renderSkeletons = () => (
    <div className="ad-skeleton-container">
      <div className="skeleton-row-cards">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton-card skeleton-pulse" />
        ))}
      </div>
      <div className="skeleton-main-grid">
        <div className="skeleton-left skeleton-pulse" />
        <div className="skeleton-right skeleton-pulse" />
      </div>
    </div>
  );

  return (
    <div className="ad-page-root">
      {/* Toast Notification Container */}
      {toast && (
        <div className={`ad-toast-banner ${toast.type}`}>
          <AlertCircle size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Row with actions */}
      <div className="ad-page-header">
        <div className="header-breadcrumbs-area">
          <nav className="ad-breadcrumb">
            <span>Dashboard</span> &gt; <span>Boost Sales</span> &gt; <span className="active">Advertisement</span>
          </nav>
          <h1 className="ad-page-title">Advertisement</h1>
        </div>
        <div className="header-navigation-icons">
          <button className="nav-icon-btn" onClick={() => navigate("/wallet")} aria-label="Wallet">
            <Wallet size={20} />
          </button>
          <button className="nav-icon-btn" onClick={() => navigate("/notifications")} aria-label="Notifications">
            <Bell size={20} />
          </button>
          <button className="btn-create-campaign-main" onClick={() => navigate("/advertisement/create-campaign")}>
            <Plus size={16} />
            <span>Create New Campaign</span>
          </button>
        </div>
      </div>

      {loading ? (
        renderSkeletons()
      ) : error ? (
        /* Error state with retry */
        <div className="ad-error-container">
          <div className="ad-error-card">
            <AlertCircle size={48} className="error-icon" />
            <h3>Unable to Sync Advertisement Hub</h3>
            <p>{error}</p>
            <button className="btn-retry-sync" onClick={loadPageData}>
              <RefreshCw size={16} />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="ad-main-layout">
          {/* A. Campaign Overview Grid */}
          <section className="ad-overview-section">
            <div className="metric-card">
              <div className="card-header-wrap">
                <span className="metric-label">Active Campaigns</span>
                <Briefcase size={18} className="card-icon" />
              </div>
              <h2 className="metric-value">{summary?.activeCampaigns}</h2>
            </div>
            <div className="metric-card">
              <div className="card-header-wrap">
                <span className="metric-label">Total Spend</span>
                <DollarSign size={18} className="card-icon" />
              </div>
              <h2 className="metric-value">₹{Number(summary?.totalSpend).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</h2>
            </div>
            <div className="metric-card">
              <div className="card-header-wrap">
                <span className="metric-label">Impressions</span>
                <Eye size={18} className="card-icon" />
              </div>
              <h2 className="metric-value">{Number(summary?.impressions).toLocaleString("en-IN")}</h2>
            </div>
            <div className="metric-card">
              <div className="card-header-wrap">
                <span className="metric-label">Clicks</span>
                <MousePointerClick size={18} className="card-icon" />
              </div>
              <h2 className="metric-value">{Number(summary?.clicks).toLocaleString("en-IN")}</h2>
            </div>
            <div className="metric-card">
              <div className="card-header-wrap">
                <span className="metric-label">Promoted Products</span>
                <Package size={18} className="card-icon" />
              </div>
              <h2 className="metric-value">{summary?.promotedProductsCount}</h2>
            </div>
          </section>

          {/* B. Promoted Products and C. Campaigns List Section */}
          <div className="ad-content-grid">
            {/* Left Column: Promoted Products Tabs */}
            <div className="ad-products-card">
              <div className="products-card-header">
                <h3>Product Coverage</h3>
                <div className="product-tabs-row">
                  <button
                    className={`prod-tab-btn ${activeTab === "promoted" ? "active" : ""}`}
                    onClick={() => setActiveTab("promoted")}
                  >
                    Promoted ({promotedProducts.length})
                  </button>
                  <button
                    className={`prod-tab-btn ${activeTab === "not_promoted" ? "active" : ""}`}
                    onClick={() => setActiveTab("not_promoted")}
                  >
                    Not Promoted ({notPromotedProducts.length})
                  </button>
                </div>
              </div>

              <div className="product-search-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search By Product"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-product-input"
                />
              </div>

              <div className="products-list-viewport">
                {filteredProducts.length === 0 ? (
                  <div className="products-empty-view">
                    <div className="empty-box-graphic">
                      <div className="box-base">
                        <div className="box-lid" />
                        <span className="zero-bubble">0</span>
                      </div>
                    </div>
                    <h4>Products Not Available</h4>
                    <p>No products align with the selected criteria or search term.</p>
                  </div>
                ) : (
                  <div className="products-small-grid">
                    {filteredProducts.map((p, idx) => (
                      <div key={p.id || p._id || idx} className="product-item-card">
                        <div className="product-img-holder">
                          {p.imageUrl || p.image ? (
                            <img src={p.imageUrl || p.image} alt={p.name || p.productName} />
                          ) : (
                            <Package size={24} className="img-placeholder" />
                          )}
                        </div>
                        <div className="product-info-column">
                          <span className="product-item-name">{p.name || p.productName || "Unnamed Product"}</span>
                          <span className="product-item-sku">SKU: {p.sku || "N/A"}</span>
                          {p.price && <span className="product-item-price">₹{p.price}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Campaigns Table list */}
            <div className="ad-campaigns-list-card">
              <div className="campaigns-card-header">
                <h3>Campaign List</h3>
                <span className="campaign-count">{campaigns.length} Total Campaigns</span>
              </div>

              <div className="table-wrapper-horizontal">
                {campaigns.length === 0 ? (
                  <div className="campaigns-empty-view">
                    <TrendingUp size={40} className="empty-chart-icon" />
                    <h4>No Active Campaigns</h4>
                    <p>Drive more traffic to your listings by launching your first campaign today.</p>
                    <button
                      className="btn-create-campaign-inline"
                      onClick={() => navigate("/advertisement/create-campaign")}
                    >
                      Create Campaign Now
                    </button>
                  </div>
                ) : (
                  <table className="campaigns-desktop-table">
                    <thead>
                      <tr>
                        <th>Campaign Name</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Daily Budget</th>
                        <th>Duration</th>
                        <th>Spend</th>
                        <th className="align-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((c) => {
                        const id = c.id || c._id;
                        const statusClass = String(c.status || "active").toLowerCase();
                        const isActionLoading = actionLoadingId === id;

                        return (
                          <tr key={id}>
                            <td>
                              <span className="campaign-name-bold">{c.name || c.campaignName || "Campaign Name"}</span>
                            </td>
                            <td>
                              <span className="campaign-type-pill">{c.type || c.campaignType || "Smart"}</span>
                            </td>
                            <td>
                              <span className={`status-capsule ${statusClass}`}>
                                {c.status || "Active"}
                              </span>
                            </td>
                            <td>
                              <span className="campaign-budget-value">₹{c.budget || c.dailyBudget}</span>
                            </td>
                            <td>
                              <span className="campaign-date-span">
                                {c.startDate ? new Date(c.startDate).toLocaleDateString() : "N/A"} -{" "}
                                {c.endDate ? new Date(c.endDate).toLocaleDateString() : "Ongoing"}
                              </span>
                            </td>
                            <td>
                              <span className="campaign-spend-cell">₹{c.spend || 0}</span>
                            </td>
                            <td className="align-right">
                              <div className="campaign-actions-cell">
                                <button
                                  className="action-pill-btn view"
                                  onClick={() => alert(`Campaign Details:\nName: ${c.name || c.campaignName}\nType: ${c.type || c.campaignType}\nBudget: ₹${c.budget || c.dailyBudget}\nStart Date: ${c.startDate}\nEnd Date: ${c.endDate || "Ongoing"}`)}
                                  title="View Details"
                                  disabled={isActionLoading}
                                >
                                  <ExternalLink size={14} />
                                </button>
                                {statusClass === "paused" ? (
                                  <button
                                    className="action-pill-btn play"
                                    onClick={() => handleResumeCampaign(id)}
                                    title="Resume Campaign"
                                    disabled={isActionLoading}
                                  >
                                    <Play size={14} />
                                  </button>
                                ) : (
                                  <button
                                    className="action-pill-btn pause"
                                    onClick={() => handlePauseCampaign(id)}
                                    title="Pause Campaign"
                                    disabled={isActionLoading}
                                  >
                                    <Pause size={14} />
                                  </button>
                                )}
                                <button
                                  className="action-pill-btn delete"
                                  onClick={() => handleDeleteCampaign(id)}
                                  title="Delete Campaign"
                                  disabled={isActionLoading}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvertisementPage;
