import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ReactDOM from "react-dom";
import { sellerService } from "../../../services/sellerService";
import { getSellerId, resolveSellerEmail } from "../../../utils/sellerSession";
import "./Sidebar.css";

const KEY_TO_ROUTE = {
  dashboard: "/dashboard",
  orders: "/orders",
  returns: "/return-exchange",
  listing: "/listing",
  inventory: "/inventory",
  settlements: "/settlements",
  help: "/help",
  advertisement: "/advertisement",
  growplan: "/growplan",
  productinsight: "/productinsight",
  warehouse: "/warehouse",
  influencer: "/influencer",
  growthcentral: "/growthcentral",
  qualityinsights: "/qualityinsights",
  referandearn: "/referandearn",
  settings: "/settings",
};

/* Reverse map — lets active highlight follow the URL automatically */
const ROUTE_TO_KEY = Object.fromEntries(
  Object.entries(KEY_TO_ROUTE).map(([k, v]) => [v, k])
);

// Menu icons helpers
const createIcon = (d, viewBox = "0 0 24 24", extra = null) => {
  return React.createElement(
    "svg",
    { width: "20", height: "20", viewBox, fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("path", { d }),
    extra
  );
};

const NAV_SECTIONS_FALLBACK = [
  {
    heading: "MANAGE BUSINESS",
    items: [
      {
        key: "orders", label: "Orders", badge: "12",
        icon: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
          React.createElement("path", { d: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" }),
          React.createElement("line", { x1: "3", y1: "6", x2: "21", y2: "6" }),
          React.createElement("path", { d: "M16 10a4 4 0 01-8 0" })
        ),
      },
      {
        key: "returns", label: "Return / Exchange",
        icon: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
          React.createElement("polyline", { points: "1 4 1 10 7 10" }),
          React.createElement("path", { d: "M3.51 15a9 9 0 102.13-9.36L1 10" })
        ),
      },
      {
        key: "listing", label: "Listing",
        icon: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
          React.createElement("line", { x1: "8", y1: "6", x2: "21", y2: "6" }),
          React.createElement("line", { x1: "8", y1: "12", x2: "21", y2: "12" }),
          React.createElement("line", { x1: "8", y1: "18", x2: "21", y2: "18" }),
          React.createElement("line", { x1: "3", y1: "6", x2: "3.01", y2: "6" }),
          React.createElement("line", { x1: "3", y1: "12", x2: "3.01", y2: "12" }),
          React.createElement("line", { x1: "3", y1: "18", x2: "3.01", y2: "18" })
        ),
      },
      {
        key: "inventory", label: "Inventory",
        icon: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
          React.createElement("path", { d: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" }),
          React.createElement("polyline", { points: "3.27 6.96 12 12.01 20.73 6.96" }),
          React.createElement("line", { x1: "12", y1: "22.08", x2: "12", y2: "12" })
        ),
      },
      {
        key: "settlements", label: "Settlements",
        icon: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
          React.createElement("line", { x1: "12", y1: "1", x2: "12", y2: "23" }),
          React.createElement("path", { d: "M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" })
        ),
      },
      {
        key: "help", label: "Help",
        icon: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
          React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
          React.createElement("path", { d: "M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" }),
          React.createElement("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })
        ),
      },
    ],
  },
  {
    heading: "Boost Sales",
    items: [
      {
        key: "advertisement", label: "Advertisement",
        icon: createIcon("M23 7H1v10h22V7z", "0 0 24 24", React.createElement("path", { d: "M16 21V3a2 2 0 00-2-2h-4a2 2 0 00-2 2v18" })),
      },
      {
        key: "growplan", label: "Grow Plan",
        icon: createIcon("M18 20V10M12 20V4M6 20v-6"),
      },
      {
        key: "productinsight", label: "Product Insight",
        icon: createIcon("M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z", "0 0 24 24", React.createElement("circle", { cx: "12", cy: "12", r: "3" })),
      },
      {
        key: "warehouse", label: "Warehouse",
        icon: createIcon("M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"),
      },
      {
        key: "influencer", label: "Influencer Branding",
        icon: createIcon("M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "0 0 24 24", React.createElement("circle", { cx: "9", cy: "7", r: "4" })),
      },
      {
        key: "growthcentral", label: "Growth Central",
        icon: createIcon("M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "0 0 24 24", React.createElement("path", { d: "M16.2 7.8l-2.2 6.4-6.4 2.2 2.2-6.4 6.4-2.2z" })),
      },
      {
        key: "qualityinsights", label: "Quality Insights",
        icon: createIcon("M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", "0 0 24 24", React.createElement("path", { d: "M12 8v4M12 16h.01" })),
      },
      {
        key: "referandearn", label: "Refer & Earn",
        icon: createIcon("M22 7H2v14h20V7z", "0 0 24 24", React.createElement("path", { d: "M6 21V5a2 2 0 012-2h8a2 2 0 012 2v16" })),
      }
    ],
  }
];

const DASHBOARD_ITEM = {
  key: "dashboard",
  label: "Dashboard",
  icon: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("rect", { x: "3", y: "3", width: "7", height: "7" }),
    React.createElement("rect", { x: "14", y: "3", width: "7", height: "7" }),
    React.createElement("rect", { x: "14", y: "14", width: "7", height: "7" }),
    React.createElement("rect", { x: "3", y: "14", width: "7", height: "7" })
  ),
};

const BOTTOM_ITEMS = [
  {
    key: "settings", label: "Settings",
    icon: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
      React.createElement("circle", { cx: "12", cy: "12", r: "3" }),
      React.createElement("path", { d: "M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" })
    ),
  },
  {
    key: "logout", label: "Logout", danger: true,
    icon: React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
      React.createElement("path", { d: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" }),
      React.createElement("polyline", { points: "16 17 21 12 16 7" }),
      React.createElement("line", { x1: "21", y1: "12", x2: "9", y2: "12" })
    ),
  },
];

const ChevronLeftIcon = () =>
  React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("polyline", { points: "15 18 9 12 15 6" })
  );

