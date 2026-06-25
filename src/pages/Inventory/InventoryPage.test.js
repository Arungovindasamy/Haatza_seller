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
      expect(screen.getByText("100")).toBeInTheDocument();
    });
  });

  // 3. In Stock tab shows only stock > 0
  test("3. In Stock tab shows only stock > 0", async () => {
    render(<InventoryPage />);

    await waitFor(() => {
      expect(screen.getByText("100")).toBeInTheDocument();
      // L has stock 0, so it shouldn't show in "in_stock" tab
      expect(screen.queryByText("0")).not.toBeInTheDocument();
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
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.queryByText("100")).not.toBeInTheDocument();
    });
  });

  // 5. Search filters rows and calls API with searchText
  test("5. Search filters rows and calls API with searchText", async () => {
    jest.useFakeTimers();
    render(<InventoryPage />);

    await waitFor(() => {
      expect(screen.getByText("100")).toBeInTheDocument();
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

  // 6. Plus button calls incrementInventory on modal confirmation
  test("6. Plus button increases local quantity, displays Update button, and calls incrementInventory on modal confirmation", async () => {
    sellerService.incrementInventory.mockResolvedValue({ success: true });

    render(<InventoryPage />);

    await waitFor(() => {
      expect(screen.getByText("100")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Update Inventory" })).not.toBeInTheDocument();

    const plusBtn = screen.getByLabelText("Increase quantity");
    fireEvent.click(plusBtn);

    await waitFor(() => {
      expect(screen.getByText("101")).toBeInTheDocument();
    });

    expect(sellerService.incrementInventory).not.toHaveBeenCalled();

    const updateBtn = screen.getByRole("button", { name: "Update Inventory" });
    expect(updateBtn).toBeInTheDocument();
    fireEvent.click(updateBtn);

    expect(screen.getByText("Are you sure you want to update the inventory?")).toBeInTheDocument();
    expect(screen.getByText("Total Product: 1, Total Variant: 1")).toBeInTheDocument();

    const okBtn = screen.getByRole("button", { name: "OK" });
    fireEvent.click(okBtn);

    await waitFor(() => {
      expect(sellerService.incrementInventory).toHaveBeenCalledWith(
        mockSellerId,
        "prod-1",
        "var-1",
        1
      );
    });
  });

  // 7. Minus button calls decrementInventory on modal confirmation
  test("7. Minus button decreases local quantity, displays Update button, and calls decrementInventory on modal confirmation", async () => {
    sellerService.decrementInventory.mockResolvedValue({ success: true });

    render(<InventoryPage />);

    await waitFor(() => {
      expect(screen.getByText("100")).toBeInTheDocument();
    });

    const minusBtn = screen.getByLabelText("Decrease quantity");
    fireEvent.click(minusBtn);

    await waitFor(() => {
      expect(screen.getByText("99")).toBeInTheDocument();
    });

    expect(sellerService.decrementInventory).not.toHaveBeenCalled();

    const updateBtn = screen.getByRole("button", { name: "Update Inventory" });
    fireEvent.click(updateBtn);

    const okBtn = screen.getByRole("button", { name: "OK" });
    fireEvent.click(okBtn);

    await waitFor(() => {
      expect(sellerService.decrementInventory).toHaveBeenCalledWith(
        mockSellerId,
        "prod-1",
        "var-1",
        1
      );
    });
  });

  // 8. Stock never goes below 0
  test("8. Minus button is disabled when stock is 0", async () => {
    render(<InventoryPage />);

    fireEvent.click(screen.getByText(/Out of Stock/));

    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    const minusBtn = screen.getByLabelText("Decrease quantity");
    expect(minusBtn).toBeDisabled();

    fireEvent.click(minusBtn);
    expect(screen.queryByRole("button", { name: "Update Inventory" })).not.toBeInTheDocument();
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

  // 11. Changing quantity back to original hides the Update Inventory button
  test("11. Changing quantity back to original hides the Update Inventory button", async () => {
    render(<InventoryPage />);

    await waitFor(() => {
      expect(screen.getByText("100")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Update Inventory" })).not.toBeInTheDocument();

    const plusBtn = screen.getByLabelText("Increase quantity");
    fireEvent.click(plusBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Update Inventory" })).toBeInTheDocument();
    });

    const minusBtn = screen.getByLabelText("Decrease quantity");
    fireEvent.click(minusBtn);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Update Inventory" })).not.toBeInTheDocument();
    });
  });
});
