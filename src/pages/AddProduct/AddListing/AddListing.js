// AddListing.js
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./AddListing.css";
import MyListings from "../MyListings/MyListings";
import InProgressListings from "../InProgressListings/InProgressListings";

const AddListing = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(location.state?.tab || null); // null | "my-listings" | "inprogress"

  const [animatedRevenue, setAnimatedRevenue] = useState(0);
  const [animatedOrders,  setAnimatedOrders]  = useState(0);
  const [animatedViews,   setAnimatedViews]   = useState(0);
  const [cardVisible,  setCardVisible]        = useState(false);
  const [barVisible,   setBarVisible]         = useState(false);
  const barRef  = useRef(null);
  const mBarRef = useRef(null);
  const tabSectionRef = useRef(null); // ref to scroll to tab content

  useEffect(() => {
    setCardVisible(true);
    const targets = { revenue: 48320, orders: 1284, views: 92400 };
    const steps   = 60;
    let count     = 0;
    const timer   = setInterval(() => {
      count++;
      setAnimatedRevenue(Math.min(Math.round((targets.revenue / steps) * count), targets.revenue));
      setAnimatedOrders( Math.min(Math.round((targets.orders  / steps) * count), targets.orders));
      setAnimatedViews(  Math.min(Math.round((targets.views   / steps) * count), targets.views));
      if (count >= steps) clearInterval(timer);
    }, 1800 / steps);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
      setTimeout(() => {
        tabSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [location.state]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setBarVisible(true); },
      { threshold: 0.3 }
    );
    if (barRef.current) observer.observe(barRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setBarVisible(true); },
      { threshold: 0.1 }
    );
    if (mBarRef.current) observer.observe(mBarRef.current);
    return () => observer.disconnect();
  }, []);

  const handleTabClick = (tab) => {
    setActiveTab(prev => {
      const next = prev === tab ? null : tab; // clicking same tab collapses it
      if (next) {
        // Scroll to tab content after state update
        setTimeout(() => {
          tabSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
      return next;
    });
  };

  const fmt = (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`);

  const sparkPts = [20, 38, 30, 55, 45, 72, 60, 88, 80, 100];
  const sparkPath = sparkPts
    .map((y, i) => `${(i / (sparkPts.length - 1)) * 160},${78 - y * 0.65}`)
    .join(" L ");

  const bars = [38, 62, 48, 80, 58, 92, 70];

  return (
    <div className="al-root">
      <section className="al-hero">

        {/* ── Hero Left ── */}
        <div className="al-hero-left">

          <h1 className={`al-h1 ${cardVisible ? "al-fadeup" : ""}`}>
            Start Selling.<br/>
            <span className="al-h1-grad">Start Growing.</span>
          </h1>

          <p className={`al-sub ${cardVisible ? "al-fadeup al-d1" : ""}`}>
            Create powerful product listings and grow your business faster with
            Haatza's intelligent seller tools.
          </p>

          {/* Mobile cards */}
          <div className="al-mobile-cards" ref={mBarRef}>
            <div className="al-mc-grid">

              <div className="al-mobile-card al-mobile-card--1">
                <span className="al-fc-lbl">Total Revenue</span>
                <div className="al-mc-val">{fmt(animatedRevenue)}</div>
                <div className="al-mc-foot">
                  <span className="al-badge-green">↑ 23.4%</span>
                  <span className="al-muted">vs last month</span>
                </div>
              </div>

              <div className="al-mobile-card al-mobile-card--2">
                <span className="al-fc-lbl">Total Orders</span>
                <div className="al-mc-val">{animatedOrders.toLocaleString()}</div>
                <div className="al-mini-bars">
                  {bars.map((h, i) => (
                    <div key={i} className="al-mini-bar"
                      style={{ height: barVisible ? `${h}%` : "3px", transitionDelay: `${i * 0.07}s` }}/>
                  ))}
                </div>
                <div className="al-mc-foot">
                  <span className="al-badge-green">↑ 18.2%</span>
                </div>
              </div>

              <div className="al-mobile-card al-mobile-card--3">
                <span className="al-fc-lbl">Product Views</span>
                <div className="al-mc-val">{(animatedViews / 1000).toFixed(1)}k</div>
                <div className="al-mobile-prog-track">
                  <div className="al-mobile-prog-fill" style={{ width: barVisible ? "72%" : "0%" }}/>
                </div>
                <div className="al-mc-foot">
                  <span className="al-badge-green">72% organic</span>
                </div>
              </div>

              <div className="al-mobile-card al-mobile-card--4">
                <div className="al-mc-prod-header">
                  <div className="al-mc-prod-img">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="3" stroke="#2962ff" strokeWidth="1.5"/>
                      <path d="M8 12l3 3 5-5" stroke="#2962ff" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="al-prod-tags" style={{ marginBottom: 0 }}>
                    <span className="al-tag al-tag-green">Live</span>
                  </div>
                </div>
                <p className="al-prod-name" style={{ marginTop: 8 }}>Wireless Earbuds Pro</p>
                <p className="al-prod-price">$89.99</p>
                <div className="al-prod-meta">
                  <span className="al-prod-stat">⭐ 4.8</span>
                  <span className="al-prod-stat">124 sold</span>
                </div>
              </div>

            </div>
          </div>

          {/* Action row */}
          <div className={`al-action-row ${cardVisible ? "al-fadeup al-d2" : ""}`}>
            <div className="al-tabs">

              {/* ── My Listings tab — toggles inline section ── */}
              <button
                className={`al-tab ${activeTab === "my-listings" ? "al-tab--active" : ""}`}
                onClick={() => handleTabClick("my-listings")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3"  y="3"  width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                  <rect x="14" y="3"  width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                  <rect x="3"  y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
                </svg>
                My Listings
              </button>

              {/* ── In Progress tab — toggles inline section ── */}
              <button
                className={`al-tab ${activeTab === "inprogress" ? "al-tab--active" : ""}`}
                onClick={() => handleTabClick("inprogress")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                In Progress
              </button>

            </div>

            {/* ── Add Product still navigates to select-category ── */}
            <button
              className="al-btn-add"
              onClick={() => navigate("/dashboard/listing/select-category")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Add Product
            </button>
          </div>
        </div>

        {/* ── Hero Right (desktop) ── */}
        <div className={`al-hero-right ${cardVisible ? "al-fade-right" : ""}`} ref={barRef}>

          <div className="al-fc al-fc-revenue">
            <div className="al-fc-row">
              <div>
                <p className="al-fc-lbl">Total Revenue</p>
                <p className="al-fc-val">{fmt(animatedRevenue)}</p>
              </div>
              <span className="al-fc-ico al-ico-blue">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"
                    stroke="#2962ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
            <svg className="al-spark" viewBox="0 0 160 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2962ff" stopOpacity="0.28"/>
                  <stop offset="100%" stopColor="#2962ff" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d={`M ${sparkPath}`} fill="none" stroke="#2962ff" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"/>
              <path d={`M ${sparkPath} L 160,80 L 0,80 Z`} fill="url(#sg)"/>
            </svg>
            <div className="al-fc-foot">
              <span className="al-badge-green">↑ 23.4%</span>
              <span className="al-muted">vs last month</span>
            </div>
          </div>

          <div className="al-fc al-fc-orders">
            <div className="al-fc-row">
              <div>
                <p className="al-fc-lbl">Total Orders</p>
                <p className="al-fc-val">{animatedOrders.toLocaleString()}</p>
              </div>
              <span className="al-fc-ico al-ico-green">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </div>
            <div className="al-bars">
              {bars.map((h, i) => (
                <div key={i} className="al-bar"
                  style={{ height: barVisible ? `${h}%` : "4px", transitionDelay: `${i * 0.07}s` }}/>
              ))}
            </div>
            <div className="al-fc-foot">
              <span className="al-badge-green">↑ 18.2%</span>
              <span className="al-muted">fulfilled 98%</span>
            </div>
          </div>

          <div className="al-fc al-fc-views">
            <div className="al-views-top">
              <div className="al-avatars">
                {["#2962ff","#7c3aed","#059669"].map((c, i) => (
                  <div key={i} className="al-avatar" style={{ background: c, marginLeft: i ? -9 : 0 }}/>
                ))}
              </div>
              <span className="al-fc-ico al-ico-purple">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#7c3aed" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" stroke="#7c3aed" strokeWidth="2"/>
                </svg>
              </span>
            </div>
            <p className="al-fc-lbl" style={{ marginTop: 10 }}>Product Views</p>
            <p className="al-fc-val">{(animatedViews / 1000).toFixed(1)}k</p>
            <div className="al-prog-row">
              <div className="al-prog-track">
                <div className="al-prog-fill" style={{ width: cardVisible ? "72%" : "0%" }}/>
              </div>
              <span className="al-muted" style={{ fontSize: 11 }}>72% organic</span>
            </div>
          </div>

          <div className="al-fc al-fc-product">
            <div className="al-prod-img">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="#2962ff" strokeWidth="1.5"/>
                <path d="M8 12l3 3 5-5" stroke="#2962ff" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="al-prod-name">Wireless Earbuds Pro</p>
            <p className="al-prod-price">$89.99</p>
            <div className="al-prod-tags">
              <span className="al-tag al-tag-blue">Electronics</span>
              <span className="al-tag al-tag-green">Live</span>
            </div>
            <div className="al-prod-meta">
              <span className="al-prod-stat">⭐ 4.8</span>
              <span className="al-prod-stat">124 sold</span>
            </div>
          </div>

        </div>
      </section>

      {/* ── Inline Tab Section — renders below hero ── */}
      {activeTab && (
        <div ref={tabSectionRef} className="al-tab-section">
          {activeTab === "my-listings" && <MyListings embedded />}
          {activeTab === "inprogress" && <InProgressListings embedded />}
        </div>
      )}
    </div>
  );
};

export default AddListing;