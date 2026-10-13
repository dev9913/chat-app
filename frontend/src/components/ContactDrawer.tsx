"use client";

import React, { useState } from "react";
import { User, Message } from "@/types";
import { X, Image as ImageIcon, FileText, Download, Trash2, Maximize2 } from "lucide-react";
import { format } from "date-fns";
import ImageLightboxModal from "./ImageLightboxModal";

interface Props {
  user: User | null;
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
  onDeleteChat: () => void;
}

export default function ContactDrawer({ user, messages, isOpen, onClose, onDeleteChat }: Props) {
  const [activeTab, setActiveTab] = useState<"media" | "docs">("media");
  const [selectedLightboxImg, setSelectedLightboxImg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const sharedImages = messages.filter((m) => Boolean(m.imageUrl && !m.fileName?.match(/\.(pdf|docx?|zip|rar|tar)$/i)));
  const sharedDocs = messages.filter((m) => Boolean(m.imageUrl && m.fileName && !m.fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i)));

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="w-full sm:w-96 h-full bg-white border-l border-stone-200 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
            <h2 className="text-sm font-semibold text-stone-900">Contact Info</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-stone-200 text-stone-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* User Profile Overview */}
            <div className="p-6 flex flex-col items-center border-b border-stone-200 bg-white">
              <div
                className="relative group cursor-pointer"
                onClick={() => user.photoUrl && setSelectedLightboxImg(user.photoUrl)}
                title="Click to view full photo"
              >
                <div className="w-24 h-24 rounded-full bg-stone-200 border-2 border-stone-300 flex items-center justify-center text-3xl font-bold text-stone-700 overflow-hidden shadow-inner">
                  {user.photoUrl ? (
                    <img src={user.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user.displayName?.[0]?.toUpperCase()
                  )}
                </div>
                {user.photoUrl && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    <Maximize2 className="w-6 h-6" />
                  </div>
                )}
                <span
                  className={`absolute bottom-1 right-1 w-4 h-4 rounded-full ring-2 ring-white ${
                    user.isOnline ? "bg-emerald-500" : "bg-stone-400"
                  }`}
                />
              </div>

              <h3 className="text-base font-bold text-stone-900 mt-3">{user.displayName}</h3>
              <p className="text-xs text-stone-400">@{user.username}</p>

              <div className="mt-2.5 flex items-center gap-1.5 text-xs">
                <span className={`w-2 h-2 rounded-full ${user.isOnline ? "bg-emerald-500" : "bg-stone-400"}`} />
                <span className={user.isOnline ? "text-emerald-600 font-medium" : "text-stone-500"}>
                  {user.isOnline ? "Online" : user.lastSeen ? `Last seen ${format(new Date(user.lastSeen), "MMM d, h:mm a")}` : "Offline"}
                </span>
              </div>
            </div>

            {/* Media & Docs Tabs */}
            <div className="p-4 border-b border-stone-200">
              <div className="flex bg-stone-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab("media")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === "media" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Media ({sharedImages.length})
                </button>
                <button
                  onClick={() => setActiveTab("docs")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === "docs" ? "bg-white text-stone-900 shadow-xs" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Docs ({sharedDocs.length})
                </button>
              </div>

              {/* Shared Media Grid */}
              {activeTab === "media" && (
                <div className="mt-3.5">
                  {sharedImages.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-6">No images shared yet</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {sharedImages.map((img) => (
                        <div
                          key={img.id}
                          onClick={() => setSelectedLightboxImg(img.imageUrl!)}
                          className="aspect-square rounded-xl overflow-hidden bg-stone-100 border border-stone-200 cursor-pointer hover:opacity-85 transition-opacity"
                        >
                          <img src={img.imageUrl!} alt="Shared" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Shared Docs List */}
              {activeTab === "docs" && (
                <div className="mt-3.5 space-y-2">
                  {sharedDocs.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-6">No documents shared yet</p>
                  ) : (
                    sharedDocs.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.imageUrl!}
                        download={doc.fileName || "file"}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-stone-800 truncate">{doc.fileName || "Document"}</p>
                          <p className="text-[10px] text-stone-400">{doc.fileSize || "File"}</p>
                        </div>
                        <Download className="w-4 h-4 text-stone-400 shrink-0" />
                      </a>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Clear Chat Button */}
            <div className="p-4">
              <button
                onClick={() => {
                  onDeleteChat();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-rose-600" /> Clear Chat History
              </button>
            </div>
          </div>
        </div>
      </div>

      <ImageLightboxModal
        imageUrl={selectedLightboxImg}
        altText="Preview"
        onClose={() => setSelectedLightboxImg(null)}
      />
    </>
  );
}
