import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Clock,
  Video,
  FileText
} from "lucide-react";
import { getSellerId, resolveSellerEmail } from "../../utils/sellerSession";
import { sellerService } from "../../services/sellerService";
import "./HelpPage.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const safeString = (value, fallback = "") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
};

// FIX: Local date formatter — avoids timezone-shift bugs from toISOString()
const formatDateString = (date) => {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * FIX: Guard against string messages like "Email ID is required."
 * being treated as a ticket array.
 */
const extractTicketsFromResponse = (response) => {
  const apiData = response?.data ?? response;

  // If apiData.message is a plain error string, bail out immediately
  if (typeof apiData?.message === "string") {
    console.warn("[HelpPage] extractTicketsFromResponse: message is a string (likely an error):", apiData.message);
    return [];
  }

  const possibleTickets =
    apiData?.message?.tickets ??
    apiData?.message?.data ??
    apiData?.message?.items ??
    apiData?.tickets ??
    apiData?.data?.tickets ??
    apiData?.data?.message?.tickets ??
    apiData?.data?.data?.tickets ??
    apiData?.data?.data ??
    apiData?.items ??
    [];

  const arr = safeArray(possibleTickets);

  if (arr.length > 0) {
    console.log("[HelpPage] extractTicketsFromResponse matched:", arr.length, "tickets");
    return arr;
  }

  console.warn("[HelpPage] extractTicketsFromResponse: no tickets found in response", response);
  return [];
};

/**
 * Unwrap one extra nesting level before reading fields.
 */
const normalizeTicket = (raw, index) => {
  const source = raw?.ticket ?? raw?.data ?? raw;

  const ticketId =
    source.ticketId ??
    source.ticketID ??
    source.ticket_id ??
    source.id ??
    source._id ??
    source.ticketNo ??
    source.ticketNumber ??
    source.TicketID ??
    "";

  return {
    id: safeString(ticketId, `ticket-row-${index}`),
    ticketId: safeString(ticketId, `HT-${index + 1}`),
    subject: safeString(
      source.subject ?? source.title ?? source.ticketSubject,
      "No Subject"
    ),
    category: safeString(
      source.category ?? source.type ?? source.issueCategory,
      "General Support"
    ),
    priority: safeString(source.priority, "Medium"),
    status: safeString(source.status, "Open"),
    description: safeString(source.description ?? source.message ?? source.details, ""),
    createdAt: source.createdAt ?? source.createdDate ?? source.created_at ?? source.date ?? "",
    assignedTo: safeString(source.assignedTo ?? source.assignee, "Support Team"),
    sellerId: safeString(source.sellerId ?? source.userId, ""),
    email: safeString(source.email ?? source.sellerEmail ?? ""),
    raw: source,
  };
};

const getTicketDate = (ticket) => {
  const d = new Date(ticket.createdAt || 0);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

const dedupeTickets = (tickets) => {
  const map = new Map();
  tickets.forEach((ticket, index) => {
    const key =
      ticket.ticketId && !ticket.ticketId.startsWith("HT-")
        ? ticket.ticketId
        : `${ticket.subject}-${ticket.createdAt}-${ticket.sellerId}-${index}`;
    if (!map.has(key)) map.set(key, ticket);
  });
  return Array.from(map.values());
};

const matchesSearch = (ticket, term) => {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return (
    ticket.ticketId.toLowerCase().includes(q) ||
    ticket.subject.toLowerCase().includes(q) ||
    ticket.category.toLowerCase().includes(q) ||
    ticket.status.toLowerCase().includes(q) ||
    ticket.priority.toLowerCase().includes(q) ||
    ticket.description.toLowerCase().includes(q)
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const HelpPage = () => {
  // FIX: Resolve both sellerId and sellerEmail at component level
  const sellerId = getSellerId();
  const sellerEmail = resolveSellerEmail();

  // FIX: Compute date range once — first day of current month to today
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromDate = formatDateString(firstDayOfMonth);
  const toDate = formatDateString(today);

  const [activeTab, setActiveTab] = useState("tickets");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [tutorials, setTutorials] = useState([]);
  const [tutorialsLoading, setTutorialsLoading] = useState(false);
  const [tutorialsError, setTutorialsError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [formSubject, setFormSubject] = useState("");
  const [formCategory, setFormCategory] = useState("Order");
  const [formPriority, setFormPriority] = useState("Medium");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState("");

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── FIX: loadTickets now uses email + fromDate + toDate ────────────────────
  const loadTickets = useCallback(async (silent = false) => {
    // Validate required params before hitting the API
    if (!sellerEmail) {
      setError("Seller email not found. Please login again.");
      setLoading(false);
      return;
    }
    if (!fromDate || !toDate) {
      setError("Ticket date range is missing.");
      setLoading(false);
      return;
    }

    console.log("[HelpPage] Active Seller ID:", sellerId);
    console.log("[HelpPage] Active Seller Email:", sellerEmail);
    console.log("[HelpPage] Ticket Fetch Params:", { email: sellerEmail, fromDate, toDate });

    if (!silent) setLoading(true);
    setError(null);

    try {
      // FIX: Call getSellerTickets with email + fromDate + toDate
      // Network tab will show: sellertickets?email=...&fromDate=...&toDate=...
      const ticketsResponse = await sellerService.getSellerTickets({
        email: sellerEmail,
        fromDate,
        toDate,
      });

      console.log("[HelpPage] Raw Tickets Response:", JSON.stringify(ticketsResponse, null, 2));

      const rawTickets = extractTicketsFromResponse(ticketsResponse);
      console.log("[HelpPage] Extracted Tickets Count:", rawTickets.length);

      const normalized = dedupeTickets(rawTickets.map(normalizeTicket));
      // Sort newest first
      normalized.sort((a, b) => getTicketDate(b) - getTicketDate(a));
      console.log("[HelpPage] Normalized Tickets:", normalized);

      setTickets(normalized);
    } catch (err) {
      console.error("[HelpPage] Error fetching tickets:", err);
      setError("Failed to load support tickets. Please verify connection.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [sellerId, sellerEmail, fromDate, toDate]);

  // ── Fetch tutorials ────────────────────────────────────────────────────────
  const fetchTutorials = useCallback(async () => {
    setTutorialsLoading(true);
    setTutorialsError(null);
    try {
      const res = await sellerService.getSellerTutorials();
      const rawTutorials =
        res?.data || res?.message?.tutorials || res?.tutorials || res?.message || [];
      setTutorials(Array.isArray(rawTutorials) ? rawTutorials : []);
    } catch (err) {
      console.error("[HelpPage] Error fetching tutorials:", err);
      setTutorialsError("Failed to fetch tutorials from server.");
      setTutorials([]);
    } finally {
      setTutorialsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "tickets") {
      loadTickets();
    } else {
      fetchTutorials();
    }
  }, [activeTab, loadTickets, fetchTutorials]);

  // ── Create ticket ──────────────────────────────────────────────────────────
  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!sellerId) {
      setFormError("Seller session not found. Please login again.");
      return;
    }

    setSubmitting(true);
    try {
      // FIX: Correct payload — createdAt (not createdDate), userId, assignedTo
      const resolvedSellerId = sellerId;
      const ticketPayload = {
        sellerId: resolvedSellerId,
        subject: formSubject.trim(),
        category: formCategory,
        priority: formPriority,
        description: formDescription.trim(),
        status: "Open",
        createdAt: new Date().toISOString(),
        userId: resolvedSellerId,
        assignedTo: "Support Team",
      };

      console.log("[HelpPage] Create Ticket Payload:", ticketPayload);

      if (!ticketPayload.sellerId) throw new Error("sellerId must exist");
      if (!ticketPayload.subject) throw new Error("subject must not be empty");
      if (!ticketPayload.category) throw new Error("category must not be empty");
      if (!ticketPayload.priority) throw new Error("priority must not be empty");
      if (!ticketPayload.description) throw new Error("description must not be empty");

      const createResponse = await sellerService.createTicket(resolvedSellerId, ticketPayload);
      console.log("[HelpPage] Create Ticket Response:", JSON.stringify(createResponse, null, 2));

      const apiData = createResponse?.data ?? createResponse;

      const isSuccess =
        apiData?.status === "success" ||
        apiData?.status === "Success" ||
        apiData?.sellerId ||
        apiData?.message?.sellerId ||
        apiData?.ticketId ||
        apiData?.message?.ticketId ||
        apiData?.message?.ticket ||
        apiData?.message?.status === "Open";

      if (isSuccess) {
        showToast("Ticket created successfully!");
        setIsCreateModalOpen(false);
        setFormSubject("");
        setFormCategory("Order");
        setFormPriority("Medium");
        setFormDescription("");

        // Optimistic prepend while we wait for the refetch
        const createdRaw =
          apiData?.message?.ticket ??
          apiData?.ticket ??
          apiData?.message ??
          apiData;

        const mergedRaw =
          createdRaw && typeof createdRaw === "object"
            ? { ...ticketPayload, ...createdRaw }
            : { ...ticketPayload };

        const optimistic = normalizeTicket(mergedRaw, 0);

        setTickets((prev) => {
          const exists = prev.some(
            (t) =>
              String(t.ticketId) === String(optimistic.ticketId) &&
              !optimistic.ticketId.startsWith("HT-")
          );
          if (exists) return prev;
          return dedupeTickets([optimistic, ...prev]);
        });

        // FIX: Hard refetch using email + fromDate + toDate to sync with backend
        await loadTickets(true);
      } else {
        const errorMsg =
          apiData?.message?.message ?? apiData?.message ?? "Failed to create ticket";
        setFormError(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
      }
    } catch (err) {
      console.error("[HelpPage] Create ticket failed:", err);
      const apiData = err.response?.data ?? err.response;
      const errorMsg =
        apiData?.message?.message ??
        apiData?.message ??
        err.message ??
        "Failed to submit support ticket. Please try again.";
      setFormError(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filters / sort ─────────────────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    return tickets
      .filter((t) => {
        const search = matchesSearch(t, searchQuery);
        const status =
          statusFilter === "all" || t.status.toLowerCase() === statusFilter.toLowerCase();
        const priority =
          priorityFilter === "all" || t.priority.toLowerCase() === priorityFilter.toLowerCase();
        return search && status && priority;
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") return getTicketDate(b) - getTicketDate(a);
        if (sortBy === "date-asc") return getTicketDate(a) - getTicketDate(b);
        if (sortBy === "priority-high") {
          const order = { high: 3, medium: 2, low: 1 };
          return (order[b.priority.toLowerCase()] || 0) - (order[a.priority.toLowerCase()] || 0);
        }
        return 0;
      });
  }, [tickets, searchQuery, statusFilter, priorityFilter, sortBy]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTickets.slice(start, start + itemsPerPage);
  }, [filteredTickets, currentPage]);

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1;

  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "Recent";
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recent";
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="help-tickets-root">
      {toastMessage && (
        <div className="help-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="help-page-header-v2">
        <div className="header-info-left">
          <nav className="help-breadcrumb" aria-label="breadcrumb">
            <span>Dashboard</span> &gt; <span>Support</span> &gt;{" "}
            <span className="active">
              {activeTab === "tickets" ? "Tickets" : "Help & Tutorials"}
            </span>
          </nav>
          <h1 className="help-page-title">
            {activeTab === "tickets" ? "My Tickets" : "Help & Tutorials"}
          </h1>
        </div>
        {activeTab === "tickets" && (
          <button className="btn-create-ticket-main" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} />
            <span>Create Ticket</span>
          </button>
        )}
      </div>

      <div className="help-tabs-container">
        <button
          className={`help-tab-btn ${activeTab === "tickets" ? "active" : ""}`}
          onClick={() => { setActiveTab("tickets"); setCurrentPage(1); }}
        >
          Support Tickets
        </button>
        <button
          className={`help-tab-btn ${activeTab === "tutorials" ? "active" : ""}`}
          onClick={() => { setActiveTab("tutorials"); setCurrentPage(1); }}
        >
          Help & Tutorials
        </button>
      </div>

      <div className="help-content-v2">

        {/* ── Tickets tab ── */}
        {activeTab === "tickets" && (
          <>
            {error && (
              <div className="help-alert-info">
                <AlertCircle size={16} />
                <span>{error}</span>
                <button className="btn-alert-close" onClick={() => setError(null)}>&times;</button>
              </div>
            )}

            {loading ? (
              <div className="help-loading-state">
                <div className="help-loading-spinner" />
                <p>Loading your support tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="help-empty-card-container">
                <div className="help-empty-state-card">
                  <div className="empty-icon-wrapper"><MessageSquare size={40} /></div>
                  <h3>No Tickets Found</h3>
                  <p>You have not created any support tickets yet. Create a new ticket to get assistance from our support team.</p>
                  <button className="btn-empty-create" onClick={() => setIsCreateModalOpen(true)}>
                    Create New Ticket
                  </button>
                </div>
              </div>
            ) : (
              <div className="help-dashboard-card">
                <div className="help-toolbar-v2">
                  <div className="toolbar-search-wrap">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search tickets by ID, subject..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="search-input"
                    />
                  </div>

                  <div className="toolbar-filters-wrap">
                    <div className="filter-select-wrapper">
                      <span className="filter-label">Status</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                        className="filter-select"
                      >
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="in progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div className="filter-select-wrapper">
                      <span className="filter-label">Priority</span>
                      <select
                        value={priorityFilter}
                        onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                        className="filter-select"
                      >
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    <div className="filter-select-wrapper">
                      <span className="filter-label">Sort By</span>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="priority-high">Highest Priority</option>
                      </select>
                    </div>

                    <button className="btn-toolbar-refresh" onClick={() => loadTickets()} title="Refresh tickets">
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div className="help-table-wrapper">
                  <table className="help-table">
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Subject</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Created Date</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="table-empty-row">
                            No support tickets match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        paginatedTickets.map((t) => (
                          <tr key={t.id} className="help-table-row">
                            <td className="font-semibold text-blue">{t.ticketId}</td>
                            <td className="table-subject-cell" title={t.subject}>
                              <div className="subject-text">{t.subject}</div>
                            </td>
                            <td><span className="category-tag">{t.category}</span></td>
                            <td>
                              <span className={`priority-tag ${t.priority.toLowerCase()}`}>
                                {t.priority}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge-v2 ${t.status.replace(" ", "-").toLowerCase()}`}>
                                <span className="status-dot" />
                                {t.status}
                              </span>
                            </td>
                            <td className="text-muted text-sm">{formatDate(t.createdAt)}</td>
                            <td className="text-right">
                              <button className="btn-table-view" onClick={() => setSelectedTicket(t)}>
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredTickets.length > 0 && (
                  <div className="help-table-pagination">
                    <span className="pagination-count-label">
                      Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
                      <strong>{Math.min(currentPage * itemsPerPage, filteredTickets.length)}</strong> of{" "}
                      <strong>{filteredTickets.length}</strong> tickets
                    </span>
                    <div className="pagination-buttons">
                      <button className="btn-paginator" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                        <ChevronLeft size={16} />
                      </button>
                      <span className="pagination-pages-label">Page {currentPage} of {totalPages}</span>
                      <button className="btn-paginator" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Tutorials tab ── */}
        {activeTab === "tutorials" && (
          <>
            {tutorialsError && (
              <div className="help-alert-info">
                <AlertCircle size={16} />
                <span>{tutorialsError}</span>
                <button className="btn-alert-close" onClick={() => setTutorialsError(null)}>&times;</button>
              </div>
            )}

            {tutorialsLoading ? (
              <div className="help-loading-state">
                <div className="help-loading-spinner" />
                <p>Loading help tutorials & guides...</p>
              </div>
            ) : tutorials.length === 0 ? (
              <div className="help-empty-card-container">
                <div className="help-empty-state-card">
                  <div className="empty-icon-wrapper"><FileText size={40} /></div>
                  <h3>No Tutorials Found</h3>
                  <p>There are no tutorials or help guides available at this moment. Please check back later.</p>
                  <button className="btn-empty-create" onClick={fetchTutorials}>Refresh Tutorials</button>
                </div>
              </div>
            ) : (
              <div className="tutorials-grid">
                {tutorials.map((item, idx) => {
                  const title = item.title || item.name || "Help Guide";
                  const desc = item.description || item.desc || "Learn how to manage your seller account features.";
                  const mediaUrl = item.videoUrl || item.videoLink;
                  const docUrl = item.docUrl || item.url || "#";
                  const isVideo = item.type === "video" || !!mediaUrl;
                  const thumbnail = item.thumbnail || item.coverImage || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop";

                  return (
                    <div key={item.id || item._id || idx} className="tutorial-card">
                      {isVideo ? (
                        <div className="tutorial-media-wrapper">
                          <img
                            src={thumbnail}
                            alt={title}
                            className="tutorial-video-thumbnail"
                            onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&auto=format&fit=crop"; }}
                          />
                          <a href={mediaUrl || docUrl} target="_blank" rel="noopener noreferrer" className="tutorial-video-play-btn" title="Watch video tutorial">
                            <Video size={20} />
                          </a>
                        </div>
                      ) : (
                        <div className="tutorial-doc-wrapper"><FileText size={40} /></div>
                      )}
                      <div className="tutorial-card-body">
                        <h3 className="tutorial-card-title">{title}</h3>
                        <p className="tutorial-card-desc">{desc}</p>
                        <a href={mediaUrl || docUrl} target="_blank" rel="noopener noreferrer" className="tutorial-card-btn">
                          {isVideo ? "Watch Tutorial" : "Read Article"}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Create Ticket Modal ── */}
      {isCreateModalOpen && (
        <div className="help-modal-overlay" onClick={() => !submitting && setIsCreateModalOpen(false)}>
          <div className="help-ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create a New Ticket</h3>
              <button type="button" className="btn-modal-close" onClick={() => setIsCreateModalOpen(false)} disabled={submitting}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="modal-error-alert">
                <AlertCircle size={14} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicketSubmit} className="modal-form-body">
              <div className="form-grid-2-col">
                <div className="form-group-v2">
                  <label htmlFor="ticket-subject">Subject</label>
                  <input
                    id="ticket-subject"
                    type="text"
                    placeholder="e.g., Commission rate dispute on listing..."
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="form-row-2-fields">
                  <div className="form-group-v2">
                    <label htmlFor="ticket-category">Category</label>
                    <select id="ticket-category" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} disabled={submitting}>
                      <option value="Order">Order Support</option>
                      <option value="Settlements">Settlement / Payouts</option>
                      <option value="Listing">Product Listing</option>
                      <option value="Inventory">Inventory Management</option>
                      <option value="Technical">Technical Glitch</option>
                      <option value="General">General Inquiry</option>
                    </select>
                  </div>

                  <div className="form-group-v2">
                    <label htmlFor="ticket-priority">Priority</label>
                    <select id="ticket-priority" value={formPriority} onChange={(e) => setFormPriority(e.target.value)} disabled={submitting}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group-v2 mt-4">
                <label htmlFor="ticket-description">Describe the issue</label>
                <textarea
                  id="ticket-description"
                  placeholder="Provide details about the issue. Include listing IDs, order IDs, or settlement dates for faster resolution."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={5}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="modal-actions-footer">
                <button type="button" className="btn-form-cancel" onClick={() => setIsCreateModalOpen(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-form-submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Details Modal ── */}
      {selectedTicket && (
        <div className="help-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="help-ticket-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="details-header-title">
                <span className="ticket-id-badge">{selectedTicket.ticketId}</span>
                <h3>Ticket Details</h3>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setSelectedTicket(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="details-modal-body">
              <div className="details-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Category</span>
                  <span className="meta-val">{selectedTicket.category}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Priority</span>
                  <span className={`meta-val priority-tag-inline ${selectedTicket.priority.toLowerCase()}`}>
                    {selectedTicket.priority}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Status</span>
                  <span className={`meta-val status-badge-inline ${selectedTicket.status.replace(" ", "-").toLowerCase()}`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Submitted On</span>
                  <span className="meta-val">{formatDate(selectedTicket.createdAt)}</span>
                </div>
              </div>

              <div className="details-section mt-4">
                <h4>Subject</h4>
                <p className="details-subject-text">{selectedTicket.subject}</p>
              </div>

              <div className="details-section mt-4">
                <h4>Description</h4>
                <p className="details-desc-text">{selectedTicket.description}</p>
              </div>

              <div className="details-status-timeline mt-6">
                <h4>Ticket Timeline</h4>
                <div className="timeline-trail">
                  <div className="timeline-node active">
                    <div className="node-circle"><CheckCircle2 size={14} /></div>
                    <div className="node-info">
                      <p className="node-title">Ticket Registered</p>
                      <p className="node-time">{formatDate(selectedTicket.createdAt)}</p>
                    </div>
                  </div>
                  <div className={`timeline-node ${selectedTicket.status !== "Open" ? "active" : ""}`}>
                    <div className="node-circle"><Clock size={14} /></div>
                    <div className="node-info">
                      <p className="node-title">Under Investigation</p>
                      <p className="node-time">Assigning support agent...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions-footer">
              <button type="button" className="btn-form-cancel" onClick={() => setSelectedTicket(null)}>
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpPage;