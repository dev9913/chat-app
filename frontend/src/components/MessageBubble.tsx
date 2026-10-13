"use client";

import React, { useState } from "react";
import { Message } from "@/types";
import { format } from "date-fns";
import { Check, CheckCheck, MoreHorizontal, Trash2, Copy, Pencil, X, Maximize2, FileText, Download, SmilePlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ImageLightboxModal from "./ImageLightboxModal";

interface Props {
  message: Message;
  isOwn: boolean;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newText: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
}

const AVAILABLE_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

export default function MessageBubble({ message, isOwn, onDelete, onEdit, onReaction }: Props) {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || "");
  const [showLightbox, setShowLightbox] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text || "");
    setShowMenu(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onEdit && editText.trim() && editText !== message.text) {
      onEdit(message.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleEmojiClick = (emoji: string) => {
    if (onReaction) {
      onReaction(message.id, emoji);
    }
    setShowEmojiPicker(false);
  };

  const isImageFile = (url?: string | null, name?: string | null) => {
    if (!url) return false;
    const target = (name || url).toLowerCase();
    return target.endsWith(".jpg") || target.endsWith(".jpeg") || target.endsWith(".png") || target.endsWith(".webp") || target.endsWith(".gif");
  };

  const hasImage = isImageFile(message.imageUrl, message.fileName);
  const hasGenericFile = Boolean(message.imageUrl && !hasImage);

  // Group reactions: each emoji has a list of user names and count
  const reactionGroups = (message.reactions || []).reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { count: 0, hasReacted: false, users: [] };
    }
    acc[r.emoji].count += 1;
    acc[r.emoji].users.push(r.user?.displayName || "User");
    if (user && r.userId === user.id) {
      acc[r.emoji].hasReacted = true;
    }
    return acc;
  }, {} as Record<string, { count: number; hasReacted: boolean; users: string[] }>);

  const hasReactions = Object.keys(reactionGroups).length > 0;

  return (
    <>
      <div
        className={`relative flex w-full group mb-3.5 ${isOwn ? "justify-end" : "justify-start"}`}
        onMouseLeave={() => {
          setShowMenu(false);
          setShowEmojiPicker(false);
        }}
      >
        {!isEditing && (
          <div
            className={`opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity ${
              isOwn ? "order-first mr-1.5" : "order-last ml-1.5"
            }`}
          >
            {/* Reaction Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowMenu(false);
                }}
                className="p-1.5 rounded-full text-stone-400 hover:text-[#2B241D] hover:bg-[#F2ECE1] transition-colors"
                title="React"
              >
                <SmilePlus className="w-4 h-4" />
              </button>

              {/* Emoji bar */}
              {showEmojiPicker && (
                <div
                  className={`absolute bottom-full mb-1 z-40 bg-white border border-[#EAE4D9] rounded-2xl shadow-xl px-2 py-1.5 flex items-center gap-1 animate-in zoom-in-95 duration-150 ${
                    isOwn ? "right-0" : "left-0"
                  }`}
                >
                  {AVAILABLE_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className="text-base p-1.5 hover:scale-125 hover:bg-[#FAF8F5] rounded-xl transition-transform active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Menu options */}
            {isOwn && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(!showMenu);
                    setShowEmojiPicker(false);
                  }}
                  className="p-1.5 rounded-full text-stone-400 hover:text-[#2B241D] hover:bg-[#F2ECE1] transition-colors"
                  title="More options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {showMenu && (
                  <div className="absolute bottom-full mb-1 right-0 z-30 bg-white border border-[#EAE4D9] rounded-xl shadow-lg py-1 text-xs text-stone-800 min-w-[110px]">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[#F6F2EC] transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-[#F6F2EC] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(message.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Unsend
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bubble & Reaction Badges */}
        <div className={`relative max-w-[85%] sm:max-w-[62%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
          <div
            className={`relative px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed shadow-2xs ${
              isOwn
                ? "bg-[#EDE7DC] text-[#26201A] border border-[#DDD4C5] rounded-br-xs"
                : "bg-white text-[#2B241D] border border-[#EAE4D9] rounded-bl-xs"
            }`}
          >
            {/* Image File */}
            {hasImage && (
              <div
                className="relative mb-2 overflow-hidden rounded-xl border border-stone-300/30 group/img cursor-pointer"
                onClick={() => setShowLightbox(true)}
                title="Click to zoom"
              >
                <img
                  src={message.imageUrl!}
                  alt="Attachment"
                  className="max-h-72 w-full object-cover hover:brightness-95 transition-all"
                />
                <div className="absolute bottom-2 right-2 bg-black/60 text-white p-1 rounded-md opacity-0 group-hover/img:opacity-100 transition-opacity">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {/* Document Attachment */}
            {hasGenericFile && (
              <a
                href={message.imageUrl!}
                download={message.fileName || "attachment"}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-2.5 mb-2 rounded-xl border transition-all ${
                  isOwn
                    ? "bg-[#E2DACB] border-[#DDD4C5] hover:bg-[#D5CBBC]"
                    : "bg-[#F6F2EC] border-[#EAE4D9] hover:bg-[#EAE4D9]"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isOwn ? "bg-white/80 text-[#2B241D]" : "bg-white text-stone-700 border border-stone-200"
                }`}>
                  <FileText className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-xs font-semibold truncate ${isOwn ? "text-[#26201A]" : "text-[#2B241D]"}`}>
                    {message.fileName || "Attachment"}
                  </p>
                  <p className={`text-[10px] ${isOwn ? "text-[#635749]" : "text-stone-400"}`}>
                    {message.fileSize || "Download"}
                  </p>
                </div>

                <Download className={`w-4 h-4 shrink-0 ${isOwn ? "text-[#26201A]" : "text-stone-500"}`} />
              </a>
            )}

            {/* Text Message */}
            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="flex flex-col gap-2 mt-1">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="px-2 py-1 rounded bg-white text-stone-900 text-xs border border-[#DDD4C5] focus:outline-none"
                  autoFocus
                />
                <div className="flex gap-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-0.5 rounded text-[11px] bg-stone-200 text-stone-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-0.5 rounded text-[11px] bg-[#2B241D] text-white font-bold"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>
            )}

            {/* Time & Read Receipts */}
            <div
              className={`flex items-center gap-1.5 mt-1 text-[10px] justify-end ${
                isOwn ? "text-[#635749]" : "text-stone-400"
              }`}
            >
              <span>{format(new Date(message.createdAt), "h:mm a")}</span>
              {message.isEdited === true && <span className="italic">(edited)</span>}

              {isOwn && (
                <span className="flex items-center gap-1 ml-0.5">
                  {message.status === "READ" ? (
                    <>
                      <span className="text-[#C28135] font-medium">Seen</span>
                      <CheckCheck className="w-3.5 h-3.5 text-[#C28135]" />
                    </>
                  ) : message.status === "DELIVERED" ? (
                    <>
                      <span>Delivered</span>
                      <CheckCheck className="w-3.5 h-3.5 text-[#635749]" />
                    </>
                  ) : (
                    <>
                      <span>Sent</span>
                      <Check className="w-3.5 h-3.5 text-[#635749]" />
                    </>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Reaction badges summary (Only 1 per user) */}
          {hasReactions && (
            <div className={`flex flex-wrap gap-1 mt-1 z-10 ${isOwn ? "justify-end" : "justify-start"}`}>
              {Object.entries(reactionGroups).map(([emoji, data]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border shadow-2xs transition-all active:scale-95 ${
                    data.hasReacted
                      ? "bg-[#F2ECE1] border-[#C28135] text-[#2B241D] ring-1 ring-[#C28135]"
                      : "bg-white border-[#EAE4D9] text-stone-600 hover:bg-[#FAF8F5]"
                  }`}
                  title={data.users.join(", ")}
                >
                  <span>{emoji}</span>
                  {data.count > 1 && <span className="text-[10px] font-semibold">{data.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ImageLightboxModal
        imageUrl={showLightbox ? message.imageUrl || null : null}
        altText="Message Photo"
        onClose={() => setShowLightbox(false)}
      />
    </>
  );
}
