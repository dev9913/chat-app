"use client";

import React, { useState, useEffect } from "react";
import { Conversation, User, FriendRequestItem } from "@/types";
import { Search, Plus, User as UserIcon, Check, CheckCheck, Trash2, LogOut, Users, MessageSquare, CheckCircle, XCircle, UserMinus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { fetcher } from "@/lib/api";
import ProfileModal from "./ProfileModal";
import UserProfileModal from "./UserProfileModal";
import { format, isToday, isYesterday } from "date-fns";

interface Props {
  conversations: Conversation[];
  activeConversationId?: string;
  typingMap?: Record<string, boolean>;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversationId: string) => void;
  onOpenNewChat: () => void;
  onStartChatWithUser?: (user: User) => void;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  typingMap = {},
  onSelectConversation,
  onDeleteConversation,
  onOpenNewChat,
  onStartChatWithUser,
}: Props) {
  const { user, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [activeTab, setActiveTab] = useState<"CHATS" | "CONTACTS">("CHATS");
  const [filterQuery, setFilterQuery] = useState("");
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [friends, setFriends] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequestItem[]>([]);

  const loadFriendsData = async () => {
    try {
      const [friendsList, requestsList] = await Promise.all([
        fetcher<User[]>("/friends"),
        fetcher<FriendRequestItem[]>("/friends/requests/pending"),
      ]);
      setFriends(friendsList);
      setPendingRequests(requestsList);
    } catch (_) {}
  };

  useEffect(() => {
    loadFriendsData();

    if (socket) {
      const handleReqReceived = (item: FriendRequestItem) => {
        setPendingRequests((prev) => [item, ...prev]);
      };

      const handleReqAccepted = () => {
        loadFriendsData();
      };

      socket.on("friend_request_received", handleReqReceived);
      socket.on("friend_request_accepted", handleReqAccepted);
      socket.on("friend_removed", loadFriendsData);

      return () => {
        socket.off("friend_request_received", handleReqReceived);
        socket.off("friend_request_accepted", handleReqAccepted);
        socket.off("friend_removed", loadFriendsData);
      };
    }
  }, [socket]);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await fetcher(`/friends/request/${requestId}/accept`, { method: "PUT" });
      loadFriendsData();
    } catch (err) {
      console.error(err);
    }
  };

    const handleRemoveFriend = async (targetUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Remove this friend?")) return;
    try {
      // Optimistic update
      setFriends((prev) => prev.filter((f) => f.id !== targetUserId));
      await fetcher(`/friends/${targetUserId}`, { method: "DELETE" });
      await loadFriendsData();
    } catch (err) {
      console.error("Failed to remove friend:", err);
      loadFriendsData();
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await fetcher(`/friends/request/${requestId}/reject`, { method: "PUT" });
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error(err);
    }
  };

  const getOtherMember = (conversation: Conversation): User | undefined => {
    return conversation.members.find((m) => m.userId !== user?.id)?.user;
  };

  const filteredConversations = conversations.filter((c) => {
    const other = getOtherMember(c);
    if (!other) return false;
    const q = filterQuery.toLowerCase();
    return (
      other.displayName.toLowerCase().includes(q) ||
      other.username.toLowerCase().includes(q)
    );
  });

  const filteredFriends = friends.filter((f) => {
    const q = filterQuery.toLowerCase();
    return f.displayName.toLowerCase().includes(q) || f.username.toLowerCase().includes(q);
  });

  const formatThreadTime = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const handleMessageFromProfile = (targetUser: User) => {
    const existing = conversations.find((c) =>
      c.members.some((m) => m.userId === targetUser.id)
    );
    if (existing) {
      onSelectConversation(existing);
    } else if (onStartChatWithUser) {
      onStartChatWithUser(targetUser);
    }
  };

  return (
    <>
      <aside className="w-full h-full bg-[#FAF8F5] border-r border-[#EAE4D9] flex flex-col shrink-0 select-none">
        {/* Profile Card Header */}
        <div className="p-3.5 border-b border-[#EAE4D9] flex items-center justify-between bg-white shrink-0">
          <button
            onClick={() => setIsMyProfileOpen(true)}
            className="flex items-center gap-3 text-left group"
            title="Edit My Profile"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-[#F2ECE1] border border-[#EAE4D9] text-[#2B241D] flex items-center justify-center font-bold text-xs overflow-hidden shadow-2xs group-hover:ring-2 group-hover:ring-[#C28135] transition-all">
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.displayName?.[0]?.toUpperCase()
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[#2B241D] leading-tight group-hover:text-[#635749] truncate">
                {user?.displayName}
              </h2>
              <p className="text-[11px] text-stone-400 truncate">@{user?.username}</p>
            </div>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenNewChat}
              className="p-2 rounded-xl bg-[#2B241D] hover:bg-[#3E342B] active:scale-95 text-[#FAF8F5] transition-all shadow-xs"
              title="Find People"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Chats vs Contacts */}
        <div className="flex border-b border-[#EAE4D9] bg-white px-3 py-1.5 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("CHATS")}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "CHATS"
                ? "bg-[#2B241D] text-[#FAF8F5] shadow-xs"
                : "text-stone-500 hover:bg-[#F6F2EC]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Chats
          </button>

          <button
            onClick={() => setActiveTab("CONTACTS")}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all relative ${
              activeTab === "CONTACTS"
                ? "bg-[#2B241D] text-[#FAF8F5] shadow-xs"
                : "text-stone-500 hover:bg-[#F6F2EC]"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Contacts
            {pendingRequests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#C28135] text-white text-[10px] flex items-center justify-center font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="px-3.5 py-2 bg-[#F6F2EC]/60 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder={activeTab === "CHATS" ? "Search conversations..." : "Search contacts..."}
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-[#EAE4D9] text-xs text-[#2B241D] placeholder-stone-400 focus:outline-none focus:ring-1.5 focus:ring-[#C28135] transition-all"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {activeTab === "CHATS" ? (
            /* CONVERSATIONS TAB */
            filteredConversations.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center p-4 text-center">
                <p className="text-xs text-stone-400">
                  {filterQuery ? "No matching contacts" : "No chats yet. Click + to begin."}
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const other = getOtherMember(c);
                const isOnline = other ? onlineUsers.has(other.id) : false;
                const isActive = c.id === activeConversationId;
                const isOwnLastMessage = c.lastMessageSenderId === user?.id;
                const isUserTyping = typingMap[c.id];
                const unread = c.unreadCount || 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectConversation(c)}
                    className={`group relative w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all cursor-pointer ${
                      isActive
                        ? "bg-white border border-[#DDD4C5] text-[#2B241D] shadow-xs ring-1 ring-[#EAE4D9]"
                        : "hover:bg-white/70 text-[#635749]"
                    }`}
                  >
                    <div
                      className="relative shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (other) setSelectedUserForProfile({ ...other, isOnline });
                      }}
                      title="View Profile"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-[#F2ECE1] border border-[#EAE4D9] flex items-center justify-center font-semibold text-[#453C32] overflow-hidden hover:ring-2 hover:ring-[#C28135] transition-all">
                        {other?.photoUrl ? (
                          <img src={other.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          other?.displayName?.[0]?.toUpperCase()
                        )}
                      </div>

                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}

                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 rounded-full bg-[#C28135] text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white shadow-xs">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs truncate ${unread > 0 ? "font-bold text-[#2B241D]" : "font-semibold text-stone-800"}`}>
                          {other?.displayName}
                        </span>
                        <span className={`text-[10px] shrink-0 ml-1.5 ${unread > 0 ? "text-[#C28135] font-bold" : "text-stone-400"}`}>
                          {formatThreadTime(c.lastMessageAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        {isUserTyping ? (
                          <span className="text-[#C28135] font-medium text-[11px] italic animate-pulse">
                            typing...
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 truncate text-stone-500 text-[11.5px]">
                            {isOwnLastMessage && (
                              <span className="shrink-0 flex items-center gap-0.5">
                                {c.lastMessageStatus === "READ" ? (
                                  <span className="text-[#C28135] flex items-center gap-0.5 font-medium">
                                    Seen <CheckCheck className="w-3.5 h-3.5" />
                                  </span>
                                ) : c.lastMessageStatus === "DELIVERED" ? (
                                  <span className="text-stone-400 flex items-center gap-0.5">
                                    Delivered <CheckCheck className="w-3.5 h-3.5" />
                                  </span>
                                ) : (
                                  <span className="text-stone-400 flex items-center gap-0.5">
                                    Sent <Check className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </span>
                            )}
                            <span className={`truncate ${unread > 0 ? "font-semibold text-[#2B241D]" : ""}`}>
                              {c.lastMessage || "Started a conversation"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (other) setSelectedUserForProfile({ ...other, isOnline });
                        }}
                        className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700"
                        title="View Profile"
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(c.id);
                        }}
                        className="p-1 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors"
                        title="Clear chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* CONTACTS & REQUESTS TAB */
            <div className="space-y-3 pt-1">
              {/* Pending Requests Section */}
              {pendingRequests.length > 0 && (
                <div className="space-y-1.5">
                  <div className="px-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#C28135]">
                    <span>Friend Requests ({pendingRequests.length})</span>
                  </div>
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-2.5 rounded-2xl bg-white border border-[#EAE4D9] shadow-2xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#F2ECE1] border border-[#EAE4D9] flex items-center justify-center font-bold text-xs text-[#2B241D] shrink-0">
                          {req.sender.photoUrl ? (
                            <img src={req.sender.photoUrl} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            req.sender.displayName[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#2B241D] truncate">{req.sender.displayName}</p>
                          <p className="text-[10px] text-stone-400 truncate">@{req.sender.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="p-1.5 rounded-lg bg-[#2B241D] text-white hover:bg-[#3E342B] transition-colors"
                          title="Accept"
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="p-1.5 rounded-lg bg-stone-100 text-stone-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Decline"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Friends List Section */}
              <div className="space-y-1">
                <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Friends ({filteredFriends.length})
                </div>
                {filteredFriends.length === 0 ? (
                  <p className="text-xs text-stone-400 px-2 py-4 text-center">
                    {filterQuery ? "No matching friends" : "No friends added yet. Use + to search."}
                  </p>
                ) : (
                  filteredFriends.map((friend) => {
                    const isOnline = onlineUsers.has(friend.id);
                    return (
                      <div
                        key={friend.id}
                        className="p-2.5 rounded-2xl bg-white hover:bg-[#F6F2EC] border border-[#EAE4D9] flex items-center justify-between cursor-pointer transition-all"
                        onClick={() => setSelectedUserForProfile({ ...friend, isOnline })}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-[#F2ECE1] border border-[#EAE4D9] flex items-center justify-center font-bold text-xs text-[#2B241D] overflow-hidden">
                              {friend.photoUrl ? (
                                <img src={friend.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                friend.displayName[0]?.toUpperCase()
                              )}
                            </div>
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#2B241D] truncate">{friend.displayName}</p>
                            <p className="text-[10px] text-stone-400 truncate">@{friend.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMessageFromProfile(friend);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-[#2B241D] text-white text-[11px] font-semibold flex items-center gap-1 hover:bg-[#3E342B]"
                          >
                            <MessageSquare className="w-3 h-3" /> Chat
                          </button>
                          <button
                            onClick={(e) => handleRemoveFriend(friend.id, e)}
                            className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Remove friend"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-[#EAE4D9] text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-[#2B241D] mb-1">Clear this chat?</h3>
            <p className="text-xs text-stone-500 mb-4">Messages will be removed from your view only.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteConversation(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileModal isOpen={isMyProfileOpen} onClose={() => setIsMyProfileOpen(false)} />
      <UserProfileModal
        user={selectedUserForProfile}
        isOpen={Boolean(selectedUserForProfile)}
        onClose={() => setSelectedUserForProfile(null)}
        onMessage={handleMessageFromProfile}
      />
    </>
  );
}
