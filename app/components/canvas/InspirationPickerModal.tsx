"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import inspirations from "@/app/prompts/highest_liked_prompts.json";
import type { Inspiration } from "./InspirationSidebar";

const data = inspirations as Inspiration[];

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

interface InspirationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  onSubmit: (selections: Array<{ inspiration: Inspiration; note: string }>) => void;
}

export function InspirationPickerModal({
  isOpen,
  onClose,
  productName,
  onSubmit,
}: InspirationPickerModalProps) {
  const [selected, setSelected] = useState<Map<string, { inspiration: Inspiration; note: string }>>(new Map());
  const [previewItem, setPreviewItem] = useState<Inspiration | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelected(new Map());
      setPreviewItem(null);
    }
  }, [isOpen]);

  // Reset active image when preview changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [previewItem]);

  // Track scroll position for thumbnail highlight in preview
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container || !previewItem || previewItem.images.length <= 1) return;
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const images = container.querySelectorAll("img");
      let closest = 0;
      let closestDist = Infinity;
      images.forEach((img, i) => {
        const dist = Math.abs(img.offsetTop - scrollTop);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      setActiveImageIndex(closest);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [previewItem]);

  const toggleSelection = (item: Inspiration) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, { inspiration: item, note: "" });
      }
      return next;
    });
  };

  const updateNote = (id: string, note: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const entry = next.get(id);
      if (entry) {
        next.set(id, { ...entry, note });
      }
      return next;
    });
  };

  const removeSelection = (id: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSubmit = () => {
    onSubmit(Array.from(selected.values()));
  };

  const handleClose = () => {
    if (selected.size > 0) {
      if (!confirm("You have selections. Discard them?")) return;
    }
    onClose();
  };

  const scrollToImage = (index: number) => {
    const container = imageContainerRef.current;
    if (!container) return;
    const images = container.querySelectorAll("img");
    if (images[index]) {
      images[index].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            style={{ width: "90vw", maxWidth: "1400px", height: "90vh", fontFamily }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: "#111" }}>
                  Pick styles for{" "}
                  <span style={{ color: "#ef4444" }}>{productName || "your product"}</span>
                </h2>
                <p style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                  Select one or more inspirations, then adapt them all at once
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Main gallery grid */}
            <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: "none" }}>
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                {data.map((item) => {
                  const isSelected = selected.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleSelection(item)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setPreviewItem(item);
                      }}
                      className="group relative rounded-xl overflow-hidden bg-gray-100 transition-all"
                      style={{
                        outline: isSelected ? "3px solid #ef4444" : "none",
                        outlineOffset: "-3px",
                      }}
                    >
                      <img
                        src={item.image}
                        alt={item.author_name}
                        className="w-full object-cover"
                        style={{ aspectRatio: "1 / 1" }}
                        loading="lazy"
                      />
                      {/* Selection checkmark */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2.5 w-full flex items-center justify-between">
                          <div className="flex items-center gap-1 text-white">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                            <span style={{ fontSize: 11, fontWeight: 500 }}>{formatNumber(item.likes)}</span>
                          </div>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewItem(item);
                            }}
                            className="text-white/80 hover:text-white cursor-pointer"
                            style={{ fontSize: 11, fontWeight: 500 }}
                          >
                            Preview
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom selection tray */}
            <AnimatePresence>
              {selected.size > 0 && (
                <motion.div
                  initial={{ y: 120, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 120, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4"
                >
                  <div className="flex items-end gap-4">
                    {/* Selected items horizontal scroll */}
                    <div className="flex-1 overflow-x-auto flex gap-3" style={{ scrollbarWidth: "none" }}>
                      {Array.from(selected.entries()).map(([id, { inspiration, note }]) => (
                        <div
                          key={id}
                          className="flex-shrink-0 bg-white rounded-xl border border-gray-200 p-2 flex gap-2"
                          style={{ width: 280 }}
                        >
                          <div className="relative flex-shrink-0">
                            <img
                              src={inspiration.image}
                              alt={inspiration.author_name}
                              className="rounded-lg object-cover"
                              style={{ width: 64, height: 64 }}
                            />
                            <button
                              onClick={() => removeSelection(id)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 hover:bg-red-500 flex items-center justify-center transition-colors"
                            >
                              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                                <path d="M2 2L10 10M10 2L2 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                          <textarea
                            value={note}
                            onChange={(e) => updateNote(id, e.target.value)}
                            placeholder="Optional note..."
                            className="flex-1 rounded-lg border border-gray-100 p-1.5 text-gray-700 resize-none outline-none focus:border-red-300 transition-colors"
                            style={{ fontSize: 11, fontFamily, minHeight: 48 }}
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                    {/* Submit button */}
                    <button
                      onClick={handleSubmit}
                      className="flex-shrink-0 px-6 py-3 rounded-full text-white font-semibold transition-all hover:scale-[1.02] active:scale-95"
                      style={{ backgroundColor: "#FF0000", fontSize: 14, fontFamily, whiteSpace: "nowrap" }}
                    >
                      Adapt {selected.size} direction{selected.size > 1 ? "s" : ""}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Preview modal (nested) */}
          <AnimatePresence>
            {previewItem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setPreviewItem(null);
                }}
              >
                <motion.div
                  ref={previewRef}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-row"
                  style={{ width: "75vw", maxWidth: "1000px", height: "75vh" }}
                >
                  {/* Left - Images */}
                  <div
                    ref={imageContainerRef}
                    className="flex-1 bg-gray-50 overflow-y-auto flex flex-col gap-2 p-2"
                    style={{ minWidth: 0, scrollbarWidth: "none" }}
                  >
                    {previewItem.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`${previewItem.author_name} #${i + 1}`}
                        className="rounded-xl"
                        style={{ display: "block", width: "100%", height: "auto" }}
                      />
                    ))}
                  </div>

                  {/* Thumbnail strip */}
                  {previewItem.images.length > 1 && (
                    <div
                      className="flex-shrink-0 bg-white flex flex-col items-center py-3 gap-2 overflow-y-auto"
                      style={{ width: 64, scrollbarWidth: "none" }}
                    >
                      {previewItem.images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => scrollToImage(i)}
                          className="flex-shrink-0 rounded-lg overflow-hidden transition-all"
                          style={{
                            width: 48,
                            height: 48,
                            border: activeImageIndex === i ? "2px solid #ef4444" : "2px solid transparent",
                            opacity: activeImageIndex === i ? 1 : 0.5,
                          }}
                        >
                          <img src={img} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Right - Info */}
                  <div
                    className="flex flex-col overflow-y-auto flex-shrink-0 border-l border-gray-100"
                    style={{ width: 320, scrollbarWidth: "none" }}
                  >
                    <div className="flex items-center justify-between px-5 pt-5 pb-2">
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", fontFamily }}>
                          {previewItem.author_name}
                        </span>
                        <div className="flex items-center gap-3 text-gray-400 mt-1" style={{ fontSize: 12 }}>
                          <span className="flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#ef4444" }}>
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                            {formatNumber(previewItem.likes)}
                          </span>
                          <span>{formatNumber(previewItem.views)} views</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setPreviewItem(null)}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
                      {previewItem.categories.map((cat) => (
                        <span key={cat} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600" style={{ fontSize: 11, fontWeight: 500 }}>
                          {cat}
                        </span>
                      ))}
                      <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-500" style={{ fontSize: 11, fontWeight: 500 }}>
                        {previewItem.model}
                      </span>
                    </div>

                    <div className="flex-1 px-5 pb-5">
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Prompt
                      </span>
                      <div
                        className="mt-2 p-4 rounded-2xl bg-gray-50 text-gray-700 whitespace-pre-wrap"
                        style={{ fontSize: 12, lineHeight: 1.6, overflowY: "auto", scrollbarWidth: "none" }}
                      >
                        {previewItem.prompt}
                      </div>

                      <button
                        onClick={() => {
                          toggleSelection(previewItem);
                          setPreviewItem(null);
                        }}
                        className="w-full mt-4 py-3 rounded-full text-white font-semibold transition-all hover:scale-[1.02] active:scale-95"
                        style={{ backgroundColor: selected.has(previewItem.id) ? "#666" : "#FF0000", fontSize: 14 }}
                      >
                        {selected.has(previewItem.id) ? "Remove selection" : "Select this"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
