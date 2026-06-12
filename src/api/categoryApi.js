// src/api/categoryApi.js

/* ─────────────────────────────────────────
   BASE ENDPOINTS
───────────────────────────────────────── */
const CATEGORY_API = "https://haatza.com/_functions/category";

const subUrl = (categoryId, page = 1, limit = 50) =>
  `https://www.haatza.com/_functions/subCategories?categoryId=${categoryId}&page=${page}&limit=${limit}`;

/* ─────────────────────────────────────────
   EXTRACT ARRAY — handles every envelope shape
───────────────────────────────────────── */
const extractArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const KEYS = [
    "items", "data", "results", "message",
    "subCategories", "subcategories", "categories",
  ];

  for (const k of KEYS) {
    const val = payload[k];
    if (Array.isArray(val)) return val;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const inner = extractArray(val);
      if (inner.length > 0) return inner;
    }
  }

  const firstArr = Object.values(payload).find(Array.isArray);
  return firstArr || [];
};

/* ─────────────────────────────────────────
   RESOLVE IMAGE URL
   Handles every Wix / HTTP image shape.

   Wix stores images as:
     wix:image://v1/<fileId>/<filename>#originWidth=W&originHeight=H
   The CDN URL is:
     https://static.wixstatic.com/media/<fileId>
   We also append /v1/fill/w_300,h_300,al_c,q_85,usm_0.66_1.00_0.01/<filename>
   for a properly-sized thumbnail so the image actually renders in the card.
───────────────────────────────────────── */
const resolveImageUrl = (rawImg) => {
  if (!rawImg) return null;

  // Unwrap object shapes: { url, src, imageUrl, uri, value }
  if (typeof rawImg === "object" && !Array.isArray(rawImg)) {
    const src =
      rawImg.url      || rawImg.src      || rawImg.imageUrl ||
      rawImg.uri      || rawImg.value    || rawImg.mediaUrl ||
      rawImg.filePath || null;
    return resolveImageUrl(src);
  }

  if (typeof rawImg !== "string") return null;

  const trimmed = rawImg.trim();
  if (!trimmed) return null;

  // ── wix:image://v1/<fileId>/<filename>#originWidth=...&originHeight=...
  if (trimmed.startsWith("wix:image://")) {
    // Remove the scheme prefix — handle both "v1/" and no version prefix
    const noScheme = trimmed.replace(/^wix:image:\/\/(?:v1\/)?/, "");
    // fileId is the first path segment; the rest is the display filename
    const [fileIdRaw, ...rest] = noScheme.split("/");
    const fileId = fileIdRaw.split("#")[0].split("?")[0];
    if (!fileId) return null;

    // Use the original filename (second segment) for the CDN path if present
    const displayName = rest.length
      ? rest.join("/").split("#")[0].split("?")[0]
      : "image.jpg";

    // Return a sized thumbnail via Wix Image API
    return `https://static.wixstatic.com/media/${fileId}/v1/fill/w_300,h_300,al_c,q_85,usm_0.66_1.00_0.01/${displayName}`;
  }

  // ── Plain HTTPS / HTTP URL — use as-is
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // ── Bare fileId (no scheme, no slashes) — prepend Wix CDN
  if (trimmed.length > 4 && !trimmed.includes(" ")) {
    return `https://static.wixstatic.com/media/${trimmed}`;
  }

  return null;
};

