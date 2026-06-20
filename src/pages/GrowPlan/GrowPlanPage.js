import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, CheckCircle2, Check, ArrowRight } from "lucide-react";
import { resolveSellerId, resolveSellerEmail } from "../../utils/sellerSession";
import { sellerService } from "../../services/sellerService";
import "./GrowPlanPage.css";

// Fallback plans in case the plans API doesn't return data
const FALLBACK_PLANS = [
  {
    id: "growth_plan",
    name: "Growth",
    price: 999,
    features: [
      "Seller Verified Badge",
      "Featured placement in category + search (5 SKUs)",
      "\"Promoted Seller\" tag in app",
      "₹500 Ad Credit (Google + Meta)",
      "Basic analytics dashboard",
      "AI Product Title & Description Optimizer",
      "SEO Score for each product",
      "In-App Product Promotions",
      "Auto Keyword Suggestions for trending searches",
      "Expected boost: up to 1.3× sales"
    ]
  },
  {
    id: "pro_plan",
    name: "Pro",
    price: 1999,
    recommended: true,
    features: [
      "Seller Verified Badge",
      "Featured placement for 15 SKUs",
      "Priority \"Trending Now\" visibility",
      "₹1,200 Ad Credit (Google + Meta)",
      "1 Managed digital ad campaign/month",
      "Advanced Analytics",
      "AI Auto-Pricing Suggestions (competitive pricing alerts)",
      "In-App Product Promotions",
      "Cross-Sell Recommendation Engine",
      "Early Payout/Settlement (T+1)",
      "Priority logistics partners (where available)",
      "Expected boost: up to 2× sales"
    ]
  },
  {
    id: "enterprise_plan",
    name: "Enterprise",
    price: 2499,
    features: [
      "Seller Verified Badge",
      "Featured placement on all SKUs",
      "\"Top Seller\" premium badge in listings",
      "₹2,000 Ad Credit",
      "2 Managed ad campaigns/month",
      "Flash Sale Tools",
      "Search Result Boosting",
      "In-App Product Promotions",
      "Detailed conversion funnel analytics",
      "Cart Abandonment Notifications (Haatza sends push to buyers)",
      "Repeat Buyer Retargeting (push / in-app)",
      "Expected boost: up to 3× sales"
    ]
  }
];

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    let script = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (!script) {
      script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const cleanup = () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };

    const handleLoad = () => {
      cleanup();
      resolve(true);
    };

    const handleError = () => {
      cleanup();
      resolve(false);
    };

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);
  });
};

