"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Tool, BrushSettings } from "./types";

interface ToolDockProps {
  currentTool: Tool;
  onToolChange: (tool: Tool) => void;
  brushSettings: BrushSettings;
  onBrushSettingsChange: (settings: BrushSettings) => void;
  onClose: () => void;
  onImportAssets: (files: FileList) => void;
  onGenerate?: () => void;
  canGenerate?: boolean;
  isGenerating?: boolean;
}

const tools: { id: Tool; label: string; iconPath: string }[] = [
  {
    id: "select",
    label: "Move",
    iconPath: "/editor/move.svg",
  },
  {
    id: "brush",
    label: "Sketch",
    iconPath: "/editor/sketch.svg",
  },
  {
    id: "text",
    label: "Frame",
    iconPath: "/editor/frame.svg",
  },
  {
    id: "prompt",
    label: "Prompt",
    iconPath: "/editor/prompt.svg",
  },
  {
    id: "setting",
    label: "Settings",
    iconPath: "/editor/setting.svg",
  },
];

const BRUSH_COLORS = [
  "#000000",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const STROKE_WIDTHS = [2, 4, 8, 12, 20];

const TOOL_LABELS: Record<Tool, string> = {
  select: "Move",
  brush: "Draw",
  eraser: "Draw",
  text: "Frame",
  prompt: "Prompt",
  setting: "Setting",
};

export function ToolDock({
  currentTool,
  onToolChange,
  brushSettings,
  onBrushSettingsChange,
  onClose,
  onImportAssets,
  onGenerate,
  canGenerate = false,
  isGenerating = false,
}: ToolDockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hoveredTool, setHoveredTool] = useState<Tool | null>(null);
  const [showBrushSettings, setShowBrushSettings] = useState(false);
  const [showSketchDropdown, setShowSketchDropdown] = useState(false);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [buttonDimensions, setButtonDimensions] = useState<Record<string, { width: number; height: number }>>({});

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportAssets(e.target.files);
      e.target.value = "";
    }
  };

  const handleToolClick = (tool: Tool) => {
    if (tool === "setting") {
      setShowBrushSettings(false);
      setShowSketchDropdown(false);
      onToolChange(tool);
    } else if (tool === "brush") {
      // Toggle brush settings and show colors on left
      setShowBrushSettings(!showBrushSettings);
      setShowSketchDropdown(false);
      onToolChange(tool);
    } else {
      setShowBrushSettings(false);
      setShowSketchDropdown(false);
      onToolChange(tool);
    }
  };

  const handleSketchDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSketchDropdown(!showSketchDropdown);
  };

  const handlePenClick = () => {
    onToolChange("brush");
    setShowBrushSettings(true);
  };

  const handleEraserClick = () => {
    onToolChange("eraser");
    setShowSketchDropdown(false);
    setShowBrushSettings(false);
  };

  // Update button dimensions when hovered tool changes
  useEffect(() => {
    if (hoveredTool && buttonRefs.current[hoveredTool]) {
      const updateDimensions = () => {
        const button = buttonRefs.current[hoveredTool!];
        if (button) {
          const rect = button.getBoundingClientRect();
          setButtonDimensions((prev) => ({
            ...prev,
            [hoveredTool!]: { width: rect.width, height: rect.height },
          }));
        }
      };
      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, [hoveredTool]);

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Floating pill toolbar - centered */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center justify-center">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex items-center"
        >
        {/* Main toolbar pill */}
        <div className="relative flex items-center gap-1 bg-white/95 backdrop-blur-xl rounded-full px-2 py-2 shadow-lg border border-gray-200">
          {tools.map((tool) => {
            const isActive = currentTool === tool.id;
            const isHovered = hoveredTool === tool.id;
            const showHighlight = isActive || isHovered;

            return (
              <div key={tool.id} className="relative flex items-center">
                <div className="relative">
                  <button
                    ref={(el) => {
                      buttonRefs.current[tool.id] = el;
                    }}
                    onClick={() => handleToolClick(tool.id)}
                    onMouseEnter={() => setHoveredTool(tool.id)}
                    onMouseLeave={() => setHoveredTool(null)}
                    className={`
                      relative p-2.5 rounded-full transition-all duration-200
                      ${showHighlight ? "bg-[#FFE5E4]" : ""}
                    `}
                  >
                    <div
                      className={`
                        w-5 h-5 relative flex items-center justify-center
                        ${tool.id === "select" ? "pl-px" : ""}
                      `}
                    >
                      <img
                        src={tool.iconPath}
                        alt={tool.label}
                        className="w-full h-full"
                        style={{
                          opacity: 1,
                        }}
                      />
                    </div>
                  </button>
                  {/* Tooltip */}
                  {hoveredTool === tool.id && (
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 flex items-center justify-center"
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
                          textAlign: "center",
                        }}
                      >
                        {TOOL_LABELS[tool.id]}
                      </div>
                    </div>
                  )}
                </div>
                {/* Dropdown indicator for sketch only - positioned to the right */}
                {tool.id === "brush" && (
                  <>
                    <button
                      onClick={handleSketchDropdownClick}
                      className={`
                        ml-1 p-1 rounded-md transition-all duration-200
                        ${showSketchDropdown ? "bg-[#FFE5E4]" : ""}
                      `}
                      title="Sketch options"
                    >
                      <img
                        src="/editor/dropdown.svg"
                        alt="Dropdown"
                        className="w-4 h-4"
                        style={{
                          opacity: showSketchDropdown || isActive ? 1 : 0.4,
                        }}
                      />
                    </button>
                    {/* Sketch dropdown - Pen and Eraser */}
                    <AnimatePresence>
                      {showSketchDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full mb-2 flex flex-col gap-2 min-w-[120px] p-2"
                          style={{ 
                            left: '50%', 
                            transform: 'translateX(-50%)',
                            backgroundColor: '#FCFCFC',
                            borderRadius: '36px',
                            border: '1px solid rgba(0, 0, 0, 0.2)',
                          }}
                        >
          <button
                            onClick={handlePenClick}
            className={`
                              px-4 py-2 text-center transition-all duration-200 whitespace-nowrap
                              ${
                                currentTool === "brush"
                                  ? "text-[#FF0000] font-semibold"
                                  : "text-black"
                              }
                            `}
                            style={{
                              backgroundColor: "white",
                              borderRadius: "50px",
                              border: currentTool === "brush" ? "1px solid rgba(255, 0, 0, 0.2)" : "none",
                              fontSize: "12px",
                              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                            }}
                          >
                            Pen
          </button>
        <button
                            onClick={handleEraserClick}
                            className={`
                              px-4 py-2 text-center transition-all duration-200 whitespace-nowrap
                              ${
                                currentTool === "eraser"
                                  ? "text-[#FF0000] font-semibold"
                                  : "text-black"
                              }
                            `}
                            style={{
                              backgroundColor: "white",
                              borderRadius: "50px",
                              border: currentTool === "eraser" ? "1px solid rgba(255, 0, 0, 0.2)" : "none",
                              fontSize: "12px",
                              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                            }}
                          >
                            Eraser
        </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
      </div>
            );
          })}

          {/* Color palette - shown on left when sketch is active */}
          <AnimatePresence>
            {showBrushSettings && currentTool === "brush" && (
        <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-full mr-2 flex items-center gap-2 bg-white/95 backdrop-blur-xl rounded-full px-2 py-2 shadow-lg border border-gray-200"
              >
                {/* Add color button */}
                <button
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  title="Add new color"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 4V12M4 8H12"
                      stroke="#000000"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                {/* Color swatches */}
                {BRUSH_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() =>
                    onBrushSettingsChange({ ...brushSettings, color })
                  }
                  className={`
                      w-8 h-8 rounded-full transition-transform
                      ${
                        brushSettings.color === color
                          ? "scale-110 ring-2 ring-[#FF0000] ring-offset-1"
                          : "hover:scale-105"
                      }
                  `}
                  style={{ backgroundColor: color }}
                    title={color}
                />
              ))}
              </motion.div>
            )}
          </AnimatePresence>
          </div>

        {/* Generate button - outside toolbar, on the right */}
              <button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
                className={`
            mt-1 w-16 h-16 flex items-center justify-center transition-all duration-200 flex-shrink-0
          `}
          title="Generate"
        >
          <img
            src="/editor/generate_hover.svg"
            alt="Generate"
            className="w-16 h-16 transition-all duration-200"
            style={{
              opacity: canGenerate && !isGenerating ? 1 : 0.4,
            }}
                />
              </button>
      </motion.div>
          </div>
    </>
  );
}
