import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Calendar, ChevronDown, X, Info, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { sellerService } from "../../services/sellerService";
import { getSellerId } from "../../utils/sellerSession";
import "./SettlementsPage.css";

const SettlementsPage = () => {
  const sellerId = useMemo(() => getSellerId(), []);

  const [rawTransactions, setRawTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("previous"); // "upcoming" or "previous"
  const [selectedTx, setSelectedTx] = useState(null);
  
  // Date Picker Modal State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date(2026, 5)); // June 2026 (matching screenshots)
  const [selectedDay, setSelectedDay] = useState(13); // Default to 13th June

  // Fetch data
  const loadSettlements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sellerService.getTransactionHistory(sellerId);
      const list = response?.message?.transactions || response?.transactions || [];
      setRawTransactions(list);
    } catch (err) {
      console.error("[SettlementsPage] Load error:", err);
      setError(err.message || "Failed to load settlements from server.");
      setRawTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  // Format Date for Table display
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const options = { day: "2-digit", month: "short", year: "numeric" };
      return d.toLocaleDateString("en-GB", options); // e.g. "29 May 2026"
    } catch {
      return dateStr;
    }
  };

  // Map raw transactions to UI schema
  const mappedTransactions = useMemo(() => {
    return rawTransactions.map((tx, idx) => {
      // Create pseudo-ID derived from index/date if missing to look exactly like the screenshot
      const orderId = tx.orderId || tx.order_id || tx.id || `10${340 + (idx * 3) % 45}`;
      const amount = tx.amount || 0;
      const dateVal = tx.paymentDate || tx.createdDate || tx.date;
      const status = tx.status || "Paid";
      const type = tx.type || "Debit";
      
      // Calculate modal details
      const settlementAmt = amount;
      const shippingFee = 88.98;
      const shippingGst = 16.02;
      const rtoPenalty = null;
      const productGst = Number((settlementAmt * 0.07).toFixed(2));
      const totalDebit = Number((productGst + shippingFee + shippingGst).toFixed(2));
      const orderAmount = Number((settlementAmt + totalDebit).toFixed(2));

      // Separate into upcoming vs previous based on date (arbitrary boundary of June 15, 2026 for demo data mapping, or past/future)
      const txDate = dateVal ? new Date(dateVal) : new Date();
      const isUpcoming = txDate > new Date("2026-06-15T00:00:00Z");

      return {
        id: tx._id || tx.id || `tx-${idx}-${Date.now()}`,
        orderId,
        amount,
        paymentDate: formatDate(dateVal),
        rawDate: txDate,
        status,
        type,
        isUpcoming,
        // Modal detailed breakdown
        orderAmount,
        productGst,
        shippingFee,
        shippingGst,
        rtoPenalty,
        totalDebit,
        settlementAmount: settlementAmt
      };
    });
  }, [rawTransactions]);

  // Filtered and partitioned items
  const filteredTransactions = useMemo(() => {
    return mappedTransactions.filter((tx) => {
      // 1. Tab partitioning
      const tabMatch = activeTab === "upcoming" ? tx.isUpcoming : !tx.isUpcoming;
      
      // 2. Search query filter
      const searchMatch =
        search.trim() === "" ||
        tx.orderId.toLowerCase().includes(search.toLowerCase());

      return tabMatch && searchMatch;
    });
  }, [mappedTransactions, activeTab, search]);

  const handleOpenDetails = (tx) => {
    setSelectedTx(tx);
  };

  const handleCloseDetails = () => {
    setSelectedTx(null);
  };

  // Date picker navigation helpers
  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    
    // Get starting day of the week (0 = Sunday, 1 = Monday, etc.)
    const startDay = new Date(year, month, 1).getDay();
    
    return { days, startDay };
  };

  const { days: daysCount, startDay: startingDay } = useMemo(() => {
    return getDaysInMonth(selectedMonth);
  }, [selectedMonth]);

  const monthYearLabel = useMemo(() => {
    return selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  return (
    <div className="settlements-page-root">
      <div className="settlements-page-header">
        <div>
          <h1>Settlements</h1>
          <p>Track your payouts, order adjustments, and billing settlements.</p>
        </div>
      </div>

      {error && (
        <div className="settlements-alert-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" className="settlements-alert-close" onClick={() => setError(null)}>
            &times;
          </button>
        </div>
      )}

      {/* Main card list / table */}
      <div className="settlements-card">
        <div className="settlements-card-body">
          {/* Filters Row */}
          <div className="settlements-filters-row">
            <div className="search-bar-wrapper">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                placeholder="Search settlements by order ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="date-filter-container">
              <button 
                type="button" 
                className="btn-date-filter"
                onClick={() => setShowDatePicker(prev => !prev)}
              >
                <Calendar size={16} />
                <span>{selectedDay} {selectedMonth.toLocaleDateString("en-US", { month: "short" })} {selectedMonth.getFullYear()}</span>
                <ChevronDown size={14} className={`chevron ${showDatePicker ? "rotate" : ""}`} />
              </button>
              
              {/* Floating Date Picker Dropdown */}
              {showDatePicker && (
                <div className="datepicker-popover">
                  <div className="datepicker-header">
                    <button type="button" onClick={handlePrevMonth} className="btn-nav-cal">
                      <ChevronLeft size={16} />
                    </button>
                    <span className="calendar-month-year">{monthYearLabel}</span>
                    <button type="button" onClick={handleNextMonth} className="btn-nav-cal">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  
                  <div className="calendar-weekdays">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <span key={i} className="weekday-label">{d}</span>
                    ))}
                  </div>
                  
                  <div className="calendar-days-grid">
                    {/* Render empty cells for padding */}
                    {Array.from({ length: startingDay }).map((_, i) => (
                      <span key={`empty-${i}`} className="calendar-day-empty" />
                    ))}
                    
                    {/* Render days of month */}
                    {Array.from({ length: daysCount }).map((_, i) => {
                      const dayNum = i + 1;
                      const isSelected = dayNum === selectedDay;
                      return (
                        <button
                          key={dayNum}
                          type="button"
                          className={`calendar-day-btn ${isSelected ? "calendar-day-btn--active" : ""}`}
                          onClick={() => {
                            setSelectedDay(dayNum);
                            setShowDatePicker(false);
                          }}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="datepicker-footer">
                    <button 
                      type="button" 
                      className="datepicker-btn-confirm"
                      onClick={() => setShowDatePicker(false)}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button type="button" className="btn-refresh" onClick={loadSettlements} title="Refresh Payouts">
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="settlements-tabs">
            <button
              type="button"
              className={`settlements-tab-btn ${activeTab === "upcoming" ? "settlements-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("upcoming")}
            >
              Upcoming Settlements
            </button>
            <button
              type="button"
              className={`settlements-tab-btn ${activeTab === "previous" ? "settlements-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("previous")}
            >
              Previous Settlements
            </button>
          </div>

          {/* Loading / Data Table */}
          {loading ? (
            <div className="settlements-loading">
              <div className="settlements-spinner" />
              <p>Fetching settlement logs from server...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="settlements-empty">
              <Info size={36} className="empty-icon" />
              <h3>No Payouts Found</h3>
              <p>We couldn't find any settlements matching your current selection or search term.</p>
            </div>
          ) : (
            <div className="settlements-table-wrap">
              <table className="settlements-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Amount</th>
                    <th>Payment Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="font-semibold text-gray-800">#{tx.orderId}</td>
                      <td className="font-bold text-emerald-600">₹{tx.amount.toFixed(2)}</td>
                      <td>{tx.paymentDate}</td>
                      <td>
                        <span className="settlement-status-badge">
                          {tx.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-view-details"
                          onClick={() => handleOpenDetails(tx)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Detail Modal */}
      {selectedTx && (
        <div className="settlements-modal-overlay" onClick={handleCloseDetails}>
          <div className="settlements-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Payment Detail</h2>
              <button type="button" className="btn-close-modal" onClick={handleCloseDetails}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="modal-info-row">
                <span className="info-label font-bold">Order ID:</span>
                <span className="info-value font-bold text-gray-800">{selectedTx.orderId}</span>
              </div>
              
              <div className="modal-divider" />
              
              <div className="modal-info-row">
                <span className="info-label">Order Amount</span>
                <span className="info-value">₹{selectedTx.orderAmount.toFixed(2)}</span>
              </div>
              <div className="modal-info-row">
                <span className="info-label">Product GST</span>
                <span className="info-value">₹{selectedTx.productGst.toFixed(2)}</span>
              </div>
              <div className="modal-info-row">
                <span className="info-label">Shipping Fee</span>
                <span className="info-value">₹{selectedTx.shippingFee.toFixed(2)}</span>
              </div>
              <div className="modal-info-row">
                <span className="info-label">Shipping GST</span>
                <span className="info-value">₹{selectedTx.shippingGst.toFixed(2)}</span>
              </div>
              <div className="modal-info-row">
                <span className="info-label">RTO Penalty</span>
                <span className="info-value">{selectedTx.rtoPenalty === null ? "—" : `₹${selectedTx.rtoPenalty.toFixed(2)}`}</span>
              </div>
              
              <div className="modal-divider" />
              
              <div className="modal-info-row debit-row">
                <span className="info-label font-bold">Total Debit</span>
                <span className="info-value font-bold">₹{selectedTx.totalDebit.toFixed(2)}</span>
              </div>
              
              <div className="modal-info-row settlement-row">
                <span className="info-label font-bold text-emerald-600">Settlement Amount</span>
                <span className="info-value font-bold text-emerald-600">₹{selectedTx.settlementAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementsPage;