const getTodayFormatted = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const GrowPlanPage = () => {
  const navigate = useNavigate();
  const sellerId = resolveSellerId();
  const sellerEmail = resolveSellerEmail();

  // View state: 'plans', 'review', 'success'
  const [viewState, setViewState] = useState("plans");
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  // Wallet & Discount states
  const [walletBalance, setWalletBalance] = useState(0);
  const [redeemWallet, setRedeemWallet] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [appliedReferralCode, setAppliedReferralCode] = useState("");
  const [referralDiscount, setReferralDiscount] = useState(0);
  
  // Loaders / Feedback states
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [checkingReferral, setCheckingReferral] = useState(false);
  const [referralMessage, setReferralMessage] = useState({ text: "", type: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Active/Existing Subscription status
  const [activeSubscription, setActiveSubscription] = useState(null);
  
  // Modals state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sellerProfile, setSellerProfile] = useState(null);
  
  // Dedupe payment handles
  const paymentInProgressRef = useRef(false);
  const processedPaymentRef = useRef(new Set());

  // Merge dynamic plans with static fallback features list for UI consistency
  const mapPlansWithFeatures = useCallback((apiPlans) => {
    if (!Array.isArray(apiPlans) || apiPlans.length === 0) {
      return FALLBACK_PLANS;
    }
    return apiPlans.map((plan) => {
      const nameLower = (plan.name || "").toLowerCase();
      let matchingFallback = FALLBACK_PLANS.find(p => p.name.toLowerCase() === nameLower);
      if (!matchingFallback) {
        matchingFallback = FALLBACK_PLANS.find(p => nameLower.includes(p.name.toLowerCase()));
      }
      return {
        ...plan,
        id: plan.id || plan._id || plan.planId || (matchingFallback ? matchingFallback.id : `${nameLower}_plan`),
        name: plan.name || (matchingFallback ? matchingFallback.name : "Plan"),
        price: plan.price !== undefined ? Number(plan.price) : (matchingFallback ? matchingFallback.price : 0),
        recommended: plan.recommended || (matchingFallback ? matchingFallback.recommended : false),
        features: plan.features || (matchingFallback ? matchingFallback.features : [])
      };
    });
  }, []);

  // Fetch plans, wallet balance, and active subscription on mount
  const initPageData = useCallback(async () => {
    if (!sellerId) {
      setErrorMsg("Seller session not found. Please log in again.");
      setLoadingPlans(false);
      return;
    }

    setLoadingPlans(true);
    setErrorMsg(null);

    try {
      // 1. Fetch Plans
      console.log("[GrowPlanPage] Fetching plans... GET https://haatzaseller.com/_functions/getPlans");
      let planItems = [];
      try {
        const plansRes = await axios.get("https://haatzaseller.com/_functions/getPlans");
        console.log("[GrowPlanPage] Get Plans Response", plansRes.data);
        planItems = plansRes.data?.message?.items || [];
      } catch (err) {
        console.error("[GrowPlanPage] Get Plans API error, using fallbacks:", err);
      }
      const finalPlans = mapPlansWithFeatures(planItems);
      setPlans(finalPlans);

      // Pre-select Recommended Pro plan if available
      const recommended = finalPlans.find(p => p.recommended);
      if (recommended) {
        setSelectedPlan(recommended);
      } else if (finalPlans.length > 0) {
        setSelectedPlan(finalPlans[0]);
      }

      // 2. Fetch Wallet Balance
      console.log(`[GrowPlanPage] Fetching wallet balance... GET https://haatza.com/_functions/checkWalletBalance?sellerId=${sellerId}`);
      try {
        const walletRes = await axios.get("https://haatza.com/_functions/checkWalletBalance", {
          params: { sellerId }
        });
        console.log("[GrowPlanPage] Wallet Balance Response", walletRes.data);
        const bal = Number(walletRes.data?.message?.RemainingBalance ?? walletRes.data?.RemainingBalance ?? 0);
        setWalletBalance(bal);
      } catch (err) {
        console.error("[GrowPlanPage] Wallet Balance API error:", err);
      }

      // 3. Fetch Seller Current Subscription
      if (sellerEmail) {
        console.log(`[GrowPlanPage] Fetching active subscription... GET https://haatzaseller.com/_functions/sellersubscription?email=${sellerEmail}`);
        try {
          const subRes = await axios.get("https://haatzaseller.com/_functions/sellersubscription", {
            params: { email: sellerEmail }
          });
          console.log("[GrowPlanPage] Seller Subscription Response", subRes.data);
          const orders = subRes.data?.message?.orders || [];
          if (orders.length > 0) {
            // Take the latest subscription order
            setActiveSubscription(orders[0]);
          }
        } catch (err) {
          console.error("[GrowPlanPage] Seller Subscription API error:", err);
        }

        // 4. Fetch Seller Profile
        console.log(`[GrowPlanPage] Fetching seller profile... GET /sellerdata?email=${sellerEmail}`);
        try {
          const profileRes = await sellerService.getUserProfile(sellerEmail);
          console.log("[GrowPlanPage] Seller Profile Response", profileRes);
          if (profileRes?.status === "success" || profileRes?.message) {
            setSellerProfile(profileRes.message);
          }
        } catch (err) {
          console.error("[GrowPlanPage] Seller Profile API error:", err);
        }
      }

    } catch (err) {
      console.error("[GrowPlanPage] Page initialization error:", err);
      setErrorMsg("Failed to initialize Grow Plan page data.");
    } finally {
      setLoadingPlans(false);
    }
  }, [sellerId, sellerEmail, mapPlansWithFeatures]);

  useEffect(() => {
    initPageData();
  }, [initPageData]);

  // Calculations for Plan Review page
  const planPrice = selectedPlan ? Number(selectedPlan.price || 0) : 0;
  
  // Wallet discount calculations
  const maxWalletRedeem = Math.min(walletBalance, planPrice);
  const walletRedeemedAmount = redeemWallet ? maxWalletRedeem : 0;
  
  // Total Price is the plan price
  const totalPrice = planPrice;
  
  // Payable amount = planPrice - wallet - referralDiscount
  const rawPayableAmount = planPrice - walletRedeemedAmount - referralDiscount;
  const payableAmount = Math.max(0, rawPayableAmount);

  // Handle Referral Check
  const handleApplyReferral = async () => {
    if (!referralCode.trim()) return;

    setCheckingReferral(true);
    setReferralMessage({ text: "", type: "" });
    setReferralDiscount(0);
    setAppliedReferralCode("");

    const enteredCode = referralCode.trim();

    console.log("[GrowPlanPage] Checking referral code:", referralCode);
    console.log("[GrowPlanPage] Referral Check URL:", `https://haatzaseller.com/_functions/referralCheck?referralCode=${referralCode}`);

    try {
      const res = await axios.get("https://haatzaseller.com/_functions/referralCheck", {
        params: { referralCode: enteredCode }
      });
      console.log("[GrowPlanPage] Referral Check Response:", res.data);

      const success =
        res.data?.status === "success" ||
        res.data?.success === true ||
        res.data?.message?.valid === true ||
        res.data?.message?.status === "success";

      const discountVal = Number(
        res.data?.message?.discount ||
        res.data?.message?.discountAmount ||
        res.data?.message?.amount ||
        res.data?.discount ||
        res.data?.discountAmount ||
        0
      );

      if (success) {
        if (discountVal > 0) {
          setReferralDiscount(discountVal);
          setAppliedReferralCode(enteredCode);
          setReferralMessage({
            text: `Referral code applied successfully! Saved ₹${discountVal}.`,
            type: "success"
          });
        } else {
          setReferralMessage({
            text: "Referral code is valid, but discount amount was not returned by backend.",
            type: "error"
          });
        }
      } else {
        const errMsg = res.data?.message?.text || res.data?.error || "Invalid referral code.";
        setReferralMessage({
          text: errMsg,
          type: "error"
        });
      }
    } catch (err) {
      console.error("[GrowPlanPage] Referral check error:", err);
      const errMsg =
        err.response?.data?.message?.text ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to verify referral code.";
      setReferralMessage({
        text: errMsg,
        type: "error"
      });
    } finally {
      setCheckingReferral(false);
    }
  };

  // Process subscription flow
  const handleProceedSubscription = async () => {
    setShowConfirmModal(false);

    if (paymentInProgressRef.current) {
      console.warn("[GrowPlanPage] A payment or subscription process is already running. Skipping duplicate call.");
      return;
    }

    paymentInProgressRef.current = true;
    setIsProcessing(true);
    setErrorMsg(null);

    const startDate = getTodayFormatted();

    try {
      if (payableAmount > 0) {
        // Razorpay Payment required
        const orderPayload = {
          sellerId,
          amount: Number(payableAmount)
        };
        console.log("[GrowPlanPage] Creating Razorpay Order payload: POST https://haatza.com/_functions/createRazorpayOrder", orderPayload);

        const orderRes = await axios.post("https://haatza.com/_functions/createRazorpayOrder", orderPayload);
        console.log("[GrowPlanPage] Create Order Payload:", orderPayload);
        console.log("[GrowPlanPage] Raw Create Order Response:", orderRes);

        const orderData =
          orderRes?.message?.order ||
          orderRes?.data?.message?.order ||
          orderRes?.order ||
          orderRes?.data?.order ||
          null;

        const orderId =
          orderData?.id ||
          orderRes?.message?.orderId ||
          orderRes?.data?.message?.orderId ||
          orderRes?.orderId ||
          orderRes?.data?.orderId ||
          orderRes?.id ||
          orderRes?.data?.id;

        const razorpayKey =
          orderRes?.message?.keyId ||
          orderRes?.data?.message?.keyId ||
          orderRes?.keyId ||
          orderRes?.data?.keyId;

        const amount =
          orderData?.amount ||
          Number(selectedPlan?.price || selectedPlan?.amount || 0) * 100;

        const currency =
          orderData?.currency || "INR";

        console.log("[GrowPlanPage] Extracted Order Data:", orderData);
        console.log("[GrowPlanPage] Extracted Order ID:", orderId);
        console.log("[GrowPlanPage] Extracted Razorpay Key:", razorpayKey);
        console.log("[GrowPlanPage] Extracted Amount:", amount);
        console.log("[GrowPlanPage] Extracted Currency:", currency);

        if (!orderId || !razorpayKey || !amount) {
          throw new Error(
            `Backend order response missing required Razorpay details. orderId=${orderId}, key=${Boolean(razorpayKey)}, amount=${amount}`
          );
        }

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Razorpay payment SDK failed to load. Please check your internet connection.");
        }

        const options = {
          key: razorpayKey,
          amount,
          currency,
          name: "Haatza",
          description: `${selectedPlan?.name || "Grow Plan"} Subscription`,
          order_id: orderId,
          handler: async function (response) {
            console.log("[GrowPlanPage] Razorpay Success Response:", response);

            try {
              if (!response.razorpay_payment_id) {
                throw new Error("Payment reference missing from gateway success response.");
              }

              const verifyPayload = {
                sellerId,
                amount: Number(selectedPlan?.price || selectedPlan?.amount || amount / 100),
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
                planId: selectedPlan?.id,
                planName: selectedPlan?.name,
              };

              console.log("[GrowPlanPage] Verify Payment Payload:", verifyPayload);

              const verifyRes = await sellerService.verifyRazorpayPayment(verifyPayload);

              console.log("[GrowPlanPage] Verify Payment Response:", verifyRes);

              const verified =
                verifyRes?.message?.verified === true ||
                verifyRes?.data?.message?.verified === true ||
                verifyRes?.verified === true ||
                verifyRes?.data?.verified === true;

              if (!verified) {
                throw new Error("Payment verification failed.");
              }

              const paymentId = response.razorpay_payment_id;
              if (processedPaymentRef.current.has(paymentId)) {
                console.log("[GrowPlanPage] Payment already processed, skipping verify/subscription:", paymentId);
                return;
              }
              processedPaymentRef.current.add(paymentId);

              // Store subscription details
              const storePayload = {
                sellerId,
                email: sellerEmail,
                planName: selectedPlan.name,
                planId: selectedPlan.id || selectedPlan._id || selectedPlan.planId,
                planPrice: Number(selectedPlan.price),
                planDuration: "1 Month",
                startDate,
                totalPrice: Number(totalPrice),
                payableAmount: Number(payableAmount),
                walletRedeemed: Number(walletRedeemedAmount),
                referralCode: appliedReferralCode || "",
                referralDiscount: Number(referralDiscount || 0),
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                paymentMethod: "razorpay",
                paymentStatus: "success"
              };

              console.log("[GrowPlanPage] Storing subscription order payload: POST https://haatzaseller.com/_functions/processSubscriptionOrder", storePayload);
              const storeRes = await axios.post("https://haatzaseller.com/_functions/processSubscriptionOrder", storePayload);
              console.log("[GrowPlanPage] Store Subscription Order Response", storeRes.data);

              // Refresh sellersubscription records from backend
              console.log(`[GrowPlanPage] Refreshing subscription records... GET https://haatzaseller.com/_functions/sellersubscription?email=${sellerEmail}`);
              try {
                const subRes = await axios.get("https://haatzaseller.com/_functions/sellersubscription", {
                  params: { email: sellerEmail }
                });
                console.log("[GrowPlanPage] Refreshed Subscription Response", subRes.data);
                const orders = subRes.data?.message?.orders || [];
                if (orders.length > 0) {
                  setActiveSubscription(orders[0]);
                }
              } catch (refreshErr) {
                console.warn("[GrowPlanPage] Failed to refresh subscription info:", refreshErr);
              }

              // Refresh wallet balance from backend
              console.log(`[GrowPlanPage] Refreshing wallet balance... GET https://haatza.com/_functions/checkWalletBalance?sellerId=${sellerId}`);
              try {
                const walletRes = await axios.get("https://haatza.com/_functions/checkWalletBalance", {
                  params: { sellerId }
                });
                const bal = Number(walletRes.data?.message?.RemainingBalance ?? walletRes.data?.RemainingBalance ?? 0);
                setWalletBalance(bal);
              } catch (balErr) {
                console.warn("[GrowPlanPage] Failed to refresh wallet balance:", balErr);
              }

              // Finished successfully
              setViewState("success");
            } catch (err) {
              console.error("[GrowPlanPage] Subscription storage/verification error:", err);
              setErrorMsg(err.message || "Failed to complete subscription processing.");
            } finally {
              setIsProcessing(false);
              paymentInProgressRef.current = false;
            }
          },
          prefill: {
            name: sellerProfile?.name || "",
            email: sellerEmail || "",
            contact: sellerProfile?.phone || "",
          },
          theme: {
            color: "#3399cc",
          },
          modal: {
            ondismiss: function () {
              console.log("[GrowPlanPage] Razorpay modal dismissed by user.");
              setIsProcessing(false);
              paymentInProgressRef.current = false;
              setErrorMsg("Payment checkout cancelled.");
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (resp) {
          console.error("[GrowPlanPage] Razorpay Payment failed:", resp.error);
          setIsProcessing(false);
          paymentInProgressRef.current = false;
          setErrorMsg(resp.error?.description || "Payment failed. Please try again.");
        });

        rzp.open();

      } else {
        // payableAmount is 0 (paid fully using wallet discount)
        const storePayload = {
          sellerId,
          email: sellerEmail,
          planName: selectedPlan.name,
          planId: selectedPlan.id || selectedPlan._id || selectedPlan.planId,
          planPrice: Number(selectedPlan.price),
          planDuration: "1 Month",
          startDate,
          totalPrice: Number(totalPrice),
          payableAmount: 0,
          walletRedeemed: Number(walletRedeemedAmount),
          referralCode: appliedReferralCode || "",
          referralDiscount: Number(referralDiscount || 0),
          paymentId: "wallet_redeem_" + Date.now(),
          orderId: "wallet_redeem_" + Date.now(),
          paymentMethod: "wallet",
          paymentStatus: "success"
        };

        console.log("[GrowPlanPage] Processing direct free/wallet subscription order: POST https://haatzaseller.com/_functions/processSubscriptionOrder", storePayload);
        const storeRes = await axios.post("https://haatzaseller.com/_functions/processSubscriptionOrder", storePayload);
        console.log("[GrowPlanPage] Direct Subscription Order Response", storeRes.data);

        // Refresh sellersubscription records from backend
        console.log(`[GrowPlanPage] Refreshing subscription records... GET https://haatzaseller.com/_functions/sellersubscription?email=${sellerEmail}`);
        try {
          const subRes = await axios.get("https://haatzaseller.com/_functions/sellersubscription", {
            params: { email: sellerEmail }
          });
          console.log("[GrowPlanPage] Refreshed Subscription Response", subRes.data);
          const orders = subRes.data?.message?.orders || [];
          if (orders.length > 0) {
            setActiveSubscription(orders[0]);
          }
        } catch (refreshErr) {
          console.warn("[GrowPlanPage] Failed to refresh subscription info:", refreshErr);
        }

        // Refresh wallet balance from backend
        console.log(`[GrowPlanPage] Refreshing wallet balance... GET https://haatza.com/_functions/checkWalletBalance?sellerId=${sellerId}`);
        try {
          const walletRes = await axios.get("https://haatza.com/_functions/checkWalletBalance", {
            params: { sellerId }
          });
          const bal = Number(walletRes.data?.message?.RemainingBalance ?? walletRes.data?.RemainingBalance ?? 0);
          setWalletBalance(bal);
        } catch (balErr) {
          console.warn("[GrowPlanPage] Failed to refresh wallet balance:", balErr);
        }

        setIsProcessing(false);
        paymentInProgressRef.current = false;
        setViewState("success");
      }

    } catch (err) {
      console.error("[GrowPlanPage] Subscription initiation error:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to subscribe. Please try again.");
      setIsProcessing(false);
      paymentInProgressRef.current = false;
    }
  };

  const handleResetFlow = () => {
    setViewState("plans");
    setRedeemWallet(false);
    setReferralCode("");
    setAppliedReferralCode("");
    setReferralDiscount(0);
    setReferralMessage({ text: "", type: "" });
    setErrorMsg(null);
  };

  if (loadingPlans) {
    return (
      <div className="grow-plan-container">
        <div className="grow-loading-overlay">
          <div className="grow-loading-spinner" />
          <p>Loading plans and billing status...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // 1. Success view State
  // ----------------------------------------
  if (viewState === "success") {
    return (
      <div className="grow-plan-container">
        <div className="subscription-success-card">
          <div className="success-check-badge">
            <Check size={40} />
          </div>
          <h1>Subscription Successful!</h1>
          <p>
            Congratulations! You have successfully subscribed to the <strong>{selectedPlan?.name} Plan</strong>.
            Your billing cycle has started, and benefits are now active on your seller dashboard.
          </p>
          <button className="btn-back-dashboard" onClick={() => { handleResetFlow(); navigate("/dashboard"); }}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // 2. Plan Review view State
  // ----------------------------------------
  if (viewState === "review") {
    return (
      <div className="grow-plan-container">
        <div className="grow-plan-breadcrumb">
          <span>Dashboard</span> &gt; <span>Grow Plan</span> &gt; <span className="active">Plan Review</span>
        </div>

        <div className="review-header-row">
          <button className="btn-back-plans" onClick={() => setViewState("plans")} title="Back to Plans">
            <ChevronLeft size={20} />
          </button>
          <div className="grow-plan-header">
            <h1>Plan Review</h1>
            <p>Review details, apply wallet balance discount, and confirm subscription to activate benefits.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="grow-error-banner">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)}>&times;</button>
          </div>
        )}

        <div className="review-grid">
          {/* Selected Plan Details Box */}
          <div className="review-card-details">
            <h2>Plan Details</h2>
            <div className="review-plan-details-info">
              <div className="review-plan-title-box">
                <span className="review-plan-name-label">{selectedPlan?.name} Plan</span>
                <span className="review-plan-price-label">₹{selectedPlan?.price}</span>
              </div>

              <div className="plan-features-title">What's included in this plan:</div>
              <ul className="plan-features-list">
                {selectedPlan?.features?.map((feat, idx) => (
                  <li className="plan-feature-item" key={idx}>
                    <CheckCircle2 size={16} className="feature-check-icon" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Pricing breakdown and actions */}
          <div className="checkout-card">
            <h2>Pricing Summary</h2>

            {/* Start Date */}
            <div className="start-date-container">
              <label>Start Date</label>
              <div className="start-date-input-wrapper">{getTodayFormatted()}</div>
            </div>

            {/* Wallet redemption Checkbox */}
            {walletBalance > 0 && (
              <div className="wallet-redeem-row">
                <input
                  type="checkbox"
                  id="walletRedeemCheck"
                  className="wallet-checkbox-input"
                  checked={redeemWallet}
                  onChange={(e) => setRedeemWallet(e.target.checked)}
                />
                <label htmlFor="walletRedeemCheck" className="wallet-redeem-label">
                  Redeem Wallet Balance? ₹{walletBalance.toFixed(2)}
                </label>
              </div>
            )}

            {/* Coupon Referral Input */}
            <div className="referral-input-row">
              <input
                type="text"
                className="referral-text-input"
                placeholder="Enter Referral Code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                disabled={checkingReferral || appliedReferralCode !== ""}
              />
              <button
                type="button"
                className="btn-apply-coupon"
                onClick={handleApplyReferral}
                disabled={checkingReferral || !referralCode.trim() || appliedReferralCode !== ""}
              >
                {checkingReferral ? "Applying..." : "Apply"}
              </button>
            </div>

            {referralMessage.text && (
              <div className={`referral-status-msg ${referralMessage.type}`}>
                {referralMessage.text}
              </div>
            )}

            {/* Checkout Pricing breakdown */}
            <div className="price-breakdown-list">
              <div className="breakdown-row">
                <span>Plan Price</span>
                <span>₹{planPrice}</span>
              </div>
              <div className="breakdown-row">
                <span>Plan Duration</span>
                <span>1 Month</span>
              </div>
              <div className="breakdown-row highlight">
                <span>Total Price</span>
                <span>₹{totalPrice}</span>
              </div>

              {walletRedeemedAmount > 0 && (
                <div className="breakdown-row wallet">
                  <span>Wallet Redeemed</span>
                  <span>- ₹{walletRedeemedAmount}</span>
                </div>
              )}

              {referralDiscount > 0 && (
                <div className="breakdown-row discount">
                  <span>Referral Discount</span>
                  <span>- ₹{referralDiscount}</span>
                </div>
              )}

              <div className="breakdown-row total-payable">
                <span>Payable Amount</span>
                <span>₹{payableAmount}</span>
              </div>
            </div>

            <button
              className="btn-subscribe-now"
              onClick={() => setShowConfirmModal(true)}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Subscribe Now"}
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="confirm-modal-overlay">
            <div className="confirm-modal-container">
              <div className="confirm-modal-title">
                Would you like to proceed with subscribing to this plan for ₹{payableAmount}?
              </div>
              <div className="confirm-modal-payable-amount">
                Payable Amount ₹{payableAmount}
              </div>
              <div className="confirm-modal-actions">
                <button className="btn-confirm-yes" onClick={handleProceedSubscription}>
                  Yes
                </button>
                <button className="btn-confirm-no" onClick={() => setShowConfirmModal(false)}>
                  No
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------
  // 3. Plans Grid view State (Web View)
  // ----------------------------------------
  return (
    <div className="grow-plan-container">
      <div className="grow-plan-breadcrumb">
        <span>Dashboard</span> &gt; <span className="active">Grow Plan</span>
      </div>

      <div className="grow-plan-header">
        <h1>Grow Plan</h1>
        <p>
          Power Up Your Business with Haatza Seller Plans. The Haatza Seller App is designed to empower sellers at every stage — whether you're starting small or scaling up rapidly. Our pricing plans are crafted to give you the tools you need to sell better, grow faster, and manage smarter.
        </p>
      </div>

      {activeSubscription && (
        <div className="current-subscription-banner">
          <div className="current-subscription-info">
            <h3>Active Subscription Found</h3>
            <p>
              You are currently subscribed to the <strong>{activeSubscription.planName || activeSubscription.plan} Plan</strong> (Price: ₹{activeSubscription.planPrice || activeSubscription.amount}).
            </p>
          </div>
          <div className="current-subscription-info" style={{ textAlign: "right" }}>
            <p><strong>Start Date:</strong> {activeSubscription.startDate}</p>
            <p><strong>Duration:</strong> {activeSubscription.planDuration || "1 Month"}</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="grow-error-banner">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}>&times;</button>
        </div>
      )}

      {/* Grid of pricing cards */}
      <div className="plans-grid">
        {plans.map((plan) => {
          const isSelected = selectedPlan?.id === plan.id;
          return (
            <div
              className={`plan-card ${isSelected ? "selected" : ""} ${plan.recommended ? "recommended" : ""}`}
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
            >
              {plan.recommended && (
                <div className="recommended-badge">Recommended</div>
              )}

              <div className="plan-name-row">
                <span className="plan-name">{plan.name}</span>
                <div className="plan-selector-radio">
                  <div className="plan-selector-inner" />
                </div>
              </div>

              <div className="plan-price-row">
                <span className="plan-price">₹{plan.price}</span>
                <span className="plan-duration"> / month</span>
              </div>

              <div className="plan-features-title">What's included:</div>
              <ul className="plan-features-list">
                {plan.features?.map((feat, idx) => (
                  <li className="plan-feature-item" key={idx}>
                    <CheckCircle2 size={16} className="feature-check-icon" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Bottom selector info bar */}
      <div className="plans-action-bar">
        <div className="plans-action-content">
          <div className="selected-plan-summary-text">
            Selected Plan: <strong>{selectedPlan?.name || "None"}</strong> (₹{selectedPlan?.price || 0}/month)
          </div>
          <button
            className="btn-continue"
            disabled={!selectedPlan}
            onClick={() => setViewState("review")}
          >
            <span>Continue</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GrowPlanPage;
