import React from "react";
import { Search, RefreshCw } from "lucide-react";
import "./InventoryFilters.css";

const InventoryFilters = ({
  search,
  onSearchChange,
  onRefresh,
}) => {
  return (
    <div className="inv-filters-row">
      <div className="inv-search-container">
        <Search size={16} className="inv-search-icon" />
        <input
          type="text"
          className="inv-search-input"
          placeholder="Search By Inventory"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="inv-selects-container">
        <button type="button" className="inv-btn-refresh" onClick={onRefresh}>
          <RefreshCw size={14} className="refresh-icon" />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
};

export default InventoryFilters;
