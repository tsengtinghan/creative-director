"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { StructuredProductAnalysis } from "../canvas/types";

interface AgentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (imageUrls: string[], brief: string, productAnalysis: StructuredProductAnalysis, boldMode: boolean) => void;
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
  const [boldMode, setBoldMode] = useState(false);

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
    if (!productAnalysis) return;
    onSubmit(images, brief, productAnalysis, boldMode);
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
    setBoldMode(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ fontFamily }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-white/80 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Upload step — centered two-column layout */}
          {step === "upload" && (
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-[880px] mx-8"
            >
              {/* Header */}
              <div className="text-center mb-10">
                <h1
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: "#111",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                  }}
                >
                  Creative Direction Explorer
                </h1>
                <p
                  style={{
                    fontSize: 16,
                    color: "#888",
                    marginTop: 8,
                  }}
                >
                  Upload your product and describe your vision to generate creative directions
                </p>
              </div>

              {/* Two-column layout */}
              <div className="flex gap-8 items-start">
                {/* Left column — Text Brief */}
                <div className="flex-1 flex flex-col gap-5">
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#999",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Product Brief
                    </label>
                    <textarea
                      value={brief}
                      onChange={(e) => setBrief(e.target.value)}
                      placeholder="Describe your product, the mood you're going for, visual style preferences, target audience, any creative guidelines..."
                      className="w-full mt-2 rounded-2xl border border-gray-200 p-4 text-gray-700 resize-none outline-none focus:border-red-300 focus:ring-1 focus:ring-red-100 transition-all bg-white"
                      style={{
                        fontSize: 14,
                        fontFamily,
                        minHeight: 200,
                        lineHeight: 1.6,
                      }}
                      rows={8}
                    />
                  </div>

                  {/* Saved products */}
                  {savedProducts.length > 0 && (
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#999",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Saved Products
                      </label>
                      <div className="flex flex-col gap-2 mt-2 max-h-32 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                        {savedProducts.map((product) => (
                          <div
                            key={product._id}
                            className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 hover:border-red-300 transition-colors group bg-white"
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
                </div>

                {/* Right column — Image Upload */}
                <div className="flex-1 flex flex-col gap-4">
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#999",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Product Images
                  </label>
                  <div
                    ref={dropRef}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center"
                    style={{
                      borderColor: isDragging ? "#FF0000" : "#e0e0e0",
                      backgroundColor: isDragging ? "rgba(255,0,0,0.02)" : "#fafafa",
                      minHeight: thumbnails.length > 0 ? "auto" : 240,
                      padding: 20,
                    }}
                  >
                    {thumbnails.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3 w-full">
                        {thumbnails.map((img, i) => (
                          <div key={i} className="relative aspect-square rounded-xl overflow-hidden group shadow-sm">
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
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                                <path d="M2 2L10 10M10 2L2 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        {thumbnails.length < 6 && (
                          <div className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:text-gray-400 hover:border-gray-300 transition-colors">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div
                          className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4"
                        >
                          <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#bbb"
                            strokeWidth="1.5"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        </div>
                        <p style={{ fontSize: 14, color: "#888", fontWeight: 500 }}>
                          Drop product images here
                        </p>
                        <p style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>
                          or click to browse (up to 6)
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
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 text-center">
                  <p style={{ fontSize: 13, color: "#ef4444" }}>{error}</p>
                </div>
              )}

              {/* Action button */}
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleContinue}
                  disabled={images.length === 0}
                  className="px-10 py-3 rounded-full text-white font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
                  style={{
                    backgroundColor: "#FF0000",
                    fontSize: 15,
                    fontWeight: 600,
                    fontFamily,
                  }}
                >
                  Generate Creative Directions
                </button>
              </div>

              {/* Skip / close hint */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  style={{ fontSize: 13 }}
                >
                  or start with a blank canvas
                </button>
              </div>
            </motion.div>
          )}

          {/* Analyzing step */}
          {step === "analyzing" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative z-10 flex flex-col items-center gap-6"
            >
              <div className="w-14 h-14 rounded-full border-2 border-gray-200 border-t-red-500 animate-spin" />
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#111",
                  textAlign: "center",
                }}
              >
                Analyzing your product...
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#888",
                  textAlign: "center",
                }}
              >
                Identifying colors, materials, text, and shape
              </p>
            </motion.div>
          )}

          {/* Choose step */}
          {step === "choose" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 flex flex-col items-center gap-6 max-w-md mx-8"
            >
              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#111",
                  textAlign: "center",
                  letterSpacing: "-0.02em",
                }}
              >
                Choose your path
              </h2>
              <p
                style={{
                  fontSize: 15,
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

              <div className="flex flex-col gap-3 w-full">
                <div className="w-full rounded-2xl border-2 border-gray-200 hover:border-red-400 transition-all bg-white shadow-sm hover:shadow-md">
                  <button
                    onClick={handleExploreWithAI}
                    className="w-full p-6 text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L2 7l10 5 10-5-10-5z" />
                          <path d="M2 17l10 5 10-5" />
                          <path d="M2 12l10 5 10-5" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>
                          Explore with AI
                        </div>
                        <div style={{ fontSize: 13, color: "#888" }}>
                          Generate 5 original creative directions
                        </div>
                      </div>
                    </div>
                  </button>
                  <div className="px-6 pb-4 -mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBoldMode(!boldMode);
                      }}
                      className="flex items-center gap-2.5 py-2 px-3 rounded-lg transition-all"
                      style={{
                        backgroundColor: boldMode ? "rgba(239, 68, 68, 0.08)" : "transparent",
                      }}
                    >
                      <div
                        className="relative w-8 h-[18px] rounded-full transition-colors"
                        style={{
                          backgroundColor: boldMode ? "#ef4444" : "#d1d5db",
                        }}
                      >
                        <div
                          className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform"
                          style={{
                            left: boldMode ? 14 : 2,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: boldMode ? "#ef4444" : "#999" }}>
                        Max creative energy
                      </span>
                      <span style={{ fontSize: 11, color: "#bbb" }}>
                        — bolder, weirder, more tension
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleStartFromInspiration}
                  className="w-full p-6 rounded-2xl border-2 border-gray-200 hover:border-red-400 transition-all text-left group bg-white shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "#111" }}>
                        Start from Inspiration
                      </div>
                      <div style={{ fontSize: 13, color: "#888" }}>
                        Pick a style from the gallery, adapted to your product
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setStep("upload")}
                className="text-gray-400 hover:text-gray-600 transition-colors mt-2"
                style={{ fontSize: 13 }}
              >
                Back to upload
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