/* ─────────────────────────────────────────
   SCAN ALL KEYS of a raw item for any image-
   like value so we never miss a field name.
───────────────────────────────────────── */
const findImageInItem = (item) => {
  // Priority: explicit known names first
  const KNOWN = [
    "subCategoryImage", "subCategoryImg",
    "SubCategoryImage", "SubCategoryImg",
    "categoryImage",    "categoryImg",
    "CategoryImage",    "CategoryImg",
    "image",            "imageUrl",
    "ImageUrl",         "img",
    "thumbnail",        "photo",
    "icon",             "coverImage",
    "bannerImage",      "mediaUrl",
    "pictureUrl",       "picture",
    "logo",             "logoUrl",
  ];

  for (const key of KNOWN) {
    if (item[key]) {
      const resolved = resolveImageUrl(item[key]);
      if (resolved) return resolved;
    }
  }

  // Fallback: scan every key whose value looks like an image reference
  for (const [key, val] of Object.entries(item)) {
    if (!val) continue;
    const isImageKey = /image|img|photo|thumb|icon|logo|media|picture|banner|cover/i.test(key);
    if (!isImageKey) continue;
    const resolved = resolveImageUrl(val);
    if (resolved) return resolved;
  }

  return null;
};

/* ─────────────────────────────────────────
   NORMALISE one category item
───────────────────────────────────────── */
const normaliseCategory = (item, index) => {
  if (index === 0) {
    console.log("🗂️ [CAT raw item keys]:", Object.keys(item));
    console.log("🗂️ [CAT raw item]:", JSON.stringify(item, null, 2));
  }

  const name =
    item.categoryName || item.CategoryName ||
    item.name         || item.title        || "Unnamed";

  const id =
    item.categoryId || item.CategoryID ||
    item.CategoryId || item._id        ||
    item.id         || `cat-${index}`;

  const imageUrl = findImageInItem(item);

  if (index < 3) {
    console.log(`🗂️ [CAT item[${index}]] name="${name}" imageUrl="${imageUrl}"`);
  }

  return {
    name,
    CategoryID: String(id),
    uniqueKey:  `${id}-${index}`,
    imageUrl,
    // keep original fields intact for any downstream consumers
    ...item,
    // but our normalised fields win
    name,
    CategoryID: String(id),
    imageUrl,
  };
};

/* ─────────────────────────────────────────
   NORMALISE one subcategory item

   FIX: categoryName and categoryId are resolved from every possible
   key the Haatza backend might use. These two fields are critical —
   they are read in SelectCategory.jsx when navigating to product-info
   so that the breadcrumb always shows the sub's TRUE parent category,
   not whichever category page the user happened to be browsing.

   Key names checked (all casing variants seen in the wild):
     categoryName  CategoryName  category_name
     categoryId    CategoryID    CategoryId    category_id
     parentCategory  parentCategoryName  parent
───────────────────────────────────────── */
const normaliseSubcategory = (item, index) => {
  if (index === 0) {
    console.log("📦 [SUB raw item keys]:", Object.keys(item));
    console.log("📦 [SUB raw item]:", JSON.stringify(item, null, 2));
  }

  const name =
    item.subCategoryName || item.SubCategoryName ||
    item.subCategory     || item.SubCategory     ||
    item.name            || item.title           || "Unnamed";

  const id =
    item.subCategoryId || item.SubCategoryID ||
    item.subCategoryID || item._id           ||
    item.id            || `sub-${index}`;

  const imageUrl = findImageInItem(item);

  // ── Resolve the sub's TRUE parent category name ──────────────────
  // Check every key variant the backend might send.
  // The resolved value is stored as `categoryName` on the normalised
  // object so SelectCategory.jsx can read sub.categoryName directly.
  const resolvedCategoryName =
    item.categoryName      ||
    item.CategoryName      ||
    item.category_name     ||
    item.parentCategory    ||
    item.parentCategoryName||
    item.parent            ||
    "";

  // ── Resolve the sub's TRUE parent category ID ────────────────────
  const resolvedCategoryId =
    item.categoryId   ||
    item.CategoryID   ||
    item.CategoryId   ||
    item.category_id  ||
    item.parentId     ||
    item.parentCategoryId ||
    "";

  if (index < 3) {
    console.log(
      `📦 [SUB item[${index}]] name="${name}" ` +
      `categoryName="${resolvedCategoryName}" categoryId="${resolvedCategoryId}" ` +
      `imageUrl="${imageUrl}"`
    );
  }

  // ── Return a clean, stable shape ─────────────────────────────────
  // No `...item` spread here — we don't want raw field name collisions
  // to clobber our resolved categoryName / categoryId.
  return {
    name,
    SubCategoryID: String(id),
    uniqueKey:     `${id}-${index}`,
    categoryId:    String(resolvedCategoryId),
    categoryName:  resolvedCategoryName,
    imageUrl,
  };
};

