import React from "react";
import "./InventoryTable.css";

const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%23f1f3f6' rx='8'/%3E%3Ctext x='30' y='35' text-anchor='middle' fill='%23b0b7c3' font-size='22'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E";

const InventoryTableRow = ({ item, onIncrement, onDecrement }) => {
  const isInStock = item.editedQuantity > 0;
  const showMinusDisabled = item.editedQuantity <= 0;

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
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span className="inv-product-name" title={item.name} style={{ fontWeight: "600", color: "#1a1d23" }}>
            {item.name}
          </span>
          <span style={{ 
            fontSize: "13px", 
            fontWeight: "700", 
            color: isInStock ? "#10b981" : "#ef4444" 
          }}>
            {isInStock ? `InStock : ${item.editedQuantity}` : `OutStock : 0`}
          </span>
        </div>
      </td>
      <td>
        <div className="qty-stepper" style={{ display: "inline-flex", alignItems: "center", gap: "12px", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "4px 8px", background: "#fff" }}>
          <button 
            type="button" 
            className="qty-btn" 
            onClick={() => onDecrement(item.rowId || item.id)}
            disabled={showMinusDisabled}
            aria-label="Decrease quantity"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              border: "none",
              background: "transparent",
              cursor: showMinusDisabled ? "not-allowed" : "pointer",
              color: showMinusDisabled ? "#9ca3af" : "#374151",
              fontSize: "18px",
              fontWeight: "600"
            }}
          >
            &minus;
          </button>
          <span className="qty-value-label" style={{ minWidth: "32px", textAlign: "center", fontWeight: "600", fontSize: "14px", color: "#111827" }}>
            {item.editedQuantity}
          </span>
          <button 
            type="button" 
            className="qty-btn" 
            onClick={() => onIncrement(item.rowId || item.id)}
            aria-label="Increase quantity"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#374151",
              fontSize: "18px",
              fontWeight: "600"
            }}
          >
            &#43;
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
            <th>Current Stock</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="3" className="inv-table-empty">
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
