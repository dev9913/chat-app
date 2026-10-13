"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { fetcher } from "@/lib/api";
import { Conversation, Message, User } from "@/types";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import NewChatModal from "@/components/NewChatModal";
import MessageToast from "@/components/MessageToast";
import { MessageSquareDashed } from "lucide-react";

export default function ChatPage() {
  const { user, loading } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});

  const [toastData, setToastData] = useState<{
    sender: User;
    text: string;
    conversationId: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetcher<Conversation[]>("/conversations")
        .then((data) => {
          setConversations(data);
          if (typeof window !== "undefined" && window.innerWidth >= 768 && data.length > 0 && !activeConversation) {
            setActiveConversation(data[0]);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  const getMessagePreview = (msg: Message) => {
    if (msg.fileName && !msg.fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
      return `📄 ${msg.fileName}`;
    }
    if (msg.imageUrl) {
      return msg.text ? `📷 ${msg.text}` : "📷 Photo";
    }
    return msg.text || "Started a conversation";
  };

  useEffect(() => {
    if (!socket) return;

    // Real-time reordering: newly messaged thread jumps to position 1
    const handleConversationUpdated = (msg: Message) => {
      setConversations((prev) => {
        const existingIndex = prev.findIndex((c) => c.id === msg.conversationId);
        const isCurrentlyViewing = activeConversation?.id === msg.conversationId;
        const isFromOtherUser = msg.senderId !== user?.id;

        if (existingIndex !== -1) {
          const targetConv = prev[existingIndex];
          const currentUnread = targetConv.unreadCount || 0;
          const newUnread = isCurrentlyViewing || !isFromOtherUser ? 0 : currentUnread + 1;

          const updatedConv = {
            ...targetConv,
            lastMessage: getMessagePreview(msg),
            lastMessageAt: msg.createdAt,
            lastMessageSenderId: msg.senderId,
            lastMessageStatus: msg.status,
            unreadCount: newUnread,
          };

          const remaining = prev.filter((_, idx) => idx !== existingIndex);
          return [updatedConv, ...remaining];
        } else {
          fetcher<Conversation[]>("/conversations").then((fresh) => {
            const isFromOther = msg.senderId !== user?.id;
            const patched = fresh.map((c) => 
              c.id === msg.conversationId && isFromOther ? { ...c, unreadCount: 1 } : c
            );
            setConversations(patched);
            // do not auto-open the chat window for receiver
          }).catch(() => {});
          return prev;
        }
      });

      if (msg.senderId !== user?.id) {
        if (!activeConversation || activeConversation.id !== msg.conversationId) {
          setToastData({
            // sender: msg.sender,
            sender: msg.sender!,
            text: getMessagePreview(msg),
            conversationId: msg.conversationId,
          });
        }
      }
    };

    const handlePreviewUpdated = (data: { conversationId: string; lastMessage: string; lastMessageAt: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId
            ? { ...c, lastMessage: data.lastMessage, lastMessageAt: data.lastMessageAt }
            : c
        )
      );
    };

    const handleReadStatus = (data: { conversationId: string }) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === data.conversationId ? { ...c, lastMessageStatus: "READ" } : c))
      );
    };

    const handleTypingStart = (data: { conversationId: string; userId: string }) => {
      setTypingMap((prev) => ({ ...prev, [data.conversationId]: true }));
    };

    const handleTypingStop = (data: { conversationId: string; userId: string }) => {
      setTypingMap((prev) => ({ ...prev, [data.conversationId]: false }));
    };

    socket.on("conversation_updated", handleConversationUpdated);
    socket.on("conversation_preview_updated", handlePreviewUpdated);
    socket.on("new_message", handleConversationUpdated);
    socket.on("messages_read", handleReadStatus);
    socket.on("conversation_read_status", handleReadStatus);
    socket.on("typing_start", handleTypingStart);
    socket.on("typing_stop", handleTypingStop);

    return () => {
      socket.off("conversation_updated", handleConversationUpdated);
      socket.off("conversation_preview_updated", handlePreviewUpdated);
      socket.off("new_message", handleConversationUpdated);
      socket.off("messages_read", handleReadStatus);
      socket.off("conversation_read_status", handleReadStatus);
      socket.off("typing_start", handleTypingStart);
      socket.off("typing_stop", handleTypingStop);
    };
  }, [socket, activeConversation, user?.id]);

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv);
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await fetcher(`/conversations/${conversationId}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
      }
    } catch (err) {
      console.error("Failed to delete conversation", err);
    }
  };

  const handleStartConversation = async (targetUser: User) => {
    try {
      const conv = await fetcher<Conversation>("/conversations", {
        method: "POST",
        body: JSON.stringify({ targetUserId: targetUser.id }),
      });

      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== conv.id);
        return [conv, ...remaining];
      });

      setActiveConversation(conv);
    } catch (err) {
      console.error("Could not start conversation from profile:", err);
    }
  };

  // --- WARM CREAM & DEEP ESPRESSO LOADING SCREEN ---
  if (loading || !user) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-[#FAF8F5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#EAE4D9] border-t-[#2B241D] animate-spin shrink-0" style={{ borderTopColor: "#2B241D" }} />
          <p className="text-[#635749] text-xs font-semibold tracking-wider uppercase font-mono">
            Loading Chatly...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#FAF8F5] select-none">
      {/* Sidebar List */}
      <div
        className={`w-full md:w-80 lg:w-88 h-full shrink-0 ${
          activeConversation ? "hidden md:block" : "block"
        }`}
      >
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversation?.id}
          typingMap={typingMap}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onOpenNewChat={() => setIsModalOpen(true)}
          onStartChatWithUser={handleStartConversation}
        />
      </div>

      {/* Main Chat Area */}
      <div
        className={`flex-1 h-full ${
          !activeConversation ? "hidden md:flex" : "flex"
        }`}
      >
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            onBack={() => setActiveConversation(null)}
            onDeleteConversation={handleDeleteConversation}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#FAF8F5] border-l border-[#EAE4D9]">
            <div className="w-14 h-14 rounded-2xl bg-white border border-[#EAE4D9] flex items-center justify-center text-[#635749] mb-3 shadow-2xs">
              <MessageSquareDashed className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#2B241D]">Your Conversations</h3>
            <p className="text-xs text-stone-400 max-w-xs mt-1">
              Select a conversation to start chatting or search a user.
            </p>
          </div>
        )}
      </div>

      <NewChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectUser={handleStartConversation}
      />

      <MessageToast
        isOpen={Boolean(toastData)}
        sender={toastData?.sender || null}
        text={toastData?.text || ""}
        onOpenChat={() => {
          if (!toastData) return;
          const target = conversations.find((c) => c.id === toastData.conversationId);
          if (target) handleSelectConversation(target);
          setToastData(null);
        }}
        onClose={() => setToastData(null)}
      />
    </div>
  );
}
