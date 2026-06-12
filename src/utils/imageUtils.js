// src/utils/imageUtils.js

/**
 * Transforms Wix image URLs to HTTPS-accessible URLs.
 * Wix stores images as: wix:image://v1/<fileId>/<filename>#originWidth=W&originHeight=H
 * The CDN URL format is: https://static.wixstatic.com/media/<fileId>
 */
export const transformWixImageUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  // Already a valid HTTPS URL
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  // Handle wix:image://v1/<fileId>/...
  if (url.startsWith("wix:image://")) {
    // Remove protocol prefix
    const withoutProtocol = url.replace("wix:image://v1/", "");
    // fileId is everything before the first "/"
    const fileId = withoutProtocol.split("/")[0];
    if (fileId) {
      return `https://static.wixstatic.com/media/${fileId}`;
    }
  }

  // Handle bare wixstatic paths
  if (url.startsWith("media/")) {
    return `https://static.wixstatic.com/${url}`;
  }

  return null;
};

/**
 * Resolves any image shape returned by the API into a usable HTTPS URL.
 * Handles: string URLs, wix:image:// URIs, and objects with url/src/image fields.
 */
export const resolveImgUrl = (img) => {
  if (!img) return null;

  if (typeof img === "string") {
    return transformWixImageUrl(img);
  }

  // Object shapes from Wix API
  const raw =
    img.url ||
    img.src ||
    img.image ||
    img.imageUrl ||
    img.mediaUrl ||
    img.fileUrl ||
    (img.media && img.media.url) ||
    null;

  return raw ? transformWixImageUrl(raw) : null;
};

/**
 * Normalizes productOptions to always be an array.
 * API may return an array or a keyed object like { "0": {...}, "1": {...} }.
 */
export const normalizeArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "object") return Object.values(val);
  return [];
};

/**
 * Resolves keywords to a string array.
 */
export const resolveKeywords = (kw) => {
  if (!kw) return [];
  if (Array.isArray(kw))
    return kw.map((k) => (typeof k === "string" ? k : String(k))).filter(Boolean);
  if (typeof kw === "string")
    return kw.split(",").map((k) => k.trim()).filter(Boolean);
  return [];
};