"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { StructuredProductAnalysis } from "../canvas/types";

interface AgentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (imageUrls: string[], brief: string) => void;
  onInspirationMode: (imageUrls: string[], productAnalysis: StructuredProductAnalysis) => void;
}

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

type Step = "upload" | "analyzing" | "choose";

export function AgentOverlay({ isOpen, onClose, onSubmit, onInspirationMode }: AgentOverlayProps) {
  const [images, setImages] = useState<string[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [productAnalysis, setProductAnalysis] = useState<StructuredProductAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const generateUploadUrl = useMutation(api.canvas.generateUploadUrl);
  const getStorageUrl = useMutation(api.canvas.getStorageUrl);
  const analyzeProductVisuals = useAction(api.agent.analyzeProductVisuals);
  const savedProducts = useQuery(api.products.list) ?? [];
  const saveProduct = useMutation(api.products.save);
  const removeProduct = useMutation(api.products.remove);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).slice(0, 6 - images.length);
    fileArray.forEach(async (file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setThumbnails((prev) => (prev.length < 6 ? [...prev, dataUrl] : prev));
      };
      reader.readAsDataURL(file);

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

  const handleContinue = async () => {
    if (images.length === 0) return;
    setStep("analyzing");
    setError(null);
    try {
      const analysis = await analyzeProductVisuals({ imageUrls: images });
      setProductAnalysis(analysis);
      setStep("choose");
      // Auto-save product to DB
      saveProduct({
        name: analysis.productName || "Untitled Product",
        imageUrls: images,
        thumbnailUrl: images[0],
        analysis,
      }).catch(console.error);
    } catch (err) {
      console.error("Product analysis failed:", err);
      setError("Failed to analyze product. Please try again.");
      setStep("upload");
    }
  };

  const handleUseSavedProduct = (product: { imageUrls: string[]; analysis: StructuredProductAnalysis }) => {
    setImages(product.imageUrls);
    setThumbnails(product.imageUrls);
    setProductAnalysis(product.analysis);
    setStep("choose");
  };

  const handleExploreWithAI = () => {
    onSubmit(images, brief);
    resetState();
  };

  const handleStartFromInspiration = () => {
    if (!productAnalysis) return;
    onInspirationMode(images, productAnalysis);
    resetState();
  };

  const resetState = () => {
    setImages([]);
    setThumbnails([]);
    setBrief("");
    setError(null);
    setStep("upload");
    setProductAnalysis(null);
  };

  const handleClose = () => {
    resetState();
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

          {/* Upload step */}
          {step === "upload" && (
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

              {/* My Products */}
              {savedProducts.length > 0 && (
                <div className="w-full">
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    My Products
                  </p>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {savedProducts.map((product) => (
                      <div
                        key={product._id}
                        className="flex items-center gap-3 p-2 rounded-xl border border-gray-200 hover:border-red-300 transition-colors group"
                      >
                        <img
                          src={product.thumbnailUrl}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#111" }} className="truncate">
                            {product.name}
                          </div>
                          <div style={{ fontSize: 11, color: "#999" }}>
                            {product.imageUrls.length} image{product.imageUrls.length > 1 ? "s" : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUseSavedProduct({ imageUrls: product.imageUrls, analysis: product.analysis as StructuredProductAnalysis })}
                          className="px-3 py-1 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors flex-shrink-0"
                          style={{ fontSize: 12, fontWeight: 600 }}
                        >
                          Use
                        </button>
                        <button
                          onClick={() => removeProduct({ id: product._id })}
                          className="w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all flex-shrink-0"
                        >
                          <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                            <path d="M2 2L10 10M10 2L2 10" stroke="#999" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

              {/* Continue button */}
              <button
                onClick={handleContinue}
                disabled={images.length === 0}
                className="px-8 py-2.5 rounded-full text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: "#FF0000",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily,
                }}
              >
                Continue
              </button>
            </div>
          )}

          {/* Analyzing step */}
          {step === "analyzing" && (
            <div className="flex flex-col items-center gap-6 w-full px-8">
              <div className="w-12 h-12 rounded-full border-2 border-gray-200 border-t-red-500 animate-spin" />
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#111",
                  textAlign: "center",
                }}
              >
                Analyzing your product...
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "#888",
                  textAlign: "center",
                }}
              >
                Identifying colors, materials, text, and shape
              </p>
            </div>
          )}

          {/* Choose step */}
          {step === "choose" && (
            <div className="flex flex-col items-center gap-6 w-full px-8">
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#111",
                  textAlign: "center",
                }}
              >
                Choose your path
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#888",
                  textAlign: "center",
                  marginTop: -8,
                }}
              >
                {productAnalysis?.productName && (
                  <span style={{ color: "#111", fontWeight: 500 }}>
                    {productAnalysis.productName}
                  </span>
                )}
                {productAnalysis?.productName ? " — " : ""}
                How would you like to create directions?
              </p>

              {/* Option cards */}
              <div className="flex flex-col gap-3 w-full">
                {/* Explore with AI */}
                <button
                  onClick={handleExploreWithAI}
                  className="w-full p-5 rounded-2xl border-2 border-gray-200 hover:border-red-400 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>
                        Explore with AI
                      </div>
                      <div style={{ fontSize: 12, color: "#888" }}>
                        Generate 5 original creative directions
                      </div>
                    </div>
                  </div>
                </button>

                {/* Start from Inspiration */}
                <button
                  onClick={handleStartFromInspiration}
                  className="w-full p-5 rounded-2xl border-2 border-gray-200 hover:border-red-400 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>
                        Start from Inspiration
                      </div>
                      <div style={{ fontSize: 12, color: "#888" }}>
                        Pick a style from the gallery, adapted to your product
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Back button */}
              <button
                onClick={() => setStep("upload")}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                style={{ fontSize: 13 }}
              >
                Back to upload
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
