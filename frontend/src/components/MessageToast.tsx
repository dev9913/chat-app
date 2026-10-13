"use client";

import React, { useEffect } from "react";
import { X, MessageSquare } from "lucide-react";
import { User } from "@/types";

interface Props {
  sender: User | null;
  text: string;
  isOpen: boolean;
  onOpenChat: () => void;
  onClose: () => void;
}

export default function MessageToast({ sender, text, isOpen, onOpenChat, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen || !sender) return null;

  return (
    <div
      onClick={onOpenChat}
      className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100%-2rem)] sm:w-88 bg-white/95 backdrop-blur-md border border-stone-200 rounded-2xl shadow-2xl p-3.5 flex items-center gap-3 cursor-pointer hover:bg-stone-50 transition-all animate-in slide-in-from-top-4 duration-200 group select-none"
    >
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-stone-200 border border-stone-300 text-stone-700 flex items-center justify-center font-bold text-sm overflow-hidden">
          {sender.photoUrl ? (
            <img src={sender.photoUrl} alt={sender.displayName} className="w-full h-full object-cover" />
          ) : (
            sender.displayName?.[0]?.toUpperCase()
          )}
        </div>
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-900 truncate">{sender.displayName}</span>
          <span className="text-[10px] text-stone-400">Just now</span>
        </div>
        <p className="text-xs text-stone-600 truncate mt-0.5">{text || "Sent an attachment"}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <span className="p-1.5 rounded-lg bg-stone-100 text-stone-600 group-hover:bg-stone-800 group-hover:text-white transition-colors">
          <MessageSquare className="w-3.5 h-3.5" />
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
