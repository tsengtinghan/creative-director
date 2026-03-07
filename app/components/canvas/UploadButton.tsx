"use client";

import { useRef, useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface UploadButtonProps {
  onImageUpload: (imageUrl: string) => void;
  onCreateBlank: () => void;
  onClearCanvas?: () => void;
  onOpenAgent?: () => void;
  hasNodes?: boolean;
}

export function UploadButton({
  onImageUpload,
  onCreateBlank,
  onClearCanvas,
  onOpenAgent,
  hasNodes = false,
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [hoveredButton, setHoveredButton] = useState<
    "sketch" | "image" | "clear" | "agent" | null
  >(null);
  const [toolbarDimensions, setToolbarDimensions] = useState({
    width: 120,
    height: 40,
  });

  const generateUploadUrl = useMutation(api.canvas.generateUploadUrl);
  const getStorageUrl = useMutation(api.canvas.getStorageUrl);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Upload to Convex storage
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      const url = await getStorageUrl({ storageId });
      if (url) {
        onImageUpload(url);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    }

    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  useEffect(() => {
    if (toolbarRef.current) {
      const updateDimensions = () => {
        const rect = toolbarRef.current?.getBoundingClientRect();
        if (rect) {
          setToolbarDimensions({ width: rect.width, height: rect.height });
        }
      };
      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, [hoveredButton]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <div className="relative">
          <div
            ref={toolbarRef}
            className="flex items-center justify-center gap-2 bg-white px-3 py-2"
            style={{
              borderRadius: "50px",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              boxShadow: "0 0 20px rgba(0, 0, 0, 0.04)",
              minWidth: "120px",
            }}
          >
            {/* Add Sketch Button */}
            <div className="relative">
              <button
                onClick={onCreateBlank}
                onMouseEnter={() => setHoveredButton("sketch")}
                onMouseLeave={() => setHoveredButton(null)}
                className="p-1.5 rounded transition-colors relative"
                style={{
                  backgroundColor:
                    hoveredButton === "sketch"
                      ? "rgba(255, 0, 0, 0.2)"
                      : "transparent",
                  borderRadius: "8px",
                }}
                aria-label="Add sketch"
              >
                <img
                  src="/add_sketch.svg"
                  alt="Add sketch"
                  width={22}
                  height={22}
                  className="w-[22px] h-[22px]"
                />
              </button>
            </div>

            {/* Add Image Button */}
            <div className="relative">
              <button
                onClick={handleClick}
                onMouseEnter={() => setHoveredButton("image")}
                onMouseLeave={() => setHoveredButton(null)}
                className="p-1.5 rounded transition-colors relative"
                style={{
                  backgroundColor:
                    hoveredButton === "image"
                      ? "rgba(255, 0, 0, 0.2)"
                      : "transparent",
                  borderRadius: "8px",
                }}
                aria-label="Add image"
              >
                <img
                  src="/add_img.svg"
                  alt="Add image"
                  width={22}
                  height={22}
                  className="w-[22px] h-[22px]"
                />
              </button>
            </div>

            {/* Creative Agent Button */}
            {onOpenAgent && (
              <>
                <div
                  className="w-px h-5 mx-1"
                  style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }}
                />
                <div className="relative">
                  <button
                    onClick={onOpenAgent}
                    onMouseEnter={() => setHoveredButton("agent")}
                    onMouseLeave={() => setHoveredButton(null)}
                    className="p-1.5 rounded transition-colors relative"
                    style={{
                      backgroundColor:
                        hoveredButton === "agent"
                          ? "rgba(255, 0, 0, 0.2)"
                          : "transparent",
                      borderRadius: "8px",
                    }}
                    aria-label="Creative Agent"
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
                      <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" />
                    </svg>
                  </button>
                </div>
              </>
            )}

            {/* Clear Canvas Button - only show when there are nodes */}
            {hasNodes && onClearCanvas && (
              <>
                <div
                  className="w-px h-5 mx-1"
                  style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }}
                />
                <div className="relative">
                  <button
                    onClick={onClearCanvas}
                    onMouseEnter={() => setHoveredButton("clear")}
                    onMouseLeave={() => setHoveredButton(null)}
                    className="p-1.5 rounded transition-colors relative"
                    style={{
                      backgroundColor:
                        hoveredButton === "clear"
                          ? "rgba(255, 0, 0, 0.2)"
                          : "transparent",
                      borderRadius: "8px",
                    }}
                    aria-label="Clear canvas"
                  >
                    <img
                      src="/clear.svg"
                      alt="Clear canvas"
                      width={22}
                      height={22}
                      className="w-[22px] h-[22px]"
                    />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Tooltip - positioned above toolbar container */}
          {hoveredButton && (
            <div
              className="absolute bottom-full left-0 mb-2 flex items-center justify-center"
              style={{
                width: `${toolbarDimensions.width}px`,
              }}
            >
              <div
                className="px-3 py-1.5 whitespace-nowrap flex items-center justify-center"
                style={{
                  backgroundColor: "white",
                  borderRadius: "50px",
                  border: "1px solid rgba(255, 0, 0, 0.2)",
                  color: "#FF0000",
                  fontSize: "12px",
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  fontWeight: "600",
                  pointerEvents: "none",
                  width: `${toolbarDimensions.width}px`,
                  height: `${toolbarDimensions.height}px`,
                  textAlign: "center",
                }}
              >
                {hoveredButton === "sketch"
                  ? "Add New Sketch"
                  : hoveredButton === "image"
                  ? "Add New Image"
                  : hoveredButton === "agent"
                  ? "Creative Agent"
                  : "Clear Canvas"}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
