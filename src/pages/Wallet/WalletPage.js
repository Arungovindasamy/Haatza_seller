import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Plus, X, CheckCircle2 } from "lucide-react";
import { getSellerId } from "../../utils/sellerSession";
import { sellerService } from "../../services/sellerService";
import "./WalletPage.css";

// Utility to load Razorpay script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const WalletPage = () => {
  const sellerId = getSellerId();
  const navigate = useNavigate();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [campaignSpends, setCampaignSpends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("history"); // 'history' or 'campaign'
  const [sellerProfile, setSellerProfile] = useState(null);

  // Add funds modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [modalSuccess, setModalSuccess] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Success message toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Load seller profile to prefill Razorpay
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const email = localStorage.getItem("userEmail") || sessionStorage.getItem("userEmail") || "";
        if (email) {
          const profile = await sellerService.getUserProfile(email);
          if (profile?.status === "success" || profile?.message) {
            setSellerProfile(profile.message);
          }
        }
      } catch (err) {
        console.warn("[WalletPage] Profile load failed:", err);
      }
    };
    fetchProfile();
  }, []);

  // Load wallet data
  const loadWalletData = useCallback(async () => {
    if (!sellerId) {
      setError("Seller session not found. Please login again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [balanceRes, transactionsRes, spendsRes] = await Promise.all([
        sellerService.getWalletSummary(sellerId),
        sellerService.getWalletTransactions(sellerId),
        sellerService.getCampaignSpends(sellerId),
      ]);

      const fetchedBalance = Number(balanceRes?.message?.RemainingBalance || 0);
      const rawTx = transactionsRes?.message?.transactions || [];
      const rawSpends = spendsRes?.message?.spends || [];

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

      setBalance(fetchedBalance);
      setTransactions(mapTx(rawTx));
      setCampaignSpends(mapTx(rawSpends));
    } catch (err) {
      console.error("[WalletPage] Error loading wallet data:", err);
      setError(err.message || "Failed to retrieve wallet records from server.");
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  // Handle opening modal
  const openModal = () => {
    setAddAmount("");
    setModalSuccess(false);
    setModalLoading(false);
    setIsModalOpen(true);
  };

  // Handle payment processing using Razorpay
  const handleProceedPayment = async (e) => {
    e.preventDefault();
    const amountVal = parseFloat(addAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast("Please enter a valid amount greater than 0");
      return;
    }

    setModalLoading(true);
    setError(null);

    try {
      // 1. Create Razorpay order on backend
      const orderRes = await sellerService.createWalletOrder(sellerId, amountVal);
      
      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load. Please check your network connection.");
      }

      // Determine order parameters (checking backend response format)
      const rzpOrderId = orderRes?.orderId || orderRes?.message?.id || orderRes?.id;
      const rzpKey = orderRes?.key || orderRes?.razorpayKey || "rzp_test_mockkey"; // Do not store secret key on frontend

      // 3. Configure Razorpay checkout
      const options = {
        key: rzpKey,
        amount: amountVal * 100, // in paise
        currency: "INR",
        name: "Haatza",
        description: "Add Funds to Wallet",
        order_id: rzpOrderId || undefined,
        handler: async function (paymentRes) {
          setModalLoading(true);
          try {
            // 4. Verify payment on backend
            const verifyRes = await sellerService.verifyWalletPayment(sellerId, {
              razorpay_payment_id: paymentRes.razorpay_payment_id,
              razorpay_order_id: paymentRes.razorpay_order_id || rzpOrderId,
              razorpay_signature: paymentRes.razorpay_signature,
            });

            if (verifyRes?.status === "success" || verifyRes?.message?.verified) {
              setModalSuccess(true);
              showToast("Funds added successfully!");
              setTimeout(() => {
                setIsModalOpen(false);
                loadWalletData();
              }, 2000);
            } else {
              throw new Error("Payment verification failed on the server.");
            }
          } catch (verifyErr) {
            console.error("[WalletPage] Payment verification failed:", verifyErr);
            setError(verifyErr.message || "Failed to verify payment. Please contact support.");
            setModalLoading(false);
          }
        },
        prefill: {
          name: sellerProfile?.sellerName || "Seller",
          email: sellerProfile?.email || "seller@haatza.com",
        },
        theme: {
          color: "#2962ff",
        },
        modal: {
          ondismiss: () => {
            setModalLoading(false);
            showToast("Payment cancelled by user");
          }
        }
      };

      if (!rzpOrderId) {
        throw new Error("Failed to create order on payment server. Please try again.");
      }
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("[WalletPage] Add funds failed:", err);
      setError(err.message || "Could not complete add funds flow.");
      setModalLoading(false);
    }
  };

  return (
    <div className="transaction-page-root">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="wallet-toast">
          <span>{toastMessage}</span>
        </div>
      )}

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

        {loading ? (
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
                onClick={() => setActiveTab("history")}
              >
                Transaction History
              </button>
              <button
                type="button"
                className={`tab-btn-v2 ${activeTab === "campaign" ? "active" : ""}`}
                onClick={() => setActiveTab("campaign")}
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
                campaignSpends.length === 0 ? (
                  <div className="empty-list-view">
                    <p>No campaign spends found.</p>
                  </div>
                ) : (
                  campaignSpends.map((t) => (
                    <div className="transaction-item-row" key={t.id}>
                      <div className="tx-col-left">
                        <span className="tx-date-text">{t.date}</span>
                        <span className="tx-type-text">{t.type}</span>
                      </div>
                      <div className="tx-col-right">
                        <span className="tx-amount-text spend">
                          ₹{t.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* Add Funds Bottom Sheet/Modal */}
      {isModalOpen && (
        <div className="wallet-modal-overlay" onClick={() => !modalLoading && setIsModalOpen(false)}>
          <div className="wallet-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-handle" />
            <button
              type="button"
              className="bottom-sheet-close"
              onClick={() => !modalLoading && setIsModalOpen(false)}
              disabled={modalLoading}
            >
              <X size={20} />
            </button>

            {modalSuccess ? (
              <div className="modal-success-state">
                <CheckCircle2 size={54} className="success-icon" />
                <h3>Funds Added Successfully!</h3>
                <p>₹{parseFloat(addAmount).toFixed(2)} credited to your wallet.</p>
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
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      min="1"
                      required
                      autoFocus
                      disabled={modalLoading}
                    />
                  </div>
                </div>

                <div className="quick-amount-selectors">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="quick-amt-button"
                      onClick={() => setAddAmount(String(amt))}
                      disabled={modalLoading}
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>

                <button type="submit" className="btn-bottom-sheet-add" disabled={modalLoading}>
                  {modalLoading ? "Processing..." : "Add"}
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
