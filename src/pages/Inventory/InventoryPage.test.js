import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import axios from "axios";
import InventoryPage from "./InventoryPage";
import { getSellerId } from "../../utils/sellerSession";
import sellerService from "../../services/sellerService";

jest.mock("../../utils/sellerSession", () => ({
  getSellerId: jest.fn()
}));

jest.mock("../../services/sellerService", () => {
  return {
    __esModule: true,
    default: {
      getSellerProductInventory: jest.fn(),
      incrementInventory: jest.fn(),
      decrementInventory: jest.fn()
    },
    resolveWixImage: jest.fn((img) => img)
  };
});

describe("InventoryPage - Flow and API Tests", () => {
  const mockSellerId = "HS1380";
  const mockInventoryData = {
    inventoryItems: [
      {
        id: "var-1",
        productId: "prod-1",
        productName: "Porsche 911 GT3",
        variant: "M",
        stock: 100,
        image: "porsche.jpg"
      },
      {
        id: "var-2",
        productId: "prod-1",
        productName: "Porsche 911 GT3",
        variant: "L",
        stock: 0,
        image: "porsche.jpg"
      }
    ],
    totalItems: 2
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getSellerId.mockReturnValue(mockSellerId);
    sellerService.getSellerProductInventory.mockResolvedValue(mockInventoryData);
  });

  // 1. Inventory API called with sellerId, page, searchText
  test("1. Inventory API called with sellerId, page, searchText", async () => {
    render(<InventoryPage />);

    await waitFor(() => {
      expect(sellerService.getSellerProductInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: mockSellerId,
          page: 1,
          searchText: ""
        })
      );
    });
  });

  // 2. API response inventoryItems renders rows
  test("2. API response inventoryItems renders rows", async () => {
    render(<InventoryPage />);

    await waitFor(() => {
      // Default status tab is "in_stock" (which filters for stock > 0)
      expect(screen.getByText("Porsche 911 GT3")).toBeInTheDocument();
      expect(screen.getByText("M")).toBeInTheDocument();
      expect(screen.getAllByText("100")[0]).toBeInTheDocument();
    });
  });

  // 3. In Stock tab shows only stock > 0
  test("3. In Stock tab shows only stock > 0", async () => {
    render(<InventoryPage />);

    await waitFor(() => {
      expect(screen.getByText("M")).toBeInTheDocument();
      // L has stock 0, so it shouldn't show in "in_stock" tab
      expect(screen.queryByText("L")).not.toBeInTheDocument();
    });
  });

  // 4. Out of Stock tab shows stock <= 0
  test("4. Out of Stock tab shows stock <= 0", async () => {
    render(<InventoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Out of Stock/)).toBeInTheDocument();
    });

    const outOfStockTab = screen.getByText(/Out of Stock/);
    fireEvent.click(outOfStockTab);

    // L should now be visible as it has stock 0
    await waitFor(() => {
      expect(screen.getByText("L")).toBeInTheDocument();
      expect(screen.queryByText("M")).not.toBeInTheDocument();
    });
  });

  // 5. Search filters rows and calls API with searchText
  test("5. Search filters rows and calls API with searchText", async () => {
    jest.useFakeTimers();
    render(<InventoryPage />);

    await waitFor(() => {
      expect(screen.getByText("M")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search By Inventory");
    fireEvent.change(searchInput, { target: { value: "GT3" } });

    // Fast-forward debounce timer (350ms)
    act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(sellerService.getSellerProductInventory).toHaveBeenLastCalledWith(
        expect.objectContaining({
          searchText: "GT3"
        })
      );
    });

    jest.useRealTimers();
  });

  // 6. Plus button calls incrementInventory
  test("6. Plus button calls incrementInventory", async () => {
    sellerService.incrementInventory.mockResolvedValue({ success: true });

    render(<InventoryPage />);

    await waitFor(() => {
      expect(screen.getAllByText("100")[0]).toBeInTheDocument();
    });

    const plusBtn = screen.getByLabelText("Increase quantity");
    fireEvent.click(plusBtn);

    // Verify immediate increment API call
    expect(sellerService.incrementInventory).toHaveBeenCalledWith(
      mockSellerId,
      "prod-1",
      "var-1",
      1
    );

    // Verify optimistic UI update
    await waitFor(() => {
      expect(screen.getAllByText("101")[0]).toBeInTheDocument();
    });
  });

  // 7. Minus button calls decrementInventory
  test("7. Minus button calls decrementInventory", async () => {
    sellerService.decrementInventory.mockResolvedValue({ success: true });

    render(<InventoryPage />);

    await waitFor(() => {
      expect(screen.getAllByText("100")[0]).toBeInTheDocument();
    });

    const minusBtn = screen.getByLabelText("Decrease quantity");
    fireEvent.click(minusBtn);

    // Verify immediate decrement API call
    expect(sellerService.decrementInventory).toHaveBeenCalledWith(
      mockSellerId,
      "prod-1",
      "var-1",
      1
    );

    // Verify optimistic UI update
    await waitFor(() => {
      expect(screen.getAllByText("99")[0]).toBeInTheDocument();
    });
  });

  // 8. Stock never goes below 0
  test("8. Stock never goes below 0", async () => {
    render(<InventoryPage />);

    // Click Out of Stock tab
    fireEvent.click(screen.getByText(/Out of Stock/));

    await waitFor(() => {
      expect(screen.getByText("L")).toBeInTheDocument();
    });

    const minusBtn = screen.getAllByLabelText("Decrease quantity")[0];
    expect(minusBtn).toBeDisabled();

    // Verify click does not fire decrementInventory
    fireEvent.click(minusBtn);
    expect(sellerService.decrementInventory).not.toHaveBeenCalled();
  });

  // 9. Empty response shows "No inventory items found"
  test("9. Empty response shows No inventory items found", async () => {
    sellerService.getSellerProductInventory.mockResolvedValue({
      inventoryItems: [],
      totalItems: 0
    });

    render(<InventoryPage />);

    await waitFor(() => {
      expect(screen.getByText("No inventory items found matching the filter criteria.")).toBeInTheDocument();
    });
  });

  // 10. API error shows "Unable to load inventory. Please try again."
  test("10. API error shows Unable to load inventory. Please try again.", async () => {
    sellerService.getSellerProductInventory.mockRejectedValue(new Error("Network Error"));

    render(<InventoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Unable to load inventory. Please try again.")).toBeInTheDocument();
    });
  });
});
