import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Plus, X, CheckCircle2 } from "lucide-react";
import {
  resolveSellerId,
  walletService,
  getUserProfile,
  getSellerCampaigns,
  getCampaignDetails,
  getCampaignSummary
} from "../../services/sellerService";
import "./WalletPage.css";

// Utility to load Razorpay script dynamically and safely ensure it is loaded only once
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const isDev = () => {
  try {
    if (process.env && process.env.NODE_ENV === "development") return true;
  } catch {}
  return typeof window !== "undefined" && window.location.hostname === "localhost";
};

const formatDateToEnGB = (dateStr) => {
  if (!dateStr) return "Recent";
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const options = { day: "2-digit", month: "short", year: "numeric" };
      return d.toLocaleDateString("en-GB", options);
    }
  } catch {}
  return String(dateStr);
};

const devLog = (...args) => { if (isDev()) console.log(...args); };
const devWarn = (...args) => { if (isDev()) console.warn(...args); };
const devError = (...args) => { if (isDev()) console.error(...args); };

const WalletPage = () => {
  const sellerId = resolveSellerId();
  const navigate = useNavigate();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [campaignSummary, setCampaignSummary] = useState(null);
  const [campaignHistory, setCampaignHistory] = useState([]);

  // States specified in task:
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [loadingCampaignHistory, setLoadingCampaignHistory] = useState(false);
  const [addingFunds, setAddingFunds] = useState(false);
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [amount, setAmount] = useState("");

  const [activeTab, setActiveTab] = useState("history"); // 'history' or 'campaign'
  const [sellerProfile, setSellerProfile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load seller profile to prefill Razorpay
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const email = localStorage.getItem("userEmail") || sessionStorage.getItem("userEmail") || "";
        if (email) {
          const profile = await getUserProfile(email);
          if (profile?.status === "success" || profile?.message) {
            setSellerProfile(profile.message);
          }
        }
      } catch (err) {
        devWarn("[WalletPage] Profile load failed:", err);
      }
    };
    fetchProfile();
  }, []);

  // Load wallet balance
  const loadBalance = useCallback(async () => {
    if (!sellerId) {
      setError("Seller session not found. Please login again.");
      setLoadingBalance(false);
      return;
    }
    setLoadingBalance(true);
    setError(null);
    try {
      const balanceRes = await walletService.checkWalletBalance(sellerId);
      const fetchedBalance = Number(balanceRes?.message?.RemainingBalance || balanceRes?.RemainingBalance || 0);
      setBalance(fetchedBalance);
      if (balanceRes?.status === "error") {
        setError("Unable to load wallet balance");
      }
    } catch (err) {
      devError("[WalletPage] Error loading balance:", err);
      setBalance(0);
      setError("Unable to load wallet balance");
    } finally {
      setLoadingBalance(false);
    }
  }, [sellerId]);

  // Load transaction history
  const loadHistory = useCallback(async () => {
    if (!sellerId) {
      setLoadingHistory(false);
      return;
    }
    setLoadingHistory(true);
    setError(null);
    try {
      const transactionsRes = await walletService.transactionHistory(sellerId);
      const rawTx = transactionsRes?.message?.transactions || transactionsRes?.transactions || [];

      // Map transactions to UI format
      const mapTx = (txs) => txs.map((tx) => {
        const isCredit =
          String(tx.type || "").toLowerCase() === "credit" ||
          String(tx.type || "").toLowerCase() === "deposit" ||
          String(tx.type || "").toLowerCase() === "add_funds";

        let displayDate = "Recent";
        const dateVal = tx.createdDate || tx.date || tx.createdAt;
        if (dateVal) {
          try {
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) {
              const options = { day: "2-digit", month: "short", year: "numeric" };
              displayDate = d.toLocaleDateString("en-GB", options);
            }
          } catch (e) {
            displayDate = String(dateVal);
          }
        }

        return {
          id: tx._id || tx.id || String(Math.random()),
          date: displayDate,
          type: tx.type || "Transaction",
          amount: Number(tx.amount || 0),
          isCredit,
          status: tx.status || "Completed",
        };
      });

      setTransactions(mapTx(rawTx));
    } catch (err) {
      devError("[WalletPage] Error loading history:", err);
      setError(err.message || "Failed to retrieve transaction history.");
    } finally {
      setLoadingHistory(false);
    }
  }, [sellerId]);

  // Load Campaign Summary
  const loadCampaignSummary = useCallback(async () => {
    if (!sellerId) {
      setError("Seller session not found. Please login again.");
      return;
    }
    setLoadingCampaign(true);
    setLoadingCampaignHistory(true);
    setError(null);
    try {
      // Step 1: Fetch Campaignsummery for top summary cards
      const summaryRes = await getCampaignSummary(sellerId);
      if (summaryRes?.status === "success" || summaryRes?.message) {
        setCampaignSummary(summaryRes.message);
      } else {
        throw new Error(summaryRes?.message || "Failed to load campaign summary.");
      }

      // Step 2: Fetch sellerCampaigns
      const campaignsResponse = await getSellerCampaigns(sellerId);
      console.log("[sellerCampaigns]", campaignsResponse);

      const rawCampaigns = campaignsResponse?.data || campaignsResponse?.message?.campaigns || campaignsResponse?.campaigns || [];
      const campaignsList = Array.isArray(rawCampaigns) ? rawCampaigns : [];

      const now = new Date();
      const fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];
      const dateRangeParams = { fromDate, toDate };

      // Step 3: Fetch campaignDetails for each campaign tableId
      const detailPromises = campaignsList.map(async (campaign) => {
        const tableId =
          campaign.tableId ||
          campaign._id ||
          campaign.id ||
          campaign.campaignTableId;

        if (!tableId) return [];

        try {
          const detailsResponse = await getCampaignDetails(tableId, dateRangeParams);
          console.log("[campaignDetails]", detailsResponse);

          // Safe performance extraction
          const performance =
            detailsResponse?.message?.performance ||
            detailsResponse?.performance ||
            [];

          // Safe campaign extraction
          const campaignInfo =
            detailsResponse?.message?.campaign ||
            detailsResponse?.campaign ||
            campaign;

          // Map every performance item into spend history rows
          const perfArray = Array.isArray(performance) ? performance : [performance];

          return perfArray.map((perf) => {
            const spendVal = Number(perf.totalSpend !== undefined ? perf.totalSpend : (perf.spend !== undefined ? perf.spend : 0));
            return {
              date: perf.date || perf.createdDate || campaignInfo.createdAt || campaignInfo.createdDate || "Recent",
              campaignTitle: campaignInfo.title || campaignInfo.name || campaignInfo.campaignName || "Unnamed Campaign",
              campaignId: campaignInfo.campaignId || campaignInfo.id || campaignInfo._id || "N/A",
              status: campaignInfo.status || "Active",
              spend: spendVal,
              reach: Number(perf.reach !== undefined ? perf.reach : 0),
              impressions: Number(perf.impressions !== undefined ? perf.impressions : 0),
              clicks: Number(perf.clicks !== undefined ? perf.clicks : 0),
              sales: Number(perf.sales !== undefined ? perf.sales : 0),
              revenue: Number(perf.revenue !== undefined ? perf.revenue : 0),
              dailyBudget: Number(campaignInfo.dailyBudget || 0),
            };
          });
        } catch (detailErr) {
          devError(`[WalletPage] Error fetching campaignDetails for ${tableId}:`, detailErr);
          return [];
        }
      });

      const settledDetails = await Promise.all(detailPromises);
      let spendHistoryRows = settledDetails.flat();

      // Step 6: Filter rows:
      // - show rows where spend > 0
      // - if all spend is 0, show all performance rows with ₹0.00
      const positiveSpendRows = spendHistoryRows.filter((r) => r.spend > 0);
      if (positiveSpendRows.length > 0) {
        spendHistoryRows = positiveSpendRows;
      }

      // Step 7: Sort by latest date first.
      spendHistoryRows.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
          return 0;
        }
        return dateB.getTime() - dateA.getTime();
      });

      console.log("[campaignSpendHistory]", spendHistoryRows);
      setCampaignHistory(spendHistoryRows);

    } catch (err) {
      devError("[WalletPage] Error loading campaign summary:", err);
      setError(err.message || "Failed to retrieve campaign summary.");
    } finally {
      setLoadingCampaign(false);
      setLoadingCampaignHistory(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadBalance();
    loadHistory();
  }, [loadBalance, loadHistory]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "history") {
      loadHistory();
    } else if (tab === "campaign") {
      loadCampaignSummary();
    }
  };

  // Handle opening modal
  const openModal = () => {
    setAmount("");
    setSuccessMessage(null);
    setAddingFunds(false);
    setRazorpayLoading(false);
    setIsModalOpen(true);
  };

  // Handle payment processing using Razorpay
  const handleProceedPayment = async (e) => {
    e.preventDefault();
    const amountVal = parseFloat(amount);
    if (!sellerId) {
      setError("Seller session not found. Please login again.");
      return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setRazorpayLoading(true);
    setError(null);

    try {
      // 1. Create Razorpay order on backend
      const requestPayload = {
        sellerId,
        amount: amountVal,
      };
      devLog("[WalletPage] Order creation request payload:", requestPayload);

      const orderRes = await walletService.createRazorpayOrder(requestPayload);

      // Sanitize response to prevent logging sensitive key secrets
      const sanitizedOrderRes = { ...orderRes };
      if (sanitizedOrderRes.message && typeof sanitizedOrderRes.message === "object") {
        sanitizedOrderRes.message = { ...sanitizedOrderRes.message };
        if (sanitizedOrderRes.message.keyId) sanitizedOrderRes.message.keyId = "***";
        if (sanitizedOrderRes.message.key) sanitizedOrderRes.message.key = "***";
      }
      if (sanitizedOrderRes.key) sanitizedOrderRes.key = "***";
      if (sanitizedOrderRes.razorpayKey) sanitizedOrderRes.razorpayKey = "***";

      devLog("[WalletPage] Order creation response:", sanitizedOrderRes);

      // Extract details safely supporting various back-end structures
      const rzpOrderId =
        orderRes?.orderId ||
        orderRes?.order_id ||
        orderRes?.id ||
        orderRes?.razorpayOrderId ||
        orderRes?.data?.orderId ||
        orderRes?.data?.order_id ||
        orderRes?.data?.id ||
        orderRes?.message?.order?.id ||
        orderRes?.message?.order?.orderId ||
        orderRes?.message?.order?.order_id ||
        orderRes?.message?.orderId ||
        orderRes?.message?.order_id ||
        orderRes?.message?.id;

      devLog("[WalletPage] Resolved orderId:", rzpOrderId);

      const rzpAmount =
        orderRes?.amount ||
        orderRes?.amount_due ||
        orderRes?.message?.order?.amount ||
        orderRes?.message?.amount ||
        (amountVal * 100);

      const rzpCurrency = orderRes?.currency || orderRes?.message?.order?.currency || "INR";

      const rzpKey =
        orderRes?.key ||
        orderRes?.razorpayKey ||
        orderRes?.message?.keyId ||
        orderRes?.message?.key ||
        orderRes?.message?.razorpayKey;

      if (!rzpOrderId) {
        throw new Error("Payment order creation failed. Please try again.");
      }

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load. Please check your network connection.");
      }

      setRazorpayLoading(false);

      // Check for image/logo in the response and ensure it's a valid HTTPS URL (no localhost/HTTP)
      const rawImage = orderRes?.image || orderRes?.logo || orderRes?.message?.image || orderRes?.message?.logo || orderRes?.message?.order?.image || orderRes?.message?.order?.logo;
      let rzpImage = undefined;
      if (rawImage && typeof rawImage === "string" && rawImage.startsWith("https://") && !rawImage.includes("localhost") && !rawImage.includes("127.0.0.1")) {
        rzpImage = rawImage;
      }

      // 3. Configure Razorpay checkout options
      const options = {
        key: rzpKey || "rzp_test_mockkey",
        amount: rzpAmount,
        currency: rzpCurrency,
        name: "Haatza India Private Limited",
        description: "Add Funds to Wallet",
        order_id: rzpOrderId,
        ...(rzpImage ? { image: rzpImage } : {}),
        prefill: {
          name: sellerProfile?.sellerName || "Seller",
          email: sellerProfile?.email || localStorage.getItem("userEmail") || sessionStorage.getItem("userEmail") || "",
          contact: sellerProfile?.phone || sellerProfile?.contact || "",
        },
        theme: {
          color: "#2962ff",
        },
        handler: async function (paymentRes) {
          setAddingFunds(true);
          devLog("[WalletPage] Razorpay payment success handler:", paymentRes);

          try {
            // Capture signature, payment ID, order ID, and amount
            const capturePayload = {
              sellerId,
              razorpay_payment_id: paymentRes.razorpay_payment_id,
              razorpay_order_id: paymentRes.razorpay_order_id || rzpOrderId,
              razorpay_signature: paymentRes.razorpay_signature,
              amount: amountVal,
            };

            // 4. Verify payment on backend
            const verifyRes = await walletService.verifyRazorpayPayment(capturePayload);
            devLog("[WalletPage] Verification response:", verifyRes);

            const isVerified = verifyRes?.status === "success" || verifyRes?.message?.verified || verifyRes?.verified;
            if (isVerified) {
              // 5. If verification succeeds, execute addFunds to complete the ledger update
              const addFundsPayload = {
                sellerId,
                amount: amountVal,
                razorpay_payment_id: paymentRes.razorpay_payment_id,
                razorpay_order_id: paymentRes.razorpay_order_id || rzpOrderId,
                razorpay_signature: paymentRes.razorpay_signature
              };
              const addRes = await walletService.addFunds(addFundsPayload);
              devLog("[WalletPage] Add funds response:", addRes);

              setSuccessMessage("₹" + amountVal.toFixed(2) + " credited to your wallet.");
              setAddingFunds(false);

              // Reload balance, transaction history, and campaign spends to sync all state
              await Promise.all([loadBalance(), loadHistory(), loadCampaignSummary()]);

              window.dispatchEvent(new CustomEvent("walletUpdate"));

              setTimeout(() => {
                setIsModalOpen(false);
                setSuccessMessage(null);
                setAmount("");
              }, 2000);
            } else {
              throw new Error("Payment verification failed on the server.");
            }
          } catch (verifyErr) {
            devError("[WalletPage] Payment verification/credit failed:", verifyErr);
            setError(verifyErr.message || "Failed to complete payment transaction. Please contact support.");
            setAddingFunds(false);
          }
        },
        modal: {
          ondismiss: () => {
            setAddingFunds(false);
            setRazorpayLoading(false);
            devLog("[WalletPage] Payment cancelled by user (modal dismissed).");
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      devError("[WalletPage] Add funds failed:", err);
      setError(err.message || "Could not complete add funds flow.");
      setRazorpayLoading(false);
      setAddingFunds(false);
    }
  };

  const isInitialLoading = (loadingBalance && balance === 0) || (activeTab === "history" && loadingHistory && transactions.length === 0);

  return (
    <div className="transaction-page-root">
      {/* Blue Header top bar */}
      <div className="transaction-header-bar">
        <button className="header-icon-btn back-btn" onClick={() => navigate(-1)} aria-label="Go Back">
          <ChevronLeft size={24} />
        </button>
        <h1 className="transaction-title">Transaction</h1>
        <button className="header-icon-btn bell-btn" onClick={() => navigate("/notifications")} aria-label="Notifications">
          <Bell size={24} />
        </button>
      </div>

      {/* Desktop flat header with breadcrumbs */}
      <div className="wallet-desktop-header">
        <nav className="wallet-breadcrumb">
          <span>Dashboard</span> &gt; <span className="active">Wallet</span>
        </nav>
        <h1 className="wallet-desktop-title">Wallet & Transactions</h1>
      </div>

      <div className="transaction-content-area">
        {error && (
          <div className="wallet-error-banner">
            <span>{error}</span>
            <button type="button" className="error-close" onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        {isInitialLoading ? (
          <div className="wallet-loading-state">
            <div className="wallet-loading-spinner" />
            <p>Loading billing details...</p>
          </div>
        ) : (
          <>
            {/* Wallet Balance Card */}
            <div className="wallet-balance-card-v2">
              <div className="balance-info-left">
                <span className="balance-label">Wallet Balance</span>
                <h2 className="balance-value">₹{balance.toFixed(2)}</h2>
              </div>
              <button className="btn-add-funds-v2" onClick={openModal}>
                <Plus size={16} />
                <span>Add Funds</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="transaction-tabs-v2">
              <button
                type="button"
                className={`tab-btn-v2 ${activeTab === "history" ? "active" : ""}`}
                onClick={() => handleTabChange("history")}
              >
                Transaction History
              </button>
              <button
                type="button"
                className={`tab-btn-v2 ${activeTab === "campaign" ? "active" : ""}`}
                onClick={() => handleTabChange("campaign")}
              >
                Campaign Spends
              </button>
            </div>

            {/* List */}
            <div className="transaction-list-container-v2">
              {activeTab === "history" ? (
                transactions.length === 0 ? (
                  <div className="empty-list-view">
                    <p>No transaction history found.</p>
                  </div>
                ) : (
                  transactions.map((t) => (
                    <div className="transaction-item-row" key={t.id}>
                      <div className="tx-col-left">
                        <span className="tx-date-text">{t.date}</span>
                        <span className="tx-type-text">{t.type}</span>
                      </div>
                      <div className="tx-col-right">
                        <span className={`tx-amount-text ${t.isCredit ? "credit" : "spend"}`}>
                          ₹{t.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )
              ) : (
                loadingCampaign ? (
                  <div className="wallet-loading-state">
                    <div className="wallet-loading-spinner" />
                    <p>Loading campaign summary...</p>
                  </div>
                ) : !campaignSummary ? (
                  <div className="empty-list-view">
                    <p>No campaign summary found.</p>
                  </div>
                ) : (
                  <div className="campaign-summary-container">
                    <div className="transaction-item-row" style={{ borderBottom: "1px solid #eee", paddingBottom: "12px", marginBottom: "12px" }}>
                      <div className="tx-col-left">
                        <span className="tx-type-text" style={{ fontSize: "16px", fontWeight: "600" }}>Total Campaign Spend</span>
                      </div>
                      <div className="tx-col-right">
                        <span className="tx-amount-text spend" style={{ fontSize: "18px", fontWeight: "700", color: "#e53935" }}>
                          {`₹${Number(campaignSummary?.data?.totalSpend || 0).toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    <div className="transaction-item-row">
                      <div className="tx-col-left">
                        <span className="tx-type-text">Active Campaigns</span>
                      </div>
                      <div className="tx-col-right">
                        <span className="tx-amount-text" style={{ color: "#333" }}>{campaignSummary?.campaignCount ?? 0}</span>
                      </div>
                    </div>

                    <div className="transaction-item-row">
                      <div className="tx-col-left">
                        <span className="tx-type-text">Reach</span>
                      </div>
                      <div className="tx-col-right">
                        <span className="tx-amount-text" style={{ color: "#333" }}>{campaignSummary?.data?.reach ?? 0}</span>
                      </div>
                    </div>

                    <div className="transaction-item-row">
                      <div className="tx-col-left">
                        <span className="tx-type-text">Impressions</span>
                      </div>
                      <div className="tx-col-right">
                        <span className="tx-amount-text" style={{ color: "#333" }}>{campaignSummary?.data?.impressions ?? 0}</span>
                      </div>
                    </div>

                    <div className="transaction-item-row">
                      <div className="tx-col-left">
                        <span className="tx-type-text">Clicks</span>
                      </div>
                      <div className="tx-col-right">
                        <span className="tx-amount-text" style={{ color: "#333" }}>{campaignSummary?.data?.clicks ?? 0}</span>
                      </div>
                    </div>

                    <div className="transaction-item-row">
                      <div className="tx-col-left">
                        <span className="tx-type-text">Sales</span>
                      </div>
                      <div className="tx-col-right">
                        <span className="tx-amount-text" style={{ color: "#333" }}>{campaignSummary?.data?.sales ?? 0}</span>
                      </div>
                    </div>

                    {/* Campaign Spend History Section */}
                    <div style={{ marginTop: "24px", borderTop: "1px solid #eee", paddingTop: "24px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", color: "#333" }}>Campaign Spend History</h3>
                      
                      {loadingCampaignHistory ? (
                        <div className="wallet-loading-state" style={{ minHeight: "100px" }}>
                          <div className="wallet-loading-spinner" />
                          <p>Loading spend history...</p>
                        </div>
                      ) : campaignHistory.length === 0 ? (
                        <div className="empty-list-view" style={{ minHeight: "100px" }}>
                          <p>No campaign spend history found.</p>
                        </div>
                      ) : (
                        campaignHistory.map((c, idx) => (
                          <div className="transaction-item-row" key={`${c.campaignId}-${idx}`}>
                            <div className="tx-col-left">
                              <span className="tx-date-text">{formatDateToEnGB(c.date)}</span>
                              <span className="tx-type-text">
                                {c.campaignTitle} • Reach: {c.reach} • Imps: {c.impressions} • Clicks: {c.clicks} • <span style={{ fontWeight: "500", color: c.status.toLowerCase() === "active" ? "#2e7d32" : "#757575" }}>{c.status}</span>
                              </span>
                            </div>
                            <div className="tx-col-right">
                              <span className="tx-amount-text spend">
                                ₹{c.spend.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Funds Bottom Sheet/Modal */}
      {isModalOpen && (
        <div className="wallet-modal-overlay" onClick={() => !(razorpayLoading || addingFunds) && setIsModalOpen(false)}>
          <div className="wallet-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-handle" />
            <button
              type="button"
              className="bottom-sheet-close"
              onClick={() => !(razorpayLoading || addingFunds) && setIsModalOpen(false)}
              disabled={razorpayLoading || addingFunds}
            >
              <X size={20} />
            </button>

            {successMessage ? (
              <div className="modal-success-state">
                <CheckCircle2 size={54} className="success-icon" />
                <h3>Funds Added Successfully!</h3>
                <p>{successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleProceedPayment} className="bottom-sheet-form">
                <h3>Add Funds</h3>
                <div className="form-group">
                  <label htmlFor="amount-input">Enter Amount</label>
                  <div className="amount-input-container">
                    <span className="amount-prefix">₹</span>
                    <input
                      id="amount-input"
                      type="number"
                      className="amount-input"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="1"
                      required
                      autoFocus
                      disabled={razorpayLoading || addingFunds}
                    />
                  </div>
                </div>

                <div className="quick-amount-selectors">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="quick-amt-button"
                      onClick={() => setAmount(String(amt))}
                      disabled={razorpayLoading || addingFunds}
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>

                <button type="submit" className="btn-bottom-sheet-add" disabled={razorpayLoading || addingFunds}>
                  {razorpayLoading ? "Opening Razorpay..." : addingFunds ? "Processing Payment..." : "Add"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletPage;
