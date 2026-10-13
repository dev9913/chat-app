"use client";

import React, { useState, useEffect } from "react";
import { User } from "@/types";
import { fetcher } from "@/lib/api";
import { Search, X, UserPlus, Clock, MessageSquare, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

export default function NewChatModal({ isOpen, onClose, onSelectUser }: Props) {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, { status: string; isSender?: boolean }>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setFriendStatuses({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const users = await fetcher<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
        const filtered = users.filter((u) => u.id !== currentUser?.id);
        setResults(filtered);

        const statuses: Record<string, { status: string; isSender?: boolean }> = {};
        await Promise.all(
          filtered.map(async (u) => {
            try {
              const res = await fetcher<{ status: string; isSender?: boolean }>(`/friends/status/${u.id}`);
              statuses[u.id] = res;
            } catch {
              statuses[u.id] = { status: "NONE" };
            }
          })
        );
        setFriendStatuses(statuses);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, currentUser?.id]);

  const handleSendRequest = async (targetUser: User) => {
    setActionLoading(targetUser.id);
    try {
      await fetcher(`/friends/request/${targetUser.id}`, { method: "POST" });
      setFriendStatuses((prev) => ({
        ...prev,
        [targetUser.id]: { status: "PENDING", isSender: true },
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#EAE4D9] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[#EAE4D9] flex items-center justify-between bg-[#FCFAF7]">
          <h2 className="font-semibold text-sm text-[#2B241D]">Search Users</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[#EAE4D9]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search by username or display name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#EAE4D9] text-xs text-[#2B241D] placeholder-stone-400 focus:outline-none focus:ring-1.5 focus:ring-[#C28135]"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="py-8 flex justify-center text-stone-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-xs text-stone-400 py-8">
              {query.trim() ? "No users found" : "Type a name to search"}
            </p>
          ) : (
            results.map((target) => {
              const rel = friendStatuses[target.id] || { status: "NONE" };
              const isAccepted = rel.status === "ACCEPTED";
              const isPending = rel.status === "PENDING";
              const isActioning = actionLoading === target.id;

              return (
                <div
                  key={target.id}
                  className="p-2.5 rounded-2xl border border-[#EAE4D9] bg-[#FAF8F5] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F2ECE1] border border-[#EAE4D9] text-[#2B241D] font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                      {target.photoUrl ? (
                        <img src={target.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        target.displayName?.[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#2B241D] truncate">{target.displayName}</p>
                      <p className="text-[10px] text-stone-400 truncate">@{target.username}</p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isAccepted ? (
                      <button
                        onClick={() => {
                          onSelectUser(target);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#2B241D] hover:bg-[#3E342B] text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Message
                      </button>
                    ) : isPending ? (
                      <div className="px-3 py-1.5 rounded-xl bg-[#F6F2EC] text-[#635749] text-[11px] font-medium flex items-center gap-1.5 border border-[#EAE4D9]">
                        <Clock className="w-3.5 h-3.5 text-[#C28135]" />
                        {rel.isSender ? "Request Sent" : "Pending"}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSendRequest(target)}
                        disabled={isActioning}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F2ECE1] text-[#2B241D] text-xs font-semibold flex items-center gap-1.5 border border-[#EAE4D9] transition-all disabled:opacity-50"
                      >
                        {isActioning ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5 text-[#C28135]" />
                        )}
                        Add Friend
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
