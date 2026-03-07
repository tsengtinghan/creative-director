"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ReferenceImage } from "./types";

interface ReferencePanelProps {
  images: ReferenceImage[];
  onUpdateLabel: (id: string, label: string) => void;
  onRemove: (id: string) => void;
}

export function ReferencePanel({
  images,
  onUpdateLabel,
  onRemove,
}: ReferencePanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (images.length === 0) return null;

  const handleStartEdit = (image: ReferenceImage) => {
    setEditingId(image.id);
    setEditValue(image.label);
  };

  const handleFinishEdit = (id: string) => {
    if (editValue.trim()) {
      onUpdateLabel(id, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      handleFinishEdit(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
      setEditValue("");
    }
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="fixed right-6 top-1/2 -translate-y-1/2 z-[60] flex flex-col gap-3 max-h-[70vh] overflow-y-auto"
    >
      <div className="bg-zinc-900/95 backdrop-blur-xl rounded-2xl p-3 shadow-2xl border border-zinc-800">
        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3 px-1">
          Reference Images
        </div>

        <div className="flex flex-col gap-3">
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative group"
            >
              {/* Image thumbnail */}
              <div className="w-40 h-28 rounded-lg overflow-hidden bg-zinc-800 ring-1 ring-zinc-700">
                <img
                  src={image.url}
                  alt={image.label}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Label */}
              <div className="mt-1.5 flex items-center gap-1">
                {editingId === image.id ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleFinishEdit(image.id)}
                    onKeyDown={(e) => handleKeyDown(e, image.id)}
                    autoFocus
                    className="w-full bg-zinc-800 text-zinc-200 text-sm px-2 py-1 rounded border border-zinc-600 focus:border-blue-500 focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => handleStartEdit(image)}
                    className="flex-1 text-left text-sm text-zinc-300 hover:text-white px-1 py-0.5 rounded hover:bg-zinc-800 transition-colors truncate"
                    title="Click to edit label"
                  >
                    <span className="text-[#ffb4b0] font-medium">
                      {image.label}
                    </span>
                  </button>
                )}

                {/* Remove button */}
                <button
                  onClick={() => onRemove(image.id)}
                  className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Index badge */}
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                {index + 1}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

