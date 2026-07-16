"use client";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [emailVal, setEmailVal] = useState("");
  const [passwordVal, setPasswordVal] = useState("");
  const { data: session, status: sessionStatus } = useSession();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const isAdminLogin = callbackUrl.startsWith("/admin");

  // OTP login state
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");
  const [otpPhone, setOtpPhone] = useState("");
  const [otpPhoneError, setOtpPhoneError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [resendEnabled, setResendEnabled] = useState(false);

  useEffect(() => {
    let t: NodeJS.Timeout;
    if (otpSent && otpTimer > 0) {
      t = setTimeout(() => setOtpTimer(v => v - 1), 1000);
    } else if (otpSent && otpTimer === 0) {
      setResendEnabled(true);
    }
    return () => clearTimeout(t);
  }, [otpSent, otpTimer]);

  useEffect(() => {
    const expired = searchParams.get("expired");
    if (sessionStatus === "authenticated") {
      const isAdmin = (session as any)?.user?.role === "admin";
      if (isAdmin) {
        router.replace("/admin/categories");
      } else {
        router.replace(callbackUrl);
      }
      return;
    }
    if (expired === "true") {
      setError("Your session has expired. Please log in again.");
    }
  }, [sessionStatus, router, searchParams, session, callbackUrl]);

  const isValidPhone = (p: string) => /^[0-9]{10}$/.test(p);

  const handleSubmit = async (e: any) => {
    if (isLoading) return;
    e.preventDefault();
    const email = emailVal;
    const password = passwordVal;

    const errors = { email: "", password: "" };
    if (!email.trim()) errors.email = "This field is required";
    if (!password) errors.password = "This field is required";
    setFieldErrors(errors);
    if (errors.email || errors.password) return;

    const { default: SHA256 } = await import("crypto-js/sha256");
    const hashedPassword = SHA256(password).toString();
    let loginstatus = "";
    let id = "";
    let role = "user";

    if (!password || password.length < 8) {
      setError("Password is invalid");
      return;
    }
    setIsLoading(true);
    setEmailVal("");
    setPasswordVal("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const res = await fetch(`${baseUrl}/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: hashedPassword }),
      });
      const data = await res.json();
      if (data && data.status === "FAILURE") {
        setError(data.message || "Login failed");
        setIsLoading(false);
        return;
      }
      if (res.ok) {
        loginstatus = "success";
        id = data.id;
        role = (data.role || data?.user?.role || data?.data?.role || "user").toLowerCase();
      } else {
        loginstatus = "failed";
      }
    } catch (err) {
      console.error(err);
    }

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      loginstatus,
      id,
      role,
    });
    if (res?.error) {
      setError("Invalid email or password");
      if (res?.url) router.replace("/");
      setIsLoading(false);
    } else {
      setError("");
      const nextRoute = role === "admin" ? "/admin/categories" : callbackUrl;
      router.push(nextRoute);
    }
  };

  const handleSendOtp = async () => {
    if (!isValidPhone(otpPhone)) {
      setOtpPhoneError("Enter a valid 10-digit mobile number");
      return;
    }
    setOtpPhoneError("");
    setOtpLoading(true);
    setError("");
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const res = await fetch(`${baseUrl}/user/login-otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: otpPhone }),
      });
      const data = await res.json();
      if (data?.responseStatus?.toLowerCase() === "success") {
        setOtpSent(true);
        setOtpTimer(60);
        setResendEnabled(false);
        setOtpValue("");
      } else {
        setError(data?.responseMessage || "Failed to send OTP");
      }
    } catch {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpLogin = async () => {
    if (!/^[0-9]{6}$/.test(otpValue)) {
      setError("Please enter the 6-digit OTP");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const res = await fetch(`${baseUrl}/user/login-otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: otpPhone, otp: otpValue }),
      });
      const data = await res.json();
      if (data?.status === "FAILURE" || !data?.id) {
        setError(data?.message || "Invalid or expired OTP");
        setIsLoading(false);
        return;
      }
      const id = String(data.id);
      const email = data.email || "";
      const role = (data.role || "user").toLowerCase();

      const signInRes = await signIn("credentials", {
        redirect: false,
        email,
        password: "",
        loginstatus: "success",
        id,
        role,
      });
      if (signInRes?.error) {
        setError("Login failed. Please try again.");
        setIsLoading(false);
      } else {
        const nextRoute = role === "admin" ? "/admin/categories" : callbackUrl;
        router.push(nextRoute);
      }
    } catch {
      setError("OTP verification failed. Please try again.");
      setIsLoading(false);
    }
  };

  if (sessionStatus === "authenticated") return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <svg className="animate-spin w-16 h-16 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        <p className="text-sm font-semibold text-blue-600 tracking-wide">Signing you in…</p>
        <p className="text-xs text-gray-400">Please wait while we load your dashboard</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Full-page loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <svg className="animate-spin w-16 h-16 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-semibold text-blue-600 tracking-wide">Signing you in…</p>
            <p className="text-xs text-gray-400">Please wait while we load your dashboard</p>
          </div>
        </div>
      )}

    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-start justify-center pt-6 pb-6 px-4 overflow-y-auto">
