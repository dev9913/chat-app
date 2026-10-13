"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetcher } from "@/lib/api";
import { X, Camera, Check, Loader2, Eye } from "lucide-react";
import ImageLightboxModal from "./ImageLightboxModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: Props) {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showBigPic, setShowBigPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const token = localStorage.getItem("chatly_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/users/me/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      updateUser({ photoUrl: data.photoUrl });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setLoading(true);
    try {
      const updated = await fetcher<any>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      updateUser({ displayName: updated.displayName });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
            <h2 className="font-semibold text-stone-900 text-sm">My Profile</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-200 text-stone-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex flex-col items-center">
            <div className="relative group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center font-bold text-2xl text-stone-700 overflow-hidden shadow-inner cursor-pointer"
              >
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user.displayName?.[0]?.toUpperCase()
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Change photo"
              >
                <Camera className="w-6 h-6" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-stone-500 hover:text-stone-800 underline underline-offset-2"
              >
                Change Photo
              </button>
              {user.photoUrl && (
                <>
                  <span className="text-stone-300 text-xs">•</span>
                  <button
                    onClick={() => setShowBigPic(true)}
                    className="text-[11px] text-stone-700 hover:text-stone-900 flex items-center gap-1 font-medium"
                  >
                    <Eye className="w-3 h-3" /> View Big
                  </button>
                </>
              )}
            </div>

            <form onSubmit={handleSave} className="w-full mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Username</label>
                <input
                  type="text"
                  disabled
                  value={`@${user.username}`}
                  className="w-full px-3 py-2 rounded-xl bg-stone-100 border border-stone-200 text-sm text-stone-400 cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <><Check className="w-4 h-4" /> Saved</> : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <ImageLightboxModal
        imageUrl={showBigPic ? user.photoUrl || null : null}
        altText={user.displayName}
        onClose={() => setShowBigPic(false)}
      />
    </>
  );
}
