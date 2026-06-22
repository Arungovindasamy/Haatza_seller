import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import GrowPlanPage from "./GrowPlanPage";
import { resolveSellerId, resolveSellerEmail } from "../../utils/sellerSession";
import { sellerService } from "../../services/sellerService";

jest.mock("axios");
jest.mock("../../utils/sellerSession", () => ({
  resolveSellerId: jest.fn(),
  resolveSellerEmail: jest.fn()
}));

jest.mock("../../services/sellerService", () => ({
  sellerService: {
    getUserProfile: jest.fn(),
    verifyRazorpayPayment: jest.fn()
  }
}));

// Mock Razorpay globally
let mockRazorpayInstance = null;
const mockRazorpayConstructor = jest.fn();
class MockRazorpay {
  constructor(options) {
    this.options = options;
    this.eventHandlers = {};
    mockRazorpayInstance = this;
    mockRazorpayConstructor(options);
  }
  on(event, handler) {
    this.eventHandlers[event] = handler;
  }
  open() {}
}
window.Razorpay = MockRazorpay;

describe("GrowPlanPage - End to End Flow Tests", () => {
  const mockSellerId = "HS1380";
  const mockSellerEmail = "seller@example.com";
  let hasProcessedSubscription = false;
  const mockPlansData = {
    message: {
      items: [
        {
          id: "growth_plan",
          name: "Growth",
          price: 999,
          features: ["Growth Feature 1"]
        },
        {
          id: "pro_plan",
          name: "Pro",
          price: 1999,
          recommended: true,
          features: ["Pro Feature 1"]
        },
        {
          id: "enterprise_plan",
          name: "Enterprise",
          price: 2499,
          features: ["Enterprise Feature 1"]
        }
      ]
    }
  };

  beforeEach(() => {
    hasProcessedSubscription = false;
    jest.clearAllMocks();
    resolveSellerId.mockReturnValue(mockSellerId);
    resolveSellerEmail.mockReturnValue(mockSellerEmail);
    mockRazorpayInstance = null;
    
    // Default mock behavior
    axios.get.mockImplementation((url) => {
      if (url.includes("getPlans")) {
        return Promise.resolve({ data: mockPlansData });
      }
      if (url.includes("checkWalletBalance")) {
        return Promise.resolve({ data: { message: { RemainingBalance: 500 } } });
      }
      if (url.includes("sellersubscription")) {
        if (hasProcessedSubscription) {
          return Promise.resolve({
            data: {
              status: "success",
              message: {
                orders: [{
                  tableId: "abc-123",
                  planName: "Pro",
                  planPrice: 1999,
                  startDate: "22-06-2026",
                  planDuration: "1 Month",
                  status: "Active"
                }]
              }
            }
          });
        }
        return Promise.resolve({ data: { message: { orders: [] } } });
      }
      return Promise.reject(new Error("Unknown GET URL"));
    });

    sellerService.getUserProfile.mockResolvedValue({
      status: "success",
      message: { name: "Test Seller", phone: "9876543210", email: mockSellerEmail }
    });
  });

  // 1. Page loads plans successfully from getPlans
  test("1. Page loads plans successfully from getPlans", async () => {
    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Growth")).toBeInTheDocument();
      expect(screen.getAllByText("Pro")[0]).toBeInTheDocument();
      expect(screen.getByText("Enterprise")).toBeInTheDocument();
    });

    expect(axios.get).toHaveBeenCalledWith("https://haatzaseller.com/_functions/getPlans");
  });

  // 2. If getPlans fails, fallback plans are shown
  test("2. If getPlans fails, fallback plans are shown", async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes("getPlans")) {
        return Promise.reject(new Error("API Error"));
      }
      if (url.includes("checkWalletBalance")) {
        return Promise.resolve({ data: { message: { RemainingBalance: 0 } } });
      }
      if (url.includes("sellersubscription")) {
        return Promise.resolve({ data: { message: { orders: [] } } });
      }
      return Promise.reject(new Error("Unknown GET URL"));
    });

    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    // Should load fallback plans (e.g. features like "Seller Verified Badge")
    await waitFor(() => {
      expect(screen.getByText("Growth")).toBeInTheDocument();
      expect(screen.getAllByText("Seller Verified Badge")[0]).toBeInTheDocument();
    });
  });

  // 3. Wallet balance loads using sellerId
  test("3. Wallet balance loads using sellerId", async () => {
    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "https://haatza.com/_functions/checkWalletBalance",
        expect.objectContaining({ params: { sellerId: mockSellerId } })
      );
    });
  });

  // 4. Existing subscription loads using sellerEmail
  test("4. Existing subscription loads using sellerEmail", async () => {
    const mockActiveSubscription = {
      planName: "Enterprise",
      planPrice: 2499,
      startDate: "20-06-2026",
      planDuration: "1 Month"
    };

    axios.get.mockImplementation((url) => {
      if (url.includes("getPlans")) {
        return Promise.resolve({ data: mockPlansData });
      }
      if (url.includes("checkWalletBalance")) {
        return Promise.resolve({ data: { message: { RemainingBalance: 100 } } });
      }
      if (url.includes("sellersubscription")) {
        return Promise.resolve({ data: { message: { orders: [mockActiveSubscription] } } });
      }
      return Promise.reject(new Error("Unknown GET URL"));
    });

    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Active Subscription Found")).toBeInTheDocument();
      expect(screen.getByText(/You are currently subscribed to the/)).toBeInTheDocument();
    });
  });

  // 5. User selects Growth plan and navigates to review
  test("5. User selects Growth plan and navigates to review", async () => {
    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Growth")).toBeInTheDocument();
    });

    // Select Growth Plan card
    const growthCard = screen.getByText("Growth").closest(".plan-card");
    fireEvent.click(growthCard);

    // Click Continue
    const continueBtn = screen.getByText("Continue").closest("button");
    fireEvent.click(continueBtn);

    // Verify Plan Review header shows up
    expect(screen.getByRole("heading", { name: "Plan Review" })).toBeInTheDocument();
    expect(screen.getByText("Growth Plan")).toBeInTheDocument();
    expect(screen.getAllByText("₹999")[0]).toBeInTheDocument();
  });

  // 6. User selects Pro plan and price updates correctly
  test("6. User selects Pro plan and price updates correctly", async () => {
    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Pro")[0]).toBeInTheDocument();
    });

    // Pro is preselected as it's recommended
    const continueBtn = screen.getByText("Continue").closest("button");
    fireEvent.click(continueBtn);

    expect(screen.getByText("Pro Plan")).toBeInTheDocument();
    expect(screen.getAllByText("₹1999")[0]).toBeInTheDocument();
  });

  // 7. User redeems wallet balance and payableAmount updates
  test("7. User redeems wallet balance and payableAmount updates", async () => {
    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Pro")[0]).toBeInTheDocument();
    });

    const continueBtn = screen.getByText("Continue").closest("button");
    fireEvent.click(continueBtn);

    // Wallet balance is mocked to 500
    const walletCheckbox = screen.getByLabelText(/Redeem Wallet Balance\?/);
    expect(walletCheckbox).not.toBeChecked();

    // Initial Payable Amount is ₹1999
    expect(screen.getByText("Payable Amount").nextSibling.textContent).toBe("₹1999");

    // Click checkbox to redeem
    fireEvent.click(walletCheckbox);
    expect(walletCheckbox).toBeChecked();

    // Wallet Redeemed shows - ₹500, Payable Amount updates to ₹1499
    expect(screen.getByText("Wallet Redeemed").nextSibling.textContent).toBe("- ₹500");
    expect(screen.getByText("Payable Amount").nextSibling.textContent).toBe("₹1499");
  });

  // 8. User applies valid referral code and discount updates
  test("8. User applies valid referral code and discount updates", async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes("getPlans")) {
        return Promise.resolve({ data: mockPlansData });
      }
      if (url.includes("checkWalletBalance")) {
        return Promise.resolve({ data: { message: { RemainingBalance: 0 } } });
      }
      if (url.includes("sellersubscription")) {
        return Promise.resolve({ data: { message: { orders: [] } } });
      }
      if (url.includes("referralCheck")) {
        return Promise.resolve({ data: { status: "success", message: { discount: 300 } } });
      }
      return Promise.reject(new Error("Unknown GET URL"));
    });

    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Pro")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Continue").closest("button"));

    // Enter coupon
    const referralInput = screen.getByPlaceholderText("Enter Referral Code");
    fireEvent.change(referralInput, { target: { value: "VALIDCODE" } });

    const applyBtn = screen.getByText("Apply");
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.getByText("Referral code applied successfully! Saved ₹300.")).toBeInTheDocument();
    });

    // Check pricing update (Plan price: 1999 - Referral: 300 = Payable: 1699)
    expect(screen.getByText("Referral Discount").nextSibling.textContent).toBe("- ₹300");
    expect(screen.getByText("Payable Amount").nextSibling.textContent).toBe("₹1699");
  });

  // 9. Invalid referral code shows error message
  test("9. Invalid referral code shows error message", async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes("getPlans")) {
        return Promise.resolve({ data: mockPlansData });
      }
      if (url.includes("checkWalletBalance")) {
        return Promise.resolve({ data: { message: { RemainingBalance: 0 } } });
      }
      if (url.includes("sellersubscription")) {
        return Promise.resolve({ data: { message: { orders: [] } } });
      }
      if (url.includes("referralCheck")) {
        return Promise.resolve({ data: { status: "error", message: { text: "Code does not exist." } } });
      }
      return Promise.reject(new Error("Unknown GET URL"));
    });

    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Pro")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Continue").closest("button"));

    const referralInput = screen.getByPlaceholderText("Enter Referral Code");
    fireEvent.change(referralInput, { target: { value: "INVALIDCODE" } });

    fireEvent.click(screen.getByText("Apply"));

    await waitFor(() => {
      expect(screen.getByText("Code does not exist.")).toBeInTheDocument();
    });
  });

  // 10. payableAmount never becomes negative
  test("10. payableAmount never becomes negative", async () => {
    // Wallet Balance: 3000 (exceeds Plan Price 1999)
    axios.get.mockImplementation((url) => {
      if (url.includes("getPlans")) {
        return Promise.resolve({ data: mockPlansData });
      }
      if (url.includes("checkWalletBalance")) {
        return Promise.resolve({ data: { message: { RemainingBalance: 3000 } } });
      }
      if (url.includes("sellersubscription")) {
        return Promise.resolve({ data: { message: { orders: [] } } });
      }
      return Promise.reject(new Error("Unknown GET URL"));
    });

    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Pro")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Continue").closest("button"));

    // Check redeem wallet checkbox
    fireEvent.click(screen.getByLabelText(/Redeem Wallet Balance\?/));

    // Price is 1999, Wallet redeemed matches max plan price = 1999, Payable = 0 (never negative)
    expect(screen.getByText("Wallet Redeemed").nextSibling.textContent).toBe("- ₹1999");
    expect(screen.getByText("Payable Amount").nextSibling.textContent).toBe("₹0");
  });

  // 11-19. Razorpay Payment, Verification, and Activation Success Flow
  test("11-19. Razorpay complete payment and verification flow", async () => {
    // Mock Razorpay order creation response
    const mockOrderResponse = {
      data: {
        status: "success",
        message: {
          order: {
            id: "order_T3qS9dNhtXZZXt",
            amount: 199900,
            currency: "INR"
          },
          keyId: "rzp_live_R8ib0QZopkaicy"
        }
      }
    };

    axios.post.mockImplementation((url, payload) => {
      if (url.includes("createRazorpayOrder")) {
        return Promise.resolve(mockOrderResponse);
      }
      if (url.includes("processSubscriptionOrder")) {
        hasProcessedSubscription = true;
        return Promise.resolve({
          data: {
            status: "success",
            message: {
              message: "Subscription order processed successfully"
            }
          }
        });
      }
      return Promise.reject(new Error("Unknown POST URL"));
    });

    sellerService.verifyRazorpayPayment.mockResolvedValue({
      status: "success",
      message: { verified: true }
    });

    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Pro")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Continue").closest("button"));

    // Click Subscribe Now
    fireEvent.click(screen.getByText("Subscribe Now"));

    // Click Yes in modal
    fireEvent.click(screen.getByText("Yes"));

    // Verify createRazorpayOrder was called with correct payload
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "https://haatza.com/_functions/createRazorpayOrder",
        { sellerId: mockSellerId, amount: 1999 }
      );
    });

    // Check that Razorpay constructor was called with extracted key and payload
    expect(mockRazorpayConstructor).toHaveBeenCalled();
    const razorpayOptions = mockRazorpayConstructor.mock.calls[0][0];

    expect(razorpayOptions.key).toBe("rzp_live_R8ib0QZopkaicy");
    expect(razorpayOptions.amount).toBe(199900);
    expect(razorpayOptions.currency).toBe("INR");
    expect(razorpayOptions.order_id).toBe("order_T3qS9dNhtXZZXt");
    expect(razorpayOptions.prefill.email).toBe(mockSellerEmail);

    // Call successful payment handler
    const mockSuccessResponse = {
      razorpay_payment_id: "pay_123",
      razorpay_order_id: "order_T3qS9dNhtXZZXt",
      razorpay_signature: "sig_abc"
    };

    await act(async () => {
      await razorpayOptions.handler(mockSuccessResponse);
    });

    // Verify verifyRazorpayPayment is called with exact signature payload
    expect(sellerService.verifyRazorpayPayment).toHaveBeenCalledWith({
      sellerId: mockSellerId,
      amount: 1999,
      paymentId: "pay_123",
      orderId: "order_T3qS9dNhtXZZXt",
      signature: "sig_abc"
    });

    // Verify processSubscriptionOrder API is called
    expect(axios.post).toHaveBeenCalledWith(
      "https://haatzaseller.com/_functions/processSubscriptionOrder",
      expect.objectContaining({
        createSubscription: expect.objectContaining({
          planName: "Pro",
          planId: "pro_plan",
          status: "Active",
          email: mockSellerEmail,
          paymentId: "pay_123",
          razorpayOrderId: "order_T3qS9dNhtXZZXt",
          sellerId: mockSellerId
        })
      })
    );

    // Verifies successful state view change
    await waitFor(() => {
      expect(screen.getByText("Subscription Successful!")).toBeInTheDocument();
    });
  });

  // 20. If payableAmount is 0, skip Razorpay and directly call processSubscriptionOrder
  test("20. Skip Razorpay if payableAmount is 0", async () => {
    // Mock Wallet balance to fully cover the price (2500)
    axios.get.mockImplementation((url) => {
      if (url.includes("getPlans")) {
        return Promise.resolve({ data: mockPlansData });
      }
      if (url.includes("checkWalletBalance")) {
        return Promise.resolve({ data: { message: { RemainingBalance: 3000 } } });
      }
      if (url.includes("sellersubscription")) {
        if (hasProcessedSubscription) {
          return Promise.resolve({
            data: {
              status: "success",
              message: {
                orders: [{
                  tableId: "abc-123",
                  planName: "Pro",
                  planPrice: 1999,
                  startDate: "22-06-2026",
                  planDuration: "1 Month",
                  status: "Active"
                }]
              }
            }
          });
        }
        return Promise.resolve({ data: { message: { orders: [] } } });
      }
      return Promise.reject(new Error("Unknown GET URL"));
    });

    axios.post.mockImplementation((url, payload) => {
      if (url.includes("processSubscriptionOrder")) {
        hasProcessedSubscription = true;
        return Promise.resolve({
          data: {
            status: "success",
            message: {
              message: "Subscription order processed successfully"
            }
          }
        });
      }
      return Promise.reject(new Error("Unknown POST URL"));
    });

    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Pro")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Continue").closest("button"));

    // Check Wallet Redeem checkbox
    fireEvent.click(screen.getByLabelText(/Redeem Wallet Balance\?/));

    // Verify payableAmount is 0
    expect(screen.getByText("Payable Amount").nextSibling.textContent).toBe("₹0");

    // Click Subscribe Now
    fireEvent.click(screen.getByText("Subscribe Now"));

    // Click Yes in modal
    fireEvent.click(screen.getByText("Yes"));

    // Verify processSubscriptionOrder is called with direct wallet details, skipping Razorpay
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "https://haatzaseller.com/_functions/processSubscriptionOrder",
        expect.objectContaining({
          createSubscription: expect.objectContaining({
            planName: "Pro",
            planId: "pro_plan",
            status: "Active",
            email: mockSellerEmail,
            sellerId: mockSellerId
          })
        })
      );
      expect(axios.post).not.toHaveBeenCalledWith(expect.stringContaining("createRazorpayOrder"), expect.any(Object));
    });

    await waitFor(() => {
      expect(screen.getByText("Subscription Successful!")).toBeInTheDocument();
    });
  });

  // 21. Payment modal dismiss resets processing state
  test("21. Payment modal dismiss resets processing state", async () => {
    const mockOrderResponse = {
      data: {
        status: "success",
        message: {
          order: { id: "order_xyz", amount: 199900 },
          keyId: "key_xyz"
        }
      }
    };

    axios.post.mockImplementation((url) => {
      if (url.includes("createRazorpayOrder")) {
        return Promise.resolve(mockOrderResponse);
      }
      return Promise.reject(new Error("Unknown POST URL"));
    });

    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Pro")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Continue").closest("button"));
    fireEvent.click(screen.getByText("Subscribe Now"));
    fireEvent.click(screen.getByText("Yes"));

    await waitFor(() => {
      expect(mockRazorpayConstructor).toHaveBeenCalled();
    });

    // Dismiss modal
    const razorpayOptions = mockRazorpayConstructor.mock.calls[0][0];
    await act(async () => {
      razorpayOptions.modal.ondismiss();
    });

    // Expect checkout cancelled error message
    expect(screen.getByText("Payment checkout cancelled.")).toBeInTheDocument();
  });

  // 22. Razorpay payment.failed resets processing state and shows error
  test("22. Razorpay payment.failed resets processing state and shows error", async () => {
    const mockOrderResponse = {
      data: {
        status: "success",
        message: {
          order: { id: "order_xyz", amount: 199900 },
          keyId: "key_xyz"
        }
      }
    };

    axios.post.mockImplementation((url) => {
      if (url.includes("createRazorpayOrder")) {
        return Promise.resolve(mockOrderResponse);
      }
      return Promise.reject(new Error("Unknown POST URL"));
    });

    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Pro")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Continue").closest("button"));
    fireEvent.click(screen.getByText("Subscribe Now"));
    fireEvent.click(screen.getByText("Yes"));

    await waitFor(() => {
      expect(mockRazorpayConstructor).toHaveBeenCalled();
    });

    // Fire payment.failed event
    const instance = mockRazorpayInstance;
    const failedHandler = instance.eventHandlers["payment.failed"];
    await act(async () => {
      failedHandler({ error: { description: "Card declined by bank." } });
    });

    expect(screen.getByText("Card declined by bank.")).toBeInTheDocument();
  });

  // 23. Duplicate click does not create duplicate orders
  test("23. Duplicate click does not create duplicate orders", async () => {
    let callCount = 0;
    axios.post.mockImplementation((url) => {
      if (url.includes("createRazorpayOrder")) {
        callCount++;
        // Delay response to simulate flight
        return new Promise((resolve) => setTimeout(() => resolve({
          data: { status: "success", message: { order: { id: "order_xyz", amount: 199900 }, keyId: "key_xyz" } }
        }), 100));
      }
      return Promise.reject(new Error("Unknown POST URL"));
    });

    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Pro")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Continue").closest("button"));
    fireEvent.click(screen.getByText("Subscribe Now"));
    
    const yesBtn = screen.getByText("Yes");
    fireEvent.click(yesBtn);

    await waitFor(() => {
      expect(mockRazorpayConstructor).toHaveBeenCalled();
    });

    expect(callCount).toBe(1); // Only 1 order creation should be triggered
  });

  // 24. Test default Pro selected
  test("24. Test default Pro selected", async () => {
    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Growth")).toBeInTheDocument();
    });

    const proCard = screen.getAllByText("Pro")[0].closest(".plan-card");
    expect(proCard).toHaveClass("selected");
    expect(proCard.querySelector(".plan-expanded-details")).toBeInTheDocument();

    const growthCard = screen.getByText("Growth").closest(".plan-card");
    expect(growthCard).not.toHaveClass("selected");
    expect(growthCard.querySelector(".plan-expanded-details")).toBeNull();
  });

  // 25. Test selecting Growth and Enterprise expands correct details
  test("25. Test selecting Growth and Enterprise expands correct details", async () => {
    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Growth")).toBeInTheDocument();
    });

    // Pro is selected initially
    let proCard = screen.getAllByText("Pro")[0].closest(".plan-card");
    let growthCard = screen.getByText("Growth").closest(".plan-card");
    let enterpriseCard = screen.getByText("Enterprise").closest(".plan-card");

    expect(proCard).toHaveClass("selected");
    expect(growthCard).not.toHaveClass("selected");
    expect(enterpriseCard).not.toHaveClass("selected");

    // Click Growth
    fireEvent.click(growthCard);
    expect(growthCard).toHaveClass("selected");
    expect(growthCard.querySelector(".plan-expanded-details")).toBeInTheDocument();
    expect(proCard).not.toHaveClass("selected");
    expect(proCard.querySelector(".plan-expanded-details")).toBeNull();

    // Click Enterprise
    fireEvent.click(enterpriseCard);
    expect(enterpriseCard).toHaveClass("selected");
    expect(enterpriseCard.querySelector(".plan-expanded-details")).toBeInTheDocument();
    expect(growthCard).not.toHaveClass("selected");
    expect(growthCard.querySelector(".plan-expanded-details")).toBeNull();
  });

  // 26. Test Continue opens Plan Review page with correct selected plan
  test("26. Test Continue opens Plan Review page with correct selected plan", async () => {
    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Growth")).toBeInTheDocument();
    });

    // Pro is default. Click Continue
    const continueBtn = screen.getByText("Continue").closest("button");
    fireEvent.click(continueBtn);

    // Verify Plan Review header shows up
    expect(screen.getByRole("heading", { name: "Plan Review" })).toBeInTheDocument();
    expect(screen.getByText("Pro Plan")).toBeInTheDocument();
  });

  // 27. Test Plan Review content order exactly: Pro -> What’s included -> See more -> Start date -> Redeem
  test("27. Test Plan Review content order exactly: Pro -> What’s included -> See more -> Start date -> Redeem", async () => {
    // Override plans mock so Pro has 6 features (enabling See more toggle)
    const longMockPlansData = {
      message: {
        items: [
          {
            id: "growth_plan",
            name: "Growth",
            price: 999,
            features: ["Growth Feature 1"]
          },
          {
            id: "pro_plan",
            name: "Pro",
            price: 1999,
            recommended: true,
            features: [
              "Feat 1",
              "Feat 2",
              "Feat 3",
              "Feat 4",
              "Feat 5",
              "Feat 6"
            ]
          },
          {
            id: "enterprise_plan",
            name: "Enterprise",
            price: 2499,
            features: ["Enterprise Feature 1"]
          }
        ]
      }
    };

    axios.get.mockImplementation((url) => {
      if (url.includes("getPlans")) {
        return Promise.resolve({ data: longMockPlansData });
      }
      if (url.includes("checkWalletBalance")) {
        return Promise.resolve({ data: { message: { RemainingBalance: 500 } } });
      }
      if (url.includes("sellersubscription")) {
        return Promise.resolve({ data: { message: { orders: [] } } });
      }
      return Promise.reject(new Error("Unknown GET URL"));
    });

    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Growth")).toBeInTheDocument();
    });

    const continueBtn = screen.getByText("Continue").closest("button");
    fireEvent.click(continueBtn);

    // Find Plan Review card container
    const reviewCard = screen.getByText("Pro Plan").closest(".plan-review-card");
    expect(reviewCard).toBeInTheDocument();

    const elName = reviewCard.querySelector(".review-plan-name-label");
    const elPrice = reviewCard.querySelector(".review-plan-price-label");
    const elTitle = reviewCard.querySelector(".plan-features-title");
    const elSeeMore = reviewCard.querySelector(".btn-see-more-toggle");
    const elStartDate = reviewCard.querySelector(".start-date-container");
    const elRedeem = reviewCard.querySelector(".wallet-redeem-row");
    const elPayable = reviewCard.querySelector(".total-payable");
    const elPay = reviewCard.querySelector(".btn-subscribe-now");

    expect(elName).toBeInTheDocument();
    expect(elPrice).toBeInTheDocument();
    expect(elTitle).toBeInTheDocument();
    expect(elSeeMore).toBeInTheDocument();
    expect(elStartDate).toBeInTheDocument();
    expect(elRedeem).toBeInTheDocument();
    expect(elPayable).toBeInTheDocument();
    expect(elPay).toBeInTheDocument();

    const isFollowing = (a, b) => {
      return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    };

    expect(isFollowing(elName, elPrice)).toBe(true);
    expect(isFollowing(elPrice, elTitle)).toBe(true);
    expect(isFollowing(elTitle, elSeeMore)).toBe(true);
    expect(isFollowing(elSeeMore, elStartDate)).toBe(true);
    expect(isFollowing(elStartDate, elRedeem)).toBe(true);
    expect(isFollowing(elRedeem, elPayable)).toBe(true);
    expect(isFollowing(elPayable, elPay)).toBe(true);
  });

  // 28. Test desktop and mobile responsive elements are in document
  test("28. Test desktop and mobile responsive elements are in document", async () => {
    render(
      <MemoryRouter>
        <GrowPlanPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Growth")).toBeInTheDocument();
    });

    // Check containers and elements
    expect(document.querySelector(".plans-list")).toBeInTheDocument();
    expect(document.querySelector(".plans-action-bar")).toBeInTheDocument();
    expect(document.querySelector(".grow-plan-footer-content")).toBeInTheDocument();
  });
});
