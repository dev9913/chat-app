"use client";

import React, { useState, useEffect, useRef } from "react";
import { Conversation, Message } from "@/types";
import { fetcher } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { sounds } from "@/lib/sound";
import MessageBubble from "./MessageBubble";
import UserProfileModal from "./UserProfileModal";
import { Send, Search, X, Paperclip, ArrowLeft, Loader2, UserCheck } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

interface Props {
  conversation: Conversation;
  onBack?: () => void;
  onDeleteConversation?: (convId: string) => void;
}

export default function ChatWindow({ conversation, onBack, onDeleteConversation }: Props) {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [isFriend, setIsFriend] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const otherUser = conversation.members.find((m) => m.userId !== user?.id)?.user;
  const isOnline = otherUser ? onlineUsers.has(otherUser.id) : false;

  useEffect(() => {
    async function loadMessages() {
      try {
        const data = await fetcher<Message[]>(`/conversations/${conversation.id}/messages`);
        setMessages(data);
      } catch (err) {
        console.error(err);
      }
    }
    loadMessages();

    if (socket) {
      socket.emit("join_conversation", { conversationId: conversation.id });
      socket.emit("mark_read", { conversationId: conversation.id });

      const handleNewMessage = (msg: Message) => {
        if (msg.conversationId === conversation.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          if (msg.senderId !== user?.id) {
            sounds.playReceivedPop();
            socket.emit("mark_read", { conversationId: conversation.id });
          }
        }
      };

      const handleMessageDeleted = (data: { conversationId: string; messageId: string }) => {
        if (data.conversationId === conversation.id) {
          setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
        }
      };

      const handleEditedMessage = (updated: Message) => {
        if (updated.conversationId === conversation.id) {
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      };

      const handleMessagesRead = (data: { conversationId: string; readerId?: string }) => {
        if (data.conversationId === conversation.id) {
          setMessages((prev) =>
            prev.map((m) => (m.senderId === user?.id ? { ...m, status: "READ" } : m))
          );
        }
      };

      const handleStatusUpdate = (data: { conversationId: string; status: "DELIVERED" | "READ" }) => {
        if (data.conversationId === conversation.id) {
          setMessages((prev) =>
            prev.map((m) => (m.senderId === user?.id && m.status !== "READ" ? { ...m, status: data.status } : m))
          );
        }
      };

      // REAL-TIME REACTION SYNC: Strictly enforces 1 reaction per user
      const handleReactionUpdated = (data: {
        conversationId: string;
        messageId: string;
        action: "added" | "removed" | "replaced";
        reaction?: any;
        emoji: string;
        oldEmoji?: string;
        userId: string;
      }) => {
        if (data.conversationId === conversation.id) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== data.messageId) return msg;

              const current = msg.reactions || [];
              const withoutUser = current.filter((r: any) => r.userId !== data.userId);

              if (data.action === "removed") {
                return { ...msg, reactions: withoutUser };
              }

              if ((data.action === "added" || data.action === "replaced") && data.reaction) {
                return { ...msg, reactions: [...withoutUser, data.reaction] };
              }

              return msg;
            })
          );
        }
      };

      const handleTypingStart = (data: { conversationId: string; userId: string }) => {
        if (data.conversationId === conversation.id && data.userId !== user?.id) {
          setIsTyping(true);
        }
      };

      const handleTypingStop = (data: { conversationId: string; userId: string }) => {
        if (data.conversationId === conversation.id && data.userId !== user?.id) {
          setIsTyping(false);
        }
      };

      socket.on("new_message", handleNewMessage);
      socket.on("message_deleted", handleMessageDeleted);
      socket.on("message_edited", handleEditedMessage);
      socket.on("messages_read", handleMessagesRead);
      socket.on("conversation_read_status", handleMessagesRead);
      socket.on("message_status_update", handleStatusUpdate);
      socket.on("reaction_updated", handleReactionUpdated);
      socket.on("send_message_error", (err: { message: string }) => {
        alert(err.message || "You cannot message this user until they accept your friend request.");
      });
      socket.on("friend_removed", (data: { userId: string }) => {
        if (data.userId === otherUser?.id) {
          setIsFriend(false);
        }
      });
      socket.on("typing_start", handleTypingStart);
      socket.on("typing_stop", handleTypingStop);

      return () => {
        socket.emit("leave_conversation", { conversationId: conversation.id });
        socket.off("new_message", handleNewMessage);
        socket.off("message_deleted", handleMessageDeleted);
        socket.off("message_edited", handleEditedMessage);
        socket.off("messages_read", handleMessagesRead);
        socket.off("conversation_read_status", handleMessagesRead);
        socket.off("message_status_update", handleStatusUpdate);
        socket.off("reaction_updated", handleReactionUpdated);
        socket.off("send_message_error", () => {});
        socket.off("friend_removed", () => {});
        socket.off("typing_start", handleTypingStart);
        socket.off("typing_stop", handleTypingStop);
      };
    }
  }, [conversation.id, socket, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

    useEffect(() => {
    if (otherUser?.id && user?.id) {
      fetcher<{ status: string }>(`/friends/status/${otherUser.id}`)
        .then((res) => {
          setIsFriend(res.status === "ACCEPTED");
        })
        .catch(() => setIsFriend(true));
    }
  }, [otherUser?.id, conversation.id, user?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSend = async () => {
    if (!isFriend) {
      alert("You must be accepted friends to send messages.");
      return;
    }
    if (!socket) return;
    if (!inputText.trim() && !selectedFile) return;

    let fileUrl: string | undefined = undefined;
    let fileName: string | undefined = undefined;
    let fileSize: string | undefined = undefined;

    if (selectedFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const token = localStorage.getItem("chatly_token");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/conversations/${conversation.id}/messages/attachment`,
          {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          }
        );
        const data = await res.json();
        fileUrl = data.url;
        fileName = selectedFile.name;
        fileSize = formatFileSize(selectedFile.size);
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
        setSelectedFile(null);
        setPreviewUrl(null);
      }
    }

    socket.emit("send_message", {
      conversationId: conversation.id,
      text: inputText,
      imageUrl: fileUrl,
      fileName,
      fileSize,
    });

    sounds.playSentPop();
    socket.emit("typing_stop", { conversationId: conversation.id });
    setInputText("");
  };

  const handleEditMessage = (messageId: string, newText: string) => {
    if (socket) {
      socket.emit("edit_message", {
        conversationId: conversation.id,
        messageId,
        text: newText,
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    if (socket) {
      socket.emit("delete_message", {
        conversationId: conversation.id,
        messageId,
      });
    }
    try {
      await fetcher(`/conversations/${conversation.id}/messages/${messageId}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (socket) {
      socket.emit("toggle_reaction", {
        conversationId: conversation.id,
        messageId,
        emoji,
      });
    }
  };

  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) => (m.text || "").toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const renderDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    let label = format(date, "MMMM d, yyyy");
    if (isToday(date)) label = "Today";
    if (isYesterday(date)) label = "Yesterday";

    return (
      <div className="flex items-center justify-center my-4">
        <span className="bg-[#EAE4D9]/80 text-[#635749] text-[11px] px-3.5 py-0.5 rounded-full font-medium shadow-2xs">
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF8F5] overflow-hidden">
      {/* Top Header */}
      <div className="px-4 py-3 bg-white border-b border-[#EAE4D9] flex items-center justify-between shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-stone-700 md:hidden hover:bg-stone-100 rounded-xl"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => setShowUserProfile(true)}
            className="flex items-center gap-3 cursor-pointer group min-w-0"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-[#F2ECE1] border border-[#EAE4D9] text-[#2B241D] flex items-center justify-center font-bold text-xs overflow-hidden group-hover:ring-2 group-hover:ring-[#C28135] transition-all">
                {otherUser?.photoUrl ? (
                  <img src={otherUser.photoUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                  otherUser?.displayName?.[0]?.toUpperCase()
                )}
              </div>
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-[#2B241D] group-hover:text-[#635749] leading-tight truncate">
                  {otherUser?.displayName}
                </h2>
                <UserCheck className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#C28135] shrink-0" />
              </div>
              <p className="text-[11px] text-stone-400 truncate">
                {isOnline ? <span className="text-emerald-700 font-medium">Online</span> : "Offline"}
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {searchOpen ? (
            <div className="flex items-center gap-1 bg-[#F6F2EC] border border-[#EAE4D9] rounded-xl px-2.5 py-1">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-[#2B241D] focus:outline-none w-24 sm:w-44"
                autoFocus
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="text-stone-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-[#F6F2EC] transition-colors"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowUserProfile(true)}
            className="px-3 py-1.5 rounded-xl bg-[#F2ECE1] hover:bg-[#EAE4D9] text-[#2B241D] text-xs font-semibold transition-colors"
          >
            Profile
          </button>
        </div>
      </div>

      {/* Message Feed Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-12 py-5 flex flex-col justify-start">
        {displayedMessages.map((m, index) => {
          const showDateSeparator =
            index === 0 ||
            format(new Date(displayedMessages[index - 1].createdAt), "yyyy-MM-dd") !==
              format(new Date(m.createdAt), "yyyy-MM-dd");

          return (
            <React.Fragment key={m.id}>
              {showDateSeparator && renderDateSeparator(m.createdAt)}
              <MessageBubble
                message={m}
                isOwn={m.senderId === user?.id}
                onDelete={handleDeleteMessage}
                onEdit={handleEditMessage}
                onReaction={handleReaction}
              />
            </React.Fragment>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-[#C28135] italic py-2">
            <span>{otherUser?.displayName} is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="mx-4 mb-2 p-2.5 bg-white border border-[#EAE4D9] rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-[#EAE4D9]" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#F2ECE1] border border-[#EAE4D9] flex items-center justify-center text-[#2B241D]">
                <Paperclip className="w-4 h-4" />
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-semibold text-[#2B241D] truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-stone-400">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>

          <button
            onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
            className="p-1 rounded-lg hover:bg-stone-100 text-stone-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Composer Bar */}
      {!isFriend ? (
        <div className="p-4 bg-[#F6F2EC] border-t border-[#EAE4D9] text-center text-xs text-[#635749] font-medium flex items-center justify-center gap-2">
          <span>🔒 You can only send messages once your friend request is accepted.</span>
        </div>
      ) : (
        <div className="p-3 sm:p-4 bg-white border-t border-[#EAE4D9]">
        <div className="flex items-center gap-2 bg-[#FAF8F5] border border-[#EAE4D9] rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-[#C28135] focus-within:bg-white transition-all">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-stone-400 hover:text-[#2B241D] transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />

          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (socket) {
                socket.emit("typing_start", { conversationId: conversation.id });
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  socket.emit("typing_stop", { conversationId: conversation.id });
                }, 2000);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-transparent px-2 py-1 text-sm text-[#2B241D] placeholder-stone-400 focus:outline-none"
          />

          <button
            onClick={handleSend}
            disabled={(!inputText.trim() && !selectedFile) || uploading}
            className="p-2 rounded-xl bg-[#2B241D] hover:bg-[#3E342B] active:scale-95 text-[#FAF8F5] transition-all disabled:opacity-30 shrink-0"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
      )}

      <UserProfileModal
        user={otherUser ? { ...otherUser, isOnline } : null}
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
      />
    </div>
  );
}
