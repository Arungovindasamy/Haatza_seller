import React, { useState, useEffect } from "react";
import { Save } from "lucide-react";
import StockBadge from "./StockBadge";
import QuantityStepper from "./QuantityStepper";
import "./InventoryTable.css";

const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23f1f3f6' rx='8'/%3E%3Ctext x='30' y='35' text-anchor='middle' fill='%23b0b7c3' font-size='22'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E";

const InventoryTableRow = ({ item, onSave }) => {
  const [localQty, setLocalQty] = useState(item.stock);

  // Sync state if item stock changes from elsewhere (e.g., refresh or bulk action)
  useEffect(() => {
    setLocalQty(item.stock);
  }, [item.stock]);

  const hasChanges = localQty !== item.stock;

  const handleSave = () => {
    onSave(item.id, localQty);
  };

  return (
    <tr className={hasChanges ? "row-has-changes" : ""}>
      <td>
        <img
          className="inv-img"
          src={item.image || FALLBACK_IMG}
          alt={item.name}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = FALLBACK_IMG;
          }}
        />
      </td>
      <td>
        <span className="inv-product-name" title={item.name}>
          {item.name}
        </span>
      </td>
      <td className="text-center font-semibold">{item.variant}</td>
      <td className="inv-sku">{item.sku}</td>
      <td className="inv-stock-cell font-bold">{item.stock}</td>
      <td>
        <StockBadge stock={item.stock} />
      </td>
      <td>
        <QuantityStepper value={localQty} onChange={setLocalQty} />
      </td>
      <td>
        <button
          type="button"
          className={`inv-btn-save ${hasChanges ? "inv-btn-save--active" : ""}`}
          onClick={handleSave}
          disabled={!hasChanges}
        >
          <Save size={14} />
          <span>Save</span>
        </button>
      </td>
    </tr>
  );
};

const InventoryTable = ({ items, onSaveQuantity }) => {
  return (
    <div className="inv-table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Product Name</th>
            <th className="text-center">Variant</th>
            <th>SKU</th>
            <th>Current Stock</th>
            <th>Stock Status</th>
            <th>Update Quantity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="8" className="inv-table-empty">
                No inventory items found matching the filter criteria.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <InventoryTableRow
                key={item.id}
                item={item}
                onSave={onSaveQuantity}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