<div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">

          {/* Card Header */}
          <div className="bg-blue-500 px-6 py-2.5 flex items-center justify-center gap-2">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 flex-shrink-0">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">
              {isAdminLogin ? "Admin Portal" : "Sign In"}
            </h1>
          </div>

          <div className="px-6 py-5">

            {/* Error Alert */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 text-sm text-red-700">
                <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* ── Password Login Form ── */}
            {loginMode === "password" && (
              <form className="space-y-4" onSubmit={handleSubmit}>

                {/* Email field */}
                <div>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="text"
                      autoComplete="email"
                      disabled={isLoading}
                      value={emailVal}
                      onChange={e => { setEmailVal(e.target.value); setFieldErrors(prev => ({ ...prev, email: "" })); }}
                      placeholder=" "
                      className={`peer block w-full rounded-xl border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors
                        ${fieldErrors.email ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"}
                        ${isLoading ? "bg-gray-50 cursor-not-allowed" : "bg-white"}`}
                    />
                    <label htmlFor="email" className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200
                      peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0
                      peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1
                      ${fieldErrors.email ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}>
                      Username / Email / Phone <span className="text-red-500 ml-0.5">*</span>
                    </label>
                  </div>
                  {fieldErrors.email && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.email}</p>}
                </div>

                {/* Password field */}
                <div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      disabled={isLoading}
                      value={passwordVal}
                      onChange={e => { setPasswordVal(e.target.value); setFieldErrors(prev => ({ ...prev, password: "" })); }}
                      placeholder=" "
                      className={`peer block w-full rounded-xl border px-3 pt-5 pb-2 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors
                        ${fieldErrors.password ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"}
                        ${isLoading ? "bg-gray-50 cursor-not-allowed" : "bg-white"}`}
                    />
                    <label htmlFor="password" className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200
                      peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0
                      peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1
                      ${fieldErrors.password ? "text-red-500 peer-focus:text-red-500" : "text-blue-600 peer-focus:text-blue-600"}`}>
                      Password <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.password}</p>}
                </div>

                {/* Forgot password */}
                <div className="flex justify-end -mt-1">
                  <a href="/forgot-password" className={`text-xs font-medium ${isLoading ? "text-gray-400 pointer-events-none" : "text-blue-600 hover:text-blue-700 hover:underline"}`}>
                    Forgot password?
                  </a>
                </div>

                {/* Submit */}
                <button type="submit" disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2">
                  {isLoading ? (
                    <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Signing in…</>
                  ) : (
                    <>{isAdminLogin ? "Sign in as Admin" : "Login"}<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>
                  )}
                </button>

                {!isAdminLogin && (
                  <>
                    {/* OR divider */}
                    <div className="flex items-center gap-3 my-1">
                      <span className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 font-medium">OR</span>
                      <span className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Login with OTP button */}
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => { setLoginMode("otp"); setError(""); }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-blue-500 text-blue-600 hover:bg-blue-50 px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Login with OTP
                    </button>

                    <p className="text-sm text-center text-gray-500 pt-1">
                      Don&apos;t have an account?{" "}
                      <Link href={`/register${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} className="font-semibold text-blue-600 hover:underline">
                        Create account
                      </Link>
                    </p>
                  </>
                )}
              </form>
            )}

            {/* ── OTP Login Form ── */}
            {loginMode === "otp" && (
              <div className="space-y-4">
                {/* Back to password */}
                <button
                  type="button"
                  onClick={() => { setLoginMode("password"); setError(""); setOtpPhone(""); setOtpSent(false); setOtpValue(""); setOtpTimer(0); setResendEnabled(false); }}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline mb-1"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  Back to Password Login
                </button>
                {/* Phone input */}
                <div>
                  <div className="flex items-start gap-2">
                    <div className="relative flex-1">
                      <input
                        id="otp-phone"
                        type="text"
                        inputMode="numeric"
                        value={otpPhone}
                        readOnly={otpSent || isLoading}
                        placeholder=" "
                        maxLength={10}
                        onChange={e => { setOtpPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setOtpPhoneError(""); }}
                        className={`peer block w-full rounded-xl border px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-2 transition-colors
                          ${otpPhoneError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"}
                          ${otpSent || isLoading ? "bg-gray-50 cursor-not-allowed" : "bg-white"}`}
                      />
                      <label htmlFor="otp-phone" className={`pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs transition-all duration-200
                        peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0
                        peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1
                        ${otpPhoneError ? "text-red-500" : "text-blue-600"}`}>
                        Mobile Number <span className="text-red-500 ml-0.5">*</span>
                      </label>
                    </div>
                    {otpSent ? (
                      <button type="button" onClick={() => { setOtpSent(false); setOtpValue(""); setOtpPhone(""); setOtpTimer(0); setResendEnabled(false); }}
                        className="mt-1 text-xs font-medium text-blue-600 hover:underline whitespace-nowrap py-2.5">
                        Change
                      </button>
                    ) : (
                      isValidPhone(otpPhone) && (
                        <button type="button" disabled={otpLoading} onClick={handleSendOtp}
                          className="mt-1 px-3 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold disabled:opacity-50 whitespace-nowrap transition-colors">
                          {otpLoading ? "Sending…" : "Send OTP"}
                        </button>
                      )
                    )}
                  </div>
                  {otpPhoneError && <p className="mt-1.5 text-xs text-red-500">{otpPhoneError}</p>}
                </div>

                {/* OTP input */}
                {otpSent && (
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        id="otp-value"
                        type="text"
                        inputMode="numeric"
                        value={otpValue}
                        placeholder=" "
                        maxLength={6}
                        disabled={isLoading}
                        onChange={e => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="peer block w-full rounded-xl border border-gray-300 px-3 pt-5 pb-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-100 transition-colors tracking-widest"
                      />
                      <label htmlFor="otp-value" className="pointer-events-none absolute left-2.5 -top-2.5 bg-white px-1 text-xs text-blue-600 transition-all duration-200
                        peer-placeholder-shown:top-3.5 peer-placeholder-shown:left-3 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-placeholder-shown:px-0
                        peer-focus:-top-2.5 peer-focus:left-2.5 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1">
                        Enter 6-digit OTP
                      </label>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>OTP sent to +91 {otpPhone}</span>
                      {resendEnabled ? (
                        <button type="button" onClick={() => { handleSendOtp(); setOtpValue(""); }} className="text-blue-600 font-medium hover:underline">
                          Resend OTP
                        </button>
                      ) : (
                        <span>Resend in {otpTimer}s</span>
                      )}
                    </div>
                    <button type="button" disabled={isLoading || otpValue.length < 6} onClick={handleOtpLogin}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                      {isLoading ? (
                        <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Verifying…</>
                      ) : (
                        <>Login<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>
                      )}
                    </button>
                  </div>
                )}

                <p className="text-sm text-center text-gray-500 pt-1">
                  Don&apos;t have an account?{" "}
                  <Link href={`/register${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} className="font-semibold text-blue-600 hover:underline">
                    Create account
                  </Link>
                </p>
              </div>
            )}

            {/* Trust badges */}
            {!isAdminLogin && (
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
          By signing in, you agree to our{" "}
          <Link href="/terms-and-conditions" className="hover:underline text-gray-500">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy-policy" className="hover:underline text-gray-500">Privacy Policy</Link>.
        </p>

      </div>
    </div>
    </>
  );
};

export default LoginPage;
