import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Wallet, Plus, X, ArrowUpRight, ArrowDownLeft, CheckCircle2 } from "lucide-react";
import { getSellerId } from "../../utils/sellerSession";
import { sellerService } from "../../services/sellerService";
import "./WalletPage.css";

const WalletPage = () => {
  const sellerId = useMemo(() => getSellerId(), []);

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // 'all' for Transaction History, 'campaign' for Campaign Spends
  
  // Add funds modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [modalSuccess, setModalSuccess] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Load wallet data
  const loadWalletData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        sellerService.checkWalletBalance(sellerId),
        sellerService.getTransactionHistory(sellerId),
      ]);

      const fetchedBalance = Number(balanceRes?.message?.RemainingBalance || 0);
      const rawTx = transactionsRes?.message?.transactions || [];

      // Map raw transactions to frontend format
      const mappedTransactions = rawTx.map((tx) => {
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
      setTransactions(mappedTransactions);
    } catch (err) {
      console.error("[WalletPage] API error loading wallet:", err);
      setError(err.message || "Failed to retrieve billing logs from server.");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  // Filter transactions based on tab
  const filteredTransactions = useMemo(() => {
    if (activeTab === "campaign") {
      return transactions.filter((t) => !t.isCredit);
    }
    return transactions;
  }, [transactions, activeTab]);

  // Handle opening the modal
  const openModal = () => {
    setAddAmount("");
    setModalSuccess(false);
    setModalLoading(false);
    setIsModalOpen(true);
  };

  // Handle adding funds submission
  const handleAddFundsSubmit = async (e) => {
    e.preventDefault();
    const amountVal = parseFloat(addAmount);
    if (!isNaN(amountVal) && amountVal > 0) {
      setModalLoading(true);
      setError(null);
      try {
        await sellerService.addFunds(sellerId, amountVal);
        setModalSuccess(true);
        loadWalletData();
        
        setTimeout(() => {
          setIsModalOpen(false);
        }, 1500);
      } catch (err) {
        console.error("[WalletPage] Failed to add funds:", err);
        setError(err.message || "Failed to add funds. Please try again.");
        setModalLoading(false);
      }
    }
  };

  return (
    <div className="wallet-page-root">
      <div className="wallet-page-header">
        <h1>Wallet</h1>
        <p>Manage your billing balance, campaign spends, and transaction records.</p>
      </div>

      {error && (
        <div className="inv-alert-banner">
          <span>{error}</span>
          <button type="button" className="inv-alert-close" onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {loading ? (
        <div className="inv-table-loading">
          <div className="inv-loading-spinner" />
          <p>Loading wallet balance and transaction logs...</p>
        </div>
      ) : (
        <>
          <div className="wallet-grid">
            {/* Wallet Balance Card */}
            <div className="wallet-card balance-card">
              <div className="balance-card__info">
                <div className="balance-card__icon-wrapper">
                  <Wallet size={24} />
                </div>
                <div>
                  <p className="balance-card__title">Wallet Balance</p>
                  <h2 className="balance-card__value">₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                </div>
              </div>
              <button type="button" className="btn-add-funds" onClick={openModal}>
                <Plus size={16} />
                <span>Add Funds</span>
              </button>
            </div>

            {/* Dynamic transaction metrics */}
            <div className="wallet-card metrics-card">
              <div className="metric-row">
                <div className="metric-col">
                  <span className="metric-label">Total Spent</span>
                  <span className="metric-value spent">
                    ₹{transactions.filter(t => !t.isCredit).reduce((sum, t) => sum + t.amount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="metric-col">
                  <span className="metric-label">Total Credited</span>
                  <span className="metric-value credited">
                    ₹{transactions.filter(t => t.isCredit).reduce((sum, t) => sum + t.amount, 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Records Card */}
          <div className="inv-card mt-6">
            <div className="inv-card-body">
              {/* Tabs */}
              <div className="inv-tabs">
                <button
                  type="button"
                  className={`inv-tab-btn ${activeTab === "all" ? "inv-tab-btn--active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  Transaction History
                </button>
                <button
                  type="button"
                  className={`inv-tab-btn ${activeTab === "campaign" ? "inv-tab-btn--active" : ""}`}
                  onClick={() => setActiveTab("campaign")}
                >
                  Campaign Spends
                </button>
              </div>

              {/* Table */}
              <div className="inv-table-wrap">
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Transaction Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="inv-table-empty">
                          No transactions found for this category.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t) => (
                        <tr key={t.id}>
                          <td>{t.date}</td>
                          <td>
                            <span className="tx-type-container">
                              {t.isCredit ? (
                                <ArrowDownLeft size={16} className="tx-icon tx-icon--credit" />
                              ) : (
                                <ArrowUpRight size={16} className="tx-icon tx-icon--spend" />
                              )}
                              <span>{t.type}</span>
                            </span>
                          </td>
                          <td className={`font-bold ${t.isCredit ? "tx-amount--credit" : "tx-amount--spend"}`}>
                            {t.isCredit ? "+" : "-"}₹{t.amount.toFixed(2)}
                          </td>
                          <td>
                            <span className="tx-status-badge">
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Funds Modal */}
      {isModalOpen && (
        <div className="wallet-modal-overlay" onClick={() => !modalLoading && setIsModalOpen(false)}>
          <div className="wallet-modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="wallet-modal-close" onClick={() => !modalLoading && setIsModalOpen(false)} disabled={modalLoading}>
              <X size={18} />
            </button>
            
            {modalSuccess ? (
              <div className="modal-success-state">
                <CheckCircle2 size={48} className="success-icon" />
                <h3>Funds Added Successfully!</h3>
                <p>₹{parseFloat(addAmount).toFixed(2)} has been credited to your wallet balance.</p>
              </div>
            ) : (
              <form onSubmit={handleAddFundsSubmit} className="add-funds-form">
                <h3>Add Funds to Wallet</h3>
                <p className="modal-subtext">Enter the amount you would like to add to your advertising wallet.</p>
                
                <div className="amount-input-wrapper">
                  <span className="currency-prefix">₹</span>
                  <input
                    type="number"
                    className="amount-input"
                    placeholder="Enter amount"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    min="1"
                    required
                    autoFocus
                    disabled={modalLoading}
                  />
                </div>
                
                <div className="quick-amounts-row">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className="quick-amount-btn"
                      onClick={() => setAddAmount(String(amt))}
                      disabled={modalLoading}
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>

                <button type="submit" className="wallet-btn-submit" disabled={modalLoading}>
                  {modalLoading ? "Processing..." : "Proceed to Payment"}
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
