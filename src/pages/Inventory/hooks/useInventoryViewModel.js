import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import sellerService, { resolveWixImage } from "../../../services/sellerService";

const LIMIT = 10;

// Safe response normalization helper to handle any API response structure
const normalizeInventoryResponse = (data) => {
  if (!data) return { items: [], totalItems: 0 };

  // If data is directly an array
  if (Array.isArray(data)) {
    return { items: data, totalItems: data.length };
  }

  // Look for totalItems in nested data
  let totalItems = 0;
  const totalFields = ["totalItems", "total", "count", "total_items"];
  for (const field of totalFields) {
    if (data[field] !== undefined) {
      totalItems = Number(data[field]);
      break;
    }
    if (data.data && data.data[field] !== undefined) {
      totalItems = Number(data.data[field]);
      break;
    }
    if (data.message && data.message[field] !== undefined) {
      totalItems = Number(data.message[field]);
      break;
    }
  }

  // Try to find the items list in typical field names
  const arrayFields = [
    "inventoryItems",
    "inventory",
    "items",
    "products",
    "data",
    "result",
    "results"
  ];

  // Check top-level fields
  for (const field of arrayFields) {
    if (Array.isArray(data[field])) {
      return { items: data[field], totalItems: totalItems || data[field].length };
    }
  }

  // Check nested in data/message/body
  const nestedObjects = ["data", "message", "body"];
  for (const nest of nestedObjects) {
    if (data[nest] && typeof data[nest] === "object") {
      if (Array.isArray(data[nest])) {
        return { items: data[nest], totalItems: totalItems || data[nest].length };
      }
      for (const field of arrayFields) {
        if (Array.isArray(data[nest][field])) {
          return { items: data[nest][field], totalItems: totalItems || data[nest][field].length };
        }
      }
    }
  }

  // If no array found but data itself has nested properties, look for any array values
  const anyArray = Object.values(data).find(Array.isArray);
  if (anyArray) {
    return { items: anyArray, totalItems: totalItems || anyArray.length };
  }

  return { items: [], totalItems: 0 };
};

