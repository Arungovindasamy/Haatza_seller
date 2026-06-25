import React from "react";
import "./StockBadge.css";

const StockBadge = ({ stock, status }) => {
  const getBadgeDetails = () => {
    // If backend status is provided and non-empty, use it
    if (status && typeof status === "string") {
      const lower = status.toLowerCase();
      if (lower.includes("out of stock") || lower.includes("outofstock") || lower === "inactive" || lower.includes("out_of_stock")) {
        return { text: "Out of Stock", className: "inv-badge--outofstock" };
      }
      if (lower.includes("low stock") || lower.includes("lowstock") || lower.includes("low_stock")) {
        return { text: "Low Stock", className: "inv-badge--lowstock" };
      }
      if (lower.includes("in stock") || lower.includes("instock") || lower === "active" || lower.includes("in_stock")) {
        return { text: "In Stock", className: "inv-badge--instock" };
      }
    }
    
    // Otherwise calculate from stock count
    if (stock <= 0) {
      return { text: "Out of Stock", className: "inv-badge--outofstock" };
    }
    if (stock <= 5) {
      return { text: "Low Stock", className: "inv-badge--lowstock" };
    }
    return { text: "In Stock", className: "inv-badge--instock" };
  };

  const { text, className } = getBadgeDetails();
  
  return (
    <span className={`inv-badge ${className}`}>
      {text}
    </span>
  );
};

export default StockBadge;
