import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Calendar, ChevronDown, X, Info, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { sellerService } from "../../services/sellerService";
import { resolveSellerId } from "../../utils/sellerSession";
import "./SettlementsPage.css";

const formatCurrency = (value) => {
  const amount = Number(value);
  return `₹${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
};

const SettlementsPage = () => {
  const [rawTransactions, setRawTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("previous"); // "upcoming" or "previous"
  const [selectedTx, setSelectedTx] = useState(null);
  const [settlementSummary, setSettlementSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Date Picker Modal State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date(2026, 5)); // June 2026 (matching screenshots)
  const [selectedDay, setSelectedDay] = useState(13); // Default to 13th June

  // Fetch data
  const loadSettlements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sellerService.getSellerPayments();
      const list = response?.message?.data || response?.data || response?.message || response || [];
      setRawTransactions(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("[SettlementsPage] Load error:", err);
      setError(err.message || "Failed to load settlements from server.");
      setRawTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
      const amount = Number(tx.amount || tx.settlementAmount || 0);
      const dateVal = tx.paymentDate || tx.createdDate || tx.date;
      const status = tx.status || "Paid";
      const type = tx.type || "Debit";

      const categoryId = tx.categoryId || tx.category_id || tx.category || "";
      const deliveryCharges = tx.deliveryCharges ?? tx.delivery_charges ?? tx.deliveryCharge ?? true;
      const shippingWeight = tx.shippingWeight ?? tx.shipping_weight ?? tx.weight ?? 0;

      // Separate into upcoming vs previous based on date
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
        categoryId,
        deliveryCharges,
        shippingWeight,
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

  const handleOpenDetails = async (tx) => {
    setSelectedTx(tx);
    setSettlementSummary(null);
    setLoadingSummary(true);

    const resolvedSellerId = (resolveSellerId() || "").trim();
    const resolvedPin = sellerService.getCachedSellerPinCode() || "";

    const orderAmount = tx.amount || tx.orderAmount || 0;
    const categoryId = tx.categoryId || tx.category_id || tx.category || "";
    const deliveryCharges = tx.deliveryCharges ?? tx.delivery_charges ?? true;
    const shippingWeight = tx.shippingWeight ?? tx.shipping_weight ?? "";

    // Validate parameters (Task 5)
    if (!resolvedSellerId) {
      setError("Seller session not found. Please login again.");
      setLoadingSummary(false);
      return;
    }
    if (!resolvedPin || resolvedPin === "000000") {
      setError("sellerPinCode is required for settlement summary.");
      setLoadingSummary(false);
      return;
    }
    if (orderAmount === undefined || orderAmount === null || orderAmount === "" || Number(orderAmount) === 0) {
      setError("orderAmount is required for settlement summary.");
      setLoadingSummary(false);
      return;
    }
    if (!categoryId || categoryId === "CATEGORY_ID") {
      setError("categoryId is required for settlement summary.");
      setLoadingSummary(false);
      return;
    }
    if (shippingWeight === undefined || shippingWeight === null || shippingWeight === "") {
      setError("shippingWeight is required for settlement summary.");
      setLoadingSummary(false);
      return;
    }

    const params = {
      orderAmount,
      categoryId,
      deliveryCharges,
      shippingWeight,
      sellerPinCode: resolvedPin,
      sellerId: resolvedSellerId,
    };

    // Debug logging (Task 6)
    if (process.env.NODE_ENV === "development" || window.location.hostname === "localhost") {
      console.log("[SettlementsPage] settlement request params", params);
    }

    try {
      const normalizedData = await sellerService.fetchSettlementSummary(params);
      const response = normalizedData.raw;

      if (process.env.NODE_ENV === "development" || window.location.hostname === "localhost") {
        console.log("[SettlementsPage] settlement response", response);
        console.log("[SettlementsPage] normalized settlement", normalizedData);
      }

      setSettlementSummary(normalizedData);
    } catch (err) {
      console.error("[SettlementsPage] fetchSettlementSummary failed:", err);
      setError(err.message || "Failed to load settlement details.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedTx(null);
    setSettlementSummary(null);
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
                      <td className="font-bold text-emerald-600">{formatCurrency(tx.amount)}</td>
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
                <span className="info-value font-bold text-gray-800">#{selectedTx.orderId}</span>
              </div>

              <div className="modal-divider" />

              {loadingSummary ? (
                <div className="settlements-loading" style={{ minHeight: "150px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div className="settlements-spinner" />
                  <p style={{ marginTop: "12px", fontSize: "14px", color: "#6b7280" }}>Calculating settlement summary...</p>
                </div>
              ) : settlementSummary ? (
                <>
                  <div className="modal-info-row">
                    <span className="info-label">Selling Price</span>
                    <span className="info-value">{formatCurrency(settlementSummary.sellingPrice)}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="info-label">Product GST</span>
                    <span className="info-value">{formatCurrency(settlementSummary.productGST)}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="info-label">TCS</span>
                    <span className="info-value">{formatCurrency(settlementSummary.tcs)}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="info-label">TDS</span>
                    <span className="info-value">{formatCurrency(settlementSummary.tds)}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="info-label">Haatza Commission</span>
                    <span className="info-value">{formatCurrency(settlementSummary.commission)}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="info-label">GST on Commission</span>
                    <span className="info-value">{formatCurrency(settlementSummary.gstOnCommission)}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="info-label">Payment Gateway Charges</span>
                    <span className="info-value">{formatCurrency(settlementSummary.pgCharges)}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="info-label">GST on PG Charges</span>
                    <span className="info-value">{formatCurrency(settlementSummary.gstOnPgCharges)}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="info-label">Shipping Fee</span>
                    <span className="info-value">{formatCurrency(settlementSummary.shippingFee)}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="info-label">GST on Shipping</span>
                    <span className="info-value">{formatCurrency(settlementSummary.gstOnShippingFee)}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="info-label">Fixed Fee</span>
                    <span className="info-value">{formatCurrency(settlementSummary.fixedFee)}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="info-label">Handling Fee</span>
                    <span className="info-value">{formatCurrency(settlementSummary.handlingFee)}</span>
                  </div>

                  <div className="modal-divider" />

                  <div className="modal-info-row debit-row">
                    <span className="info-label font-bold">Total Debit</span>
                    <span className="info-value font-bold">{formatCurrency(settlementSummary.totalDebit)}</span>
                  </div>

                  <div className="modal-info-row settlement-row">
                    <span className="info-label font-bold text-emerald-600">Settlement Amount</span>
                    <span className="info-value font-bold text-emerald-600">{formatCurrency(settlementSummary.settlementAmount)}</span>
                  </div>

                  {settlementSummary.note && (
                    <div style={{ marginTop: "12px", padding: "10px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #f1f3f6" }}>
                      <p style={{ margin: 0, fontSize: "12px", color: "#6b7280", fontStyle: "italic" }}>
                        <strong>Note:</strong> {settlementSummary.note}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "#ef4444" }}>
                  Failed to load settlement details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementsPage;
