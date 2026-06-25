import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import sellerService, { resolveWixImage, resolveSellerId } from "../../../services/sellerService";

const LIMIT = 10;

const parseNumber = (val) => {
  const parsed = Number(val);
  return isNaN(parsed) ? 0 : Math.round(parsed);
};

export const useInventoryViewModel = (sellerId) => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const inventory = inventoryItems;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search state (raw input and debounced search term)
  const [searchRaw, setSearchRaw] = useState("");
  const [search, setSearch] = useState("");
  
  // Pagination and filter states
  const [page, setPage] = useState(1);
  const currentPage = page;
  const setCurrentPage = setPage;

  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("in_stock"); // default to In Stock tab

  // Batch update states
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const debounceRef = useRef(null);
  const isRefetchingRef = useRef(false);

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
    const isDev = process.env.NODE_ENV !== "production";
    const resolvedSellerId = sellerId || resolveSellerId();
    if (isDev) {
      console.log("[InventoryPage] Seller ID", resolvedSellerId);
      console.log("[InventoryPage] API Params", { sellerId: resolvedSellerId, page, searchText: search });
    }
    try {
      const response = await sellerService.getSellerProductInventory({ 
        sellerId: resolvedSellerId, 
        page, 
        searchText: search, 
        signal 
      });
      
      const inventoryItemsResponse = response?.inventoryItems || [];
      const totalItemsVal = Number(response?.totalItems || 0);
      const currentPageVal = Number(response?.currentPage || page);
      const totalPagesVal = Number(response?.totalPages || 1);

      const rows = inventoryItemsResponse.flatMap((item) => {
        const variants = Array.isArray(item.variants) && item.variants.length
          ? item.variants
          : [{
              variantId: item.variantId || item.id || "",
              quantity: parseNumber(item.stock !== undefined ? item.stock : (item.quantity !== undefined ? item.quantity : 0)),
              inStock: item.inStock !== undefined ? item.inStock : (item.stock > 0),
              variant: item.variant || "Standard"
            }];

        return variants.map((variant) => {
          const originalQuantity = parseNumber(
            variant?.quantity ??
            variant?.stock?.quantity ??
            variant?.stock ??
            0
          );

          return {
            rowId: `${item.productId || item.externalId || "prod"}-${variant.variantId || "default"}`,
            id: (item.variants && item.variants.length) 
              ? `${item.productId}-${variant.variantId || "default"}`
              : (item.id || `${item.productId}-${variant.variantId || "default"}`),
            productId: item.productId || item.externalId || "-",
            externalId: item.externalId || "-",
            productName: item.productName || "-",
            image: resolveWixImage(item.mainMedia) || resolveWixImage(item.image) || item.mainMedia || item.image || "",
            variantId: variant.variantId || "-",
            originalQuantity,
            editedQuantity: originalQuantity,
            inStock: Boolean(variant?.inStock ?? variant?.stock?.inStock),
            stockStatus:
              originalQuantity <= 0 ? "Out of Stock" :
              originalQuantity <= 5 ? "Low Stock" :
              "In Stock",
              
            // Legacy / UI properties
            name: item.productName || item.name || "-",
            variant: variant.variant || variant.variantId || "Standard",
            stock: originalQuantity,
            status: originalQuantity <= 0 ? "Out of Stock" :
                    originalQuantity <= 5 ? "Low Stock" :
                    "In Stock"
          };
        });
      });

      if (isDev) {
        if (isRefetchingRef.current) {
          console.log("[InventoryPage] Refetch Response", response);
          isRefetchingRef.current = false;
        } else {
          console.log("[InventoryPage] Raw API Response", response);
        }
        console.log("[InventoryPage] inventoryItems", response?.inventoryItems);
        console.log("[InventoryPage] mappedRows", rows);
      }

      setInventoryItems(rows);
      setTotalItems(totalItemsVal);
      setCurrentPage(currentPageVal);
      setTotalPages(totalPagesVal);
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError" || err.message === "canceled") {
        return; // Request was aborted, ignore error setting
      }
      console.error("[Inventory] Error", err);
      setError("Unable to load inventory. Please try again.");
      setInventoryItems([]);
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

  // Compute pending changed rows
  const changedRows = useMemo(() => {
    return inventoryItems.filter((row) => row.editedQuantity !== row.originalQuantity);
  }, [inventoryItems]);

  useEffect(() => {
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev && changedRows.length > 0) {
      console.log("[InventoryPage] Changed Rows detected:", changedRows);
    }
  }, [changedRows]);

  const totalProduct = useMemo(() => {
    return new Set(changedRows.map((row) => row.productId)).size;
  }, [changedRows]);

  const totalVariant = changedRows.length;

  // Calculate stats dynamically based on the current dataset
  const inStockCount = useMemo(() => inventoryItems.filter((item) => item.originalQuantity > 0 || item.inStock).length, [inventoryItems]);
  const outOfStockCount = useMemo(() => inventoryItems.filter((item) => !(item.originalQuantity > 0 || item.inStock)).length, [inventoryItems]);

  // Handle local-only increment
  const handleIncrement = (rowId) => {
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.rowId === rowId || item.id === rowId
          ? { ...item, editedQuantity: item.editedQuantity + 1 }
          : item
      )
    );
  };

  // Handle local-only decrement
  const handleDecrement = (rowId) => {
    setInventoryItems((prev) =>
      prev.map((item) =>
        (item.rowId === rowId || item.id === rowId) && item.editedQuantity > 0
          ? { ...item, editedQuantity: Math.max(0, item.editedQuantity - 1) }
          : item
      )
    );
  };

  // Handle Batch update submission
  const handleUpdateInventory = async () => {
    setUpdating(true);
    setError(null);
    const isDev = process.env.NODE_ENV !== "production";
    const resolvedSellerId = sellerId || resolveSellerId();

    if (isDev) {
      console.log("[InventoryPage] Original Rows", inventoryItems.map(r => ({ rowId: r.rowId, quantity: r.originalQuantity })));
      console.log("[InventoryPage] Edited Rows", inventoryItems.map(r => ({ rowId: r.rowId, quantity: r.editedQuantity })));
      console.log("[InventoryPage] Changed Rows", changedRows);
      console.log("[InventoryPage] Update Summary", { totalProduct, totalVariant });
    }

    try {
      const promises = changedRows.map(async (row) => {
        const diff = Math.abs(row.editedQuantity - row.originalQuantity);
        if (diff === 0) return;

        const targetVariantId = row.variantId && row.variantId !== "-" ? row.variantId : row.id;
        
        if (row.editedQuantity > row.originalQuantity) {
          if (isDev) {
            console.log("[InventoryPage] Increment Payload", {
              sellerId: resolvedSellerId,
              productId: row.productId,
              variantId: targetVariantId,
              quantity: diff
            });
          }
          const res = await sellerService.incrementInventory(resolvedSellerId, row.productId, targetVariantId, diff);
          if (isDev) {
            console.log("[InventoryPage] Update Response", res);
          }
        } else {
          if (isDev) {
            console.log("[InventoryPage] Decrement Payload", {
              sellerId: resolvedSellerId,
              productId: row.productId,
              variantId: targetVariantId,
              quantity: diff
            });
          }
          const res = await sellerService.decrementInventory(resolvedSellerId, row.productId, targetVariantId, diff);
          if (isDev) {
            console.log("[InventoryPage] Update Response", res);
          }
        }
      });

      await Promise.all(promises);

      // Successfully updated all changes
      setSuccessMessage("Inventory updated successfully.");
      isRefetchingRef.current = true;
      setShowConfirmation(false);
      await loadInventory();
    } catch (err) {
      console.error("[useInventoryViewModel] Batch update failed:", err);
      setError(err.message || "Failed to update some inventory items.");
    } finally {
      setUpdating(false);
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
    return inventoryItems.filter((item) => {
      // 1. Status filter
      let matchesStatus = true;
      if (statusFilter === "in_stock") {
        matchesStatus = item.originalQuantity > 0 || item.inStock;
      } else if (statusFilter === "out_of_stock") {
        matchesStatus = !(item.originalQuantity > 0 || item.inStock);
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
  }, [inventoryItems, statusFilter, searchRaw]);

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
    
    // Batch updates
    changedRows,
    showConfirmation,
    setShowConfirmation,
    updating,
    successMessage,
    setSuccessMessage,
    handleUpdateInventory,
    totalProduct,
    totalVariant
  };
};
