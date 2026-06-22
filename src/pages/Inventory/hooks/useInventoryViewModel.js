import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import sellerService, { resolveWixImage } from "../../../services/sellerService";

const LIMIT = 10;

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
    const url = `https://haatza.com/_functions/sellerproductInventory?sellerId=${sellerId}&page=${page}&searchText=${search}`;
    console.log("[Inventory] sellerId", sellerId);
    console.log("[Inventory] Fetch URL", url);
    try {
      const response = await sellerService.getSellerProductInventory({ 
        sellerId, 
        page, 
        searchText: search, 
        signal 
      });
      
      console.log("[Inventory] Raw Response", response);

      const items = response?.inventoryItems || [];
      const totalItemsVal = response?.totalItems ?? 0;

      console.log("[Inventory] inventoryItems count", items.length);
      console.log("[Inventory] totalItems", totalItemsVal);

      setTotalItems(totalItemsVal);

      // Map backend fields safely to frontend schema
      const mappedItems = [];
      items.forEach((item, index) => {
        if (!item || typeof item !== "object") return;
        
        const pId = item.productId || item.externalId || item.id || item.productId || "";
        const pName = item.productName || item.name || item.title || "Unnamed Product";
        
        const media = item.image || item.productImage || item.imageUrl || (Array.isArray(item.media) ? item.media[0] : item.media) || "";
        const pImg = resolveWixImage(media) || media || "";

        const variantName = item.variant || item.size || item.variantName || item.options?.size || "Standard";
        const sku = item.sku || "";
        
        const stock = Number(
          item.stock !== undefined
            ? item.stock
            : (item.quantity !== undefined
                ? item.quantity
                : (item.currentStock !== undefined
                    ? item.currentStock
                    : (item.inventory !== undefined ? item.inventory : 0)))
        );

        const id = item.id || item.variantId || item.variant_id || item._id || `inv-${index}-${Date.now()}`;

        mappedItems.push({
          id,
          productId: pId,
          name: pName,
          variant: variantName,
          sku,
          stock,
          image: pImg,
        });
      });

      setInventory(mappedItems);
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError" || err.message === "canceled") {
        return; // Request was aborted, ignore error setting
      }
      console.error("[Inventory] Error", err);
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

  // Reset page to 1 on status tab change
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Calculate stats dynamically based on the current dataset
  const inStockCount = useMemo(() => inventory.filter((item) => item.stock > 0).length, [inventory]);
  const outOfStockCount = useMemo(() => inventory.filter((item) => item.stock === 0).length, [inventory]);

  // Handle immediate increment
  const handleIncrement = async (id) => {
    const item = inventory.find((x) => x.id === id);
    if (!item) return;

    // Optimistically increment stock locally
    setInventory((prev) =>
      prev.map((x) => (x.id === id ? { ...x, stock: x.stock + 1 } : x))
    );

    try {
      setError(null);
      await sellerService.incrementInventory(sellerId, item.productId, item.id, 1);
    } catch (err) {
      console.error("[useInventoryViewModel] Increment failed:", err);
      setError(err.message || "Failed to increment stock.");
      // Rollback on failure
      setInventory((prev) =>
        prev.map((x) => (x.id === id ? { ...x, stock: Math.max(0, x.stock - 1) } : x))
      );
    }
  };

  // Handle immediate decrement
  const handleDecrement = async (id) => {
    const item = inventory.find((x) => x.id === id);
    if (!item || item.stock <= 0) return;

    // Optimistically decrement stock locally
    setInventory((prev) =>
      prev.map((x) => (x.id === id ? { ...x, stock: Math.max(0, x.stock - 1) } : x))
    );

    try {
      setError(null);
      await sellerService.decrementInventory(sellerId, item.productId, item.id, 1);
    } catch (err) {
      console.error("[useInventoryViewModel] Decrement failed:", err);
      setError(err.message || "Failed to decrement stock.");
      // Rollback on failure
      setInventory((prev) =>
        prev.map((x) => (x.id === id ? { ...x, stock: x.stock + 1 } : x))
      );
    }
  };

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setSearchRaw("");
    setSearch("");
    setStatusFilter("in_stock");
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

      // 2. Local search filter (product name, variant/size)
      const query = (searchRaw || "").toLowerCase().trim();
      let matchesSearch = true;
      if (query) {
        matchesSearch =
          (item.name || "").toLowerCase().includes(query) ||
          (item.variant || "").toLowerCase().includes(query);
      }

      return matchesStatus && matchesSearch;
    });
  }, [inventory, statusFilter, searchRaw]);

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
    inStockCount,
    outOfStockCount,
    handleIncrement,
    handleDecrement,
    handleRefresh,
    page,
    setPage,
    totalPages,
    totalItems,
    limit: LIMIT,
  };
};
