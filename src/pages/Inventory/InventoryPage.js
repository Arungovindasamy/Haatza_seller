import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import InventoryStats from "./components/InventoryStats";
import InventoryFilters from "./components/InventoryFilters";
import InventoryTable from "./components/InventoryTable";
import { getSellerId } from "../../utils/sellerSession";
import { useInventoryViewModel } from "./hooks/useInventoryViewModel";
import "./InventoryPage.css";

const InventoryPage = () => {
  const sellerId = getSellerId();
  
  const {
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
    limit,
  } = useInventoryViewModel(sellerId);

  // Calculate items range shown
  const fromItem = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const toItem = Math.min(page * limit, totalItems);

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
            search={searchRaw}
            onSearchChange={handleSearchChange}
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
            <>
              <InventoryTable
                items={filteredItems}
                onSaveQuantity={handleSaveQuantity}
              />
              
              {/* Pagination Controls */}
              {!error && filteredItems.length > 0 && (
                <div className="inv-pagination">
                  <div className="inv-pagination-info">
                    Showing <span>{fromItem}–{toItem}</span> of <span>{totalItems}</span> products
                  </div>
                  <div className="inv-pagination-controls">
                    <button
                      type="button"
                      className="inv-page-btn"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                    <span className="inv-page-indicator">
                      Page <span>{page}</span> of <span>{totalPages}</span>
                    </span>
                    <button
                      type="button"
                      className="inv-page-btn"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryPage;
