import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateCampaignPage from "../CreateCampaignPage";
import { resolveSellerId } from "../../../utils/sellerSession";
import {
  advertisementService,
  checkWalletBalance,
  sellerService,
  extractCampaignProducts
} from "../../../services/sellerService";

jest.mock("../../../utils/sellerSession", () => ({
  resolveSellerId: jest.fn()
}));

jest.mock("../../../services/sellerService", () => ({
  advertisementService: {
    fetchSellerCampaignProduct: jest.fn(),
    createCampaign: jest.fn(),
    getCampaignProducts: jest.fn(),
    getSellerCampaignProducts: jest.fn()
  },
  sellerService: {
    updateSellerCampaign: jest.fn(),
    getUserProfile: jest.fn()
  },
  checkWalletBalance: jest.fn(),
  resolveWixImage: (img) => img,
  extractCampaignProducts: jest.fn((res) => res?.products || res || [])
}));

describe("CreateCampaignPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveSellerId.mockReturnValue("HS1380");
    checkWalletBalance.mockResolvedValue({
      status: "success",
      message: { RemainingBalance: 150.5 }
    });
  });

  test("Step 1 and Step 2 flow works", async () => {
    advertisementService.fetchSellerCampaignProduct.mockResolvedValue({
      status: "success",
      products: [
        {
          productId: "p1",
          name: "Test T-Shirt",
          price: 500,
          status: "In Stock"
        }
      ]
    });
    advertisementService.getSellerCampaignProducts.mockResolvedValue({
      status: "success",
      products: [
        {
          productId: "p1",
          name: "Test T-Shirt",
          price: 500,
          status: "In Stock"
        }
      ]
    });

    advertisementService.createCampaign.mockResolvedValue({ status: "success" });

    render(
      <MemoryRouter>
        <CreateCampaignPage />
      </MemoryRouter>
    );

    // Verify wallet balance is rendered
    await waitFor(() => {
      expect(screen.getByText("₹150.50")).toBeInTheDocument();
    });

    // We should see Step 1 components: campaign name input
    const nameInput = screen.getByPlaceholderText("Enter campaign name");
    expect(nameInput.value).toContain("New Smart Campaign");

    // Click continue to proceed to Step 2
    const continueBtn = screen.getByText("Continue");
    fireEvent.click(continueBtn);

    // Verify step transition to Choose the Products
    await waitFor(() => {
      expect(screen.getByText("Choose the Products")).toBeInTheDocument();
    });

    // Verify products table list
    await waitFor(() => {
      expect(screen.getByText("Test T-Shirt")).toBeInTheDocument();
    });

    // Check product checkbox
    const checkboxes = screen.getAllByRole("checkbox");
    // checkboxes[0] is select all, checkboxes[1] is Test T-Shirt
    fireEvent.click(checkboxes[1]);

    // Click Continue on Choose Products page to go to Step 3 Review
    const continueBtnStep2 = screen.getByText("Continue");
    fireEvent.click(continueBtnStep2);

    // Verify step transition to Review Campaign
    await waitFor(() => {
      expect(screen.getByText("Review Campaign")).toBeInTheDocument();
    });

    // Submit campaign on step 3 via Publish
    const publishBtn = screen.getByText("Publish");
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(advertisementService.createCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: "HS1380",
          campaignType: "Smart",
          selectedProducts: ["p1"],
          dailyBudget: 250 // default preset option
        })
      );
    });
  });

  test("Edit campaign flow works", async () => {
    const mockEditCampaign = {
      campaignId: "CAMP1001",
      tableId: "CAMP1001-table",
      campaignName: "Promo Campaign",
      title: "Promo Campaign",
      campaignType: "Smart",
      startDateTime: "2026-06-20 09:00 AM",
      endDateTime: "2026-06-27 10:00 PM",
      cpcGoal: 5,
      dailyBudget: 550,
      status: "Active"
    };

    advertisementService.getCampaignProducts.mockResolvedValue({
      status: "success",
      products: [
        {
          productId: "p1",
          productName: "Campaign Product 1",
          price: 300,
          status: "In Stock"
        }
      ]
    });

    advertisementService.fetchSellerCampaignProduct.mockResolvedValue({
      status: "success",
      products: [
        {
          productId: "p1",
          productName: "Campaign Product 1",
          price: 300,
          status: "In Stock"
        },
        {
          productId: "p2",
          productName: "Available Product 2",
          price: 400,
          status: "In Stock"
        }
      ]
    });
    advertisementService.getSellerCampaignProducts.mockResolvedValue({
      status: "success",
      products: [
        {
          productId: "p1",
          productName: "Campaign Product 1",
          price: 300,
          status: "In Stock"
        },
        {
          productId: "p2",
          productName: "Available Product 2",
          price: 400,
          status: "In Stock"
        }
      ]
    });

    sellerService.updateSellerCampaign.mockResolvedValue({ status: "success" });

    render(
      <MemoryRouter initialEntries={[{ pathname: "/edit", state: { editCampaign: mockEditCampaign } }]}>
        <CreateCampaignPage />
      </MemoryRouter>
    );

    // Verify wallet balance
    await waitFor(() => {
      expect(screen.getByText("₹150.50")).toBeInTheDocument();
    });

    // Name should be pre-populated
    const nameInput = screen.getByPlaceholderText("Enter campaign name");
    expect(nameInput.value).toBe("Promo Campaign");

    // Click continue to Step 2
    const continueBtn = screen.getByText("Continue");
    fireEvent.click(continueBtn);

    // Verify step transition to Choose the Products
    await waitFor(() => {
      expect(screen.getByText("Choose the Products")).toBeInTheDocument();
    });

    // Verify both Campaign Product 1 is shown
    await waitFor(() => {
      expect(screen.getByText("Campaign Product 1")).toBeInTheDocument();
    });

    // Checkboxes should be loaded. The first checkbox is 'select all', others are products.
    const checkboxes = screen.getAllByRole("checkbox");
    // Verify that Campaign Product 1 checkbox is checked (since it belongs to the campaign)
    expect(checkboxes[1]).toBeChecked();

    // Click continue to Step 3 Review
    const continueBtnStep2 = screen.getByText("Continue");
    fireEvent.click(continueBtnStep2);

    await waitFor(() => {
      expect(screen.getByText("Review Campaign")).toBeInTheDocument();
    });

    // In edit mode, the submit button is "Update Campaign"
    const updateBtn = screen.getByText("Update Campaign");
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(sellerService.updateSellerCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: "HS1380",
          campaignId: "CAMP1001",
          tableId: "CAMP1001-table",
          title: "Promo Campaign",
          dailyBudget: 550,
          productId: ["p1"]
        })
      );
    });
  });
});
