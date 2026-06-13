import React, { useState, useEffect, useMemo, useCallback } from "react";
import InventoryStats from "./components/InventoryStats";
import InventoryFilters from "./components/InventoryFilters";
import InventoryTable from "./components/InventoryTable";
import { getSellerId } from "../../utils/sellerSession";
import { sellerService } from "../../services/sellerService";
import { resolveWixImage } from "../../api/listingApi";
import "./InventoryPage.css";

const InventoryPage = () => {
  const sellerId = useMemo(() => getSellerId(), []);
  
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("in_stock"); // default to In Stock tab
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Load Inventory from API
  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sellerService.fetchInventoryData(sellerId);
      
      // Safe nested response structure parsing as requested
      const rawItems =
        data?.inventoryItems ||
        data?.message?.inventoryItems ||
        data?.message?.body?.inventoryItems ||
        data?.message?.data ||
        data?.data ||
        [];
        
      // Print temporary debug logs as requested
      console.log("SELLER ID:", sellerId);
      console.log("INVENTORY API RESPONSE:", data);
      console.log("RAW INVENTORY ITEMS:", rawItems);

      // Map backend fields safely to frontend schema
      const mappedItems = [];
      rawItems.forEach((product, prodIndex) => {
        if (!product) return;
        const pId = product.productId || product.externalId || "";
        const pName = product.productName || product.name || "Unnamed Product";
        
        const media = product.mainMedia || product.mainmedia || product.mainImage || product.image || "";
        const pImg = resolveWixImage(media) || media || "";
        
        const pCat = product.category || product.categoryName || "General";
        const variants = product.variants || [];

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
            if (!v) return;
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
      console.error("[InventoryPage] API loading failed:", err);
      setError(err.message || "Could not load inventory from the backend server.");
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Calculate unique categories dynamically
  const categories = useMemo(() => {
    return Array.from(new Set(inventory.map((item) => item.category).filter(Boolean)));
  }, [inventory]);

  // Calculate stats dynamically based on the current dataset
  const stats = useMemo(() => {
    const uniqueProducts = new Set(inventory.map((item) => item.name));
    const totalProducts = uniqueProducts.size;
    const totalVariants = inventory.length;
    const inStockVariants = inventory.filter((item) => item.stock > 0).length;
    const outOfStockVariants = inventory.filter((item) => item.stock === 0).length;

    return {
      totalProducts,
      totalVariants,
      inStockVariants,
      outOfStockVariants,
    };
  }, [inventory]);

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
      console.error("[InventoryPage] Save failed:", err);
      setError(err.message || "Failed to update inventory quantity on the server.");
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setSearch("");
    setStatusFilter("in_stock");
    setCategoryFilter("all");
    loadInventory();
  };

  // Filter items based on search query, dropdown filters, and tab selection
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      // 1. Search filter
      const matchesSearch =
        search.trim() === "" ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.variant.toLowerCase().includes(search.toLowerCase());

      // 2. Status filter
      let matchesStatus = true;
      if (statusFilter === "in_stock") {
        matchesStatus = item.stock > 0;
      } else if (statusFilter === "out_of_stock") {
        matchesStatus = item.stock === 0;
      }

      // 3. Category filter
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [inventory, search, statusFilter, categoryFilter]);

  return (
    <div className="inv-page-root">
      <div className="inv-page-header">
        <h1>Inventory</h1>
        <p>Manage product variants, stock levels, and availability.</p>
      </div>

      {/* Dynamic Stats Cards */}
      <InventoryStats
        totalProducts={stats.totalProducts}
        totalVariants={stats.totalVariants}
        inStockVariants={stats.inStockVariants}
        outOfStockVariants={stats.outOfStockVariants}
      />

      {/* Error / Warning Alert Banner */}
      {error && (
        <div className="inv-alert-banner">
          <span>{error}</span>
          <button type="button" className="inv-alert-close" onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Filters */}
      <div className="inv-card">
        <div className="inv-card-body">
          <InventoryFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            categories={categories}
            onRefresh={handleRefresh}
          />

          {/* Tab Selection */}
          <div className="inv-tabs">
            <button
              type="button"
              className={`inv-tab-btn ${statusFilter === "in_stock" ? "inv-tab-btn--active" : ""}`}
              onClick={() => setStatusFilter("in_stock")}
            >
              In Stock ({stats.inStockVariants})
            </button>
            <button
              type="button"
              className={`inv-tab-btn ${statusFilter === "out_of_stock" ? "inv-tab-btn--active" : ""}`}
              onClick={() => setStatusFilter("out_of_stock")}
            >
              Out of Stock ({stats.outOfStockVariants})
            </button>
            <button
              type="button"
              className={`inv-tab-btn ${statusFilter === "all" ? "inv-tab-btn--active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All Items ({stats.totalVariants})
            </button>
          </div>

          {/* Desktop Table View */}
          {loading ? (
            <div className="inv-table-loading">
              <div className="inv-loading-spinner" />
              <p>Fetching inventory from server...</p>
            </div>
          ) : (
            <InventoryTable
              items={filteredItems}
              onSaveQuantity={handleSaveQuantity}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