/* ═══════════════════════════════════════════
   PUBLIC EXPORTS
═══════════════════════════════════════════ */

/* ── fetchCategories ── */
export const fetchCategories = async () => {
  try {
    const res = await fetch(CATEGORY_API);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log("🗂️ [fetchCategories] top-level keys:", Object.keys(data));

    const raw = Array.isArray(data.message) ? data.message : extractArray(data);
    console.log(`🗂️ [fetchCategories] raw array length: ${raw.length}`);

    return raw.map(normaliseCategory);
  } catch (err) {
    console.error("[fetchCategories]", err);
    return [];
  }
};

/* ── fetchSubcategoriesFirstPage ──
   Fetches page 1 (up to 50 items) and returns items + hasMore flag.
*/
export const fetchSubcategoriesFirstPage = async (categoryId) => {
  const cleanId = String(categoryId ?? "").trim();
  console.log(`[fetchSubcategoriesFirstPage] categoryId="${cleanId}"`);

  try {
    const res = await fetch(subUrl(cleanId, 1, 50));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    console.log(`📡 [fetchSubcategoriesFirstPage] top-level keys:`, Object.keys(data));

    const raw        = extractArray(data);
    console.log(`📡 [fetchSubcategoriesFirstPage] raw array length: ${raw.length}`);

    const normalised = raw.map(normaliseSubcategory);
    console.log(`[fetchSubcategoriesFirstPage] → ${normalised.length} subcategories`);

    return {
      items:   normalised,
      hasMore: normalised.length === 50,
    };
  } catch (err) {
    console.error("[fetchSubcategoriesFirstPage]", err);
    return { items: [], hasMore: false };
  }
};

/* ── fetchSubcategoriesPaged ──
   Fetches any page. Returns { items, hasMore }.
   hasMore = true  → backend returned a full page of 50, so a next page likely exists.
   hasMore = false → backend returned fewer than 50, meaning this is the last page.
*/
export const fetchSubcategoriesPaged = async (categoryId, page = 1, limit = 50) => {
  const cleanId = String(categoryId ?? "").trim();
  console.log(`[fetchSubcategoriesPaged] categoryId="${cleanId}" page=${page}`);

  try {
    const res = await fetch(subUrl(cleanId, page, limit));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const raw        = extractArray(data);
    const normalised = raw.map(normaliseSubcategory);
    console.log(`[fetchSubcategoriesPaged] page=${page} → ${normalised.length} items`);

    return {
      items:   normalised,
      hasMore: normalised.length === limit,
    };
  } catch (err) {
    console.error("[fetchSubcategoriesPaged]", err);
    return { items: [], hasMore: false };
  }
};



/* ── fetchSubcategories — alias for backwards compat ── */
export const fetchSubcategories = fetchSubcategoriesFirstPage;

