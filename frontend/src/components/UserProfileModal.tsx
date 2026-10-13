"use client";

import React, { useState, useEffect } from "react";
import { User } from "@/types";
import { X, Calendar, Circle, Eye, MessageSquare, UserPlus, UserCheck, Clock, UserMinus } from "lucide-react";
import { format } from "date-fns";
import { fetcher } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import ImageLightboxModal from "./ImageLightboxModal";

interface Props {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onMessage?: (user: User) => void;
}

export default function UserProfileModal({ user, isOpen, onClose, onMessage }: Props) {
  const { user: currentUser } = useAuth();
  const [showBigPic, setShowBigPic] = useState(false);
  const [friendStatus, setFriendStatus] = useState<"NONE" | "PENDING" | "ACCEPTED">("NONE");
  const [isSender, setIsSender] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (user && isOpen && user.id !== currentUser?.id) {
      fetcher<{ status: "NONE" | "PENDING" | "ACCEPTED"; isSender?: boolean }>(
        `/friends/status/${user.id}`
      )
        .then((res) => {
          setFriendStatus(res.status);
          setIsSender(Boolean(res.isSender));
        })
        .catch(() => {});
    }
  }, [user, isOpen, currentUser?.id]);

  if (!isOpen || !user) return null;

  const isSelf = user.id === currentUser?.id;

    const handleRemoveFriend = async () => {
    if (!user || !window.confirm(`Remove ${user.displayName} from your friends?`)) return;
    setLoadingAction(true);
    try {
      await fetcher(`/friends/${user.id}`, { method: "DELETE" });
      setFriendStatus("NONE");
      setIsSender(false);
    } catch (err) {
      console.error("Failed to remove friend from profile:", err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSendFriendRequest = async () => {
    setLoadingAction(true);
    try {
      await fetcher(`/friends/request/${user.id}`, { method: "POST" });
      setFriendStatus("PENDING");
      setIsSender(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <div
          className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-[#EAE4D9] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-[#EAE4D9] flex items-center justify-between bg-[#FCFAF7]">
            <h2 className="font-semibold text-[#2B241D] text-sm">User Profile</h2>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 rounded-lg hover:bg-[#F6F2EC] text-stone-400 hover:text-stone-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 flex flex-col items-center">
            {/* Avatar */}
            <div
              className="relative group cursor-pointer"
              onClick={() => user.photoUrl && setShowBigPic(true)}
              title={user.photoUrl ? "Click to view full photo" : ""}
            >
              <div className="w-24 h-24 rounded-full bg-[#F2ECE1] border-2 border-[#EAE4D9] flex items-center justify-center font-bold text-3xl text-[#453C32] overflow-hidden shadow-inner">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  user.displayName?.[0]?.toUpperCase()
                )}
              </div>
              <span
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full ring-2 ring-white ${
                  user.isOnline ? "bg-emerald-500" : "bg-stone-400"
                }`}
              />
              {user.photoUrl && (
                <div className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-6 h-6" />
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-[#2B241D] mt-3">{user.displayName}</h3>
            <p className="text-xs text-stone-400 font-medium">@{user.username}</p>

            {/* Presence Box */}
            <div className="w-full mt-4 space-y-2.5 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EAE4D9] text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500 flex items-center gap-1.5">
                  <Circle className="w-3 h-3 fill-current text-[#C28135]" /> Presence
                </span>
                <span className={`font-semibold ${user.isOnline ? "text-emerald-700" : "text-stone-600"}`}>
                  {user.isOnline ? "Active now" : "Offline"}
                </span>
              </div>

              {user.lastSeen && !user.isOnline && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-[#C28135]" /> Last Active
                  </span>
                  <span className="text-stone-700 font-medium">
                    {format(new Date(user.lastSeen), "MMM d, h:mm a")}
                  </span>
                </div>
              )}
            </div>

            {/* Friend Request Button Bar */}
            {!isSelf && (
              <div className="w-full mt-3 flex items-center gap-2">
                {friendStatus === "ACCEPTED" ? (
                  <div className="flex-1 flex gap-1.5">
                    <div className="flex-1 py-2 px-3 rounded-xl bg-[#EDE7DC] text-[#2B241D] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#DDD4C5]">
                      <UserCheck className="w-4 h-4 text-emerald-700" /> Friends
                    </div>
                    <button
                      onClick={handleRemoveFriend}
                      disabled={loadingAction}
                      className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-1 border border-rose-200 transition-colors"
                      title="Remove Friend"
                    >
                      <UserMinus className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                ) : friendStatus === "PENDING" ? (
                  <div className="flex-1 py-2 px-3 rounded-xl bg-[#F6F2EC] text-[#635749] text-xs font-medium flex items-center justify-center gap-1.5 border border-[#EAE4D9]">
                    <Clock className="w-4 h-4 text-[#C28135]" />
                    {isSender ? "Request Sent" : "Request Received"}
                  </div>
                ) : (
                  <button
                    onClick={handleSendFriendRequest}
                    disabled={loadingAction}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE1] text-[#2B241D] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#EAE4D9] transition-all active:scale-98"
                  >
                    <UserPlus className="w-4 h-4 text-[#C28135]" /> Add Friend
                  </button>
                )}
              </div>
            )}

            {/* Direct Message Action */}
            {onMessage && friendStatus === "ACCEPTED" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMessage(user);
                  onClose();
                }}
                className="w-full mt-2.5 py-2.5 px-4 rounded-xl bg-[#2B241D] hover:bg-[#3E342B] active:scale-98 text-[#FAF8F5] text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <MessageSquare className="w-4 h-4" /> Message @{user.username}
              </button>
            )}

            {user.photoUrl && (
              <button
                onClick={() => setShowBigPic(true)}
                className="mt-3 text-xs font-medium text-[#453C32] hover:text-[#2B241D] hover:underline underline-offset-4 flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> View Photo Fullscreen
              </button>
            )}
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
