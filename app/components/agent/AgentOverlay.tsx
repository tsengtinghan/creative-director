"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface AgentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (imageUrls: string[], brief: string) => void;
}

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

export function AgentOverlay({ isOpen, onClose, onSubmit }: AgentOverlayProps) {
  const [images, setImages] = useState<string[]>([]); // Convex storage URLs
  const [thumbnails, setThumbnails] = useState<string[]>([]); // local data URLs for preview
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const generateUploadUrl = useMutation(api.canvas.generateUploadUrl);
  const getStorageUrl = useMutation(api.canvas.getStorageUrl);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).slice(0, 6 - images.length);
    fileArray.forEach(async (file) => {
      if (!file.type.startsWith("image/")) return;

      // Create local thumbnail for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setThumbnails((prev) => (prev.length < 6 ? [...prev, dataUrl] : prev));
      };
      reader.readAsDataURL(file);

      // Upload to Convex storage
      try {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        const url = await getStorageUrl({ storageId });
        if (url) {
          setImages((prev) => (prev.length < 6 ? [...prev, url] : prev));
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
    });
  }, [images.length, generateUploadUrl, getStorageUrl]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setThumbnails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStart = () => {
    if (images.length === 0) return;
    onSubmit(images, brief);
    // Reset state
    setImages([]);
    setThumbnails([]);
    setBrief("");
    setError(null);
  };

  const handleClose = () => {
    setImages([]);
    setThumbnails([]);
    setBrief("");
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-0 right-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center border-l border-gray-200 shadow-xl"
          style={{ fontFamily, width: 420, height: '100vh' }}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-6 right-6 px-4 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400 transition-colors"
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            Close
          </button>

          {/* Form */}
          <div className="flex flex-col items-center gap-6 w-full px-8">
            <h2
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: "#111",
                textAlign: "center",
              }}
            >
              Creative Directions
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#888",
                textAlign: "center",
                marginTop: -8,
              }}
            >
              Upload product photos to get AI-suggested creative directions
            </p>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center"
              style={{
                borderColor: isDragging ? "#FF0000" : "#e5e5e5",
                backgroundColor: isDragging ? "rgba(255,0,0,0.03)" : "#fafafa",
                minHeight: thumbnails.length > 0 ? "auto" : 180,
                padding: 20,
              }}
            >
              {thumbnails.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 w-full">
                  {thumbnails.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img
                        src={img}
                        alt={`Upload ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(i);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                          <path d="M2 2L10 10M10 2L2 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {thumbnails.length < 6 && (
                    <div className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:text-gray-400 hover:border-gray-300 transition-colors">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ccc"
                    strokeWidth="1.5"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p style={{ fontSize: 13, color: "#999", marginTop: 8 }}>
                    Drop images here or click to browse
                  </p>
                  <p style={{ fontSize: 11, color: "#ccc", marginTop: 4 }}>
                    Up to 6 images
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
              className="hidden"
            />

            {/* Brief textarea */}
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Optional brief — describe the style, mood, or context you're going for..."
              className="w-full rounded-xl border border-gray-200 p-3 text-gray-700 resize-none outline-none focus:border-red-300 transition-colors"
              style={{ fontSize: 13, fontFamily, minHeight: 80 }}
              rows={3}
            />

            {/* Error */}
            {error && (
              <p style={{ fontSize: 13, color: "#ef4444" }}>{error}</p>
            )}

            {/* Start button */}
            <button
              onClick={handleStart}
              disabled={images.length === 0}
              className="px-8 py-2.5 rounded-full text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              style={{
                backgroundColor: "#FF0000",
                fontSize: 14,
                fontWeight: 600,
                fontFamily,
              }}
            >
              Generate Directions
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