export const useInventoryViewModel = (sellerId) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search state (raw input and debounced search term)
  const [searchRaw, setSearchRaw] = useState("");
  const [search, setSearch] = useState("");
  
  // Pagination and filter states
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState("in_stock"); // default to In Stock tab
  const [categoryFilter, setCategoryFilter] = useState("all");

  const debounceRef = useRef(null);

  // Debounced search handler
  const handleSearchChange = (val) => {
    setSearchRaw(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val.trim());
      setPage(1); // Reset page to 1 when search query changes
    }, 350);
  };

  // Fetch Inventory from API
  const loadInventory = useCallback(async (signal = null) => {
    setLoading(true);
    setError(null);
    try {
      const data = await sellerService.getSellerProductInventory({ 
        sellerId, 
        page, 
        searchText: search, 
        signal 
      });
      
      const { items: rawItems, totalItems: itemsCount } = normalizeInventoryResponse(data);

      setTotalItems(itemsCount);

      // Map backend fields safely to frontend schema
      const mappedItems = [];
      rawItems.forEach((product, prodIndex) => {
        if (!product || typeof product !== "object") return;
        const pId = product.productId || product.externalId || product.id || product._id || "";
        const pName = product.productName || product.name || "Unnamed Product";
        
        const media = product.mainMedia || product.mainmedia || product.mainImage || product.image || "";
        const pImg = resolveWixImage(media) || media || "";
        
        const pCat = product.category || product.categoryName || "General";
        const variants = Array.isArray(product.variants) ? product.variants : [];

        if (variants.length === 0) {
          const id = product.id || product._id || product.variantId || `inv-${prodIndex}-${Date.now()}`;
          const variantName = product.variant || product.variantName || product.size || product.choices?.Size || "Standard";
          const sku = product.sku || `SKU-${id}`;
          const stock = Number(
            product.quantity !== undefined
              ? product.quantity
              : (product.stock?.quantity !== undefined
                  ? product.stock.quantity
                  : (product.stock !== undefined ? product.stock : (product.inventoryQuantity !== undefined ? product.inventoryQuantity : 0)))
          );
          mappedItems.push({
            id,
            productId: pId,
            name: pName,
            variant: variantName,
            sku,
            stock,
            category: pCat,
            image: pImg,
          });
        } else {
          variants.forEach((v, vIndex) => {
            if (!v || typeof v !== "object") return;
            const id = v.variantId || v.id || v._id || `var-${prodIndex}-${vIndex}-${Date.now()}`;
            const variantName =
              v.choices?.Size ||
              v.choices?.size ||
              v.variant ||
              v.size ||
              v.variantName ||
              (v.choices ? Object.values(v.choices).join(" / ") : "") ||
              "Standard";
            
            const sku = v.sku || product.sku || `SKU-${id}`;
            const stock = Number(
              v.quantity !== undefined
                ? v.quantity
                : (v.stock?.quantity !== undefined
                    ? v.stock.quantity
                    : (v.stock !== undefined ? v.stock : (v.inventoryQuantity !== undefined ? v.inventoryQuantity : 0)))
            );
            
            mappedItems.push({
              id,
              productId: pId,
              name: pName,
              variant: variantName,
              sku,
              stock,
              category: pCat,
              image: pImg,
            });
          });
        }
      });

      setInventory(mappedItems);
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError" || err.message === "canceled") {
        return; // Request was aborted, ignore error setting
      }
      console.warn("[Inventory API Failed]", err.response?.status, err.response?.data || err.message);
      setError("Unable to load inventory. Please try again.");
      setInventory([]);
      setTotalItems(0);
    } finally {
      // Only set loading false if not aborted
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [sellerId, page, search]);

  useEffect(() => {
    const controller = new AbortController();
    loadInventory(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadInventory]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Calculate unique categories dynamically
  const categories = useMemo(() => {
    return Array.from(new Set(inventory.map((item) => item.category).filter(Boolean)));
  }, [inventory]);

  // Calculate stats dynamically based on the current dataset and server totalItems
  const stats = useMemo(() => {
    const uniqueProducts = new Set(inventory.map((item) => item.name));
    const totalProducts = Math.max(uniqueProducts.size, totalItems);
    const totalVariants = inventory.length;
    const inStockVariants = inventory.filter((item) => item.stock > 0).length;
    const outOfStockVariants = inventory.filter((item) => item.stock === 0).length;

    return {
      totalProducts,
      totalVariants,
      inStockVariants,
      outOfStockVariants,
    };
  }, [inventory, totalItems]);

  // Handle quantity save action for a row
  const handleSaveQuantity = async (id, newQty) => {
    const item = inventory.find((x) => x.id === id);
    if (!item) return;

    try {
      setError(null);
      const delta = newQty - item.stock;
      if (delta === 0) return;

      const absQty = Math.abs(delta);
      if (delta > 0) {
        await sellerService.incrementInventory(sellerId, item.productId, item.id, absQty);
      } else {
        await sellerService.decrementInventory(sellerId, item.productId, item.id, absQty);
      }

      setInventory((prev) =>
        prev.map((x) => (x.id === id ? { ...x, stock: newQty } : x))
      );
    } catch (err) {
      console.error("[useInventoryViewModel] Save failed:", err);
      setError(err.message || "Failed to update inventory quantity on the server.");
      throw err; // bubble up if needed
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setSearchRaw("");
    setSearch("");
    setStatusFilter("in_stock");
    setCategoryFilter("all");
    setPage(1);
    loadInventory();
  }, [loadInventory]);

  // Filter items based on dropdown filters and tab selection
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      // 1. Status filter
      let matchesStatus = true;
      if (statusFilter === "in_stock") {
        matchesStatus = item.stock > 0;
      } else if (statusFilter === "out_of_stock") {
        matchesStatus = item.stock === 0;
      }

      // 2. Category filter
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      return matchesStatus && matchesCategory;
    });
  }, [inventory, statusFilter, categoryFilter]);

  const totalPages = Math.ceil(totalItems / LIMIT);

  return {
    inventory,
    filteredItems,
    loading,
    error,
    setError,
    searchRaw,
    handleSearchChange,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    categories,
    stats,
    handleSaveQuantity,
    handleRefresh,
    page,
    setPage,
    totalPages,
    totalItems,
    limit: LIMIT,
  };
};
