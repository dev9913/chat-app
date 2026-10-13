"use client";

import React, { useState } from "react";
import { User, Message } from "@/types";
import { X, Phone, Video, Calendar, ShieldCheck, FileText, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import ImageLightboxModal from "./ImageLightboxModal";

interface Props {
  user: User | null;
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactInspector({ user, messages, isOpen, onClose }: Props) {
  const [showFullPic, setShowFullPic] = useState(false);

  if (!isOpen || !user) return null;

  const sharedImages = messages.filter((m) => Boolean(m.imageUrl && !m.fileName?.match(/\.(pdf|docx?|zip|rar|tar)$/i)));
  const sharedDocs = messages.filter((m) => Boolean(m.imageUrl && m.fileName && !m.fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i)));

  return (
    <>
      <aside className="w-80 h-full bg-[#FFFFFF] border-l border-[#E2EBE5] flex flex-col shrink-0 select-none overflow-y-auto">
        {/* Top Header */}
        <div className="p-4 border-b border-[#E2EBE5] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-900">User Details</span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="p-5 flex flex-col items-center text-center border-b border-[#E2EBE5]">
          <div
            onClick={() => user.photoUrl && setShowFullPic(true)}
            className="relative cursor-pointer group mb-3"
          >
            <div className="w-20 h-20 rounded-full bg-teal-100 border-2 border-teal-200 flex items-center justify-center font-bold text-2xl text-teal-900 overflow-hidden shadow-inner group-hover:ring-2 group-hover:ring-teal-700 transition-all">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user.displayName?.[0]?.toUpperCase()
              )}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                user.isOnline ? "bg-emerald-500" : "bg-stone-300"
              }`}
            />
          </div>

          <h3 className="text-base font-bold text-[#0F2427] leading-tight">{user.displayName}</h3>
          <p className="text-xs text-stone-400 mt-0.5">@{user.username}</p>

          <span
            className={`mt-2.5 px-3 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 ${
              user.isOnline
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-stone-100 text-stone-500"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${user.isOnline ? "bg-emerald-500" : "bg-stone-400"}`} />
            {user.isOnline ? "Active Now" : "Offline"}
          </span>

          {/* Quick Action Pills */}
          <div className="flex items-center gap-2 mt-4 w-full">
            <button
              onClick={() => alert("Audio call feature simulated")}
              className="flex-1 py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Call
            </button>
            <button
              onClick={() => alert("Video call feature simulated")}
              className="flex-1 py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Video className="w-3.5 h-3.5" /> Video
            </button>
          </div>
        </div>

        {/* Information & Status */}
        <div className="p-4 space-y-4 border-b border-[#E2EBE5] text-xs">
          <div className="flex items-center justify-between text-stone-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-700" /> Last Active
            </span>
            <span className="font-medium text-[#0F2427]">
              {user.isOnline ? "Online" : user.lastSeen ? format(new Date(user.lastSeen), "MMM d, h:mm a") : "Recently"}
            </span>
          </div>
          <div className="flex items-center justify-between text-stone-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" /> Account Status
            </span>
            <span className="font-medium text-emerald-700">Verified Client</span>
          </div>
        </div>

        {/* Shared Media Gallery Grid */}
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Shared Media
            </span>
            <span className="text-[11px] text-stone-400 font-medium">{sharedImages.length}</span>
          </div>

          {sharedImages.length === 0 ? (
            <p className="text-[11px] text-stone-400 py-2">No photos shared yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {sharedImages.slice(0, 6).map((img) => (
                <div
                  key={img.id}
                  onClick={() => setShowFullPic(true)}
                  className="aspect-square rounded-xl overflow-hidden border border-stone-200 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img src={img.imageUrl!} alt="Media" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Shared Documents Section */}
          <div className="flex items-center justify-between mt-5 mb-2.5">
            <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Documents
            </span>
            <span className="text-[11px] text-stone-400 font-medium">{sharedDocs.length}</span>
          </div>

          {sharedDocs.length === 0 ? (
            <p className="text-[11px] text-stone-400 py-1">No documents shared</p>
          ) : (
            <div className="space-y-1.5">
              {sharedDocs.slice(0, 3).map((doc) => (
                <a
                  key={doc.id}
                  href={doc.imageUrl!}
                  target="_blank"
                  rel="noreferrer"
                  download={doc.fileName}
                  className="flex items-center gap-2 p-2 rounded-xl bg-teal-50/60 hover:bg-teal-100/70 border border-teal-100 text-xs text-teal-900 transition-colors"
                >
                  <FileText className="w-4 h-4 text-teal-700 shrink-0" />
                  <span className="truncate flex-1 font-medium">{doc.fileName}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </aside>

      <ImageLightboxModal
        imageUrl={showFullPic ? user.photoUrl || null : null}
        altText={user.displayName}
        onClose={() => setShowFullPic(false)}
      />
    </>
  );
}
