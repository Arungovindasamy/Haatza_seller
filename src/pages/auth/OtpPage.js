// OtpPage.js
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import OtpScreen from "../../components/auth/OtpScreen/OtpScreen";
import { generateOtp, verifyOtp, resendOtp } from "../../api/OtpApi";
import { checkOnboardStatus } from "../../api/OnboardStatusApi";
const OTP_LENGTH    = 6;
const TIMER_SECONDS = 60;

function OtpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeState    = location.state || {};
  const phone         = routeState.phone || routeState.contact || "";
  const emailForStatus = routeState.email;

  const [otp,          setOtp]          = useState(Array(OTP_LENGTH).fill(""));
  const [timeLeft,     setTimeLeft]     = useState(TIMER_SECONDS);
  const [timerActive,  setTimerActive]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [resendLoading,setResendLoading]= useState(false);
  const [error,        setError]        = useState("");
  const [successMsg,   setSuccessMsg]   = useState("");
  const [otpGenerated, setOtpGenerated] = useState(false);

  const timerRef  = useRef(null);
  const otpSentRef = useRef(false);

  // ─── Timer ────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    setTimeLeft(TIMER_SECONDS);
    setTimerActive(true);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  // ─── Generate OTP on Mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!phone) {
      setError("Phone number not found. Please go back and try again.");
      return;
    }
    if (otpSentRef.current) return;
    otpSentRef.current = true;

    const sendOtp = async () => {
      try {
        setLoading(true);
        console.log("Generating OTP...");
        await generateOtp(phone);
        setOtpGenerated(true);
        setSuccessMsg("OTP sent to " + phone);
        setTimeout(() => setSuccessMsg(""), 3000);
        startTimer();
      } catch (err) {
        setError(err.message || "Could not send OTP. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    sendOtp();
  }, [phone, startTimer]);

  // ─── Verify OTP ───────────────────────────────────────────────────────────
  const handleVerify = () => {
    const code = otp.join("");

    if (!otpGenerated) { setError("OTP was not generated. Please resend."); return; }
    if (code.length < OTP_LENGTH) { setError("Please enter all 6 digits."); return; }

    setLoading(true);
    setError("");

    verifyOtp(phone, code)
      .then(async (verifyResponse) => {
        clearInterval(timerRef.current);
        setSuccessMsg("Verified successfully! Checking your account…");

        // ── Extract email from verify response ─────────────────────────
        const emailFromResponse =
  verifyResponse?.message?.seller?.email ||
  verifyResponse?.seller?.email          ||
  verifyResponse?.email                  ||
  verifyResponse?.data?.email            ||
  null;

const sellerIdFromOtp =
  verifyResponse?.message?.seller?.sellerId ||
  verifyResponse?.seller?.sellerId          ||
  verifyResponse?.sellerId                  ||
  "";

const sellerPinCodeFromOtp =
  verifyResponse?.message?.seller?.pincode       ||   // ← actual response key (lowercase)
  verifyResponse?.message?.seller?.sellerPinCode ||
  verifyResponse?.message?.seller?.pinCode       ||
  verifyResponse?.seller?.pincode                ||
  verifyResponse?.seller?.sellerPinCode          ||
  verifyResponse?.seller?.pinCode                ||
  verifyResponse?.sellerPinCode                  ||
  verifyResponse?.pinCode                        ||
  "";

console.log("[OtpPage] Full verify response:", JSON.stringify(verifyResponse, null, 2));
console.log("[OtpPage] Seller ID from OTP verify:", sellerIdFromOtp || "Not found in response");
if (sellerIdFromOtp) {
  sessionStorage.setItem("__haatza_sellerId", String(sellerIdFromOtp));
  localStorage.setItem("__haatza_sellerId", String(sellerIdFromOtp));
  sessionStorage.setItem("sellerId", String(sellerIdFromOtp));
  localStorage.setItem("sellerId", String(sellerIdFromOtp));
  console.log("[OtpPage] ✅ sellerId stored:", sellerIdFromOtp);
}

if (sellerPinCodeFromOtp && /^\d{6}$/.test(String(sellerPinCodeFromOtp).trim())) {
  const pin = String(sellerPinCodeFromOtp).trim();
  sessionStorage.setItem("__haatza_sellerPinCode", pin);
  localStorage.setItem("__haatza_sellerPinCode", pin);
  sessionStorage.setItem("sellerPinCode", pin);
  localStorage.setItem("sellerPinCode", pin);
  console.log("[OtpPage] ✅ sellerPinCode stored:", pin);
} else if (sellerPinCodeFromOtp) {
  console.warn("[OtpPage] ⚠️ sellerPinCode from OTP response is not a valid 6-digit pin:", sellerPinCodeFromOtp);
}



        const emailToUse = (emailFromResponse || emailForStatus || "")
          .trim()
          .toLowerCase();

        console.log("[OtpPage] Resolved email:", emailToUse,
          "| from response:", emailFromResponse,
          "| from routeState:", emailForStatus);

        if (!emailToUse) {
          console.error("[OtpPage] ❌ No email found — cannot proceed.");
          setError("Unable to retrieve your account email. Please sign in again.");
          setLoading(false);
          return;
        }

        // ── SAVE TO BOTH STORAGES IMMEDIATELY ──────────────────────────
        // This is the critical step that was missing for phone-based login
        sessionStorage.setItem("pendingEmail", emailToUse);
        localStorage.setItem("userEmail",      emailToUse);
        console.log("[OtpPage] ✅ Email saved to storage:", emailToUse);

try {
  console.log("[OtpPage] Checking onboard status for:", emailToUse);
          const isOnboarded = await checkOnboardStatus(emailToUse);

          if (isOnboarded) {
            // ✅ Navigate to dashboard and pass email in state
            navigate("/dashboard", {
              state: {
                email: emailToUse,   // ← always pass email in state
                phone,
                ...routeState,
              },
            });
          } else {
            navigate("/onboarding", {
              state: {
                email: emailToUse,   // ← always pass email in state
                phone,
                ...routeState,
              },
            });
          }
        } catch (statusErr) {
          console.error("[OtpPage] Onboard status check failed:", statusErr);
          // Email is already saved — navigate anyway
          navigate("/dashboard", {
            state: {
              email: emailToUse,
              phone,
              ...routeState,
            },
          });
        }
      })
      .catch((err) => {
        setError(err.message || "Invalid OTP. Please try again.");
        setOtp(Array(OTP_LENGTH).fill(""));
      })
      .finally(() => setLoading(false));
  };

  // ─── Resend OTP ───────────────────────────────────────────────────────────
  const handleResend = () => {
    setResendLoading(true);
    setError("");
    setOtp(Array(OTP_LENGTH).fill(""));

    resendOtp(phone)
      .then(() => {
        setSuccessMsg("OTP resent to " + phone);
        setTimeout(() => setSuccessMsg(""), 3000);
        startTimer();
      })
      .catch((err) => {
        setError(err.message || "Could not resend OTP. Please try again.");
      })
      .finally(() => setResendLoading(false));
  };

  // ─── Change Number ────────────────────────────────────────────────────────
  const handleChangeNumber = () => {
    clearInterval(timerRef.current);
    navigate("/signin", { state: { prefillContact: phone } });
  };

  const handleOtpChange = (newOtpArray) => {
    setOtp(newOtpArray);
    if (error) setError("");
  };

  return (
    <OtpScreen
      phone={phone}
      otp={otp}
      onOtpChange={handleOtpChange}
      timeLeft={timeLeft}
      timerActive={timerActive}
      loading={loading}
      resendLoading={resendLoading}
      error={error}
      successMsg={successMsg}
      onVerify={handleVerify}
      onResend={handleResend}
      onChangeNumber={handleChangeNumber}
    />
  );
}

export default OtpPage;