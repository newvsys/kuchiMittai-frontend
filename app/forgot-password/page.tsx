"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

const showToast = async (type: "error" | "success", msg: string) => {
  const { default: toast } = await import("react-hot-toast");
  toast[type](msg);
};

const ForgotPasswordPage = () => {
  const [step, setStep] = useState<'request' | 'verify' | 'reset' | 'done'>("request");
  const [otpTimer, setOtpTimer] = useState(0);
  const [resendEnabled, setResendEnabled] = useState(false);
  const router = useRouter();
  const [emailOrMobile, setEmailOrMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ emailOrMobile: "", otp: "", newPassword: "", confirmPassword: "" });

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "verify" && otpTimer > 0) {
      timer = setTimeout(() => {
        setOtpTimer(otpTimer - 1);
      }, 1000);
    } else if (step === "verify" && otpTimer === 0) {
      setResendEnabled(true);
    }
    return () => clearTimeout(timer);
  }, [step, otpTimer]);

  // Step 1: Send OTP using /api/generate-otp
  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    if (!emailOrMobile.trim()) {
      setFieldErrors(prev => ({ ...prev, emailOrMobile: "This field is required" }));
      return;
    }
    setFieldErrors(prev => ({ ...prev, emailOrMobile: "" }));
    setLoading(true);
    setMessage("");
    setOtpTimer(30);
    setResendEnabled(false);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailOrMobile);
      const isMobile = /^\d{10}$/.test(emailOrMobile);
      if (!isMobile) {
        setMessage("");
        showToast("error", "Please enter a valid 10-digit mobile number.");
        setLoading(false);
        return;
      }
      // Get deviceId and ipAddress (IP fetch is non-blocking — capped at 1.5 s)
      const deviceId = navigator.userAgent;
      let ipAddress = "";
      const ipPromise = fetch("https://api.ipify.org?format=json")
        .then(r => r.json())
        .then(d => { ipAddress = d.ip || ""; })
        .catch(() => {});
      await Promise.race([ipPromise, new Promise(r => setTimeout(r, 1500))]);
      const payload = {
        phone: isMobile ? emailOrMobile : "",
        email: isEmail ? emailOrMobile : "",
        purpose: "forgot-password",
        ipAddress,
        deviceId
      };
      const res = await fetch(`${baseUrl}/user/generate-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.responseStatus && data.responseStatus.toLowerCase() === "success") {
        setStep("verify");
        setMessage("");
        showToast("success", data.responseMessage || `OTP sent successfully`);
      } else {
        setMessage(data.responseMessage || "Failed to send OTP.");
        showToast("error", data.responseMessage || "Failed to send OTP.");
      }
    } catch (err) {
      setMessage("Error sending OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP using /api/verify-otp
  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    if (!otp.trim()) {
      setFieldErrors(prev => ({ ...prev, otp: "This field is required" }));
      return;
    }
    setFieldErrors(prev => ({ ...prev, otp: "" }));
    setLoading(true);
    setMessage("");
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const isMobile = /^\d{10}$/.test(emailOrMobile);
      if (!isMobile) {
        setMessage("OTP verification requires a valid 10-digit mobile number.");
        setLoading(false);
        return;
      }
      const payload = {
        phone: emailOrMobile,
        otp,
        purpose: "forgot-password"
      };
      const res = await fetch(`${baseUrl}/user/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.responseStatus && data.responseStatus.toLowerCase() === "success") {
        setStep("reset");
        setMessage("");
        showToast("success", data.responseMessage || "OTP verified successfully");
      } else {
        setMessage(data.responseMessage || "Invalid OTP.");
        showToast("error", data.responseMessage || "Invalid OTP.");
      }
    } catch (err) {
      setMessage("Error verifying OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password using /api/reset-password
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const resetErrors = { newPassword: "", confirmPassword: "" };
    if (!newPassword) resetErrors.newPassword = "This field is required";
    if (!confirmPassword) resetErrors.confirmPassword = "This field is required";
    if (resetErrors.newPassword || resetErrors.confirmPassword) {
      setFieldErrors(prev => ({ ...prev, ...resetErrors }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("");
      showToast("error", "New password and confirm password do not match.");
      return;
    }
    if (loading) return;
    let keepLoadingDuringRedirect = false;
    setLoading(true);
    setMessage("");
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailOrMobile);
      const isMobile = /^\d{10}$/.test(emailOrMobile);
      const payload = {
        phoneNo: isMobile ? emailOrMobile : "",
        email: isEmail ? emailOrMobile : "",
        otp,
        newPassword
      };
      const res = await fetch(`${baseUrl}/user/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.responseStatus && data.responseStatus.toLowerCase() === "success") {
        keepLoadingDuringRedirect = true;
        setResetSuccess(data.responseMessage || "Password reset successful. Redirecting to login…");
        setMessage("");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setMessage(data.responseMessage || "Failed to reset password.");
      }
    } catch (err) {
      setMessage("Error resetting password.");
    } finally {
      if (keepLoadingDuringRedirect === false) {
        setLoading(false);
      }
    }
  };

  const STEPS = [
    { key: "request", label: "Mobile No" },
    { key: "verify",  label: "Verify OTP" },
    { key: "reset",   label: "New Password" },
  ] as const;
  const currentStepIndex = STEPS.findIndex(s => s.key === (step === "done" ? "reset" : step));

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-10 pb-10 px-4">
      <div className="w-full max-w-md rounded-2xl shadow-xl border border-gray-200 overflow-hidden bg-white">

        {/* Card header */}
        <div className="bg-blue-500 px-8 py-4 text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold leading-tight">Forgot Password</h2>
            <p className="text-blue-100 text-xs">Reset your KuchiMittai account password</p>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-center gap-0 px-8 py-4 border-b border-gray-100 bg-gray-50">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  i < currentStepIndex
                    ? "bg-blue-500 border-blue-500 text-white"
                    : i === currentStepIndex
                    ? "bg-white border-blue-500 text-blue-600"
                    : "bg-white border-gray-300 text-gray-400"
                }`}>
                  {i < currentStepIndex ? (
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : i + 1}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${
                  i <= currentStepIndex ? "text-blue-600" : "text-gray-400"
                }`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-10 mb-4 mx-1 transition-colors ${i < currentStepIndex ? "bg-blue-500" : "bg-gray-200"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form body */}
        <div className="px-8 py-7">

          {/* Inline error/info message */}
          {message && step !== "done" && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{message}</span>
            </div>
          )}

          {/* ── Step 1: Enter mobile ── */}
          {step === "request" && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <p className="text-sm text-gray-500 mb-2">Enter your registered 10-digit mobile number to receive an OTP.</p>
              <div className="relative">
                <input
                  id="emailOrMobile"
                  name="emailOrMobile"
                  type="text"
                  value={emailOrMobile}
                  onChange={e => { setEmailOrMobile(e.target.value); setFieldErrors(prev => ({ ...prev, emailOrMobile: "" })); }}
                  placeholder=" "
                  className={`peer block w-full rounded-xl border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors bg-white ${fieldErrors.emailOrMobile ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"}`}
                />
                <label
                  htmlFor="emailOrMobile"
                  className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${fieldErrors.emailOrMobile ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}
                >
                  10-Digit Mobile No <span className="text-red-500 ml-0.5">*</span>
                </label>
                {fieldErrors.emailOrMobile && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.emailOrMobile}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Sending…
                  </>
                ) : "Send OTP"}
              </button>
            </form>
          )}

          {/* ── Step 2: Verify OTP ── */}
          {step === "verify" && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <p className="text-sm text-gray-500 mb-2">
                OTP sent to <span className="font-semibold text-gray-700">{emailOrMobile}</span>.{" "}
                <button type="button" className="text-blue-600 hover:underline text-xs" onClick={() => setStep("request")}>Change</button>
              </p>
              <div className="flex items-start gap-3">
                <div className="relative flex-1">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setFieldErrors(prev => ({ ...prev, otp: "" })); }}
                    placeholder=" "
                    maxLength={6}
                    inputMode="numeric"
                    className={`peer block w-full rounded-xl border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors bg-white ${fieldErrors.otp ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"}`}
                  />
                  <label
                    htmlFor="otp"
                    className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${fieldErrors.otp ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}
                  >
                    Enter OTP <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  {fieldErrors.otp && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.otp}</p>
                  )}
                </div>
                <div className="pt-3 text-right min-w-[90px]">
                  {resendEnabled ? (
                    <button
                      type="button"
                      disabled={loading}
                      className={`text-xs font-medium ${loading ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:underline"}`}
                      onClick={() => {
                        if (loading) return;
                        setOtp("");
                        setOtpTimer(30);
                        setResendEnabled(false);
                        handleSendOtp({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>);
                      }}
                    >
                      Resend OTP
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Resend in {otpTimer}s</span>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Verifying…
                  </>
                ) : "Verify OTP"}
              </button>
            </form>
          )}

          {/* ── Step 3: Reset password — success ── */}
          {step === "reset" && resetSuccess && (
            <div className="flex flex-col items-center justify-center py-4 text-center space-y-4">
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 ring-4 ring-green-200">
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Password Reset Successful!</h3>
                <p className="mt-1 text-sm text-gray-500">{resetSuccess}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg className="animate-spin h-3.5 w-3.5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Redirecting to login…
              </div>
            </div>
          )}

          {/* ── Step 3: Reset password — form ── */}
          {step === "reset" && !resetSuccess && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <p className="text-sm text-gray-500 mb-2">Choose a new password for your account.</p>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  readOnly={loading}
                  value={newPassword}
                  onChange={e => { if (!loading) { setNewPassword(e.target.value); setFieldErrors(prev => ({ ...prev, newPassword: "" })); } }}
                  placeholder=" "
                  className={`peer block w-full rounded-xl border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors ${fieldErrors.newPassword ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"} ${loading ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                />
                <label
                  htmlFor="newPassword"
                  className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${fieldErrors.newPassword ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}
                >
                  New Password <span className="text-red-500 ml-0.5">*</span>
                </label>
                {fieldErrors.newPassword && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.newPassword}</p>
                )}
              </div>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  readOnly={loading}
                  value={confirmPassword}
                  onChange={e => { if (!loading) { setConfirmPassword(e.target.value); setFieldErrors(prev => ({ ...prev, confirmPassword: "" })); } }}
                  placeholder=" "
                  className={`peer block w-full rounded-xl border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors ${fieldErrors.confirmPassword ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"} ${loading ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                />
                <label
                  htmlFor="confirmPassword"
                  className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${fieldErrors.confirmPassword ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}
                >
                  Confirm Password <span className="text-red-500 ml-0.5">*</span>
                </label>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Processing…
                  </>
                ) : "Reset Password"}
              </button>
            </form>
          )}

          {/* ── Step done ── */}
          {step === "done" && (
            <div className="text-center py-4 text-green-600 font-semibold">{message}</div>
          )}

          {/* Back to login */}
          {step !== "reset" || !resetSuccess ? (
            <p className="mt-6 text-center text-sm text-gray-500">
              Remember your password?{" "}
              <a href="/login" className="text-blue-600 font-medium hover:underline">Back to Sign in</a>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

