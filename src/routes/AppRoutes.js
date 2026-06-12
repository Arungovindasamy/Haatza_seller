import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import SignInPage from "../pages/auth/SignInPage";
import SignUpPage from "../pages/auth/SignUpPage";
import OtpPage from "../pages/auth/OtpPage";
import OnboardingPage from "../pages/Onboarding/Onboarding";
import DashboardLayout from "../components/Layout/DashboardLayout/DashboardLayout"; // ← adjust path

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signup" replace />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/otp" element={<OtpPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/dashboard/*" element={<DashboardLayout />} />
      {/* Catch-all — only fires for truly unknown routes */}
      <Route path="*" element={<Navigate to="/signup" replace />} />
    </Routes>
  );
}
export default AppRoutes;