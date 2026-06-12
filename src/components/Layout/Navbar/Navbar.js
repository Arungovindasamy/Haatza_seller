import React, { useState, useEffect, useRef } from "react";
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

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const HaatzaNavbar = ({ seller = {} }) => {
  const [dropdownOpen, setDropdownOpen]         = useState(false);
  const [mobileIconsOpen, setMobileIconsOpen]   = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused]       = useState(false);
  const [searchValue, setSearchValue]           = useState("");
  const [scrolled, setScrolled]                 = useState(false);

  const dropdownRef   = useRef(null);
  const mobileIconRef = useRef(null);

  const greeting = getGreeting();

  const sellerName    = seller?.name          || "";
  const sellerEmail   = seller?.email         || "";
  const sellerRole    = seller?.role          || "";
  const sellerInitial = seller?.avatarInitial || (sellerName ? sellerName.charAt(0).toUpperCase() : "");
  const sellerLogoUrl = seller?.logoUrl       || null;

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dropdownItems = [
    { icon: React.createElement(User,       { size: 16 }), label: "My Profile"       , danger: false },
    { icon: React.createElement(Settings,   { size: 16 }), label: "Business Settings", danger: false },
    { icon: React.createElement(Wallet,     { size: 16 }), label: "Wallet"           , danger: false },
    { icon: React.createElement(HelpCircle, { size: 16 }), label: "Help Center"      , danger: false },
    { icon: React.createElement(LogOut,     { size: 16 }), label: "Logout"           , danger: true  },
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
      React.createElement("circle", { cx: "12", cy: "5",  r: "1.5" }),
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
              onBlur:  () => setSearchFocused(false),
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
            React.createElement(
              "button", { className: "icon-btn", title: "Notifications" },
              React.createElement(Bell, { size: 20 })
            ),
            React.createElement(
              "button", { className: "icon-btn", title: "Wallet" },
              React.createElement(Wallet, { size: 20 })
            ),
            React.createElement(
              "button", { className: "icon-btn", title: "Messages" },
              React.createElement(MessageSquare, { size: 20 })
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
                        React.createElement("span", { className: "di-icon"  }, item.icon),
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
          "button", { className: "mobile-drawer-icon-btn", title: "Notifications" },
          React.createElement(
            "div", { className: "mobile-drawer-icon" },
            React.createElement(Bell, { size: 22 })
          ),
          React.createElement("span", { className: "icon-label" }, "Alerts")
        ),

        React.createElement(
          "button", { className: "mobile-drawer-icon-btn", title: "Wallet" },
          React.createElement(
            "div", { className: "mobile-drawer-icon" },
            React.createElement(Wallet, { size: 22 })
          ),
          React.createElement("span", { className: "icon-label" }, "Wallet")
        ),

        React.createElement(
          "button", { className: "mobile-drawer-icon-btn", title: "Messages" },
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