const ChevronRightIcon = () =>
  React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("polyline", { points: "9 18 15 12 9 6" })
  );

function SidebarTooltip({ label, anchorRect, visible }) {
  const tooltipRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!anchorRect) { setReady(false); return; }

    const GAP = 14;
    const estimatedH = tooltipRef.current ? tooltipRef.current.offsetHeight : 36;
    const rawTop = anchorRect.top + anchorRect.height / 2 - estimatedH / 2;
    const rawLeft = anchorRect.right + GAP;
    const maxTop = window.innerHeight - estimatedH - 8;

    setCoords({ top: Math.max(8, Math.min(rawTop, maxTop)), left: rawLeft });
    setReady(true);
  }, [anchorRect]);

  if (!label) return null;

  return ReactDOM.createPortal(
    React.createElement(
      "div",
      {
        ref: tooltipRef,
        className: ["sidebar-tooltip", visible && ready ? "sidebar-tooltip--visible" : ""].filter(Boolean).join(" "),
        style: { top: coords.top, left: coords.left },
        "aria-hidden": "true",
      },
      React.createElement("span", { className: "sidebar-tooltip__caret", "aria-hidden": "true" }),
      label
    ),
    document.body
  );
}

function NavItem({ item, active, onClick, isCollapsed, onTooltipShow, onTooltipHide, tooltipActiveKey }) {
  const btnRef = useRef(null);
  const isTouchDevice = useRef(false);

  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!isCollapsed || !onTooltipShow) return;
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) onTooltipShow(item.label, rect, item.key);
  }, [isCollapsed, onTooltipShow, item.label, item.key]);

  const handleMouseLeave = useCallback(() => {
    if (onTooltipHide) onTooltipHide();
  }, [onTooltipHide]);

  const handleTouchStart = useCallback((e) => {
    if (!isCollapsed || !onTooltipShow || !isTouchDevice.current) return;
    e.preventDefault();

    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      onTooltipShow(item.label, rect, item.key);
    }
  }, [isCollapsed, onTooltipShow, item.label, item.key, isTouchDevice]);

  const handleTouchEnd = useCallback((e) => {
    setTimeout(() => {
      if (onClick) onClick(item.key);
    }, 50);
  }, [onClick, item.key]);

  return React.createElement(
    "button",
    {
      ref: btnRef,
      className: [
        "nav-item",
        active ? "nav-item--active" : "",
        item.danger ? "nav-item--danger" : "",
        isCollapsed ? "nav-item--icon-only" : "",
        tooltipActiveKey === item.key ? "nav-item--tooltip-active" : "",
      ].filter(Boolean).join(" "),
      onClick: (e) => {
        e.stopPropagation();
        if (onClick) onClick(item.key);
      },
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      "aria-label": item.label,
    },
    React.createElement("span", { className: "nav-item__icon" }, item.icon),
    !isCollapsed && React.createElement("span", { className: "nav-item__label" }, item.label),
    !isCollapsed && item.badge &&
    React.createElement("span", {
      className: `nav-item__badge${item.badgeType === "pro" ? " nav-item__badge--pro" : ""}`,
    }, item.badge)
  );
}

