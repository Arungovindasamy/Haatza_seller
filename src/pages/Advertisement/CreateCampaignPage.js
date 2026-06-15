import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Wallet,
  Bell,
  Check,
  AlertCircle,
  Plus,
  RefreshCw,
  Clock,
  Calendar
} from "lucide-react";
import { getSellerId } from "../../utils/sellerSession";
import { advertisementService, walletService } from "../../services/sellerService";
import "./CreateCampaignPage.css";

const CreateCampaignPage = () => {
  const sellerId = getSellerId();
  const navigate = useNavigate();

  // API Data
  const [campaignTypes, setCampaignTypes] = useState([]);
  const [budgetOptions, setBudgetOptions] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [selectedType, setSelectedType] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("12:00");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("12:00");
  const [cpcGoal, setCpcGoal] = useState("");
  const [selectedBudgetMode, setSelectedBudgetMode] = useState("option"); // 'option' | 'manual'
  const [selectedBudgetOption, setSelectedBudgetOption] = useState("");
  const [manualBudget, setManualBudget] = useState("");

  // validation state
  const [validationErrors, setValidationErrors] = useState({});

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Load Data
  const loadFormData = useCallback(async () => {
    if (!sellerId) {
      setError("Seller session not found. Please login again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [typesRes, budgetRes, walletRes] = await Promise.all([
        advertisementService.getCampaignTypes(sellerId).catch(err => {
          console.warn("[CreateCampaignPage] getCampaignTypes failed:", err);
          throw err;
        }),
        advertisementService.getBudgetOptions(sellerId).catch(err => {
          console.warn("[CreateCampaignPage] getBudgetOptions failed:", err);
          throw err;
        }),
        walletService.getWalletSummary(sellerId).catch(err => {
          console.warn("[CreateCampaignPage] getWalletSummary failed:", err);
          throw err;
        })
      ]);

      // Parse types
      const parsedTypes = typesRes?.data || typesRes?.message?.types || typesRes?.types || typesRes || [];
      setCampaignTypes(Array.isArray(parsedTypes) ? parsedTypes : []);
      // Auto-select first available type
      const firstAvail = parsedTypes.find(t => t.isAvailable !== false);
      if (firstAvail) setSelectedType(firstAvail.name || firstAvail.title || "");

      // Parse budgets
      const parsedBudgets = budgetRes?.data || budgetRes?.message?.budgets || budgetRes?.budgets || budgetRes || [];
      const formattedBudgets = Array.isArray(parsedBudgets) ? parsedBudgets : [250, 550, 700];
      setBudgetOptions(formattedBudgets);
      if (formattedBudgets.length > 0) setSelectedBudgetOption(formattedBudgets[0].toString());

      // Parse wallet balance
      const parsedBalance = walletRes?.data?.RemainingBalance || walletRes?.message?.RemainingBalance || walletRes?.RemainingBalance || 0;
      setWalletBalance(Number(parsedBalance));

      // Prefill campaign name
      const now = new Date();
      const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
      // Format time as hh:mm
      let hours = now.getHours();
      let minutes = now.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const minutesStr = minutes < 10 ? "0" + minutes : minutes;
      const timeStr = `${hours}:${minutesStr} ${ampm}`;
      
      setCampaignName(`New Campaign ${dateStr} ${timeStr}`);

    } catch (err) {
      console.error("[CreateCampaignPage] Failed loading options:", err);
      setError("Failed to fetch campaign creation criteria. Please check connection.");
      showToast("Error loading page configurations", "error");
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  // Validations
  const validateForm = () => {
    const errors = {};
    if (!selectedType) errors.type = "Campaign Type is required.";
    if (!campaignName.trim()) {
      errors.name = "Campaign Name is required.";
    } else if (campaignName.length > 40) {
      errors.name = "Campaign Name cannot exceed 40 characters.";
    }

    if (!startDate) errors.startDate = "Start Date is required.";
    if (!startTime) errors.startTime = "Start Time is required.";

    if (selectedBudgetMode === "option") {
      if (!selectedBudgetOption) errors.budget = "Daily Budget option is required.";
    } else {
      if (!manualBudget) {
        errors.budget = "Daily Budget amount is required.";
      } else {
        const num = Number(manualBudget);
        if (isNaN(num) || num <= 0) {
          errors.budget = "Daily Budget must be a number greater than 0.";
        }
      }
    }

    if (hasEndDate) {
      if (!endDate) {
        errors.endDate = "End Date is required.";
      } else {
        const start = new Date(`${startDate}T${startTime}`);
        const end = new Date(`${endDate}T${endTime}`);
        if (end < start) {
          errors.endDate = "End date and time cannot be before start date and time.";
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast("Please fix validation errors", "error");
      return;
    }

    setSubmitting(true);
    const budgetVal = selectedBudgetMode === "option" ? Number(selectedBudgetOption) : Number(manualBudget);
    const payload = {
      sellerId,
      campaignType: selectedType,
      campaignName: campaignName.trim(),
      startDate,
      startTime,
      endDate: hasEndDate ? endDate : null,
      endTime: hasEndDate ? endTime : null,
      cpcGoal: cpcGoal ? Number(cpcGoal) : null,
      dailyBudget: budgetVal,
    };

    try {
      await advertisementService.createCampaign(payload);
      showToast("Campaign created successfully!");
      setTimeout(() => {
        navigate("/advertisement");
      }, 1500);
    } catch (err) {
      console.error("[CreateCampaignPage] Creation failed:", err);
      showToast("Failed to launch campaign", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderSkeletons = () => (
    <div className="cc-skeleton-layout">
      <div className="skeleton-form-card skeleton-pulse" style={{ height: "600px", borderRadius: "14px", background: "#e2e8f0" }} />
    </div>
  );

  return (
    <div className="cc-page-root">
      {toast && (
        <div className={`cc-toast-banner ${toast.type}`}>
          <AlertCircle size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="cc-page-header">
        <div className="cc-header-left">
          <button className="back-arrow-btn" onClick={() => navigate("/advertisement")} aria-label="Go Back">
            <ChevronLeft size={24} />
          </button>
          <div>
            <nav className="cc-breadcrumb">
              <span>Advertisement</span> &gt; <span className="active">Create Campaign</span>
            </nav>
            <h1 className="cc-page-title">Create New Campaign</h1>
          </div>
        </div>
        <div className="cc-header-right">
          <button className="nav-icon-btn" onClick={() => navigate("/wallet")} aria-label="Wallet">
            <Wallet size={20} />
          </button>
          <button className="nav-icon-btn" onClick={() => navigate("/notifications")} aria-label="Notifications">
            <Bell size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        renderSkeletons()
      ) : error ? (
        <div className="cc-error-container">
          <div className="cc-error-card">
            <AlertCircle size={48} className="error-icon" />
            <h3>Configuration Error</h3>
            <p>{error}</p>
            <button className="btn-retry-sync" onClick={loadFormData}>
              <RefreshCw size={16} />
              <span>Retry Load</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleFormSubmit} className="cc-form-layout">
          <div className="cc-grid-main">
            {/* Form Fields Card */}
            <div className="cc-fields-card">
              {/* 1. Campaign Type */}
              <div className="form-group-section">
                <label className="section-label-main">1. Select Campaign Type</label>
                <div className="type-selection-cards">
                  {campaignTypes.map((type, idx) => {
                    const name = type.name || type.title || "";
                    const isAvailable = type.isAvailable !== false;
                    const isRecommended = type.recommended === true;
                    const isSelected = selectedType === name;

                    return (
                      <div
                        key={idx}
                        className={`type-card ${isSelected ? "selected" : ""} ${!isAvailable ? "unavailable" : ""}`}
                        onClick={() => {
                          if (isAvailable) {
                            setSelectedType(name);
                            setValidationErrors(prev => ({ ...prev, type: null }));
                          }
                        }}
                      >
                        <div className="type-card-header">
                          <span className="type-title">{name}</span>
                          <div className="type-badges">
                            {isRecommended && <span className="badge-recommended">Recommended</span>}
                            {!isAvailable && <span className="badge-unavailable">Currently unavailable</span>}
                          </div>
                        </div>
                        <p className="type-description">
                          {type.description || "Optimize visibility for your catalogs automatically with bidding metrics."}
                        </p>
                        {isSelected && isAvailable && (
                          <div className="selected-check-bubble">
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {validationErrors.type && <span className="field-error-text">{validationErrors.type}</span>}
              </div>

              {/* 2. Campaign Name */}
              <div className="form-group-section">
                <label className="section-label-main">2. Campaign Name</label>
                <div className="input-with-counter">
                  <input
                    type="text"
                    placeholder="Enter campaign name"
                    value={campaignName}
                    onChange={(e) => {
                      setCampaignName(e.target.value);
                      setValidationErrors(prev => ({ ...prev, name: null }));
                    }}
                    className={`text-input ${validationErrors.name ? "error" : ""}`}
                    maxLength={40}
                  />
                  <span className="char-counter">{campaignName.length}/40</span>
                </div>
                {validationErrors.name && <span className="field-error-text">{validationErrors.name}</span>}
              </div>

              {/* 3. Select Duration */}
              <div className="form-group-section">
                <label className="section-label-main">3. Select Duration</label>
                <div className="duration-inputs-row">
                  <div className="date-time-box">
                    <span className="sub-label">Start Date</span>
                    <div className="icon-input-wrap">
                      <Calendar size={16} className="input-icon" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setValidationErrors(prev => ({ ...prev, startDate: null }));
                        }}
                        className="date-input"
                      />
                    </div>
                  </div>
                  <div className="date-time-box">
                    <span className="sub-label">Start Time</span>
                    <div className="icon-input-wrap">
                      <Clock size={16} className="input-icon" />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => {
                          setStartTime(e.target.value);
                          setValidationErrors(prev => ({ ...prev, startTime: null }));
                        }}
                        className="date-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="checkbox-wrap">
                  <input
                    type="checkbox"
                    id="setEndDateCheckbox"
                    checked={hasEndDate}
                    onChange={(e) => {
                      setHasEndDate(e.target.checked);
                      if (e.target.checked && !endDate) {
                        setEndDate(startDate);
                      }
                      setValidationErrors(prev => ({ ...prev, endDate: null }));
                    }}
                  />
                  <label htmlFor="setEndDateCheckbox">Set an End Date</label>
                </div>

                {hasEndDate && (
                  <div className="duration-inputs-row ending-row">
                    <div className="date-time-box">
                      <span className="sub-label">End Date</span>
                      <div className="icon-input-wrap">
                        <Calendar size={16} className="input-icon" />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value);
                            setValidationErrors(prev => ({ ...prev, endDate: null }));
                          }}
                          className={`date-input ${validationErrors.endDate ? "error" : ""}`}
                        />
                      </div>
                    </div>
                    <div className="date-time-box">
                      <span className="sub-label">End Time</span>
                      <div className="icon-input-wrap">
                        <Clock size={16} className="input-icon" />
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => {
                            setEndTime(e.target.value);
                            setValidationErrors(prev => ({ ...prev, endDate: null }));
                          }}
                          className="date-input"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {validationErrors.endDate && <span className="field-error-text">{validationErrors.endDate}</span>}
              </div>

              {/* 4. CPC Goal */}
              <div className="form-group-section">
                <div className="label-with-tip">
                  <label className="section-label-main">4. CPC Goal (Optional)</label>
                  <span className="field-tip">Set your target cost per click</span>
                </div>
                <div className="cpc-input-wrapper">
                  <span className="currency-prefix">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Leave blank for maximum reach"
                    value={cpcGoal}
                    onChange={(e) => setCpcGoal(e.target.value)}
                    className="cpc-input"
                  />
                </div>
                <p className="cpc-instructions">
                  Haatza will aim to get more clicks at or below this amount. Leave blank for maximum reach.
                </p>
              </div>

              {/* 5. Daily Budget */}
              <div className="form-group-section">
                <label className="section-label-main">5. Add Daily Budget</label>
                
                <div className="budget-modes-selectors">
                  <div
                    className={`budget-mode-card ${selectedBudgetMode === "option" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedBudgetMode("option");
                      setValidationErrors(prev => ({ ...prev, budget: null }));
                    }}
                  >
                    <div className="radio-check-row">
                      <div className={`radio-circle ${selectedBudgetMode === "option" ? "checked" : ""}`}>
                        {selectedBudgetMode === "option" && <div className="radio-dot" />}
                      </div>
                      <span>Select a budget option</span>
                    </div>

                    <div className="preset-budget-options">
                      {budgetOptions.map((budgetOpt, idx) => {
                        const optStr = budgetOpt.toString();
                        const isPresetSelected = selectedBudgetOption === optStr && selectedBudgetMode === "option";

                        return (
                          <button
                            key={idx}
                            type="button"
                            className={`preset-btn ${isPresetSelected ? "selected" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBudgetMode("option");
                              setSelectedBudgetOption(optStr);
                              setValidationErrors(prev => ({ ...prev, budget: null }));
                            }}
                          >
                            {isPresetSelected && <Check size={12} className="check-icon" />}
                            <span>₹{budgetOpt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    className={`budget-mode-card ${selectedBudgetMode === "manual" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedBudgetMode("manual");
                      setValidationErrors(prev => ({ ...prev, budget: null }));
                    }}
                  >
                    <div className="radio-check-row">
                      <div className={`radio-circle ${selectedBudgetMode === "manual" ? "checked" : ""}`}>
                        {selectedBudgetMode === "manual" && <div className="radio-dot" />}
                      </div>
                      <span>Select budget manually</span>
                    </div>

                    {selectedBudgetMode === "manual" && (
                      <div className="manual-budget-input-wrap">
                        <span className="currency-prefix">₹</span>
                        <input
                          type="number"
                          placeholder="Enter daily limit"
                          value={manualBudget}
                          onChange={(e) => {
                            setManualBudget(e.target.value);
                            setValidationErrors(prev => ({ ...prev, budget: null }));
                          }}
                          className={`manual-input ${validationErrors.budget && selectedBudgetMode === "manual" ? "error" : ""}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {validationErrors.budget && <span className="field-error-text">{validationErrors.budget}</span>}
                <p className="cpc-instructions warning-note">
                  Your catalogs lose over 10k+ customer searches as daily budget gets over.
                </p>
              </div>
            </div>

            {/* Right Sticky Summary panel */}
            <div className="cc-summary-card">
              <h3>Campaign Launch Control</h3>
              
              <div className="summary-details-list">
                <div className="summary-item">
                  <span className="sum-label">Campaign Type:</span>
                  <span className="sum-val">{selectedType || "Not selected"}</span>
                </div>
                <div className="summary-item">
                  <span className="sum-label">Daily Budget:</span>
                  <span className="sum-val text-primary">
                    ₹{selectedBudgetMode === "option" ? selectedBudgetOption || "0" : manualBudget || "0"}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="sum-label">Duration:</span>
                  <span className="sum-val">
                    {startDate} {hasEndDate ? `to ${endDate}` : "(Ongoing)"}
                  </span>
                </div>
              </div>

              <div className="wallet-balance-callout">
                <div className="balance-labels">
                  <span className="lbl">Current Balance:</span>
                  <span className="val">₹{walletBalance.toFixed(2)}</span>
                </div>
                <button
                  type="button"
                  className="btn-add-funds-cc"
                  onClick={() => navigate("/wallet")}
                >
                  <Plus size={14} />
                  <span>Add Funds</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-launch-campaign"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="spinner-icon" />
                    <span>Launching Campaign...</span>
                  </>
                ) : (
                  <span>Continue</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateCampaignPage;
