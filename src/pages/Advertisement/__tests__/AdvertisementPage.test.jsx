import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdvertisementPage from "../AdvertisementPage";
import { resolveSellerId } from "../../../utils/sellerSession";
import { advertisementService } from "../../../services/sellerService";

jest.mock("../../../utils/sellerSession", () => ({
  resolveSellerId: jest.fn()
}));

jest.mock("../../../services/sellerService", () => {
  const mockService = {
    getCampaigns: jest.fn(),
    getSellerCampaigns: jest.fn(),
    pauseCampaign: jest.fn(),
    resumeCampaign: jest.fn(),
    deleteCampaign: jest.fn(),
    getCampaignDetails: jest.fn(),
    getCampaignProducts: jest.fn(),
    getCampaignProductPerformance: jest.fn(),
    offSellerCampaign: jest.fn(),
    updateSellerCampaign: jest.fn(),
    deleteSellerCampaign: jest.fn()
  };
  return {
    __esModule: true,
    default: mockService,
    advertisementService: mockService
  };
});

describe("AdvertisementPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveSellerId.mockReturnValue("HS1380");
  });

  test("renders campaign table with fetched data", async () => {
    advertisementService.getSellerCampaigns.mockResolvedValue([
      {
        tableId: "CAMP1001-table",
        campaignId: "CAMP1001",
        campaignName: "Smart Promo 1",
        campaignType: "Smart",
        status: "Active",
        startDate: "2026-06-20",
        startTime: "09:00 AM",
        dailyBudget: 250
      }
    ]);

    render(
      <MemoryRouter>
        <AdvertisementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Smart Promo 1")).toBeInTheDocument();
    });

    expect(screen.getByText("CAMP1001")).toBeInTheDocument();
    expect(screen.getByText("₹250")).toBeInTheDocument();
  });

  test("filters campaigns by name or id locally", async () => {
    advertisementService.getSellerCampaigns.mockResolvedValue([
      { tableId: "CAMP1001-table", campaignId: "CAMP1001", campaignName: "Smart A", campaignType: "Smart", status: "Active", dailyBudget: 250 },
      { tableId: "CAMP1002-table", campaignId: "CAMP1002", campaignName: "Test B", campaignType: "Smart", status: "Paused", dailyBudget: 550 }
    ]);

    render(
      <MemoryRouter>
        <AdvertisementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Smart A")).toBeInTheDocument();
    });

    expect(screen.getByText("Test B")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Search Campaign");
    fireEvent.change(searchInput, { target: { value: "smart" } });

    expect(screen.getByText("Smart A")).toBeInTheDocument();
    expect(screen.queryByText("Test B")).not.toBeInTheDocument();
  });

  test("clicking a campaign row opens campaign details page and displays metrics and products", async () => {
    advertisementService.getSellerCampaigns.mockResolvedValue([
      {
        tableId: "CAMP1001-table",
        campaignId: "CAMP1001",
        campaignName: "Smart Promo A",
        campaignType: "Smart",
        status: "Active",
        startDate: "2026-06-20",
        dailyBudget: 250,
        plan: "Pro Plan"
      }
    ]);

    advertisementService.getCampaignDetails.mockResolvedValue({
      status: "success",
      message: {
        data: {
          haatzaSales: 15,
          costPerSale: 12.5,
          totalSpend: 187.5,
          reach: 5000,
          impressions: 12000,
          clicks: 350,
          sales: 12,
          revenue: 1500,
          trend: [
            { date: "2026-06-21", reach: 2000, impressions: 5000, clicks: 150 }
          ]
        }
      }
    });

    advertisementService.getCampaignProducts.mockResolvedValue({
      status: "success",
      message: [
        {
          productId: "PROD99",
          productName: "Awesome T-Shirt",
          image: "thumb.jpg",
          price: 299
        }
      ]
    });

    render(
      <MemoryRouter>
        <AdvertisementPage />
      </MemoryRouter>
    );

    // Wait for list to load
    await waitFor(() => {
      expect(screen.getByText("Smart Promo A")).toBeInTheDocument();
    });

    // Click on row to open details
    fireEvent.click(screen.getByText("Smart Promo A"));

    // Check if details header/breadcrumbs shows up and metrics are rendered
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Campaign Details" })).toBeInTheDocument();
      expect(screen.getByText("₹15")).toBeInTheDocument(); // Haatza Sales
      expect(screen.getByText("₹12.5")).toBeInTheDocument(); // Cost Per Sale
      expect(screen.getByText("₹187.5")).toBeInTheDocument(); // Total Spend
      expect(screen.getByText("5,000")).toBeInTheDocument(); // Reach
      expect(screen.getByText("12,000")).toBeInTheDocument(); // Impressions
    });

    // Click see more
    fireEvent.click(screen.getByText("See More"));
    await waitFor(() => {
      expect(screen.getByText("350")).toBeInTheDocument(); // Clicks
      expect(screen.getByText("12")).toBeInTheDocument(); // Sales
      expect(screen.getByText("₹1,500")).toBeInTheDocument(); // Revenue
    });

    // Check settings section
    expect(screen.getByText("Smart")).toBeInTheDocument(); // Campaign type
    expect(screen.getByText("Active / Pro Plan")).toBeInTheDocument(); // Status / plan

    // Check product is rendered
    expect(screen.getByText("Awesome T-Shirt")).toBeInTheDocument();
    expect(screen.getByText("₹299")).toBeInTheDocument();
  });
});
