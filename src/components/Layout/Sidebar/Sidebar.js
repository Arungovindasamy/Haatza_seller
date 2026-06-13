import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ReactDOM from "react-dom";
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
  haatzup: "/haatzup",
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

/* ─────────────────────────────────────────────────────────────
   NAV DATA
   ───────────────────────────────────────────────────────────── */
const NAV_SECTIONS = [
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

/* ─────────────────────────────────────────────────────────────
   ICONS
   ───────────────────────────────────────────────────────────── */
const ChevronLeftIcon = () =>
  React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("polyline", { points: "15 18 9 12 15 6" })
  );

const ChevronRightIcon = () =>
  React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
    React.createElement("polyline", { points: "9 18 15 12 9 6" })
  );

/* ─────────────────────────────────────────────────────────────
   SIDEBAR TOOLTIP
   ─────────────────────────────────────────────────────────────
   Rendered into document.body via a React portal.
   Position is set from anchorRect (getBoundingClientRect of the
   hovered nav button), so it tracks perfectly during scroll —
   no CSS ::after hack, no stale coordinate issues.
   ───────────────────────────────────────────────────────────── */
function SidebarTooltip({ label, anchorRect, visible }) {
  const tooltipRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!anchorRect) { setReady(false); return; }

    // Tooltip gap from sidebar right edge → tooltip left edge
    const GAP = 14;
    // Estimated height before first render; actual height used after mount
    const estimatedH = tooltipRef.current ? tooltipRef.current.offsetHeight : 36;

    const rawTop = anchorRect.top + anchorRect.height / 2 - estimatedH / 2;
    const rawLeft = anchorRect.right + GAP;

    // Clamp vertically inside the viewport
    const maxTop = window.innerHeight - estimatedH - 8;
    setCoords({ top: Math.max(8, Math.min(rawTop, maxTop)), left: rawLeft });
    setReady(true);
  }, [anchorRect]);

  // Nothing to show — keep it completely out of the paint tree
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
      /* Left-pointing caret */
      React.createElement("span", { className: "sidebar-tooltip__caret", "aria-hidden": "true" }),
      label
    ),
    document.body
  );
}

/* ─────────────────────────────────────────────────────────────
   NAV ITEM
   ───────────────────────────────────────────────────────────── */
