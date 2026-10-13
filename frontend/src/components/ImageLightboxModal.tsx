"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface Props {
  imageUrl: string | null;
  altText?: string;
  onClose: () => void;
}

export default function ImageLightboxModal({ imageUrl, altText, onClose }: Props) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [transformOrigin, setTransformOrigin] = useState("center center");
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    if (!imgRef.current) return;

    if (!isZoomed) {
      const rect = imgRef.current.getBoundingClientRect();
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
      setTransformOrigin(`${xPercent}% ${yPercent}%`);
      setScale(2.5);
      setIsZoomed(true);
    } else {
      setScale(1);
      setIsZoomed(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    setTransformOrigin(`${Math.max(0, Math.min(100, xPercent))}% ${Math.max(0, Math.min(100, yPercent))}%`);
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 select-none overflow-hidden animate-in fade-in duration-150"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onMouseMove={handleMouseMove}
    >
      <div
        className="absolute top-4 right-4 flex items-center gap-2 bg-stone-900/80 border border-stone-700/60 rounded-full px-3 py-1.5 text-white z-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            setIsZoomed(!isZoomed);
            setScale(isZoomed ? 1 : 2.5);
          }}
          className="p-1 hover:text-stone-300 text-xs flex items-center gap-1"
        >
          {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          <span>{isZoomed ? "Fit" : "Zoom"}</span>
        </button>

        <div className="w-[1px] h-4 bg-stone-700 mx-1" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 hover:text-rose-400 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        className="relative max-w-[92vw] max-h-[86vh] flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt={altText || "Preview"}
          onClick={handleImageClick}
          style={{
            transformOrigin,
            transform: `scale(${scale})`,
            cursor: isZoomed ? "zoom-out" : "zoom-in",
          }}
          className="max-w-[90vw] max-h-[84vh] object-contain rounded-xl shadow-2xl transition-transform duration-200 ease-out"
        />
      </div>
      <p className="text-stone-400 text-[11px] mt-3">
        {isZoomed ? "Move cursor to pan • Click to zoom out" : "Click image to zoom in"}
      </p>
    </div>
  );
}
