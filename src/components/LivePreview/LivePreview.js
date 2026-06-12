import React from "react";
import "./LivePreview.css";

// Helper to resolve Wix image URLs
const resolveWixImage = (img) => {
  if (!img) return null;
  const raw =
    typeof img === "string"
      ? img
      : img.src || img.url || img.image || img.imageUrl || null;
  if (!raw) return null;
  if (raw.startsWith("data:")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    if (raw.includes("static.wixstatic.com/media/")) {
      const parts = raw.split("static.wixstatic.com/media/");
      if (parts.length > 1) {
        const pathPart = parts[1].split("?")[0].split("#")[0];
        const pathSegments = pathPart.split("/");
        let fileId = pathSegments[0];
        if (pathSegments.length > 1) {
          if (!fileId.includes(".") && pathSegments[1].includes(".")) {
            const ext = pathSegments[1].split(".").pop();
            fileId = `${fileId}.${ext}`;
          }
        }
        return `https://static.wixstatic.com/media/${fileId}`;
      }
    }
    return raw;
  }
  if (raw.startsWith("wix:image://")) {
    const withoutScheme  = raw.replace(/^wix:image:\/\//, "");
    const withoutVersion = withoutScheme.replace(/^v1\//, "");
    const hashIdx  = withoutVersion.indexOf("#");
    const pathPart = hashIdx !== -1 ? withoutVersion.substring(0, hashIdx) : withoutVersion;
    const pathSegments = pathPart.split("/");
    let fileId   = pathSegments[0];
    let fileName = pathSegments[1] || "";
    if (!fileId || fileId.length > 200 || fileId.includes(" ")) return null;
    if (fileId.includes(".")) {
      return `https://static.wixstatic.com/media/${fileId}`;
    }
    if (fileName && fileName.includes(".")) {
      const ext = fileName.split(".").pop();
      return `https://static.wixstatic.com/media/${fileId}.${ext}`;
    }
    return `https://static.wixstatic.com/media/${fileId}~mv2.jpg`;
  }
  return null;
};

// Inline SVG icons
const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
    <path d="M12 3l1.912 5.886h6.192l-5.01 3.639 1.912 5.886-5.006-3.639-5.006 3.639 1.912-5.886-5.01-3.639h6.192z" fill="#2962ff"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const LivePreview = ({
  category = null,
  subcategory = null,
  formData = {},
  images = [],
  specifications = {},
  confirmedColors = [],
  colourImages = {},
  variantPrices = {},
  promotionImage = null,
  keywords = [],
  fields = [],
  optionFields = [],
  variants = [],
}) => {
  // 1. Calculations & Computations
  const nameDisplay = formData?.productName || "No Product Name Added";
  const brandDisplay = formData?.brand || "No Brand Added";
  const catDisplay = category?.name || "No Category Selected";
  const subCatDisplay = subcategory?.name || "No Subcategory Selected";
  const priceDisplay = formData?.price ? `₹${formData.price}` : "No Price Added";
  const discountDisplay = formData?.onSale && formData?.discountValue
    ? (formData.discountType === "percent" ? `${formData.discountValue}%` : `₹${formData.discountValue}`)
    : "No Discount";

  const finalPrice = (() => {
    const base = parseFloat(formData?.price) || 0;
    if (formData?.onSale && formData?.discountValue) {
      const distVal = parseFloat(formData.discountValue) || 0;
      if (formData.discountType === "percent") {
        return base - (base * distVal) / 100;
      } else {
        return Math.max(0, base - distVal);
      }
    }
    return base;
  })();

  const isOptionField = (f) => f.type === "Product Options";
  const isSizeChartField = (f) => {
    if (f.type === "Product Options") return false;
    const titleLower = (f.title || "").toLowerCase().trim();
    const fieldIdLower = (f.fieldId || "").toLowerCase().trim();
    const elementTypeLower = (f.elementType || "").toLowerCase().trim();
    const placeholderLower = (f.placeholderText || "").toLowerCase().trim();
    return (
      elementTypeLower === "upload" ||
      elementTypeLower === "file" ||
      placeholderLower === "upload" ||
      titleLower.includes("size chart") ||
      titleLower.includes("size chat") ||
      titleLower.includes("upload") ||
      fieldIdLower.includes("sizechart") ||
      fieldIdLower.includes("size_chart") ||
      fieldIdLower.includes("upload")
    );
  };

  // Section completion checks

  // 1. Product Info & Shipping Complete (20%)
  const isProductInfoComplete = !!(
    formData?.productName?.trim() &&
    formData?.brand?.trim() &&
    formData?.price &&
    parseFloat(formData.price) > 0 &&
    formData?.availableStock &&
    parseInt(formData.availableStock) >= 5 &&
    formData?.shippingWeight &&
    parseFloat(formData.shippingWeight) > 0 &&
    formData?.productReturn
  );

  // 2. Product Images Complete (20%)
  const isProductImagesComplete = !!(images && images.length >= 2);

  // 3. Specifications Complete (20%)
  const reqSpecs = fields.filter(f => f.type !== "Product Options" && !isSizeChartField(f) && f.required);
  const isSpecsComplete = reqSpecs.length === 0 || reqSpecs.every(f => {
    const key = f.fieldId || f.title;
    const v = specifications[key];
    return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  });

  // 4. Product Options Complete (20%)
  const hasColorPicker = fields.some(f => (f.elementType || "").toLowerCase() === "color picker");
  const isProductOptionsComplete = (() => {
    const optFields = fields.filter(isOptionField);
    if (optFields.length === 0) return true;

    // Check sizes selection
    const sizeField = optFields.find(f => {
      const t = (f.title || "").toLowerCase().trim();
      return t === "size" || t === "sizes";
    });
    if (sizeField) {
      const key = sizeField.fieldId || sizeField.title;
      const v = specifications[key];
      const sizeArr = Array.isArray(v) ? v : (v ? [v] : []);
      if (sizeArr.length === 0) return false;
    }

    // Check colors selection if color picker is active
    if (hasColorPicker && confirmedColors.length === 0) return false;

    // Check variant prices
    if (variants.length > 0) {
      const allPricesFilled = variants.every(v => {
        const price = variantPrices[v.key];
        return price !== undefined && price !== "" && parseFloat(price) >= 0;
      });
      if (!allPricesFilled) return false;
    }

    return true;
  })();

  // 5. Promotion (including size chart and keywords) Complete (20%)
  const sizeChartField = fields.find(f => isSizeChartField(f));
  const isPromotionComplete = (() => {
    if (sizeChartField && sizeChartField.required) {
      const key = sizeChartField.fieldId || sizeChartField.title;
      const v = specifications[key];
      return !!(v && v !== "__PENDING_FILE__");
    }
    return true;
  })();

  const sectionStates = [
    isProductInfoComplete,      // 20%
    isProductImagesComplete,    // 20%
    isSpecsComplete,            // 20%
    isProductOptionsComplete,   // 20%
    isPromotionComplete,        // 20%
  ];
  const completedSectionsCount = sectionStates.filter(Boolean).length;
  const progress = completedSectionsCount * 20;

  // Debugging logs as requested:
  const productData = {
    category,
    subcategory,
    formData,
    images,
    specifications,
    confirmedColors,
    colourImages,
    variantPrices,
    promotionImage,
    keywords,
  };
  const completionPercentage = progress;
  console.log("Live Preview Data:", productData);
  console.log("Completion Percentage:", completionPercentage);

  // Map values for options and specifications
  const optionFieldsList = fields.filter(isOptionField);
  const specFieldsList = fields.filter(f => !isOptionField(f) && !isSizeChartField(f));

  // Resolved URL array for product images
  const resolvedImages = (images || [])
    .map(img => img?.mediaUrl || img?.url || img?.preview || null)
    .filter(Boolean);

  const mainImageUrl = resolvedImages[0] ? resolveWixImage(resolvedImages[0]) : null;

  return (
    <div className="lp-card">
      <div className="lp-card-header">
        <SparkleIcon />
        <span className="lp-card-title">Live Preview</span>
      </div>

      {/* Completion Percentage Section */}
      <div className="lp-progress-section">
        <div className="lp-progress-header">
          <span className="lp-progress-label">Completion</span>
          <span className="lp-progress-pct">{progress}%</span>
        </div>
        <div className="lp-progress-track">
          <div className="lp-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="lp-progress-sub">{completedSectionsCount}/5 sections completed</p>
      </div>

      <div className="lp-divider" />

      {/* Product Basic Info Section */}
      <div className="lp-section">
        <h4 className="lp-section-title">Product Information</h4>
        <div className="lp-row">
          <span className="lp-key">Product Name</span>
          <span className={`lp-val ${!formData?.productName ? "lp-val--placeholder" : ""}`}>
            {formData?.productName || "No Product Name Added"}
          </span>
        </div>
        <div className="lp-row">
          <span className="lp-key">Brand</span>
          <span className={`lp-val ${!formData?.brand ? "lp-val--placeholder" : ""}`}>
            {formData?.brand || "No Brand Added"}
          </span>
        </div>
        <div className="lp-row">
          <span className="lp-key">Category</span>
          <span className="lp-val">{catDisplay}</span>
        </div>
        <div className="lp-row">
          <span className="lp-key">Subcategory</span>
          <span className="lp-val">{subCatDisplay}</span>
        </div>
        <div className="lp-row">
          <span className="lp-key">Price</span>
          <span className={`lp-val ${!formData?.price ? "lp-val--placeholder" : ""}`}>
            {priceDisplay}
          </span>
        </div>
        <div className="lp-row">
          <span className="lp-key">Discount</span>
          <span className="lp-val">{discountDisplay}</span>
        </div>
        <div className="lp-row">
          <span className="lp-key">Final Price</span>
          <span className="lp-val font-semibold text-blue-600">₹{finalPrice.toFixed(2)}</span>
        </div>
        <div className="lp-row">
          <span className="lp-key">Product Type</span>
          <span className="lp-val">Physical</span>
        </div>
      </div>

      <div className="lp-divider" />

      {/* Product Images Section */}
      <div className="lp-section">
        <h4 className="lp-section-title">Product Images</h4>
        {resolvedImages.length > 0 ? (
          <div className="lp-images-gallery">
            <div className="lp-main-image-wrap">
              <img src={mainImageUrl} alt="Main view" className="lp-main-image" />
              <span className="lp-main-image-badge">Main Image (Front View)</span>
            </div>
            {resolvedImages.length > 1 && (
              <div className="lp-sub-images-grid">
                {resolvedImages.slice(1).map((url, idx) => (
                  <img key={idx} src={resolveWixImage(url)} alt={`Sub view ${idx + 2}`} className="lp-sub-image" />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="lp-empty-block">
            <InfoIcon />
            <span>No Images Uploaded</span>
          </div>
        )}
      </div>

      <div className="lp-divider" />

      {/* Product Options Section */}
      {optionFieldsList.length > 0 ? (
        <div className="lp-section">
          <h4 className="lp-section-title">Product Options</h4>
          
          {/* Available Sizes */}
          {optionFieldsList.map(field => {
            const isSize = (field.title || "").toLowerCase().trim().includes("size");
            if (!isSize) return null;
            const key = field.fieldId || field.title;
            const val = specifications[key];
            const sizeArr = Array.isArray(val) ? val : (val ? [val] : []);
            return (
              <div key={key} className="lp-option-group">
                <span className="lp-option-label">Available Sizes:</span>
                {sizeArr.length > 0 ? (
                  <div className="lp-size-chips">
                    {sizeArr.map(s => (
                      <span key={s} className="lp-size-chip">{s}</span>
                    ))}
                  </div>
                ) : (
                  <span className="lp-val--placeholder">No Sizes Selected</span>
                )}
              </div>
            );
          })}

          {/* Color list and mapped color images */}
          {confirmedColors.length > 0 && (
            <div className="lp-option-group">
              <span className="lp-option-label">Color Variants:</span>
              <div className="lp-color-variants-grid">
                {confirmedColors.map(c => {
                  const img = colourImages[c.name];
                  let resolvedUrl = null;
                  if (img) {
                    if (img instanceof File) {
                      resolvedUrl = URL.createObjectURL(img);
                    } else if (Array.isArray(img)) {
                      const first = img.find(Boolean);
                      if (first) {
                        resolvedUrl = first instanceof File ? URL.createObjectURL(first) : (first.url || first.mediaUrl || first.src || first || null);
                      }
                    } else if (typeof img === "object") {
                      resolvedUrl = img.url || img.mediaUrl || img.src || null;
                    } else if (typeof img === "string") {
                      resolvedUrl = img;
                    }
                  }

                  return (
                    <div key={c.name} className="lp-color-variant-card">
                      <div className="lp-color-variant-info">
                        <span className="lp-color-dot" style={{ background: c.hex }} />
                        <span className="lp-color-variant-name">{c.name}</span>
                      </div>
                      {resolvedUrl ? (
                        <img src={resolveWixImage(resolvedUrl)} alt={c.name} className="lp-color-variant-img" />
                      ) : (
                        <div className="lp-color-variant-no-img">No Image Connected</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variant pricing combinations */}
          {variants.length > 0 && (
            <div className="lp-option-group">
              <span className="lp-option-label">Variant Pricing combinations:</span>
              <div className="lp-variants-pricing-list">
                {variants.map(v => {
                  const label = v.optionLabel ? `${v.color ? v.color + " + " : ""}${v.optionLabel}` : v.color;
                  const priceOverride = variantPrices[v.key];
                  const displayPrice = priceOverride !== undefined && priceOverride !== "" ? `₹${priceOverride}` : `₹${finalPrice}`;
                  return (
                    <div key={v.key} className="lp-variant-price-row">
                      <span className="lp-variant-comb">{label}</span>
                      <span className="lp-variant-price-val">{displayPrice}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="lp-section">
          <h4 className="lp-section-title">Product Options</h4>
          <div className="lp-empty-block">
            <InfoIcon />
            <span>No Product Options Selected</span>
          </div>
        </div>
      )}

      <div className="lp-divider" />

      {/* Specifications Section */}
      <div className="lp-section">
        <h4 className="lp-section-title">Product Specification</h4>
        {specFieldsList.length > 0 ? (
          <div className="lp-specs-table">
            {specFieldsList.map(field => {
              const key = field.fieldId || field.title;
              const val = specifications[key];
              const display = Array.isArray(val) ? val.join(", ") : String(val || "");
              if (!display) return null;
              return (
                <div key={key} className="lp-spec-row">
                  <span className="lp-spec-key">{field.title}</span>
                  <span className="lp-spec-val">{display}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="lp-empty-block">
            <InfoIcon />
            <span>No Specifications Added</span>
          </div>
        )}
      </div>

      <div className="lp-divider" />

      {/* Shipping & Delivery Section */}
      <div className="lp-section">
        <h4 className="lp-section-title">Shipping & Delivery</h4>
        <div className="lp-row">
          <span className="lp-key">COD Availability</span>
          <span className="lp-val">
            {formData?.acceptCOD === "yes" ? "Cash on Delivery Available" : "Prepaid Only"}
          </span>
        </div>
        <div className="lp-row">
          <span className="lp-key">Return Policy</span>
          <span className="lp-val">
            {formData?.productReturn ? resolveProductReturnLabel(formData.productReturn) : "No Return Policy Set"}
          </span>
        </div>
        <div className="lp-row">
          <span className="lp-key">Shipping Weight</span>
          <span className={`lp-val ${!formData?.shippingWeight ? "lp-val--placeholder" : ""}`}>
            {formData?.shippingWeight ? `${formData.shippingWeight} kg` : "No Shipping Weight Added"}
          </span>
        </div>
        <div className="lp-row">
          <span className="lp-key">Stock Quantity</span>
          <span className="lp-val">{formData?.availableStock || 0} units</span>
        </div>
      </div>

      <div className="lp-divider" />

      {/* Promotion Information Section */}
      <div className="lp-section">
        <h4 className="lp-section-title">Promotion Information</h4>
        
        {/* Banner Preview */}
        <div className="lp-option-group">
          <span className="lp-option-label">Promotion Image:</span>
          {promotionImage ? (
            <div className="lp-promo-banner-wrap">
              <img src={resolveWixImage(typeof promotionImage === "object" ? promotionImage.url : promotionImage)} alt="Promotion Banner" className="lp-promo-banner" />
            </div>
          ) : (
            <div className="lp-empty-block lp-empty-block--inline">
              <span>No Promotion Image Uploaded</span>
            </div>
          )}
        </div>

        {/* Keywords */}
        <div className="lp-option-group" style={{ marginTop: 12 }}>
          <span className="lp-option-label">Keywords:</span>
          {keywords && keywords.length > 0 ? (
            <div className="lp-kw-chips">
              {keywords.map(kw => (
                <span key={kw} className="lp-kw-chip">{kw}</span>
              ))}
            </div>
          ) : (
            <div className="lp-empty-block lp-empty-block--inline">
              <span>No Keywords Added</span>
            </div>
          )}
        </div>

        {/* Sell and Earn */}
        {formData?.resellingProfit && parseFloat(formData.resellingProfit) > 0 ? (
          <div className="lp-promo-commission-box">
            <div className="lp-row">
              <span className="lp-key text-green-700">Sell & Earn Status</span>
              <span className="lp-val text-green-700 font-bold">Enabled</span>
            </div>
            <div className="lp-row">
              <span className="lp-key">Commission Profit</span>
              <span className="lp-val font-semibold">₹{formData.resellingProfit} per sale</span>
            </div>
          </div>
        ) : (
          <div className="lp-row">
            <span className="lp-key">Sell & Earn</span>
            <span className="lp-val lp-val--placeholder">Disabled</span>
          </div>
        )}
      </div>

      {/* Size Chart Section */}
      {sizeChartField && (
        <>
          <div className="lp-divider" />
          <div className="lp-section">
            <h4 className="lp-section-title">Size Chart</h4>
            {(() => {
              const key = sizeChartField.fieldId || sizeChartField.title;
              const val = specifications[key];
              if (val && val !== "__PENDING_FILE__") {
                const url = val.url || (typeof val === "string" ? val : null);
                return url ? (
                  <div className="lp-sizechart-wrap">
                    <img src={resolveWixImage(url)} alt="Size Chart" className="lp-sizechart" />
                  </div>
                ) : (
                  <div className="lp-empty-block">
                    <InfoIcon />
                    <span>No Size Chart Image Uploaded</span>
                  </div>
                );
              }
              return (
                <div className="lp-empty-block">
                  <InfoIcon />
                  <span>No Size Chart Image Uploaded</span>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
};

// Helper for Return policy display
const resolveProductReturnLabel = (v) => {
  return {
    return:             "7 Days Easy Return",
    no_return:          "No Return",
    exchange:           "7 Days Exchange",
    return_or_exchange: "7 Days Return or Exchange",
  }[v] || v;
};

export default LivePreview;
