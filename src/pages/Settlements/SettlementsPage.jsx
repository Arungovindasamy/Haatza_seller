import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, Calendar, ChevronDown, X, Info, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { sellerService } from "../../services/sellerService";
import { resolveSellerId, resolveSellerEmail } from "../../utils/sellerSession";
import "./SettlementsPage.css";

// ─── Utility helpers ──────────────────────────────────────────────────────────

const formatCurrency = (value) => {
  const amount = Number(value);
  return `₹${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
};

const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const safeString = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
};

const normalizeStatus = (status) => safeString(status).trim();
const isPaidStatus = (status) => normalizeStatus(status).toLowerCase() === "paid";

const getPayoutDetails = (payment) => {
  if (payment?.rawPayout) return payment.rawPayout;
  if (payment?.payoutDetails) return payment.payoutDetails;
  if (payment?.payout_details) return payment.payout_details;
  if (payment?.payout) return payment.payout;
  return payment;
};

const extractPaymentsFromResponse = (response) => {
  const apiData = response?.data ?? response;
  const possiblePayments =
    apiData?.message?.payments ??
    apiData?.payments ??
    apiData?.data?.payments ??
    apiData?.data?.message?.payments ??
    [];
  return safeArray(possiblePayments);
};

const normalizeSettlementPayments = (apiResponse) => {
  const message = apiResponse?.message || apiResponse || {};
  const payments = Array.isArray(message?.payments)
    ? message.payments
    : Array.isArray(apiResponse?.payments)
      ? apiResponse.payments
      : Array.isArray(apiResponse)
        ? apiResponse
        : [];

  const rows = [];

  payments.forEach((item, index) => {
    const payout = item?.payoutDetails || item || {};
    const breakupList = Array.isArray(payout?.settlementBreakup) ? payout.settlementBreakup : [];

    if (breakupList.length > 0) {
      breakupList.forEach((breakup, breakupIndex) => {
        rows.push({
          id: `${payout.sellerId || "seller"}_${breakup.orderId || payout.ordersPaid || index}_${payout.paymentDate || index}_${breakupIndex}`,
          sellerId: payout.sellerId || "-",
          ordersPaid: payout.ordersPaid || "-",
          orderId: breakup.orderId || payout.ordersPaid || "-",
          totalAmount: Number(payout.totalAmount || 0),
          orderAmount: Number(breakup.orderAmount || payout.totalAmount || 0),
          settlementAmount: Number(breakup.settlementAmount || payout.totalAmount || 0),
          productGST: Number(breakup.productGST || 0),
          shippingFee: Number(breakup.shippingFee || 0),
          shippingGST: Number(breakup.shippingGST || 0),
          totalDebit: Number(breakup.totalDebit || 0),
          rtopenalty: Number(breakup.rtopenalty || breakup.rtoPenalty || 0),
          status: payout.status || "-",
          paymentDate: payout.paymentDate || null,
          rawPayout: payout,
          payoutDetails: payout,
        });
      });
    } else {
      rows.push({
        id: `${payout.sellerId || "seller"}_${payout.ordersPaid || index}_${payout.paymentDate || index}`,
        sellerId: payout.sellerId || "-",
        ordersPaid: payout.ordersPaid || "-",
        orderId: payout.ordersPaid || "-",
        totalAmount: Number(payout.totalAmount || 0),
        orderAmount: Number(payout.totalAmount || 0),
        settlementAmount: Number(payout.totalAmount || 0),
        productGST: 0,
        shippingFee: 0,
        shippingGST: 0,
        totalDebit: 0,
        rtopenalty: 0,
        status: payout.status || "-",
        paymentDate: payout.paymentDate || null,
        rawPayout: payout,
        payoutDetails: payout,
      });
    }
  });

  const totalSettlements = rows.reduce((sum, r) => sum + r.settlementAmount, 0);
  const totalOrderAmount = rows.reduce((sum, r) => sum + r.orderAmount, 0);
  const totalDebits = rows.reduce((sum, r) => sum + r.totalDebit, 0);
  const paidCount = rows.filter((r) => isPaidStatus(r.status)).length;

  return {
    fromDate: message.fromDate,
    toDate: message.toDate,
    totalItems: Number(message.totalItems || rows.length),
    lastFetched: Number(message.lastFetched || rows.length),
    rows,
    summary: { totalSettlements, totalOrderAmount, totalDebits, paidCount },
  };
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Format a Date to "DD Mon YYYY" display string, e.g. "01 Jun 2026"
 */
const formatDisplayDate = (date) => {
  if (!date) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = String(date.getDate()).padStart(2, "0");
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
};

/**
 * Format a Date to YYYY-MM-DD for API calls
 */
const formatDateForApi = (date) => {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * Return { from, to } for "This Month"
 */
const getThisMonthRange = () => {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  from.setHours(0, 0, 0, 0);
  const to = new Date(today);
  to.setHours(23, 59, 59, 999);
  return { from, to };
};

// Module-level caches (unchanged from original)
const activeRequests = new Map();
const lastFetchedParams = { key: null };

// ─── Month / Year picker constants ────────────────────────────────────────────

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// ─── Main component ───────────────────────────────────────────────────────────

const SettlementsPage = () => {
  // ── Core state ──
  const [rawTransactions, setRawTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("previous");
  const [selectedTx, setSelectedTx] = useState(null);

  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const c = abortControllerRef.current;
      if (c) c.abort();
    };
  }, []);

  // ── Applied date range (drives API calls) ──
  const thisMonth = useMemo(() => getThisMonthRange(), []);

  const [appliedFromDate, setAppliedFromDate] = useState(thisMonth.from);
  const [appliedToDate, setAppliedToDate] = useState(thisMonth.to);

  // ── Picker open/close ──
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);

  // ── Picker view: "calendar" | "month" | "year" ──
  const [pickerView, setPickerView] = useState("calendar");

  // ── Calendar navigation month ──
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // ── Temp selection inside picker (committed only on Confirm) ──
  const [tempFrom, setTempFrom] = useState(null);
  const [tempTo, setTempTo] = useState(null);

  // ── Year grid start ──
  const [yearGridStart, setYearGridStart] = useState(() => {
    const y = new Date().getFullYear();
    return Math.floor(y / 10) * 10 - 1; // e.g. 2019 so grid shows 2019–2031
  });

  // ── Open picker: initialise temp state from applied ──
  const handleOpenPicker = useCallback(() => {
    setTempFrom(appliedFromDate);
    setTempTo(appliedToDate);
    setCalendarMonth(new Date(appliedFromDate.getFullYear(), appliedFromDate.getMonth(), 1));
    setPickerView("calendar");
    setIsDateRangeOpen(true);
  }, [appliedFromDate, appliedToDate]);

  // ── Day click: first click = start, second = end ──
  const handleDayClick = useCallback((dayNum) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const clicked = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), dayNum);
    clicked.setHours(0, 0, 0, 0);

    // Disable future dates
    if (clicked > today) return;

    if (!tempFrom || (tempFrom && tempTo)) {
      // Start fresh selection
      setTempFrom(clicked);
      setTempTo(null);
    } else {
      // tempFrom set, tempTo not set yet
      if (clicked < tempFrom) {
        // Clicked earlier → swap
        setTempTo(tempFrom);
        setTempFrom(clicked);
      } else {
        setTempTo(clicked);
      }
    }
  }, [calendarMonth, tempFrom, tempTo]);

  // ── Confirm button ──
  const handleConfirm = useCallback(() => {
    let finalFrom = tempFrom;
    let finalTo = tempTo || tempFrom; // if only start selected, treat as single-day range

    if (!finalFrom) return;

    if (finalFrom > finalTo) {
      [finalFrom, finalTo] = [finalTo, finalFrom];
    }

    finalTo = new Date(finalTo);
    finalTo.setHours(23, 59, 59, 999);

    if (process.env.NODE_ENV !== "production") {
      console.log("[SettlementsPage] Date Filter Applied", {
        from: formatDateForApi(finalFrom),
        to: formatDateForApi(finalTo),
      });
    }

    // Reset cache so API refetches
    lastFetchedParams.key = null;

    setAppliedFromDate(finalFrom);
    setAppliedToDate(finalTo);
    setIsDateRangeOpen(false);
  }, [tempFrom, tempTo]);

  // ── Clear → reset to This Month ──
  const handleClear = useCallback(() => {
    const range = getThisMonthRange();
    setTempFrom(range.from);
    setTempTo(range.to);
    setCalendarMonth(new Date(range.from.getFullYear(), range.from.getMonth(), 1));
    setPickerView("calendar");
  }, []);

  // ── Cancel ──
  const handleCancel = useCallback(() => {
    setIsDateRangeOpen(false);
  }, []);

  // ── Calendar navigation ──
  const handlePrevMonth = () => {
    setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  };

  // ── Month selection ──
  const handleMonthSelect = (monthIdx) => {
    const now = new Date();
    // Disable future months
    const proposed = new Date(calendarMonth.getFullYear(), monthIdx, 1);
    if (proposed > new Date(now.getFullYear(), now.getMonth(), 1)) return;

    setCalendarMonth(new Date(calendarMonth.getFullYear(), monthIdx, 1));
    setPickerView("calendar");
  };

  // ── Year selection ──
  const handleYearSelect = (year) => {
    const now = new Date();
    if (year > now.getFullYear()) return;
    setCalendarMonth(new Date(year, calendarMonth.getMonth(), 1));
    setPickerView("month");
  };

  // ── Calendar grid calculation ──
  const calendarData = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInM = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay(); // 0=Sun
    return { year, month, daysInM, startDay };
  }, [calendarMonth]);

  // ── Today for disabling future dates ──
  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  // ── Month-year header label ──
  const monthYearLabel = useMemo(() => {
    return calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [calendarMonth]);

  // ── Date filter display label ──
  const dateFilterLabel = useMemo(() => {
    const thisMonthFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const isThisMonth =
      appliedFromDate.getFullYear() === thisMonthFrom.getFullYear() &&
      appliedFromDate.getMonth() === thisMonthFrom.getMonth() &&
      appliedFromDate.getDate() === 1;
    if (isThisMonth) {
      return `This Month · ${formatDisplayDate(appliedFromDate)} – ${formatDisplayDate(appliedToDate)}`;
    }
    return `${formatDisplayDate(appliedFromDate)} – ${formatDisplayDate(appliedToDate)}`;
  }, [appliedFromDate, appliedToDate]);

  // ── Confirm disabled when nothing selected ──
  const isConfirmDisabled = !tempFrom;

  // ─── API fetch ───────────────────────────────────────────────────────────────

  const loadSettlements = useCallback(async (force = false) => {
    const email = (resolveSellerEmail() || "").trim();
    const fromStr = formatDateForApi(appliedFromDate);
    const toStr = formatDateForApi(appliedToDate);
    const paramKey = `${email}_${fromStr}_${toStr}_50_0`;

    if (!force && lastFetchedParams.key === paramKey) return;
    if (!force && activeRequests.has(paramKey)) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    activeRequests.set(paramKey, controller);

    const fetchParams = {
      email,
      fromDate: fromStr,
      toDate: toStr,
      count: 50,
      lastFetched: 0,
    };

    if (process.env.NODE_ENV !== "production") {
      console.log("[SettlementsPage] Fetch Params:", fetchParams);
    }

    try {
      const response = await sellerService.getSellerPayments(fetchParams, { signal: controller.signal });
      lastFetchedParams.key = paramKey;
      const payments = extractPaymentsFromResponse(response);
      setRawTransactions(payments);
    } catch (err) {
      if (
        err.name === "CanceledError" || err.name === "AbortError" ||
        err.message === "canceled" || err.code === "ERR_CANCELED"
      ) return;

      console.error("[SettlementsPage] Load Error", err);
      const is400 = err.response?.status === 400;
      if (is400) {
        setError("Failed to load settlements: Invalid request configuration (400). Please check parameters.");
      } else {
        setError(err.message || "Failed to load settlements from server.");
      }
      setRawTransactions([]);
    } finally {
      activeRequests.delete(paramKey);
      setLoading(false);
    }
  }, [appliedFromDate, appliedToDate]);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  // ─── Data mapping ─────────────────────────────────────────────────────────

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const mappedTransactions = useMemo(() => {
    const apiResponse = { message: { payments: rawTransactions } };
    const { rows } = normalizeSettlementPayments(apiResponse);

    return rows.map((payment, idx) => {
      const payoutDetails = getPayoutDetails(payment);
      if (!payoutDetails || typeof payoutDetails !== "object") return null;

      const ordersPaid = safeString(
        payoutDetails.ordersPaid ?? payoutDetails.orderPaid ?? payoutDetails.orderId ?? ""
      );
      const totalAmount = safeNumber(
        payoutDetails.totalAmount ?? payoutDetails.amount ?? payoutDetails.settlementAmount ?? 0
      );
      const status = normalizeStatus(payoutDetails.status || "Pending");
      const paymentDate =
        payoutDetails.paymentDate ?? payoutDetails.paidDate ??
        payoutDetails.settlementDate ?? payoutDetails.createdAt ?? "";

      const settlementBreakup = safeArray(
        payoutDetails.settlementBreakup ?? payoutDetails.breakup ?? []
      );

      return {
        id: `${ordersPaid || "order"}-${paymentDate || "date"}-${status || "status"}-${idx}`,
        orderId: payment?.orderId || ordersPaid || "-",
        amount: totalAmount,
        sellerId: payoutDetails.sellerId || "-",
        ordersPaid: ordersPaid || "-",
        totalAmount,
        orderAmount: safeNumber(payment?.orderAmount ?? totalAmount),
        settlementAmount: safeNumber(payment?.settlementAmount ?? totalAmount),
        productGST: safeNumber(payment?.productGST ?? 0),
        shippingFee: safeNumber(payment?.shippingFee ?? 0),
        shippingGST: safeNumber(payment?.shippingGST ?? 0),
        totalDebit: safeNumber(payment?.totalDebit ?? 0),
        rtopenalty: safeNumber(payment?.rtopenalty ?? 0),
        status,
        paymentDate: formatDate(paymentDate),
        rawPaymentDate: paymentDate,
        isUpcoming: !isPaidStatus(status),
        settlementBreakup,
        rawPayout: payoutDetails,
      };
    }).filter(Boolean);
  }, [rawTransactions]);

  const matchesSearch = useCallback((tx) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      safeString(tx.orderId).toLowerCase().includes(term) ||
      safeString(tx.status).toLowerCase().includes(term) ||
      safeString(tx.sellerId).toLowerCase().includes(term)
    );
  }, [search]);

  const filteredTransactions = useMemo(() => {
    const prev = mappedTransactions.filter((tx) => !tx.isUpcoming && matchesSearch(tx));
    const upcoming = mappedTransactions.filter((tx) => tx.isUpcoming && matchesSearch(tx));
    return activeTab === "upcoming" ? upcoming : prev;
  }, [mappedTransactions, activeTab, matchesSearch]);

  // ─── Year grid helpers ────────────────────────────────────────────────────

  const yearGridYears = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => yearGridStart + i);
  }, [yearGridStart]);

  const yearGridLabel = useMemo(() => {
    return `${yearGridYears[0]} – ${yearGridYears[yearGridYears.length - 1]}`;
  }, [yearGridYears]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="settlements-page-root">
      {/* Header */}
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

      {/* Main card */}
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
                onClick={handleOpenPicker}
              >
                <Calendar size={16} />
                <span>{dateFilterLabel}</span>
                <ChevronDown size={14} className={`chevron ${isDateRangeOpen ? "rotate" : ""}`} />
              </button>
            </div>

            <button
              type="button"
              className="btn-refresh"
              onClick={() => loadSettlements(true)}
              title="Refresh Payouts"
            >
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

          {/* Table / Loading / Empty */}
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
                      <td className="font-semibold text-gray-800">{tx.orderId}</td>
                      <td className="font-bold text-emerald-600">{formatCurrency(tx.amount)}</td>
                      <td>{tx.paymentDate}</td>
                      <td>
                        <span className="settlement-status-badge">{tx.status}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-view-details"
                          onClick={() => setSelectedTx(tx)}
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

      {/* ── Payment Detail Modal ── */}
      {selectedTx && (
        <div className="settlements-modal-overlay" onClick={() => setSelectedTx(null)}>
          <div className="settlements-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Payment Detail</h2>
              <button type="button" className="btn-close-modal" onClick={() => setSelectedTx(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div className="modal-info-row">
                <span className="info-label font-bold">Orders Paid:</span>
                <span className="info-value font-bold text-gray-800">{selectedTx.ordersPaid}</span>
              </div>
              <div className="modal-info-row">
                <span className="info-label font-bold">Payment Date:</span>
                <span className="info-value text-gray-800">{selectedTx.paymentDate}</span>
              </div>
              <div className="modal-info-row">
                <span className="info-label font-bold">Status:</span>
                <span className="info-value text-gray-800">
                  <span className="settlement-status-badge">{selectedTx.status}</span>
                </span>
              </div>
              <div className="modal-info-row">
                <span className="info-label font-bold">Total Amount:</span>
                <span className="info-value font-bold text-emerald-600">{formatCurrency(selectedTx.totalAmount)}</span>
              </div>
              <div className="modal-divider" />
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", marginBottom: "12px" }}>
                Settlement Breakup
              </h3>
              {selectedTx.settlementBreakup && selectedTx.settlementBreakup.length > 0 ? (
                <div className="breakup-list" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {selectedTx.settlementBreakup.map((item, idx) => {
                    const breakupOrderId = item.orderId ?? item.orderID ?? item.id ?? "-";
                    const orderAmount = safeNumber(item.orderAmount ?? item.amount ?? 0);
                    const productGST = safeNumber(item.productGST ?? item.productGst ?? 0);
                    const shippingFee = safeNumber(item.shippingFee ?? 0);
                    const shippingGST = safeNumber(item.shippingGST ?? 0);
                    const totalDebit = safeNumber(item.totalDebit ?? 0);
                    const settlementAmt = safeNumber(item.settlementAmount ?? 0);

                    return (
                      <div
                        key={idx}
                        className="breakup-item"
                        style={{ padding: "14px", background: "#f9fafb", borderRadius: "10px", border: "1px solid #f1f3f6" }}
                      >
                        <div className="modal-info-row" style={{ marginBottom: "8px" }}>
                          <span className="info-label font-semibold">Order ID:</span>
                          <span className="info-value font-semibold text-gray-800">#{breakupOrderId}</span>
                        </div>
                        {[
                          ["Order Amount", formatCurrency(orderAmount)],
                          ["Product GST", formatCurrency(productGST)],
                          ["Shipping Fee", formatCurrency(shippingFee)],
                          ["Shipping GST", formatCurrency(shippingGST)],
                          ["Total Debit", formatCurrency(totalDebit)],
                        ].map(([label, val]) => (
                          <div key={label} className="modal-info-row" style={{ marginBottom: "6px", fontSize: "13.5px" }}>
                            <span className="info-label">{label}:</span>
                            <span className="info-value">{val}</span>
                          </div>
                        ))}
                        {item.rtopenalty != null && (
                          <div className="modal-info-row" style={{ marginBottom: "6px", fontSize: "13.5px" }}>
                            <span className="info-label">RTO Penalty:</span>
                            <span className="info-value">{formatCurrency(item.rtopenalty)}</span>
                          </div>
                        )}
                        <div className="modal-divider" style={{ margin: "10px 0" }} />
                        <div className="modal-info-row" style={{ marginBottom: 0 }}>
                          <span className="info-label font-semibold text-emerald-600">Settlement Amount:</span>
                          <span className="info-value font-bold text-emerald-600">{formatCurrency(settlementAmt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: "#6b7280", fontSize: "13.5px", fontStyle: "italic" }}>No breakup details available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Date Range Picker Modal / Bottom Sheet
          ══════════════════════════════════════════════════════════════════════ */}
      {isDateRangeOpen && (
        <div className="datepicker-modal-overlay" onClick={handleCancel}>
          <div className="datepicker-bottom-sheet" onClick={(e) => e.stopPropagation()}>

            {/* Title */}
            <div className="datepicker-title">Select Date Range</div>

            {/* ── CALENDAR VIEW ── */}
            {pickerView === "calendar" && (
              <div className="datepicker-calendar-wrap">

                {/* Month / Year header */}
                <div className="datepicker-header">
                  <button
                    type="button"
                    className="btn-nav-cal"
                    onClick={handlePrevMonth}
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="calendar-month-year-group">
                    <button
                      type="button"
                      className="calendar-month-btn"
                      onClick={() => setPickerView("month")}
                    >
                      {calendarMonth.toLocaleDateString("en-US", { month: "long" })}
                    </button>
                    <button
                      type="button"
                      className="calendar-year-btn"
                      onClick={() => setPickerView("year")}
                    >
                      {calendarMonth.getFullYear()}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-nav-cal"
                    onClick={handleNextMonth}
                    aria-label="Next month"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Weekday labels */}
                <div className="calendar-weekdays">
                  {WEEKDAY_LABELS.map((d, i) => (
                    <span
                      key={i}
                      className="weekday-label"
                      style={i === 3 /* Wed */ ? { color: "#2962ff", fontWeight: "700" } : {}}
                    >
                      {d}
                    </span>
                  ))}
                </div>

                {/* Day cells */}
                <div className="calendar-days-grid">
                  {/* Leading empty cells */}
                  {Array.from({ length: calendarData.startDay }).map((_, i) => (
                    <span key={`empty-${i}`} className="calendar-day-empty" />
                  ))}

                  {Array.from({ length: calendarData.daysInM }).map((_, i) => {
                    const dayNum = i + 1;
                    const cellDate = new Date(calendarData.year, calendarData.month, dayNum);
                    cellDate.setHours(0, 0, 0, 0);

                    const isFuture = cellDate > todayMidnight;

                    const isStart = tempFrom && cellDate.getTime() === tempFrom.getTime();
                    const isEnd = tempTo && cellDate.getTime() === tempTo.getTime();
                    const inRange = tempFrom && tempTo &&
                      cellDate > tempFrom && cellDate < tempTo;
                    const isToday = cellDate.toDateString() === new Date().toDateString();

                    let cls = "calendar-day-btn";
                    if (isFuture) cls += " calendar-day-btn--disabled";
                    else if (isStart) cls += " calendar-day-btn--range-start";
                    else if (isEnd) cls += " calendar-day-btn--range-end";
                    else if (inRange) cls += " calendar-day-btn--in-range";
                    else if (isToday) cls += " calendar-day-btn--today";

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        className={cls}
                        onClick={() => !isFuture && handleDayClick(dayNum)}
                        disabled={isFuture}
                        aria-label={`${dayNum} ${monthYearLabel}`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>

                {/* Selected range hint */}
                {(tempFrom || tempTo) && (
                  <div className="datepicker-range-hint">
                    <span className={`range-hint-chip ${tempFrom ? "filled" : ""}`}>
                      {tempFrom ? formatDisplayDate(tempFrom) : "Start Date"}
                    </span>
                    <span className="range-hint-dash">–</span>
                    <span className={`range-hint-chip ${tempTo ? "filled" : ""}`}>
                      {tempTo ? formatDisplayDate(tempTo) : "End Date"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── MONTH VIEW ── */}
            {pickerView === "month" && (
              <div className="datepicker-month-view">
                <div className="datepicker-header">
                  <button
                    type="button"
                    className="calendar-year-btn"
                    onClick={() => setPickerView("year")}
                  >
                    {calendarMonth.getFullYear()}
                  </button>
                </div>

                <div className="month-grid">
                  {MONTH_NAMES_SHORT.map((name, idx) => {
                    const now = new Date();
                    const isFuture =
                      calendarMonth.getFullYear() > now.getFullYear() ||
                      (calendarMonth.getFullYear() === now.getFullYear() && idx > now.getMonth());
                    const isCurrent = idx === calendarMonth.getMonth();

                    return (
                      <button
                        key={name}
                        type="button"
                        className={[
                          "month-grid-btn",
                          isCurrent ? "month-grid-btn--selected" : "",
                          isFuture ? "month-grid-btn--disabled" : "",
                        ].join(" ").trim()}
                        onClick={() => !isFuture && handleMonthSelect(idx)}
                        disabled={isFuture}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── YEAR VIEW ── */}
            {pickerView === "year" && (
              <div className="datepicker-year-view">
                <div className="datepicker-header">
                  <button
                    type="button"
                    className="btn-nav-cal"
                    onClick={() => setYearGridStart((y) => y - 12)}
                    aria-label="Previous years"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="calendar-month-btn" style={{ cursor: "default" }}>
                    {yearGridLabel}
                  </span>
                  <button
                    type="button"
                    className="btn-nav-cal"
                    onClick={() => setYearGridStart((y) => y + 12)}
                    aria-label="Next years"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="year-grid">
                  {yearGridYears.map((year) => {
                    const now = new Date().getFullYear();
                    const isFuture = year > now;
                    const isCurrent = year === calendarMonth.getFullYear();

                    return (
                      <button
                        key={year}
                        type="button"
                        className={[
                          "year-grid-btn",
                          isCurrent ? "year-grid-btn--selected" : "",
                          isFuture ? "year-grid-btn--disabled" : "",
                        ].join(" ").trim()}
                        onClick={() => !isFuture && handleYearSelect(year)}
                        disabled={isFuture}
                      >
                        {year}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer actions */}
            <div className="datepicker-footer-actions">
              <button type="button" className="datepicker-btn-cancel" onClick={handleCancel}>
                Cancel
              </button>
              <button type="button" className="datepicker-btn-clear" onClick={handleClear}>
                Clear
              </button>
              <button
                type="button"
                className="datepicker-btn-apply"
                onClick={handleConfirm}
                disabled={isConfirmDisabled}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementsPage;
