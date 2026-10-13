"use client";

import React from "react";
import { MessageSquare, Users, Settings, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  onOpenNewChat: () => void;
  onOpenMyProfile: () => void;
}

export default function NavigationRail({ onOpenNewChat, onOpenMyProfile }: Props) {
  const { user, logout } = useAuth();

  return (
    <nav className="hidden lg:flex flex-col items-center justify-between w-18 h-full py-5 bg-[#FFFFFF] border-r border-[#E2EBE5] shrink-0 select-none">
      {/* Brand logo */}
      <div className="flex flex-col items-center gap-6">
        <div className="w-11 h-11 rounded-2xl bg-teal-800 flex items-center justify-center text-white shadow-md shadow-teal-900/10">
          <Sparkles className="w-5 h-5 text-teal-200" />
        </div>

        {/* Primary nav buttons */}
        <div className="flex flex-col items-center gap-3">
          <button
            className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center hover:bg-teal-100 transition-colors shadow-2xs"
            title="Messages"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenNewChat}
            className="w-10 h-10 rounded-xl text-stone-400 hover:text-teal-800 hover:bg-teal-50/70 flex items-center justify-center transition-colors"
            title="Find People"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenMyProfile}
            className="w-10 h-10 rounded-xl text-stone-400 hover:text-teal-800 hover:bg-teal-50/70 flex items-center justify-center transition-colors"
            title="Account Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom User Avatar & Logout */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={logout}
          className="w-10 h-10 rounded-xl text-stone-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenMyProfile}
          className="relative group cursor-pointer"
          title="My Profile"
        >
          <div className="w-10 h-10 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center font-bold text-xs text-teal-900 overflow-hidden shadow-xs group-hover:ring-2 group-hover:ring-teal-700 transition-all">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="Me" className="w-full h-full object-cover" />
            ) : (
              user?.displayName?.[0]?.toUpperCase()
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </button>
      </div>
    </nav>
  );
}