/* ── searchCategories ── */
export const searchCategories = async (query = "") => {
  try {
    const url =
      `https://haatza.com/_functions/subcategorylist` +
      `?page=1&count=10&search=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const items = extractArray(data);
    const seen  = new Set();

    return items
      .filter((item) => {
        const cid = item.categoryId || item.CategoryID;
        if (!cid || seen.has(cid)) return false;
        seen.add(cid);
        return true;
      })
      .map((item, i) => ({
        CategoryID: item.categoryId || item.CategoryID,
        name:       item.categoryName || item.CategoryName || "Unnamed",
        uniqueKey:  `cat-s-${i}`,
      }));
  } catch (err) {
    console.error("[searchCategories]", err);
    return [];
  }
};

/* ── rankByRelevance ──────────────────────────────────────────────────
   The backend API matches on any word overlap, so searching "Men's
   Jumpsuits" also returns "Women's Jumpsuits" (both contain "Jumpsuits").
   We re-rank and filter client-side so results that actually contain
   ALL of the user's query words score highest, and results that only
   share a partial overlap are pushed down or removed.

   Scoring tiers (higher = better):
     4  Exact full-string match          "men's jumpsuits" === name
     3  Name STARTS WITH the query       "men's jump..."
     2  Name CONTAINS the full query     "...men's jumpsuits..."
     1  ALL query words found in name    every word present
     0  FILTERED OUT                     not all words present
──────────────────────────────────────────────────────────────────── */
/* wordMatch — whole-word boundary check (case-insensitive).
   Prevents "men's" matching inside "women's" since the substring
   "men" is preceded by "wo" which is a letter, not a boundary.      */
export const normalizeSearchText = (text = "") => {
  return text
    .toLowerCase()

    // remove apostrophes
    .replace(/['’`]/g, "")

    // t-shirt => tshirt
    .replace(/-/g, "")

    // replace &
    .replace(/&/g, " and ")

    // remove special chars
    .replace(/[^a-z0-9\s]/g, " ")

    // remove extra spaces
    .replace(/\s+/g, " ")

    .trim();
};
const rankByRelevance = (items, query) => {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return items;

  const queryWords = normalizedQuery.split(" ");

  const scored = items
    .map((item) => {
      const normalizedName = normalizeSearchText(item.name || "");

      // split words
      const nameWords = normalizedName.split(" ");

      const allWordsMatch = queryWords.every((queryWord) => {
        return nameWords.some((nameWord) => {
          if ((queryWord === "men" || queryWord === "mens") && (nameWord.includes("women") || nameWord.includes("womens"))) {
            return false;
          }
          return nameWord.startsWith(queryWord) || nameWord.includes(queryWord);
        });
      });

      // reject completely
      if (!allWordsMatch) {
        return null;
      }

      let score = 0;

      // EXACT
      if (normalizedName === normalizedQuery) {
        score = 100;
      }

      // WORD START MATCH
      else {
        const startsCorrectly = queryWords.every(
          (word, index) => {
            return nameWords[index]?.startsWith(word) || nameWords[index]?.includes(word);
          }
        );

        if (startsCorrectly) {
          score = 80;
        } else {
          score = 60;
        }
      }

      return {
        item,
        score,
      };
    })
    .filter(Boolean);

  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.item);
};

/* ── searchSubcategories ──
   Global search across ALL subcategories regardless of which category
   page the user is currently on. Endpoint:
     https://haatza.com/_functions/subcategorylist?page=1&count=20&search=<query>
   No categoryId filtering — "Herbal Tea" surfaced from "Grocery" even
   when the user is browsing "Men's Fashion".
   Results are re-ranked client-side so only genuinely matching items
   are shown (all query words must appear in the subcategory name).

   IMPORTANT: each returned sub object carries `.categoryName` and
   `.categoryId` (its real parent) via normaliseSubcategory, so the
   product-info breadcrumb always shows the correct category path.
*/
export const searchSubcategories = async (
  query = "",
  _categoryId = null
) => {
  try {
    const normalizedQuery = normalizeSearchText(query);

    const url =
      `https://haatza.com/_functions/subcategorylist` +
      `?page=1&count=100&search=${encodeURIComponent(query.trim())}`;

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    /* API DATA */
    const raw = extractArray(data).map(normaliseSubcategory);

    /* STRICT FRONTEND FILTER */
    const filtered = rankByRelevance(raw, normalizedQuery);

    return filtered;

  } catch (err) {
    console.error("[searchSubcategories]", err);

    return [];
  }
};