function SellerProfile({ sellerName = "", sellerEmail = "", onProfileClick, isCollapsed }) {
  const displayCompany = sellerName || "Seller";
  const displayEmail = sellerEmail || "";

  const initials = displayCompany
    .split(" ")
    .map((n) => n ? n[0] : "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return React.createElement(
    "div",
    {
      className: [
        "sidebar__profile",
        isCollapsed ? "sidebar__profile--mini" : "",
      ].filter(Boolean).join(" "),
      onClick: onProfileClick,
      title: isCollapsed ? displayCompany : undefined,
      style: { cursor: "pointer" }
    },
    React.createElement("div", { className: "profile__avatar" },
      React.createElement("span", { className: "profile__avatar-initials" }, initials)
    ),
    !isCollapsed && React.createElement(
      "div", { className: "profile__info" },
      React.createElement("p", { className: "profile__name" }, displayCompany),
      React.createElement("p", { className: "profile__email" }, displayEmail)
    ),
    !isCollapsed && React.createElement("div", { className: "profile__arrow" },
      React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
        React.createElement("polyline", { points: "9 18 15 12 9 6" })
      )
    )
  );
}

function Sidebar({
  sellerName = "",
  sellerEmail = "",
  onProfileClick = () => { },
  onCollapseChange,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 768
  );

  const [menuSections, setMenuSections] = useState(NAV_SECTIONS_FALLBACK);

  const sellerId = getSellerId();

  const onCollapseChangeRef = useRef(onCollapseChange);
  useEffect(() => {
    onCollapseChangeRef.current = onCollapseChange;
  });

  const fetchingRef = useRef(false);
  const walletFetchedRef = useRef(false);
  const lastWalletBalanceRef = useRef(0);

  useEffect(() => {
    walletFetchedRef.current = false;
    lastWalletBalanceRef.current = 0;
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId) return;

    let active = true;
    const abortController = new AbortController();

    const fetchCounts = async (forceWalletFetch = false) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const emailId = sellerEmail || resolveSellerEmail() || "";
        const now = new Date();
        const fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];

        const walletPromise = (!walletFetchedRef.current || forceWalletFetch)
          ? sellerService.checkWalletBalance(sellerId)
          : Promise.resolve({ status: "success", message: { RemainingBalance: lastWalletBalanceRef.current } });

        const [ordersRes, ticketsRes, notifRes, walletRes, campaignRes] = await Promise.allSettled([
          sellerService.getSellerNewOrders(sellerId),
          sellerService.getSellerTickets({ sellerId, emailId, fromDate, toDate }),
          sellerService.getNotifications(sellerId),
          walletPromise,
          sellerService.getAdvertisementSummary(sellerId)
        ]);

        if (!active) return;

        let ordersCount = 0;
        if (ordersRes.status === "fulfilled") {
          const rawOrders = ordersRes.value?.data || ordersRes.value?.message || [];
          ordersCount = Array.isArray(rawOrders)
            ? rawOrders.filter(o => o.status === "new" || o.status === "pending").length
            : (ordersRes.value?.count || 0);
        }

        let ticketsCount = 0;
        if (ticketsRes.status === "fulfilled") {
          const rawTickets = ticketsRes.value?.message?.data || ticketsRes.value?.data || ticketsRes.value?.tickets || [];
          ticketsCount = Array.isArray(rawTickets)
            ? rawTickets.filter(t => t.status !== "Closed" && t.status !== "Resolved").length
            : 0;
        }

        let unreadNotifCount = 0;
        if (notifRes.status === "fulfilled") {
          const rawNotifs = notifRes.value?.message?.data || notifRes.value?.data || [];
          unreadNotifCount = Array.isArray(rawNotifs)
            ? rawNotifs.filter(n => !n.read && n.status !== "read").length
            : 0;
        }

        let walletLabel = "";
        if (walletRes.status === "fulfilled") {
          const val = walletRes.value;
          if (val && val.status !== "error") {
            const bal = Number(val.message?.RemainingBalance || val.RemainingBalance || 0);
            lastWalletBalanceRef.current = bal;
            walletFetchedRef.current = true;
          }
          walletLabel = `₹${lastWalletBalanceRef.current.toFixed(2)}`;
        }

        let activeCampaigns = 0;
        if (campaignRes.status === "fulfilled") {
          const summary = campaignRes.value?.data || campaignRes.value?.message || {};
          activeCampaigns = summary.activeCampaigns || summary.ActiveCampaignsCount || 0;
        }

        setMenuSections(prevSections => {
          return prevSections.map(section => {
            return {
              ...section,
              items: section.items.map(item => {
                if (item.key === "orders") {
                  return { ...item, badge: ordersCount > 0 ? String(ordersCount) : undefined };
                }
                if (item.key === "help") {
                  return { ...item, badge: ticketsCount > 0 ? String(ticketsCount) : undefined };
                }
                if (item.key === "notifications") {
                  return { ...item, badge: unreadNotifCount > 0 ? String(unreadNotifCount) : undefined };
                }
                if (item.key === "wallet") {
                  return { ...item, badge: walletLabel || undefined };
                }
                if (item.key === "advertisement") {
                  return { ...item, badge: activeCampaigns > 0 ? `${activeCampaigns} Active` : undefined };
                }
                return item;
              })
            };
          });
        });

      } catch (err) {
        if (active) {
          console.warn("[Sidebar] Error updating dynamic counts:", err);
        }
      } finally {
        fetchingRef.current = false;
      }
    };

    fetchCounts(true);
    const interval = setInterval(() => {
      fetchCounts(false);
    }, 60000);

    const handleWalletUpdate = () => {
      fetchCounts(true);
    };

    window.addEventListener("walletUpdate", handleWalletUpdate);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("walletUpdate", handleWalletUpdate);
      abortController.abort();
    };
  }, [sellerId, sellerEmail]);

  const activeKey = (() => {
    const path = location.pathname;

    if (
      path.includes("/listing") ||
      path.includes("/my-listings") ||
      path.includes("/inprogress-listings")
    ) {
      return "listing";
    }

    return ROUTE_TO_KEY[path] ?? "dashboard";
  })();

  const [tooltip, setTooltip] = useState({
    label: "",
    anchorRect: null,
    visible: false,
    activeKey: null
  });
  const hideTimer = useRef(null);
  const isTouchDevice = useRef(false);

  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const handleTooltipShow = useCallback((label, anchorRect, key) => {
    clearTimeout(hideTimer.current);
    setTooltip({ label, anchorRect, visible: true, activeKey: key });
  }, []);

  const handleTooltipHide = useCallback(() => {
    if (!isTouchDevice.current) {
      clearTimeout(hideTimer.current);
      setTooltip({ label: "", anchorRect: null, visible: false, activeKey: null });
    }
  }, [isTouchDevice]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isCollapsed && tooltip.visible && isTouchDevice.current) {
        if (!e.target.closest('.sidebar') && !e.target.closest('.sidebar-tooltip')) {
          setTooltip({ label: "", anchorRect: null, visible: false, activeKey: null });
        }
      }
    };

    if (isCollapsed && isTouchDevice.current) {
      document.addEventListener('touchstart', handleOutsideClick, { passive: true });
      document.addEventListener('click', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isCollapsed, tooltip.visible, isTouchDevice]);

  useEffect(() => {
    let rafId;
    const updateTooltipPosition = () => {
      if (tooltip.visible && tooltip.anchorRect && isCollapsed && isTouchDevice.current) {
        const navItems = document.querySelectorAll('.nav-item');
        for (let item of navItems) {
          if (item.classList.contains(`nav-item--tooltip-active`)) {
            const rect = item.getBoundingClientRect();
            setTooltip(prev => ({ ...prev, anchorRect: rect }));
            break;
          }
        }
      }
      rafId = requestAnimationFrame(updateTooltipPosition);
    };

    if (tooltip.visible && isCollapsed && isTouchDevice.current) {
      rafId = requestAnimationFrame(updateTooltipPosition);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooltip.visible, tooltip.activeKey, isCollapsed, isTouchDevice]);

  useEffect(() => {
    if (!isCollapsed) {
      clearTimeout(hideTimer.current);
      setTooltip({ label: "", anchorRect: null, visible: false, activeKey: null });
    }
  }, [isCollapsed]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onBreakpoint = (e) => {
      setIsCollapsed(e.matches);
      if (e.matches) {
        setTooltip({ label: "", anchorRect: null, visible: false, activeKey: null });
      }
    };
    mq.addEventListener("change", onBreakpoint);
    return () => mq.removeEventListener("change", onBreakpoint);
  }, []);

  useEffect(() => {
    if (typeof onCollapseChangeRef.current === "function") {
      onCollapseChangeRef.current(isCollapsed);
    }
  }, [isCollapsed]);

  const handleToggle = useCallback(() => setIsCollapsed(prev => !prev), []);
  const handleItemClick = useCallback((key) => {
    const route = KEY_TO_ROUTE[key];
    if (route) navigate(route);
  }, [navigate]);

  const handleProfileClick = useCallback((e) => {
    e.stopPropagation();
    onProfileClick();
  }, [onProfileClick]);

  const getToggleLeft = useCallback(() => {
    if (isCollapsed) return "72px";
    const w = getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width").trim();
    return w || "380px";
  }, [isCollapsed]);

  const tooltipCallbacks = isCollapsed
    ? {
      onTooltipShow: handleTooltipShow,
      onTooltipHide: handleTooltipHide,
      tooltipActiveKey: tooltip.activeKey
    }
    : {};

  const content = React.createElement(
    React.Fragment, null,

    React.createElement(SellerProfile, { sellerName, sellerEmail, onProfileClick: handleProfileClick, isCollapsed }),

    React.createElement("div", { className: "sidebar__divider" }),

    React.createElement("div", { className: "sidebar__primary-nav" },
      React.createElement(NavItem, { item: DASHBOARD_ITEM, active: activeKey === DASHBOARD_ITEM.key, onClick: handleItemClick, isCollapsed, ...tooltipCallbacks })
    ),

    React.createElement("div", { className: "sidebar__divider" }),

    React.createElement("nav", { className: "sidebar__nav" },
      menuSections.map((section) =>
        React.createElement("div", { key: section.heading, className: "nav-section" },
          !isCollapsed && React.createElement("p", { className: "nav-section__heading" }, section.heading),
          section.items.map((item) =>
            React.createElement(NavItem, { key: item.key, item, active: activeKey === item.key, onClick: handleItemClick, isCollapsed, ...tooltipCallbacks })
          )
        )
      )
    ),

    React.createElement("div", { className: "sidebar__bottom" },
      React.createElement("div", { className: "sidebar__divider sidebar__divider--bottom" }),
      BOTTOM_ITEMS.map((item) =>
        React.createElement(NavItem, { key: item.key, item, active: activeKey === item.key, onClick: handleItemClick, isCollapsed, ...tooltipCallbacks })
      )
    )
  );

  return React.createElement(
    React.Fragment, null,

    React.createElement(SidebarTooltip, tooltip),

    React.createElement(
      "button",
      {
        className: "sidebar__external-toggle",
        style: { left: getToggleLeft() },
        onClick: handleToggle,
        "aria-label": isCollapsed ? "Expand sidebar" : "Collapse sidebar",
        title: isCollapsed ? "Expand sidebar" : "Collapse sidebar",
      },
      isCollapsed ? React.createElement(ChevronRightIcon) : React.createElement(ChevronLeftIcon)
    ),

    React.createElement(
      "aside",
      { className: ["sidebar", isCollapsed ? "sidebar--mini" : ""].filter(Boolean).join(" ") },
      content
    )
  );
}

export default Sidebar;