import React from "react";
import { Plus, Minus } from "lucide-react";
import StockBadge from "./StockBadge";
import "./InventoryTable.css";

const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23f1f3f6' rx='8'/%3E%3Ctext x='30' y='35' text-anchor='middle' fill='%23b0b7c3' font-size='22'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E";

const InventoryTableRow = ({ item, onIncrement, onDecrement }) => {
  return (
    <tr>
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
      <td className="inv-stock-cell font-bold">{item.stock}</td>
      <td>
        <StockBadge stock={item.stock} />
      </td>
      <td>
        <div className="qty-stepper" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <button 
            type="button" 
            className="qty-btn" 
            onClick={() => onDecrement(item.id)}
            disabled={item.stock <= 0}
            aria-label="Decrease quantity"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "4px",
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: item.stock <= 0 ? "not-allowed" : "pointer",
              color: "#374151"
            }}
          >
            <Minus size={14} />
          </button>
          <span className="qty-value-label" style={{ minWidth: "32px", textAlign: "center", fontWeight: "600" }}>{item.stock}</span>
          <button 
            type="button" 
            className="qty-btn" 
            onClick={() => onIncrement(item.id)}
            aria-label="Increase quantity"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "4px",
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
              color: "#374151"
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};

const InventoryTable = ({ items, onIncrement, onDecrement }) => {
  return (
    <div className="inv-table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Product Name</th>
            <th className="text-center">Variant / Size</th>
            <th>Current Stock</th>
            <th>Stock Status</th>
            <th>Update Quantity</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="6" className="inv-table-empty">
                No inventory items found matching the filter criteria.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <InventoryTableRow
                key={item.id}
                item={item}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;
