"use client";

import { memo, useState, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import type { CreativeDirectionNode as CreativeDirectionNodeType } from "./types";

function CreativeDirectionNodeComponent({
  id,
  data,
  selected,
}: NodeProps<CreativeDirectionNodeType>) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingBrief, setIsEditingBrief] = useState(data.autoEditBrief === true);
  const [briefValue, setBriefValue] = useState(data.brief);
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [iterateInput, setIterateInput] = useState("");
  const briefRef = useRef<HTMLTextAreaElement>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);
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
    setIsEditingBrief(false);
    if (briefValue !== data.brief && data.onUpdateField) {
      data.onUpdateField(id, "brief", briefValue);
    }
  };

  const handleRemoveKeyword = (index: number) => {
    if (data.onUpdateField) {
      const updated = data.keywords.filter((_, i) => i !== index);
      data.onUpdateField(id, "keywords", updated);
    }
  };

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (trimmed && data.onUpdateField) {
      data.onUpdateField(id, "keywords", [...data.keywords, trimmed]);
      setNewKeyword("");
      setIsAddingKeyword(false);
    }
  };

  const fontFamily =
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif';

  const canExpand = data.promptsReady || (data.brief && data.vibePrompt && !data.isLoading);
  const showIterateInput = data.isIterating;

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
            relative overflow-hidden rounded-xl cursor-pointer
            bg-white shadow-lg
            ${selected ? "ring-2 ring-red-500 ring-offset-2 ring-offset-white" : "ring-1 ring-gray-200"}
          `}
          style={{ width: 256 }}
        >
          {/* Vibe image area */}
          <div
            className="w-full flex items-center justify-center bg-gray-100 overflow-hidden"
            style={{ height: 160 }}
          >
            {data.isLoading && !data.vibeImageUrl ? (
              <motion.div
                className="w-full h-full"
                style={{
                  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
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
            )}
          </div>

          {/* Content */}
          <div className="p-3 relative" style={{ fontFamily }}>
            {data.isLoading && data.title === "Loading..." && (
              <motion.div
                className="absolute inset-0 z-10 rounded-b-xl"
                style={{
                  background: "linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            )}
            {/* Title */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: data.isLoading && data.title === "Loading..." ? "#ccc" : "#111",
                marginBottom: 8,
              }}
            >
              {data.title}
            </div>

            {/* Keywords */}
            <div className="flex flex-wrap gap-1 mb-2">
              {data.keywords.map((keyword, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 group/pill"
                  style={{ fontSize: 11 }}
                >
                  {keyword}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveKeyword(i);
                    }}
                    className="opacity-0 group-hover/pill:opacity-100 ml-0.5 text-gray-400 hover:text-red-500 transition-opacity"
                    style={{ fontSize: 10, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </span>
              ))}
              {isAddingKeyword ? (
                <input
                  ref={keywordInputRef}
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onBlur={() => {
                    if (newKeyword.trim()) handleAddKeyword();
                    else setIsAddingKeyword(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddKeyword();
                    if (e.key === "Escape") {
                      setNewKeyword("");
                      setIsAddingKeyword(false);
                    }
                  }}
                  className="nodrag nowheel px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border-none outline-none focus:ring-1 focus:ring-red-300"
                  style={{ fontSize: 11, width: 60 }}
                  autoFocus
                  placeholder="tag"
                />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAddingKeyword(true);
                  }}
                  className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                  style={{ fontSize: 11 }}
                >
                  +
                </button>
              )}
            </div>

            {/* Brief */}
            {isEditingBrief ? (
              <textarea
                ref={briefRef}
                value={briefValue}
                onChange={(e) => setBriefValue(e.target.value)}
                onBlur={handleBriefBlur}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setBriefValue(data.brief);
                    setIsEditingBrief(false);
                  }
                }}
                className="nodrag nowheel w-full resize-none border border-gray-200 rounded-md p-1 text-gray-500 outline-none focus:border-red-300"
                style={{ fontSize: 12, lineHeight: 1.4, fontFamily }}
                rows={3}
                autoFocus
              />
            ) : (
              <p
                onClick={() => {
                  setIsEditingBrief(true);
                  setBriefValue(data.brief);
                }}
                className="text-gray-500 cursor-text hover:text-gray-700 transition-colors"
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {data.brief}
              </p>
            )}
          </div>

          {/* Delete button */}
          {(isHovered || selected) && (
            <button
              onClick={handleDelete}
              className="nodrag absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500 flex items-center justify-center transition-colors"
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

        {/* Action buttons — always visible, outside the card to prevent selection conflicts */}
        {!data.isLoading && data.title !== "Loading..." && (
          <div
            className="nodrag nowheel flex gap-1.5 mt-2 w-full"
            style={{ fontFamily }}
          >
            {!data.isExpanded ? (
              <button
                onClick={handleExpand}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={!canExpand}
                className="flex-1 py-2 rounded-lg transition-all"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: canExpand ? "#111" : "#e5e5e5",
                  color: canExpand ? "#fff" : "#999",
                  cursor: canExpand ? "pointer" : "default",
                }}
              >
                {data.promptsReady ? "Expand" : canExpand ? "Generate" : "Building prompts..."}
              </button>
            ) : (
              <>
                <button
                  onClick={handleIterate}
                  onMouseDown={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex-1 py-2 rounded-lg transition-all hover:bg-gray-800"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: "#111",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Iterate
                </button>
              </>
            )}
          </div>
        )}

        {/* Iterate input — shown on the iterated copy */}
        {showIterateInput && (
          <div
            className="nodrag nowheel mt-2 w-full"
            style={{ fontFamily, width: 256 }}
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
              placeholder="What would you like to change? e.g. &quot;more water and stream imagery&quot;"
              className="w-full resize-none border border-gray-200 rounded-lg p-3 text-gray-700 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-200 bg-white shadow-sm"
              style={{ fontSize: 13, lineHeight: 1.5, fontFamily }}
              rows={2}
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
              className="w-full mt-1.5 py-2 rounded-lg text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "#FF0000",
                fontSize: 12,
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
