"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import inspirations from "@/app/prompts/highest_liked_prompts.json";

export interface Inspiration {
  rank: number;
  id: string;
  prompt: string;
  author: string;
  author_name: string;
  likes: number;
  views: number;
  image: string;
  images: string[];
  model: string;
  categories: string[];
  date: string;
  source_url: string;
}

const data = inspirations as Inspiration[];

export function InspirationSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Inspiration | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Reset active image when selection changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [selected]);

  // Track scroll position to highlight active thumbnail
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container || !selected || selected.images.length <= 1) return;
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
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const handleClick = (e: MouseEvent) => {
      if (detailRef.current && !detailRef.current.contains(e.target as Node)) {
        setSelected(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [selected]);

  const handleCopyPrompt = (prompt: string, id: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
    <>
      {/* Toggle button - only visible when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed left-6 top-16 z-30 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          title="Inspirations"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </button>
      )}

      {/* Sidebar panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -360, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-6 top-6 bottom-6 z-40 flex flex-col bg-white"
            style={{
              borderRadius: "36px",
              width: "340px",
              border: "1px solid rgba(0, 0, 0, 0.32)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <span
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1a1a1a",
                }}
              >
                Inspirations
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Gallery grid */}
            <div className="flex-1 overflow-y-auto px-3 pb-4" style={{ scrollbarWidth: "none" }}>
              <div className="grid grid-cols-2 gap-2.5">
                {data.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="group relative rounded-xl overflow-hidden bg-gray-100 hover:ring-2 hover:ring-red-400 transition-all"
                  >
                    <img
                      src={item.image}
                      alt={item.author_name}
                      className="w-full object-cover"
                      style={{ aspectRatio: "1 / 1" }}
                      loading="lazy"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2.5 w-full">
                        <div className="flex items-center gap-1 text-white">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                              <span style={{ fontSize: "11px", fontWeight: "500" }}>
                                {formatNumber(item.likes)}
                              </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail overlay - horizontal layout: images left, prompt right */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              ref={detailRef}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-row"
              style={{ width: "80vw", maxWidth: "1100px", height: "80vh" }}
            >
              {/* Left side - Images: scrollable, each image fills the width */}
              <div
                ref={imageContainerRef}
                className="flex-1 bg-gray-50 overflow-y-auto flex flex-col gap-2 p-2"
                style={{ minWidth: 0, scrollbarWidth: "none" }}
              >
                {selected.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${selected.author_name} #${i + 1}`}
                    className="rounded-xl"
                    style={{
                      display: "block",
                      width: "100%",
                      height: "auto",
                    }}
                  />
                ))}
              </div>

              {/* Thumbnail strip - only show when multiple images */}
              {selected.images.length > 1 && (
                <div
                  className="flex-shrink-0 bg-white flex flex-col items-center py-3 gap-2 overflow-y-auto"
                  style={{ width: "64px", scrollbarWidth: "none" }}
                >
                  {selected.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => scrollToImage(i)}
                      className="flex-shrink-0 rounded-lg overflow-hidden transition-all"
                      style={{
                        width: "48px",
                        height: "48px",
                        border: activeImageIndex === i ? "2px solid #ef4444" : "2px solid transparent",
                        opacity: activeImageIndex === i ? 1 : 0.5,
                      }}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Right side - Info & Prompt */}
              <div
                className="flex flex-col overflow-y-auto flex-shrink-0 border-l border-gray-100"
                style={{ width: "340px", scrollbarWidth: "none" }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#1a1a1a",
                        }}
                      >
                        {selected.author_name}
                      </span>
                      {selected.source_url && (
                        <a
                          href={selected.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                          title="View on X"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="#666">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-gray-400 mt-1" style={{ fontSize: "12px" }}>
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#ef4444" }}>
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        {formatNumber(selected.likes)}
                      </span>
                      <span>{formatNumber(selected.views)} views</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Categories & model */}
                <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
                  {selected.categories.map((cat) => (
                    <span
                      key={cat}
                      className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
                      style={{ fontSize: "11px", fontWeight: "500" }}
                    >
                      {cat}
                    </span>
                  ))}
                  <span
                    className="px-2.5 py-1 rounded-full bg-red-50 text-red-500"
                    style={{ fontSize: "11px", fontWeight: "500" }}
                  >
                    {selected.model}
                  </span>
                </div>

                {/* Prompt */}
                <div className="flex-1 px-5 pb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#999",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Prompt
                    </span>
                    <button
                      onClick={() => handleCopyPrompt(selected.prompt, selected.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-gray-100 transition-colors"
                      style={{ fontSize: "11px", fontWeight: "500", color: "#666" }}
                    >
                      {copiedId === selected.id ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div
                    className="p-4 rounded-2xl bg-gray-50 text-gray-700 whitespace-pre-wrap"
                    style={{
                      fontSize: "12px",
                      lineHeight: "1.6",
                      overflowY: "auto",
                      scrollbarWidth: "none",
                    }}
                  >
                    {selected.prompt}
                  </div>

                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
