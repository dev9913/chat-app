"use client";

import React, { useState } from "react";
import Link from "next/link";
import { fetcher } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await fetcher<{ user: any; accessToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      login(data.accessToken, data.user);
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8 select-none">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-sand-200 border border-sand-300 flex items-center justify-center text-clay-900 mb-3 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-serif tracking-tight font-medium text-sand-900">Chatly</h1>
          <p className="text-xs text-sand-500 mt-1">Simple, private one-to-one conversations</p>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-3xl p-7 border border-sand-200 shadow-sm">
          <h2 className="text-sm font-medium text-sand-800 mb-5">Sign in to your account</h2>

          {error && (
            <div className="p-3 mb-4 rounded-xl text-xs bg-rose-50 text-rose-600 border border-rose-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-sand-700 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="alex or alex@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-sand-50/70 border border-sand-200 text-sm text-sand-900 placeholder-sand-400 focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-sand-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-sand-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-sand-50/70 border border-sand-200 text-sm text-sand-900 placeholder-sand-400 focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-sand-400 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-clay-800 hover:bg-clay-900 text-sand-50 text-xs font-semibold tracking-wide transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? "Signing in..." : "Continue"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-sand-500">
          New to Chatly?{" "}
          <Link href="/register" className="text-sand-900 font-medium hover:underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
