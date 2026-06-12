import React, { useState, useRef } from "react";import { useNavigate } from "react-router-dom";
import SignUpForm from "../../components/auth/SignUpForm/SignUpForm";
import { registerUser } from "../../api/RegisterApi";
import { saveUser } from '../../utils/userStore';
export let registeredEmail = '';
/**
 * SignUpPage — route-level container for the sign-up / registration flow
 *
 * Mounted at: /signup
 *
 * Owns:
 *   - All API calls (registerUser, which internally calls checkSeller)
 *   - Form state
 *   - Success / error state derived from API responses
 *   - Navigation via react-router-dom useNavigate
 *   - Redirects to /signin after successful registration
 */
function SignUpPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // ─── Field change handler ─────────────────────────────────────────────────
  const handleFormChange = (field, value) => {
    setError("");
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ─── Register handler ─────────────────────────────────────────────────────
 const isSubmitting = useRef(false);

const handleRegister = async () => {
  if (isSubmitting.current) return; // prevent duplicate calls
  isSubmitting.current = true;

  setError("");
  setSuccess("");
  setLoading(true);

  try {
    const result = await registerUser(form);
console.log("[SignUpPage] Registration API full response:", JSON.stringify(result, null, 2));
console.log("[SignUpPage] Seller ID:", result.sellerId || "Not found in response");
    sessionStorage.setItem('pendingEmail', form.email.toLowerCase().trim());
    // Also store email under the keys the listing flow checks
    sessionStorage.setItem('userEmail', form.email.toLowerCase().trim());
    localStorage.setItem('userEmail', form.email.toLowerCase().trim());

    // sellerId is returned by registerUser if backend includes it
    if (result.sellerId) {


  console.log("[SignUpPage] ✅ sellerId confirmed stored:", result.sellerId);
} else {
  console.warn("[SignUpPage] ⚠️ sellerId missing from registration result — will try to resolve after onboarding");
}
     // ✅ ADD THIS LINE
    setSuccess(
      typeof result.message === "string"
        ? result.message
        : "Account created successfully!"
    );
    setTimeout(() => navigate("/onboarding", { state: { email: form.email.toLowerCase().trim() } }), 1500);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
    isSubmitting.current = false;
  }
};
  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <SignUpForm
      form={form}
      onFormChange={handleFormChange}
      loading={loading}
      error={error}
      success={success}
      onRegister={handleRegister}
      onNavigateSignIn={() => navigate("/signin")}
    />
  );
}

export default SignUpPage;