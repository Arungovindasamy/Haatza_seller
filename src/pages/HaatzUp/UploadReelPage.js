import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Upload,
  X,
  AlertCircle,
  Film,
  RefreshCw
} from "lucide-react";
import { getSellerId } from "../../utils/sellerSession";
import { haatzupService } from "../../services/sellerService";
import "./UploadReelPage.css";

const MAX_FILE_SIZE_MB = 50; // 50MB limit

const UploadReelPage = () => {
  const sellerId = getSellerId();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // API Data
  const [products, setProducts] = useState([]);

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form Fields
  const [title, setTitle] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("Fashion");

  // validation state
  const [validationErrors, setValidationErrors] = useState({});

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Load Products
  const loadProducts = useCallback(async () => {
    const resolvedSellerId = (sellerId || getSellerId() || "").trim();
    if (!resolvedSellerId || resolvedSellerId === "null" || resolvedSellerId === "undefined") {
      console.warn("[UploadReelPage] Missing sellerId. API call skipped.");
      setError("Seller session not found. Please login again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await haatzupService.getProductsForPromotion(resolvedSellerId);
      const parsedProducts = res?.data || res?.message?.products || res?.products || res || [];
      const productList = Array.isArray(parsedProducts) ? parsedProducts : [];
      setProducts(productList);
      if (productList.length > 0) {
        setSelectedProductId(productList[0].id || productList[0]._id || "");
      }
    } catch (err) {
      console.error("[UploadReelPage] Failed loading products for promotion:", err);
      setError("Failed to load catalog products. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // File selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    const errors = { ...validationErrors };
    delete errors.file;

    // Validate type (must be video)
    if (!file.type.startsWith("video/")) {
      errors.file = "Unsupported format. Please select a valid video file (e.g. mp4, mov, avi).";
      setValidationErrors(errors);
      return;
    }

    // Validate size (MB)
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > MAX_FILE_SIZE_MB) {
      errors.file = `File is too large. Maximum size allowed is ${MAX_FILE_SIZE_MB}MB.`;
      setValidationErrors(errors);
      return;
    }

    setVideoFile(file);
    setValidationErrors(errors);
  };

  const removeSelectedFile = () => {
    setVideoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) validateAndSetFile(file);
  };

  // Validations
  const validateForm = () => {
    const errors = {};
    if (!title.trim()) errors.title = "Reel Title is required.";
    if (!videoFile) errors.file = "A video file upload is required.";
    if (!caption.trim()) {
      errors.caption = "Caption is required.";
    } else if (caption.length > 180) {
      errors.caption = "Caption cannot exceed 180 characters.";
    }
    if (!category) errors.category = "Category selection is required.";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast("Please fix validation errors", "error");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("sellerId", sellerId);
    formData.append("title", title.trim());
    formData.append("productId", selectedProductId);
    formData.append("video", videoFile);
    formData.append("caption", caption.trim());
    formData.append("tags", tags.trim());
    formData.append("category", category);

    try {
      await haatzupService.uploadHaatzUpReel(formData, (percent) => {
        setUploadProgress(percent);
      });
      showToast("Reel uploaded successfully!");
      setTimeout(() => {
        navigate("/haatzup");
      }, 1500);
    } catch (err) {
      console.error("[UploadReelPage] Reel upload failed:", err);
      showToast("Reel upload failed. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="ur-page-root">
      {toast && (
        <div className={`ur-toast-banner ${toast.type}`}>
          <AlertCircle size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="ur-page-header">
        <div className="ur-header-left">
          <button className="back-arrow-btn" onClick={() => navigate("/haatzup")} aria-label="Go Back">
            <ChevronLeft size={24} />
          </button>
          <div>
            <nav className="ur-breadcrumb">
              <span>HaatzUp</span> &gt; <span className="active">Upload Reel</span>
            </nav>
            <h1 className="ur-page-title">Upload Reel</h1>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="ur-skeleton-layout">
          <div className="skeleton-form-card skeleton-pulse" style={{ height: "550px", borderRadius: "14px", background: "#e2e8f0" }} />
        </div>
      ) : error ? (
        <div className="ur-error-container">
          <div className="ur-error-card">
            <AlertCircle size={48} className="error-icon" />
            <h3>Unable to Sync Form Data</h3>
            <p>{error}</p>
            <button className="btn-retry-sync" type="button" onClick={loadProducts}>
              <RefreshCw size={16} />
              <span>Retry Load</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="ur-form-container">
          <div className="ur-layout-grid">
            {/* Left Column: File upload & Caption fields */}
            <div className="ur-left-card">
              <label className="field-label-main">1. Choose Reel Video</label>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*"
                style={{ display: "none" }}
              />

              {!videoFile ? (
                <div
                  className={`ur-upload-dropzone ${validationErrors.file ? "error" : ""}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={40} className="upload-icon" />
                  <h4>Tap to Upload</h4>
                  <p>or drag and drop your video file here</p>
                  <span className="file-limits-lbl">Max size: {MAX_FILE_SIZE_MB}MB | Format: MP4, MOV</span>
                </div>
              ) : (
                <div className="ur-uploaded-file-preview">
                  <Film size={36} className="file-icon" />
                  <div className="file-details">
                    <span className="name">{videoFile.name}</span>
                    <span className="size">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                  <button type="button" className="btn-remove-file" onClick={removeSelectedFile}>
                    <X size={16} />
                  </button>
                </div>
              )}
              {validationErrors.file && <span className="field-error-text">{validationErrors.file}</span>}

              {/* Caption field */}
              <div className="form-group" style={{ marginTop: "20px" }}>
                <div className="label-row">
                  <label htmlFor="captionInput">2. Enter Caption</label>
                  <span className="char-counter">{caption.length}/180</span>
                </div>
                <textarea
                  id="captionInput"
                  placeholder="Enter caption descriptive details..."
                  value={caption}
                  onChange={(e) => {
                    setCaption(e.target.value);
                    setValidationErrors(prev => ({ ...prev, caption: null }));
                  }}
                  className={`textarea-input ${validationErrors.caption ? "error" : ""}`}
                  maxLength={180}
                />
                {validationErrors.caption && <span className="field-error-text">{validationErrors.caption}</span>}
              </div>
            </div>

            {/* Right Column: Metadata fields */}
            <div className="ur-right-card">
              <h3>Reel Parameters</h3>

              {/* Reel Title */}
              <div className="form-group">
                <label htmlFor="titleInput">Reel Title</label>
                <input
                  type="text"
                  id="titleInput"
                  placeholder="e.g. Summer collection launch"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setValidationErrors(prev => ({ ...prev, title: null }));
                  }}
                  className={`text-input ${validationErrors.title ? "error" : ""}`}
                />
                {validationErrors.title && <span className="field-error-text">{validationErrors.title}</span>}
              </div>

              {/* Associated Product Selection */}
              <div className="form-group">
                <label htmlFor="productSelect">Associated Product (Optional)</label>
                <select
                  id="productSelect"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="select-input"
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p, idx) => (
                    <option key={p.id || p._id || idx} value={p.id || p._id}>
                      {p.name || p.productName || "Unnamed Product"} (SKU: {p.sku || "N/A"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="form-group">
                <label htmlFor="categorySelect">Category</label>
                <select
                  id="categorySelect"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="select-input"
                >
                  <option value="Fashion">Fashion</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Home decor">Home Decor</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Sports">Sports</option>
                </select>
                {validationErrors.category && <span className="field-error-text">{validationErrors.category}</span>}
              </div>

              {/* Tags */}
              <div className="form-group">
                <label htmlFor="tagsInput">Tags (Comma-separated)</label>
                <input
                  type="text"
                  id="tagsInput"
                  placeholder="e.g. summer, dress, style"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="text-input"
                />
              </div>

              {/* Upload progress & Submit button */}
              {uploading && (
                <div className="ur-progress-bar-wrap">
                  <div className="progress-labels">
                    <span>Uploading Reel...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn-upload-reel-submit"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <RefreshCw size={16} className="spinner-icon" />
                    <span>Processing video...</span>
                  </>
                ) : (
                  <span>Upload HaatzUp</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default UploadReelPage;