function NavItem({ item, active, onClick, isCollapsed, onTooltipShow, onTooltipHide, tooltipActiveKey }) {
  const btnRef = useRef(null);
  const isTouchDevice = useRef(false);

  // Detect touch device
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

  // Touch handlers for mobile/tablet - persistent tooltip
  const handleTouchStart = useCallback((e) => {
    if (!isCollapsed || !onTooltipShow || !isTouchDevice.current) return;
    e.preventDefault(); // Prevent scroll interference

    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      onTooltipShow(item.label, rect, item.key);
    }
  }, [isCollapsed, onTooltipShow, item.label, item.key, isTouchDevice]);

  const handleTouchEnd = useCallback((e) => {
    // Only handle click navigation, tooltip stays persistent
    setTimeout(() => {
      if (onClick) onClick(item.key);
    }, 50); // Small delay for smooth UX
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

/* ─────────────────────────────────────────────────────────────
   SELLER PROFILE
   ───────────────────────────────────────────────────────────── */
function SellerProfile({ sellerName = "", sellerEmail = "", onProfileClick, isCollapsed }) {
  const initials = sellerName
    .split(" ")
    .map(n => n[0])
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
      title: isCollapsed ? sellerName : undefined,
    },
    React.createElement("div", { className: "profile__avatar" },
      React.createElement("span", { className: "profile__avatar-initials" }, initials)
    ),
    !isCollapsed && React.createElement(
      "div", { className: "profile__info" },
      React.createElement("p", { className: "profile__name" }, sellerName || "Loading..."),
      React.createElement("div", { className: "profile__email-container" },
        React.createElement("p", { className: "profile__email" }, sellerEmail || "seller@haatza.com"),
        React.createElement("button", {
          className: "profile__action-btn",
          title: "View Store Profile",
          onClick: onProfileClick,
        },
          React.createElement("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" },
            React.createElement("path", { d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" }),
            React.createElement("polyline", { points: "15 3 21 3 21 9" }),
            React.createElement("line", { x1: "10", y1: "14", x2: "21", y2: "3" })
          )
        )
      )
    )
  );
}

/* ─────────────────────────────────────────────────────────────
   SIDEBAR
   ───────────────────────────────────────────────────────────── */
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

  /* ── Tooltip state ────────────────────────────────────────── */
  const [tooltip, setTooltip] = useState({
    label: "",
    anchorRect: null,
    visible: false,
    activeKey: null
  });
  const hideTimer = useRef(null);
  const isTouchDevice = useRef(false);

  // Detect touch device
  useEffect(() => {
    isTouchDevice.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const handleTooltipShow = useCallback((label, anchorRect, key) => {
    clearTimeout(hideTimer.current);
    setTooltip({ label, anchorRect, visible: true, activeKey: key });
  }, []);

  const handleTooltipHide = useCallback(() => {
    // For desktop: hide immediately
    if (!isTouchDevice.current) {
      clearTimeout(hideTimer.current);
      setTooltip({ label: "", anchorRect: null, visible: false, activeKey: null });
    }
  }, [isTouchDevice]);

  // Hide tooltip on outside clicks (mobile)
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isCollapsed && tooltip.visible && isTouchDevice.current) {
        // Check if click is outside sidebar and tooltip
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

  // Update tooltip position when scrolling (for active tooltip)
  useEffect(() => {
    let rafId;
    const updateTooltipPosition = () => {
      if (tooltip.visible && tooltip.anchorRect && isCollapsed && isTouchDevice.current) {
        // Find the current nav item by key or position
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
  }, [tooltip.visible, tooltip.activeKey, isCollapsed, isTouchDevice]);

  // Kill tooltip instantly on sidebar expand
  useEffect(() => {
    if (!isCollapsed) {
      clearTimeout(hideTimer.current);
      setTooltip({ label: "", anchorRect: null, visible: false, activeKey: null });
    }
  }, [isCollapsed]);

  /* ── Breakpoint listener ──────────────────────────────────── */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onBreakpoint = (e) => {
      setIsCollapsed(e.matches);
      if (e.matches) {
        // Hide tooltip on mobile collapse
        setTooltip({ label: "", anchorRect: null, visible: false, activeKey: null });
      }
    };
    mq.addEventListener("change", onBreakpoint);
    return () => mq.removeEventListener("change", onBreakpoint);
  }, []);

  useEffect(() => {
    if (typeof onCollapseChange === "function") onCollapseChange(isCollapsed);
  }, [isCollapsed, onCollapseChange]);

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

  /* Tooltip callbacks — only wired when sidebar is actually collapsed */
  const tooltipCallbacks = isCollapsed
    ? {
      onTooltipShow: handleTooltipShow,
      onTooltipHide: handleTooltipHide,
      tooltipActiveKey: tooltip.activeKey
    }
    : {};

  /* ── Sidebar content ──────────────────────────────────────── */
  const content = React.createElement(
    React.Fragment, null,

    React.createElement(SellerProfile, { sellerName, sellerEmail, onProfileClick: handleProfileClick, isCollapsed }),

    React.createElement("div", { className: "sidebar__divider" }),

    React.createElement("div", { className: "sidebar__primary-nav" },
      React.createElement(NavItem, { item: DASHBOARD_ITEM, active: activeKey === DASHBOARD_ITEM.key, onClick: handleItemClick, isCollapsed, ...tooltipCallbacks })
    ),

    React.createElement("div", { className: "sidebar__divider" }),

    React.createElement("nav", { className: "sidebar__nav" },
      NAV_SECTIONS.map((section) =>
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

    /* ── Floating tooltip portal ──────────────────────────── */
    React.createElement(SidebarTooltip, tooltip),

    /* ── Toggle button ────────────────────────────────────── */
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

    /* ── Sidebar shell ────────────────────────────────────── */
    React.createElement(
      "aside",
      { className: ["sidebar", isCollapsed ? "sidebar--mini" : ""].filter(Boolean).join(" ") },
      content
    )
  );
}

export default Sidebar;