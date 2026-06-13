import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";
import haatzaSellerLogo from "../../../assets/Images/haatzaSellerlogo.png";
import {
  Bell,
  Wallet,
  MessageSquare,
  Search,
  ChevronDown,
  User,
  Settings,
  HelpCircle,
  LogOut,
  X,
} from "lucide-react";

import { sellerService } from "../../../services/sellerService";
import { getSellerId } from "../../../utils/sellerSession";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const HaatzaNavbar = ({ seller = {} }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileIconsOpen, setMobileIconsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const dropdownRef = useRef(null);
  const mobileIconRef = useRef(null);

  const sellerId = getSellerId() || "HS1380";

  // Dropdown states
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [remindersDropdownOpen, setRemindersDropdownOpen] = useState(false);

  // Notifications API states
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState(null);

  // Wallet API states
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    setNotifLoading(true);
    setNotifError(null);
    try {
      const response = await sellerService.getNotifications(sellerId);
      const rawNotif = response?.message?.data || response?.data || [];
      setNotifications(rawNotif);
    } catch (err) {
      console.error("[Navbar] Fetch notifications failed:", err);
      setNotifError("Failed to load notifications.");
    } finally {
      setNotifLoading(false);
    }
  };

  // Mark notification as read
  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    try {
      await sellerService.updateNotificationStatus(sellerId, id, "read");
      setNotifications(prev => prev.map(n => n._id === id || n.id === id ? { ...n, read: true, status: "read" } : n));
    } catch (err) {
      console.error("[Navbar] Update notification failed:", err);
    }
  };

  // Fetch wallet info
  const fetchWalletInfo = async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        sellerService.checkWalletBalance(sellerId),
        sellerService.getTransactionHistory(sellerId),
      ]);
      const fetchedBalance = Number(balanceRes?.message?.RemainingBalance || 0);
      const rawTx = transactionsRes?.message?.transactions || [];
      setWalletBalance(fetchedBalance);
      setWalletTransactions(rawTx.slice(0, 5)); // show top 5 recent
    } catch (err) {
      console.error("[Navbar] Fetch wallet info failed:", err);
      setWalletError("Failed to load wallet data.");
    } finally {
      setWalletLoading(false);
    }
  };

  const toggleNotifDropdown = () => {
    const nextState = !notifDropdownOpen;
    setNotifDropdownOpen(nextState);
    setWalletDropdownOpen(false);
    setRemindersDropdownOpen(false);
    setDropdownOpen(false);
    if (nextState) {
      fetchNotifications();
    }
  };

  const toggleWalletDropdown = () => {
    const nextState = !walletDropdownOpen;
    setWalletDropdownOpen(nextState);
    setNotifDropdownOpen(false);
    setRemindersDropdownOpen(false);
    setDropdownOpen(false);
    if (nextState) {
      fetchWalletInfo();
    }
  };

  const toggleRemindersDropdown = () => {
    const nextState = !remindersDropdownOpen;
    setRemindersDropdownOpen(nextState);
    setNotifDropdownOpen(false);
    setWalletDropdownOpen(false);
    setDropdownOpen(false);
  };

  const NotifDropdownMenu = () => {
    return React.createElement(
      "div", { className: "navbar-dropdown-panel notif-dropdown" },
      React.createElement("div", { className: "dropdown-panel-header" },
        React.createElement("h3", null, "Notifications"),
        React.createElement("button", { 
          className: "btn-mark-all-read", 
          onClick: async (e) => {
            e.stopPropagation();
            try {
              await Promise.all(notifications.filter(n => !n.read && !n.status === "read").map(n => sellerService.updateNotificationStatus(sellerId, n._id || n.id, "read")));
              setNotifications(prev => prev.map(n => ({ ...n, read: true, status: "read" })));
            } catch (err) {
              console.error(err);
            }
          }
        }, "Mark all read")
      ),
      React.createElement("div", { className: "dropdown-panel-body" },
        notifLoading
          ? React.createElement("div", { className: "panel-loading" }, "Loading...")
          : notifError
            ? React.createElement("div", { className: "panel-error" }, notifError)
            : notifications.length === 0
              ? React.createElement("div", { className: "panel-empty" }, "No notifications available.")
              : React.createElement("ul", { className: "panel-list" },
                  notifications.map((n, idx) => {
                    const isRead = n.read || n.status === "read";
                    return React.createElement("li", { 
                      key: n._id || n.id || idx, 
                      className: `panel-list-item ${isRead ? "read" : "unread"}` 
                    },
                      React.createElement("div", { className: "item-content" },
                        React.createElement("p", { className: "item-title" }, n.title || "Notification"),
                        React.createElement("p", { className: "item-message" }, n.message || n.body || "")
                      ),
                      !isRead && React.createElement("button", { 
                        className: "btn-item-read",
                        onClick: (e) => handleMarkRead(e, n._id || n.id)
                      }, "✓")
                    );
                  })
                )
      )
    );
  };

  const WalletDropdownMenu = () => {
    return React.createElement(
      "div", { className: "navbar-dropdown-panel wallet-dropdown" },
      React.createElement("div", { className: "dropdown-panel-header" },
        React.createElement("h3", null, "Wallet Balance"),
        React.createElement("span", { className: "wallet-balance-amount" }, 
          walletBalance !== null ? `₹${walletBalance.toFixed(2)}` : "..."
        )
      ),
      React.createElement("div", { className: "dropdown-panel-body" },
        walletLoading
          ? React.createElement("div", { className: "panel-loading" }, "Loading...")
          : walletError
            ? React.createElement("div", { className: "panel-error" }, walletError)
            : walletTransactions.length === 0
              ? React.createElement("div", { className: "panel-empty" }, "No transactions found.")
              : React.createElement("ul", { className: "panel-list" },
                  walletTransactions.map((tx, idx) => {
                    const isCredit = String(tx.type || "").toLowerCase().includes("credit") || String(tx.type || "").toLowerCase().includes("deposit");
                    return React.createElement("li", { 
                      key: tx._id || tx.id || idx, 
                      className: "panel-list-item tx-item" 
                    },
                      React.createElement("div", { className: "item-content" },
                        React.createElement("p", { className: "item-title" }, tx.type || "Transaction"),
                        React.createElement("p", { className: "item-date" }, tx.createdDate ? new Date(tx.createdDate).toLocaleDateString() : "")
                      ),
                      React.createElement("span", { className: `tx-amount ${isCredit ? "credit" : "debit"}` }, 
                        `${isCredit ? "+" : "-"}₹${Number(tx.amount || 0).toFixed(2)}`
                      )
                    );
                  })
                )
      )
    );
  };

  const RemindersDropdownMenu = () => {
    return React.createElement(
      "div", { className: "navbar-dropdown-panel reminders-dropdown" },
      React.createElement("div", { className: "dropdown-panel-header" },
        React.createElement("h3", null, "Reminders")
      ),
      React.createElement("div", { className: "dropdown-panel-body" },
        React.createElement("div", { className: "panel-empty" }, "No reminders available.")
      )
    );
  };

  const greeting = getGreeting();

  const sellerName = seller?.name || "";
  const sellerEmail = seller?.email || "";
  const sellerRole = seller?.role || "";
  const sellerInitial = seller?.avatarInitial || (sellerName ? sellerName.charAt(0).toUpperCase() : "");
  const sellerLogoUrl = seller?.logoUrl || null;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (
        mobileIconRef.current &&
        !mobileIconRef.current.contains(e.target) &&
        !e.target.closest(".mobile-icons-toggle-btn")
      ) {
        setMobileIconsOpen(false);
      }
      if (
        !e.target.closest(".mobile-search-bar") &&
        !e.target.closest(".mobile-search-icon-btn")
      ) {
        setMobileSearchOpen(false);
      }
      if (!e.target.closest(".notif-dropdown-container")) {
        setNotifDropdownOpen(false);
      }
      if (!e.target.closest(".wallet-dropdown-container")) {
        setWalletDropdownOpen(false);
      }
      if (!e.target.closest(".reminders-dropdown-container")) {
        setRemindersDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dropdownItems = [
    { icon: React.createElement(User, { size: 16 }), label: "My Profile", danger: false },
    { icon: React.createElement(Settings, { size: 16 }), label: "Business Settings", danger: false },
    { icon: React.createElement(Wallet, { size: 16 }), label: "Wallet", danger: false },
    { icon: React.createElement(HelpCircle, { size: 16 }), label: "Help Center", danger: false },
    { icon: React.createElement(LogOut, { size: 16 }), label: "Logout", danger: true },
  ];

  /* ── Avatar: letter or logo image ── */
  const AvatarContent = () =>
    sellerLogoUrl
      ? React.createElement(
        "div", { className: "avatar" },
        React.createElement("img", { src: sellerLogoUrl, alt: sellerName, className: "avatar-img" })
      )
      : React.createElement("div", { className: "avatar" }, sellerInitial);

  /* ── Dropdown avatar (slightly larger) ── */
  const DropdownAvatarContent = () =>
    sellerLogoUrl
      ? React.createElement(
        "div", { className: "dropdown-avatar" },
        React.createElement("img", { src: sellerLogoUrl, alt: sellerName, className: "avatar-img" })
      )
      : React.createElement("div", { className: "dropdown-avatar" }, sellerInitial);

  /* ── Greeting text shared between mobile & desktop center ── */
  const GreetingText = () =>
    React.createElement(
      "p", { className: "greeting-text" },
      greeting,
      sellerName
        ? React.createElement(
          React.Fragment, null,
          ", ",
          React.createElement("span", { className: "greeting-name" }, sellerName)
        )
        : null,
      " 👋"
    );

  /* ── 3-dot vertical icon SVG ── */
  const ThreeDotsIcon = () =>
    React.createElement(
      "svg",
      {
        width: "20", height: "20",
        viewBox: "0 0 24 24",
        fill: "currentColor",
        xmlns: "http://www.w3.org/2000/svg",
      },
      /* Three filled circles */
      React.createElement("circle", { cx: "12", cy: "5", r: "1.5" }),
      React.createElement("circle", { cx: "12", cy: "12", r: "1.5" }),
      React.createElement("circle", { cx: "12", cy: "19", r: "1.5" })
    );

  return React.createElement(
    React.Fragment,
    null,

    /* ══════════════════════════════════════════════
       NAVBAR
    ══════════════════════════════════════════════ */
    React.createElement(
      "nav",
      { className: `haatza-navbar ${scrolled ? "scrolled" : ""}` },
      React.createElement(
        "div",
        { className: "navbar-inner" },

        /* ── LEFT: Logo + Search ── */
        React.createElement(
          "div",
          { className: "navbar-left" },

          /* Logo */
          React.createElement(
            "div", { className: "logo-wrap" },
            React.createElement("img", {
              src: haatzaSellerLogo,
              alt: "Haatza Seller",
              className: "brand-logo-img",
            })
          ),

          /* Mobile search tap icon (≤639px only, shown via CSS) */
          React.createElement(
            "button",
            {
              className: "icon-btn mobile-search-icon-btn",
              title: "Search",
              onClick: () => setMobileSearchOpen((p) => !p),
            },
            React.createElement(Search, { size: 20 })
          ),

          /* Desktop / Tablet search bar (hidden on ≤639px via CSS) */
          React.createElement(
            "div",
            { className: `search-wrap desktop-search ${searchFocused ? "focused" : ""}` },
            React.createElement(Search, { className: "search-icon", size: 16 }),
            React.createElement("input", {
              type: "text",
              className: "search-input",
              placeholder: "Search products, orders…",
              value: searchValue,
              onChange: (e) => setSearchValue(e.target.value),
              onFocus: () => setSearchFocused(true),
              onBlur: () => setSearchFocused(false),
            }),
            searchValue &&
            React.createElement(
              "button",
              { className: "search-clear", onClick: () => setSearchValue("") },
              React.createElement(X, { size: 14 })
            )
          )
        ),

        /* ── MOBILE CENTER greeting (≤639px) ── */
        React.createElement(
          "div", { className: "navbar-center mobile-center" },
          React.createElement(GreetingText)
        ),

        /* ── DESKTOP / TABLET CENTER greeting (≥640px) ── */
        React.createElement(
          "div", { className: "navbar-center desktop-center" },
          React.createElement(GreetingText)
        ),

        /* ── RIGHT: Icon group + Profile avatar + 3-dot ── */
        React.createElement(
          "div",
          { className: "navbar-right" },

          /* Desktop icon group (Bell, Wallet, Messages) — hidden on tablet/mobile */
          React.createElement(
            "div", { className: "icon-group" },

            /* Notifications Icon + Panel */
            React.createElement(
              "div", { className: "notif-dropdown-container" },
              React.createElement(
                "button", 
                { 
                  className: `icon-btn ${notifDropdownOpen ? "active" : ""}`, 
                  title: "Notifications",
                  onClick: toggleNotifDropdown 
                },
                React.createElement(Bell, { size: 20 })
              ),
              notifDropdownOpen && NotifDropdownMenu()
            ),

            /* Wallet Icon + Panel */
            React.createElement(
              "div", { className: "wallet-dropdown-container" },
              React.createElement(
                "button", 
                { 
                  className: `icon-btn ${walletDropdownOpen ? "active" : ""}`, 
                  title: "Wallet",
                  onClick: toggleWalletDropdown 
                },
                React.createElement(Wallet, { size: 20 })
              ),
              walletDropdownOpen && WalletDropdownMenu()
            ),

            /* Messages Icon + Panel */
            React.createElement(
              "div", { className: "reminders-dropdown-container" },
              React.createElement(
                "button", 
                { 
                  className: `icon-btn ${remindersDropdownOpen ? "active" : ""}`, 
                  title: "Messages",
                  onClick: toggleRemindersDropdown 
                },
                React.createElement(MessageSquare, { size: 20 })
              ),
              remindersDropdownOpen && RemindersDropdownMenu()
            )
          ),

          /* ── Profile — AVATAR ONLY button, dropdown has all details ── */
          React.createElement(
            "div",
            { className: "profile-wrap", ref: dropdownRef },

            /* Circular avatar button — no name/email/chevron visible */
            React.createElement(
              "button",
              {
                className: `profile-btn ${dropdownOpen ? "active" : ""}`,
                onClick: () => setDropdownOpen((p) => !p),
                title: sellerName || "Profile",
                "aria-label": "Open profile menu",
              },
              React.createElement(AvatarContent)
            ),

            /* Dropdown panel — reveals name, full email, role, menu items */
            dropdownOpen &&
            React.createElement(
              "div", { className: "dropdown-menu" },

              /* Header: avatar + name + full email + role */
              React.createElement(
                "div", { className: "dropdown-header" },
                React.createElement(DropdownAvatarContent),
                React.createElement(
                  "div", { className: "dropdown-user-info" },
                  sellerName &&
                  React.createElement("p", { className: "dropdown-name" }, sellerName),
                  /* Full email — word-break: break-all in CSS handles long addresses */
                  sellerEmail &&
                  React.createElement("p", { className: "dropdown-email" }, sellerEmail),
                  sellerRole &&
                  React.createElement("p", { className: "dropdown-role" }, sellerRole)
                )
              ),

              React.createElement("div", { className: "dropdown-divider" }),

              React.createElement(
                "ul", { className: "dropdown-list" },
                dropdownItems.map((item, i) =>
                  React.createElement(
                    "li", { key: i },
                    React.createElement(
                      "button",
                      { className: `dropdown-item ${item.danger ? "danger" : ""}` },
                      React.createElement("span", { className: "di-icon" }, item.icon),
                      React.createElement("span", { className: "di-label" }, item.label)
                    )
                  )
                )
              )
            )
          ),

          /* ── 3-dot toggle (tablet + mobile) — opens Bell/Wallet/Messages drawer ── */
          React.createElement(
            "button",
            {
              className: "mobile-icons-toggle-btn",
              onClick: () => setMobileIconsOpen((p) => !p),
              "aria-label": "Toggle notifications and wallet",
              title: "Notifications & Wallet",
            },
            React.createElement(ThreeDotsIcon)
          )
        )
      )
    ),

    /* ══════════════════════════════════════════════
       MOBILE SEARCH BAR (slides below navbar on tap)
    ══════════════════════════════════════════════ */
    mobileSearchOpen &&
    React.createElement(
      "div", { className: "mobile-search-bar" },
      React.createElement(Search, { className: "search-icon", size: 16 }),
      React.createElement("input", {
        type: "text",
        className: "search-input",
        placeholder: "Search products, orders…",
        value: searchValue,
        autoFocus: true,
        onChange: (e) => setSearchValue(e.target.value),
      }),
      React.createElement(
        "button",
        {
          className: "search-clear",
          onClick: () => {
            if (searchValue) setSearchValue("");
            else setMobileSearchOpen(false);
          },
        },
        React.createElement(X, { size: 14 })
      )
    ),

    /* ══════════════════════════════════════════════
       MOBILE / TABLET DRAWER — Bell, Wallet, Messages
       Opens via 3-dot button on tablet + mobile
    ══════════════════════════════════════════════ */
    React.createElement(
      "div",
      {
        className: `mobile-drawer ${mobileIconsOpen ? "open" : ""}`,
        ref: mobileIconRef,
      },
      React.createElement(
        "div", { className: "mobile-icon-row" },

        React.createElement(
          "button", 
          { 
            className: "mobile-drawer-icon-btn", 
            title: "Notifications",
            onClick: () => { setMobileIconsOpen(false); navigate("/notifications"); }
          },
          React.createElement(
            "div", { className: "mobile-drawer-icon" },
            React.createElement(Bell, { size: 22 })
          ),
          React.createElement("span", { className: "icon-label" }, "Alerts")
        ),

        React.createElement(
          "button", 
          { 
            className: "mobile-drawer-icon-btn", 
            title: "Wallet",
            onClick: () => { setMobileIconsOpen(false); navigate("/wallet"); }
          },
          React.createElement(
            "div", { className: "mobile-drawer-icon" },
            React.createElement(Wallet, { size: 22 })
          ),
          React.createElement("span", { className: "icon-label" }, "Wallet")
        ),

        React.createElement(
          "button", 
          { 
            className: "mobile-drawer-icon-btn", 
            title: "Messages",
            onClick: () => { setMobileIconsOpen(false); navigate("/notifications"); }
          },
          React.createElement(
            "div", { className: "mobile-drawer-icon" },
            React.createElement(MessageSquare, { size: 22 })
          ),
          React.createElement("span", { className: "icon-label" }, "Messages")
        )
      )
    ),

    /* Overlay to close mobile/tablet drawer */
    mobileIconsOpen &&
    React.createElement("div", {
      className: "drawer-overlay",
      onClick: () => setMobileIconsOpen(false),
    })
  );
};

export default HaatzaNavbar;