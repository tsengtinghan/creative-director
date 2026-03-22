"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import type { CreativeDirectionNode as CreativeDirectionNodeType } from "./types";

function CreativeDirectionNodeComponent({
  id,
  data,
  selected,
}: NodeProps<CreativeDirectionNodeType>) {
  const [isHovered, setIsHovered] = useState(false);
  const [briefValue, setBriefValue] = useState(data.brief);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(data.title);
  const [iterateInput, setIterateInput] = useState("");
  const briefRef = useRef<HTMLTextAreaElement>(null);

  // Sync local state when data changes from parent (e.g. API response)
  useEffect(() => { setBriefValue(data.brief); }, [data.brief]);
  useEffect(() => { setTitleValue(data.title); }, [data.title]);
  const titleRef = useRef<HTMLInputElement>(null);
  const iterateInputRef = useRef<HTMLTextAreaElement>(null);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (data.onExpand) {
      data.onExpand(id);
    }
  };

  const handleIterate = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    data.onIterate?.(id);
  };

  const handleIterateSubmit = () => {
    const trimmed = iterateInput.trim();
    if (trimmed && data.onIterateSubmit) {
      data.onIterateSubmit(id, trimmed);
      setIterateInput("");
    }
  };

  const handleBriefBlur = () => {
    if (briefValue !== data.brief && data.onUpdateField) {
      data.onUpdateField(id, "brief", briefValue);
    }
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (titleValue !== data.title && data.onUpdateField) {
      data.onUpdateField(id, "title", titleValue);
    }
  };

  const fontFamily =
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

  const canExpand = data.promptsReady || (data.brief && data.vibePrompt && !data.isLoading);
  const showIterateInput = data.isIterating;
  const isLoadingState = data.isLoading && data.title === "Loading...";

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 !border-gray-500 !w-2 !h-2 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`
            relative overflow-hidden rounded-2xl cursor-pointer
            bg-white
            ${selected ? "ring-2 ring-red-500 ring-offset-2 ring-offset-white shadow-xl shadow-red-500/10" : "ring-1 ring-gray-200 shadow-lg"}
          `}
          style={{ width: 340 }}
        >
          {/* Vibe image area — larger */}
          <div
            className="w-full flex items-center justify-center bg-gray-50 overflow-hidden relative"
            style={{ height: 200 }}
          >
            {data.isLoading && !data.vibeImageUrl ? (
              <motion.div
                className="w-full h-full"
                style={{
                  background: "linear-gradient(90deg, #f5f5f5 25%, #ebebeb 50%, #f5f5f5 75%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            ) : data.vibeImageUrl ? (
              <img
                src={data.vibeImageUrl}
                alt={data.title}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#d1d5db"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
          </div>

          {/* Content area — more spacious */}
          <div className="p-5 relative" style={{ fontFamily }}>
            {isLoadingState && (
              <motion.div
                className="absolute inset-0 z-10 rounded-b-2xl"
                style={{
                  background: "linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            )}

            {/* Title — editable on click */}
            {isEditingTitle && !isLoadingState ? (
              <input
                ref={titleRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleBlur();
                  if (e.key === "Escape") {
                    setTitleValue(data.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="nodrag nowheel w-full border-b-2 border-red-300 bg-transparent outline-none text-gray-900 mb-3"
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  fontFamily,
                  letterSpacing: "-0.01em",
                }}
                autoFocus
              />
            ) : (
              <div
                onClick={() => {
                  if (!isLoadingState) {
                    setIsEditingTitle(true);
                    setTitleValue(data.title);
                  }
                }}
                className={`mb-3 ${isLoadingState ? "" : "cursor-text hover:text-red-600"} transition-colors`}
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: isLoadingState ? "#ccc" : "#111",
                  letterSpacing: "-0.01em",
                }}
              >
                {data.title}
              </div>
            )}

            {/* Brief — plain editable text */}
            {isLoadingState ? (
              <p
                className="text-gray-300"
                style={{ fontSize: 13, lineHeight: 1.6 }}
              >
                {data.brief}
              </p>
            ) : (
              <textarea
                ref={briefRef}
                value={briefValue}
                onChange={(e) => setBriefValue(e.target.value)}
                onBlur={handleBriefBlur}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setBriefValue(data.brief);
                    briefRef.current?.blur();
                  }
                }}
                className="nodrag nowheel w-full resize-none border-none outline-none bg-transparent text-gray-500"
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  fontFamily,
                  maxHeight: 200,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                }}
                rows={7}
              />
            )}
          </div>

          {/* Delete button */}
          {(isHovered || selected) && (
            <button
              onClick={handleDelete}
              className="nodrag absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 hover:bg-red-500 flex items-center justify-center transition-colors"
              aria-label="Delete direction"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 2L10 10M10 2L2 10"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </motion.div>

        {/* Action button — centered below card */}
        {!data.isLoading && data.title !== "Loading..." && (
          <div className="nodrag nowheel flex justify-center mt-3 w-full">
            {!data.isExpanded ? (
              <button
                onClick={handleExpand}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={!canExpand}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md hover:scale-110"
                style={{
                  color: canExpand ? "#ef4444" : "#9ca3af",
                  cursor: canExpand ? "pointer" : "default",
                  backgroundColor: "transparent",
                }}
              >
                {data.promptsReady || canExpand ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
                )}
              </button>
            ) : (
              <button
                onClick={handleIterate}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                style={{
                  border: "1px solid #e0e0e0",
                  color: "#ef4444",
                  cursor: "pointer",
                  backgroundColor: "#fff",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4v6h6" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Iterate input — shown on the iterated copy */}
        {showIterateInput && (
          <div
            className="nodrag nowheel mt-3 w-full"
            style={{ fontFamily, width: 340 }}
          >
            <textarea
              ref={iterateInputRef}
              value={iterateInput}
              onChange={(e) => setIterateInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleIterateSubmit();
                }
                if (e.key === "Escape") {
                  setIterateInput("");
                }
              }}
              placeholder='What would you like to change? e.g. "warmer tones", "more minimal", "outdoor setting"'
              className="w-full resize-none border border-gray-200 rounded-xl p-4 text-gray-700 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200 bg-white shadow-sm"
              style={{ fontSize: 13, lineHeight: 1.5, fontFamily }}
              rows={3}
              autoFocus
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleIterateSubmit();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={!iterateInput.trim()}
              className="w-full mt-2 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-red-500/20"
              style={{
                backgroundColor: "#FF0000",
                fontSize: 13,
                fontWeight: 600,
                fontFamily,
              }}
            >
              Regenerate Direction
            </button>
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-400 !border-gray-500 !w-2 !h-2 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </>
  );
}

export const CreativeDirectionNode = memo(CreativeDirectionNodeComponent);
