import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Bell,
  Plus,
  RefreshCw,
  Video,
  Play,
  FileText,
  AlertCircle,
  Eye,
  Heart,
  MessageCircle,
  Clock
} from "lucide-react";
import { getSellerId } from "../../utils/sellerSession";
import { haatzupService } from "../../services/sellerService";
import "./HaatzUpPage.css";

const HaatzUpPage = () => {
  const sellerId = getSellerId();
  const navigate = useNavigate();

  // API Data
  const [summary, setSummary] = useState(null);
  const [videos, setVideos] = useState([]);
  const [guidelines, setGuidelines] = useState([]);

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null); // for popup player preview

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Load Data
  const loadPageData = useCallback(async () => {
    const resolvedSellerId = (sellerId || getSellerId() || "").trim();
    if (!resolvedSellerId || resolvedSellerId === "null" || resolvedSellerId === "undefined") {
      console.warn("[HaatzUpPage] Missing sellerId. API call skipped.");
      setError("Seller session not found. Please login again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, videosRes, guidelinesRes] = await Promise.all([
        haatzupService.getHaatzUpSummary(resolvedSellerId).catch(err => {
          console.warn("[HaatzUpPage] getHaatzUpSummary failed:", err);
          return null; // Don't crash if summary card is empty/optional
        }),
        haatzupService.getPromotionalVideos(resolvedSellerId).catch(err => {
          console.warn("[HaatzUpPage] getPromotionalVideos failed:", err);
          throw err; // crash/error state if video list fails
        }),
        haatzupService.getHaatzUpGuidelines().catch(err => {
          console.warn("[HaatzUpPage] getHaatzUpGuidelines failed:", err);
          return null; // fallback guidelines if missing
        })
      ]);

      // Parse Summary
      if (summaryRes) {
        const parsedSummary = summaryRes?.data || summaryRes?.message || summaryRes || {};
        setSummary({
          totalViews: parsedSummary.totalViews || parsedSummary.views || 0,
          totalLikes: parsedSummary.totalLikes || parsedSummary.likes || 0,
          totalComments: parsedSummary.totalComments || parsedSummary.comments || 0,
          uploadedCount: parsedSummary.uploadedCount || parsedSummary.count || 0
        });
      } else {
        setSummary(null);
      }

      // Parse Videos
      const parsedVideos = videosRes?.data || videosRes?.message?.videos || videosRes?.videos || videosRes || [];
      setVideos(Array.isArray(parsedVideos) ? parsedVideos : []);

      // Parse Guidelines
      const parsedGuidelines = guidelinesRes?.data || guidelinesRes?.message?.guidelines || guidelinesRes?.guidelines || guidelinesRes || [];
      setGuidelines(Array.isArray(parsedGuidelines) ? parsedGuidelines : [
        "Reel length must be between 15 and 60 seconds.",
        "Ensure high resolution vertical video (1080x1920, 9:16 aspect ratio).",
        "Avoid copyright background music. Use royalty-free music.",
        "Highlight your product clearly in the first 3 seconds of the reel.",
        "Keep captions descriptive and use relevant tags."
      ]);

    } catch (err) {
      console.error("[HaatzUpPage] Error fetching data:", err);
      setError("Failed to fetch promotional video reels from server. Please try again.");
      showToast("Error loading reels data", "error");
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // Render skeletons
  const renderSkeletons = () => (
    <div className="hz-skeleton-layout">
      <div className="skeleton-grid-cards">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-card skeleton-pulse" style={{ height: "100px", borderRadius: "12px", background: "#e2e8f0" }} />
        ))}
      </div>
      <div className="skeleton-row-main">
        <div className="skeleton-left skeleton-pulse" style={{ height: "400px", borderRadius: "14px", background: "#e2e8f0" }} />
        <div className="skeleton-right skeleton-pulse" style={{ height: "400px", borderRadius: "14px", background: "#e2e8f0" }} />
      </div>
    </div>
  );

  return (
    <div className="hz-page-root">
      {toast && (
        <div className={`hz-toast-banner ${toast.type}`}>
          <AlertCircle size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="hz-page-header">
        <div className="hz-header-left">
          <nav className="hz-breadcrumb">
            <span>Dashboard</span> &gt; <span>Boost Sales</span> &gt; <span className="active">HaatzUp</span>
          </nav>
          <h1 className="hz-page-title">Upload Promotional Video</h1>
        </div>
        <div className="hz-header-right">
          <button className="nav-icon-btn" onClick={() => navigate("/wallet")} aria-label="Wallet">
            <Wallet size={20} />
          </button>
          <button className="nav-icon-btn" onClick={() => navigate("/notifications")} aria-label="Notifications">
            <Bell size={20} />
          </button>
          <button className="btn-upload-haatzup-main" onClick={() => navigate("/haatzup/upload-reel")}>
            <Plus size={16} />
            <span>Upload HaatzUp</span>
          </button>
        </div>
      </div>

      {loading ? (
        renderSkeletons()
      ) : error ? (
        <div className="hz-error-container">
          <div className="hz-error-card">
            <AlertCircle size={48} className="error-icon" />
            <h3>Connection Error</h3>
            <p>{error}</p>
            <button className="btn-retry-sync" onClick={loadPageData}>
              <RefreshCw size={16} />
              <span>Retry Load</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="hz-main-content">
          {/* Summary Cards Row (conditional on summary existence) */}
          {summary && (
            <section className="hz-summary-row">
              <div className="hz-metric-card">
                <div className="card-top">
                  <span className="lbl">Total Uploads</span>
                  <Video size={16} className="metric-icon blue" />
                </div>
                <h2 className="val">{summary.uploadedCount}</h2>
              </div>
              <div className="hz-metric-card">
                <div className="card-top">
                  <span className="lbl">Total Views</span>
                  <Eye size={16} className="metric-icon green" />
                </div>
                <h2 className="val">{summary.totalViews.toLocaleString()}</h2>
              </div>
              <div className="hz-metric-card">
                <div className="card-top">
                  <span className="lbl">Likes Received</span>
                  <Heart size={16} className="metric-icon red" />
                </div>
                <h2 className="val">{summary.totalLikes.toLocaleString()}</h2>
              </div>
              <div className="hz-metric-card">
                <div className="card-top">
                  <span className="lbl">Comments</span>
                  <MessageCircle size={16} className="metric-icon purple" />
                </div>
                <h2 className="val">{summary.totalComments.toLocaleString()}</h2>
              </div>
            </section>
          )}

          {/* Guidelines & Gallery Grid */}
          <div className="hz-layout-grid">
            {/* Guidelines Box */}
            <div className="hz-guidelines-card">
              <div className="card-title-wrap">
                <FileText size={18} className="title-icon" />
                <h3>Upload Guidelines</h3>
              </div>
              <p className="guidelines-desc">
                Follow these specifications to ensure your reel is approved and gains maximum visibility on the app.
              </p>
              <ul className="guidelines-list">
                {guidelines.map((rule, idx) => (
                  <li key={idx}>
                    <span className="bullet-num">{idx + 1}</span>
                    <span className="rule-text">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Video Reels Gallery */}
            <div className="hz-gallery-card">
              <div className="card-title-wrap">
                <Video size={18} className="title-icon" />
                <h3>Your Reel Submissions</h3>
              </div>

              {videos.length === 0 ? (
                <div className="hz-empty-gallery">
                  <div className="reel-empty-graphic">
                    <Video size={48} className="graphic-icon" />
                  </div>
                  <h4>No Promotional Videos Found</h4>
                  <p>You have not uploaded any promotional video reels yet. Showcase your products with interactive reels.</p>
                  <button className="btn-upload-reel-inline" onClick={() => navigate("/haatzup/upload-reel")}>
                    Upload Your First Reel
                  </button>
                </div>
              ) : (
                <div className="reels-grid">
                  {videos.map((vid, idx) => (
                    <div key={vid.id || vid._id || idx} className="reel-item-card">
                      <div className="reel-thumbnail-area">
                        {vid.thumbnailUrl || vid.thumbnail ? (
                          <img src={vid.thumbnailUrl || vid.thumbnail} alt={vid.title} className="thumbnail-img" />
                        ) : (
                          <div className="default-thumbnail">
                            <Video size={28} className="thm-icon" />
                          </div>
                        )}
                        <button className="play-hover-btn" onClick={() => setSelectedVideo(vid)}>
                          <Play size={20} fill="#fff" />
                        </button>
                        {vid.duration && <span className="reel-duration-badge">{vid.duration}s</span>}
                      </div>

                      <div className="reel-info-area">
                        <h4 className="reel-title-text">{vid.title || "Unnamed Video"}</h4>
                        <div className="reel-associated-product">
                          <span className="prod-label">Product:</span>
                          <span className="prod-val">{vid.productName || vid.productId || "None"}</span>
                        </div>
                        {vid.createdDate && (
                          <div className="reel-date">
                            <Clock size={12} />
                            <span>{new Date(vid.createdDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="reel-footer-row">
                          <span className={`status-tag ${String(vid.status || "approved").toLowerCase()}`}>
                            {vid.status || "Approved"}
                          </span>
                          <div className="views-likes-stats">
                            <span className="stat-span"><Eye size={12} />{vid.views || 0}</span>
                            <span className="stat-span"><Heart size={12} />{vid.likes || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal popup */}
      {selectedVideo && (
        <div className="hz-video-preview-modal" onClick={() => setSelectedVideo(null)}>
          <div className="modal-video-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header-row">
              <h4>{selectedVideo.title}</h4>
              <button className="close-btn" onClick={() => setSelectedVideo(null)}>&times;</button>
            </div>
            <div className="video-player-frame">
              {selectedVideo.videoUrl || selectedVideo.url ? (
                <video src={selectedVideo.videoUrl || selectedVideo.url} controls autoPlay className="main-video-elt" />
              ) : (
                <div className="no-video-url-placeholder">
                  <Video size={48} />
                  <p>Video URL is not available.</p>
                </div>
              )}
            </div>
            <div className="video-meta-detail">
              <p className="caption"><strong>Caption:</strong> {selectedVideo.caption || "No caption provided."}</p>
              {selectedVideo.tags && <p className="tags"><strong>Tags:</strong> {selectedVideo.tags}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HaatzUpPage;
