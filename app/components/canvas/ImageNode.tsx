"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import type { ImageNode as ImageNodeType } from "./types";

function ImageNodeComponent({ id, data, selected }: NodeProps<ImageNodeType>) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !border-gray-500 !w-2 !h-2 opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <div 
        className="flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`
            relative overflow-hidden rounded-lg cursor-pointer
            bg-white shadow-xl
            ${selected ? "ring-2 ring-red-500 ring-offset-2 ring-offset-white" : "ring-1 ring-gray-300"}
          `}
        >
          {data.isLoading || !data.imageUrl ? (
            <div className="w-48 h-48 flex items-center justify-center bg-gray-100">
              <motion.div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#d1d5db"
                strokeWidth="1.5"
                className="relative z-10"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          ) : (
            <img
              src={data.imageUrl}
              alt={data.label || "Generated image"}
              className="w-48 h-48 object-cover"
              draggable={false}
            />
          )}
          {/* Delete button - shows on hover or when selected */}
          {(isHovered || selected) && (
            <button
              onClick={handleDelete}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-red-500 flex items-center justify-center transition-colors"
              aria-label="Delete image"
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
        {data.label && (
          <p className="text-xs text-black truncate font-medium mt-2 text-left">
            {data.label}
          </p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-400 !border-gray-500 !w-2 !h-2 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </>
  );
}

export const ImageNode = memo(ImageNodeComponent);
