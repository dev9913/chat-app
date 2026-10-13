"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetcher } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, ArrowRight, ArrowLeft, Mail, RefreshCw } from "lucide-react";

export default function RegisterPage() {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const { login } = useAuth();

  // Resend countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && resendTimer > 0) {
      interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await fetcher("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), username: username.trim() }),
      });
      setStep("otp");
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Create Account
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await fetcher<{ user: any; accessToken: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          displayName: displayName.trim(),
          password,
          otp: otp.trim(),
        }),
      });
      login(data.accessToken, data.user);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError("");
    setLoading(true);
    try {
      await fetcher("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), username: username.trim() }),
      });
      setResendTimer(60);
    } catch (err: any) {
      setError(err.message || "Could not resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8 select-none">
      <div className="w-full max-w-sm">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-sand-200 border border-sand-300 flex items-center justify-center text-clay-900 mb-3 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-serif tracking-tight font-medium text-sand-900">Chatly</h1>
          <p className="text-xs text-sand-500 mt-1">
            {step === "details" ? "Create your personal messaging space" : "Verify your email address"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-3xl p-7 border border-sand-200 shadow-sm">
          {error && (
            <div className="p-3 mb-4 rounded-xl text-xs bg-rose-50 text-rose-600 border border-rose-100">
              {error}
            </div>
          )}

          {step === "details" ? (
            /* STEP 1: Account Information */
            <form onSubmit={handleRequestOtp} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-sand-700 uppercase tracking-wider mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-sand-50/70 border border-sand-200 text-sm text-sand-900 placeholder-sand-400 focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-sand-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-sand-700 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="alexmorgan"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-sand-50/70 border border-sand-200 text-sm text-sand-900 placeholder-sand-400 focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-sand-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-sand-700 uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-sand-50/70 border border-sand-200 text-sm text-sand-900 placeholder-sand-400 focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-sand-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-sand-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-sand-50/70 border border-sand-200 text-sm text-sand-900 placeholder-sand-400 focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-sand-400 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-2.5 px-4 rounded-xl bg-clay-800 hover:bg-clay-900 text-sand-50 text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? "Sending code..." : "Continue"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            /* STEP 2: Enter 6-Digit OTP */
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-sand-100/70 border border-sand-200 text-xs text-sand-700">
                <Mail className="w-4 h-4 text-sand-500 shrink-0" />
                <span className="truncate">{email}</span>
                <button
                  type="button"
                  onClick={() => {
                    setStep("details");
                    setError("");
                  }}
                  className="ml-auto text-[11px] text-sand-900 font-semibold underline shrink-0"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-sand-700 uppercase tracking-wider mb-2 text-center">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full text-center tracking-[10px] text-2xl font-bold py-3 px-4 rounded-2xl bg-sand-50 border border-sand-200 text-sand-900 focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-sand-400 transition-all"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-2.5 px-4 rounded-xl bg-clay-800 hover:bg-clay-900 text-sand-50 text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? "Verifying..." : "Verify & Create Account"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center justify-between text-xs text-sand-500 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("details");
                    setError("");
                  }}
                  className="flex items-center gap-1 hover:text-sand-900 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>

                <button
                  type="button"
                  disabled={resendTimer > 0 || loading}
                  onClick={handleResendOtp}
                  className="font-medium text-sand-900 disabled:text-sand-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-sand-500">
          Already have an account?{" "}
          <Link href="/login" className="text-sand-900 font-medium hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
