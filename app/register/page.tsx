"use client";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";
import toast from "react-hot-toast";

const RegisterPage = () => {
    // ...existing code...
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [resendEnabled, setResendEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ phone: "", password: "", confirmPassword: "" });

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpSent && !otpVerified && otpTimer > 0) {
      timer = setTimeout(() => {
        setOtpTimer(otpTimer - 1);
      }, 1000);
    } else if (otpSent && !otpVerified && otpTimer === 0) {
      setResendEnabled(true);
    }
    return () => clearTimeout(timer);
  }, [otpSent, otpVerified, otpTimer]);

  React.useEffect(() => {
    if (otp.length === 6 && otpSent && !otpVerified && !otpLoading) {
      handleVerifyOtp();
    }
  }, [otp]);

  const router = useRouter();

  const isValidEmail = (email: string) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const firstName = formData.get("name") as string;
    const phoneVal = phone;
    const emailVal = email;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmpassword") as string;

    const newErrors = { phone: "", password: "", confirmPassword: "" };
    let hasErrors = false;

    if (!isValidPhone(phoneVal)) {
      newErrors.phone = "Please enter a valid 10-digit mobile number";
      hasErrors = true;
    }
    if (emailVal && emailVal.trim() !== "") {
      if (!isValidEmail(emailVal)) {
        setError("Email is invalid");
        return;
      }
    }
    if (!password) {
      newErrors.password = "This field is required";
      hasErrors = true;
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
      hasErrors = true;
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "This field is required";
      hasErrors = true;
    } else if (password && confirmPassword !== password) {
      newErrors.confirmPassword = "Passwords do not match";
      hasErrors = true;
    }
    if (!otpVerified) {
      setError("Please verify your phone number with OTP");
      return;
    }
    if (hasErrors) {
      setFieldErrors(newErrors);
      return;
    }
    setIsSubmitting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const res = await fetch(`${baseUrl}/user/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          phone: phoneVal,
          email: emailVal,
          password
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Defensive checks for undefined/null
        const status = typeof data.responseStatus === "string" ? data.responseStatus.toLowerCase() : "";
        const message = typeof data.responseMessage === "string" ? data.responseMessage.toLowerCase() : "";
        if (status.includes("failure") || message.includes("already exists")) {
          toast.error(data.responseMessage || "User already exists.");
          router.push(`/login?message=${encodeURIComponent(data.responseMessage || "User already exists.")}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
          return;
        } else {
          setError("");
          setRegisterSuccess(data.responseMessage || "Registration successful! Redirecting to login…");
          setTimeout(() => {
            router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
          }, 2000);
        }
      } else {
        if (data.details && Array.isArray(data.details)) {
          const errorMessage = data.details.map((err: any) => err.message).join(", ");
          setError(errorMessage);
          toast.error(errorMessage);
        } else if (data.error) {
          setError(data.error);
          toast.error(data.error);
        } else {
          setError("Registration failed");
          toast.error("Registration failed");
        }
      }
    } catch (error) {
      toast.error("Registration failed due to Technical Error ,please Contact Support");
      setError("Registration failed due to Technical Error ,please Contact Support");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    if (!isValidPhone(phone)) {
      setError("Invalid phone number");
      toast.error("Invalid phone number (must be 10 digits)");
      return;
    }
    setOtpLoading(true);
    setError("");
    setOtpTimer(60);
    setResendEnabled(false);
    // Get deviceId; fetch IP in background (non-blocking, defaults to "" on failure)
    const deviceId = navigator.userAgent;
    let ipAddress = "";
    const ipPromise = fetch("https://api.ipify.org?format=json")
      .then(r => r.json())
      .then(d => { ipAddress = d.ip || ""; })
      .catch(() => {});
    await Promise.race([ipPromise, new Promise(r => setTimeout(r, 1500))]);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const res = await fetch(`${baseUrl}/user/generate-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phone,
          purpose: "Mobile No Verification",
          ipAddress,
          deviceId
        }),
      });
      const data = await res.json();
      // API returns { responseMessage, responseStatus }
      if (res.ok && data.responseStatus && data.responseStatus.toLowerCase() === "success") {
        setOtpSent(true);
        toast.success(data.responseMessage || "OTP sent to your mobile number");
      } else {
        setOtpSent(false);
        toast.error(data.responseMessage || "Failed to send OTP");
      }
    } catch (err) {
      setOtpSent(false);
      toast.error("Failed to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }
    if (!/^[0-9]{6}$/.test(otp)) {
      toast.error("OTP must be exactly 6 digits");
      return;
    }
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const res = await fetch(`${baseUrl}/user/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phone,
          otp: otp,
          purpose: "Mobile No Verification"
        }),
      });
      const data = await res.json();
      if (res.ok && data.responseStatus && data.responseStatus.toLowerCase() === "success") {
        setOtpVerified(true);
        toast.success(data.responseMessage || "OTP verified successfully");
      } else {
        setOtpVerified(false);
        toast.error(data.responseMessage || "OTP verification failed");
      }
    } catch (err) {
      setOtpVerified(false);
      toast.error("OTP verification failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-start justify-center pt-10 pb-10 px-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">

          {/* Card Header */}
          <div className="bg-blue-500 px-6 py-3 flex items-center justify-center gap-2">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 flex-shrink-0">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-base font-bold text-white">Create Account</h1>
          </div>

          <div className="px-8 py-7">

            {/* Inline error */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700">
                <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {registerSuccess ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100 ring-4 ring-green-200">
                  <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Registration Successful!</h3>
                  <p className="mt-1 text-sm text-gray-500">{registerSuccess}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <svg className="animate-spin h-3.5 w-3.5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Redirecting to login…
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>

                {/* ── Mobile + OTP ── */}
                <div>
                  <div className="flex items-start gap-2">
                    <div className="relative flex-1">
                      <input
                        id="phone"
                        name="phone"
                        type="text"
                        value={phone}
                        onChange={e => { setPhone(e.target.value); setFieldErrors(prev => ({ ...prev, phone: "" })); }}
                        placeholder=" "
                        readOnly={otpSent || isSubmitting}
                        className={`peer block w-full rounded-xl border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors
                          ${fieldErrors.phone ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"}
                          ${otpSent || isSubmitting ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                      />
                      <label htmlFor="phone" className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${fieldErrors.phone ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}>
                        Mobile Number <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>}
                    </div>
                    {otpSent && (
                      otpVerified ? (
                        <span className="mt-3 text-xs font-semibold text-green-600 whitespace-nowrap flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                          Verified
                        </span>
                      ) : (
                        <button type="button" className="mt-3 text-xs font-medium text-blue-600 hover:underline whitespace-nowrap" onClick={() => { setOtpSent(false); setOtp(""); setOtpVerified(false); setPhone(""); }}>
                          Change
                        </button>
                      )
                    )}
                    {isValidPhone(phone) && !otpSent && (
                      <button
                        type="button"
                        disabled={otpLoading || isSubmitting}
                        onClick={handleSendOtp}
                        className="mt-1 px-3 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold disabled:opacity-50 whitespace-nowrap transition-colors"
                      >
                        {otpLoading ? "Sending…" : "Verify"}
                      </button>
                    )}
                  </div>
                  {otpSent && !otpVerified && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        inputMode="numeric"
                        className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100"
                      />
                      {resendEnabled ? (
                        <button type="button" className="text-xs font-medium text-blue-600 hover:underline whitespace-nowrap" onClick={() => { handleSendOtp(); setOtp(""); }}>
                          Resend OTP
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 whitespace-nowrap">Resend in {otpTimer}s</span>
                      )}
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        className="px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold whitespace-nowrap transition-colors"
                      >
                        Verify OTP
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Name ── */}
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    readOnly={isSubmitting}
                    placeholder=" "
                    className={`peer block w-full rounded-xl border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors border-gray-300 focus:border-blue-500 focus:ring-blue-100 ${isSubmitting ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                  />
                  <label htmlFor="name" className="pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 text-blue-600 peer-focus:text-blue-600">
                    User Name
                  </label>
                </div>

                {/* ── Email ── */}
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    readOnly={isSubmitting}
                    placeholder=" "
                    className={`peer block w-full rounded-xl border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors border-gray-300 focus:border-blue-500 focus:ring-blue-100 ${isSubmitting ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                  />
                  <label htmlFor="email" className="pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 text-blue-600 peer-focus:text-blue-600">
                    Email Address
                  </label>
                </div>

                {/* ── Password ── */}
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    readOnly={isSubmitting}
                    placeholder=" "
                    onChange={() => setFieldErrors(prev => ({ ...prev, password: "" }))}
                    className={`peer block w-full rounded-xl border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors
                      ${fieldErrors.password ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"}
                      ${isSubmitting ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                  />
                  <label htmlFor="password" className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${fieldErrors.password ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}>
                    Password <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
                </div>

                {/* ── Confirm Password ── */}
                <div className="relative">
                  <input
                    id="confirmpassword"
                    name="confirmpassword"
                    type="password"
                    autoComplete="new-password"
                    readOnly={isSubmitting}
                    placeholder=" "
                    onChange={() => setFieldErrors(prev => ({ ...prev, confirmPassword: "" }))}
                    className={`peer block w-full rounded-xl border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors
                      ${fieldErrors.confirmPassword ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"}
                      ${isSubmitting ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white"}`}
                  />
                  <label htmlFor="confirmpassword" className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0 peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 ${fieldErrors.confirmPassword ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}>
                    Confirm Password <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || otpLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Processing…
                    </>
                  ) : "Create Account"}
                </button>

                <p className="text-sm text-center text-gray-500 pt-1">
                  Already have an account?{" "}
                  <a href="/login" className={`font-semibold text-blue-600 hover:underline ${isSubmitting ? "pointer-events-none opacity-50" : ""}`}>
                    Login
                  </a>
                </p>
              </form>
            )}

            {/* Trust badges */}
            {!registerSuccess && (
              <div className="mt-6 pt-5 border-t border-gray-100">
                <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    SSL Secured
                  </span>
                  <span className="w-px h-3 bg-gray-200" />
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Safe & Trusted
                  </span>
                  <span className="w-px h-3 bg-gray-200" />
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    5-Star Rated
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center text-xs text-gray-400">
          By creating an account you agree to our{" "}
          <a href="/terms-and-conditions" className="hover:underline text-gray-500">Terms of Service</a>
          {" "}and{" "}
          <a href="/privacy-policy" className="hover:underline text-gray-500">Privacy Policy</a>.
        </p>

      </div>
    </div>
  );
};

export default RegisterPage;
