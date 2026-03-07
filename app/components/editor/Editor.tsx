"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EditorCanvas } from "./EditorCanvas";
import type { EditorCanvasRef } from "./EditorCanvas";
import { ToolDock } from "./ToolDock";
import { ReferencePanel } from "./ReferencePanel";
import { GlobalPromptBar } from "./GlobalPromptBar";
import type {
  Tool,
  EditorObject,
  BrushSettings,
  ReferenceImage,
} from "./types";
import { DEFAULT_BRUSH_SETTINGS } from "./types";

interface EditorProps {
  isOpen: boolean;
  baseImage: string | null;
  baseImageDimensions?: { width: number; height: number } | null;
  parentNodeId: string | null;
  initialObjects?: EditorObject[];
  onClose: () => void;
  onSave?: (objects: EditorObject[], compositeImage: string) => void;
  onGenerate?: (
    generatedImageUrl: string,
    parentNodeId: string | null,
    inputCompositeImage: string | null
  ) => void;
  onObjectsChange?: (objects: EditorObject[]) => void;
}

// Generate unique ID for reference images
let refIdCounter = 0;
const generateRefId = () => `ref-${Date.now()}-${refIdCounter++}`;

export function Editor({
  isOpen,
  baseImage,
  baseImageDimensions,
  parentNodeId,
  initialObjects,
  onClose,
  onSave,
  onGenerate,
  onObjectsChange,
}: EditorProps) {
  const canvasRef = useRef<EditorCanvasRef>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [objects, setObjects] = useState<EditorObject[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [brushSettings, setBrushSettings] = useState<BrushSettings>(
    DEFAULT_BRUSH_SETTINGS
  );
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPromptBar, setShowPromptBar] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>(
    `You are an image editor that interprets visual instructions marked directly on an image.

YOUR TASK:

1. Identify all pink-marked regions and follow their associated text instructions
2. Generate the requested content at the exact location of each marked region
3. Follow any brushstroke guides for shape, position, or composition
4. Preserve all unmarked areas of the original image exactly as they appear

- Do NOT include the pink region markers or the text instructions in the output

The final image should look like a clean, finished result with only the requested changes applied`
  );
  
  // Undo/Redo history for editor
  const [editorHistory, setEditorHistory] = useState<EditorObject[][]>([]);
  const [editorHistoryIndex, setEditorHistoryIndex] = useState(-1);
  const maxEditorHistorySize = 50;
  const isUndoingEditorRef = useRef(false);

  // Calculate canvas size based on window and image aspect ratio
  // Centered layout with generous whitespace
  useEffect(() => {
    const updateSize = () => {
      // Generous padding on all sides for centered layout
      const horizontalPadding = 120; // Left and right padding
      const topPadding = 80;
      const bottomPadding = 140; // Fixed padding - prompt bar is positioned absolutely and doesn't affect canvas size

      const maxWidth = window.innerWidth - horizontalPadding * 2;
      const maxHeight = window.innerHeight - topPadding - bottomPadding;

      // Use actual image aspect ratio if we have dimensions, otherwise default to 4:3
      const aspectRatio = baseImageDimensions
        ? baseImageDimensions.width / baseImageDimensions.height
        : 4 / 3;

      let width = maxWidth;
      let height = width / aspectRatio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

      // Also ensure we don't exceed max width after height adjustment
      if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
      }

      setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [referenceImages.length, baseImageDimensions]);

  // Save objects and close editor
  const handleClose = useCallback(() => {
    // Only save if there are edits (objects) or if there's a base image
    // Don't save completely blank sketches
    const hasEdits = objects.length > 0;
    if (hasEdits) {
      // Export composite image and save it
      const compositeImage = canvasRef.current?.exportComposite();
      if (compositeImage && onSave) {
        onSave(objects, compositeImage);
      }
    }
    // Save current objects back to the node before closing (if editing existing node)
    onObjectsChange?.(objects);
    onClose();
  }, [objects, onObjectsChange, onClose, onSave]);

  // Save editor state to history
  const saveEditorToHistory = useCallback((currentObjects: EditorObject[]) => {
    if (isUndoingEditorRef.current) {
      isUndoingEditorRef.current = false;
      return;
    }
    setEditorHistory((prev) => {
      const newHistory = prev.slice(0, editorHistoryIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(currentObjects)));
      if (newHistory.length > maxEditorHistorySize) {
        newHistory.shift();
        setEditorHistoryIndex((prev) => prev - 1);
        return newHistory;
      }
      return newHistory;
    });
    setEditorHistoryIndex((prev) => Math.min(prev + 1, maxEditorHistorySize - 1));
  }, [editorHistoryIndex]);

  // Handle editor undo/redo
  const handleEditorUndoRedo = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    // Don't handle keys if user is typing in an input/textarea
    const activeElement = document.activeElement;
    const isTyping =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement?.getAttribute("contenteditable") === "true";

    if (isTyping) return;

    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (editorHistoryIndex > 0) {
        isUndoingEditorRef.current = true;
        const prevState = editorHistory[editorHistoryIndex - 1];
        setObjects(prevState);
        setSelectedIds([]);
        setEditorHistoryIndex((prev) => prev - 1);
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      if (editorHistoryIndex < editorHistory.length - 1) {
        isUndoingEditorRef.current = true;
        const nextState = editorHistory[editorHistoryIndex + 1];
        setObjects(nextState);
        setSelectedIds([]);
        setEditorHistoryIndex((prev) => prev + 1);
      }
    }
  }, [isOpen, editorHistory, editorHistoryIndex]);

  // Handle escape key to close and other keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys if user is typing in an input/textarea
      const activeElement = document.activeElement;
      const isTyping =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute("contenteditable") === "true";

      if (e.key === "Escape" && isOpen) {
        // Allow escape to close even when typing (will blur the input first)
        if (!isTyping) {
          handleClose();
        }
        return;
      }

      // Delete selected objects with Backspace or Delete
      // But only if not currently typing in an input
      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        selectedIds.length > 0 &&
        !isTyping
      ) {
        setObjects((prev) => {
          // For text regions, selectedIds might be "obj-123-frame" or "obj-123-label"
          // We need to match against the base object ID
          const filtered = prev.filter((obj) => {
            // Check if any selectedId matches this object directly or is a sub-component
            const isSelected = selectedIds.some(
              (id) => id === obj.id || id.startsWith(`${obj.id}-`)
            );
            return !isSelected;
          });
          return filtered;
        });
        setSelectedIds([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleEditorUndoRedo);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleEditorUndoRedo);
    };
  }, [isOpen, handleClose, selectedIds, handleEditorUndoRedo]);
  
  // Save to history when objects change
  useEffect(() => {
    if (isOpen && objects.length >= 0) {
      const timeoutId = setTimeout(() => {
        saveEditorToHistory(objects);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [objects, isOpen, saveEditorToHistory]);

  // Initialize state when editor opens - load existing objects or start fresh
  useEffect(() => {
    if (isOpen) {
      // Load existing editor objects from the node, or start fresh
      const initialObjs = initialObjects ?? [];
      setObjects(initialObjs);
      setSelectedIds([]);
      setTool("select");
      setReferenceImages([]);
      setShowSettings(false);
      setShowPromptBar(false);
      // Initialize history with initial state
      setEditorHistory([JSON.parse(JSON.stringify(initialObjs))]);
      setEditorHistoryIndex(0);
    }
  }, [isOpen, baseImage, initialObjects]);

  const handleToolChange = useCallback((newTool: Tool) => {
    setTool(newTool);
    if (newTool !== "select") {
      setSelectedIds([]);
    }
    
    // Handle prompt and setting tools
    if (newTool === "prompt") {
      setShowPromptBar(true);
      setShowSettings(false);
    } else if (newTool === "setting") {
      setShowSettings(true);
      setShowPromptBar(false);
    } else {
      setShowPromptBar(false);
      // Keep settings open if reference images exist
      if (referenceImages.length === 0) {
        setShowSettings(false);
      }
    }
  }, [referenceImages.length]);

  // Handle importing reference images
  const handleImportAssets = useCallback((files: FileList) => {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        if (url) {
          setReferenceImages((prev) => [
            ...prev,
            {
              id: generateRefId(),
              url,
              label: `Image ${prev.length + 1}`,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Handle updating reference image label
  const handleUpdateRefLabel = useCallback((id: string, label: string) => {
    setReferenceImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, label } : img))
    );
  }, []);

  // Handle removing reference image
  const handleRemoveRef = useCallback((id: string) => {
    setReferenceImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  // Convex action for image generation
  const generateImage = useAction(api.generate.generateImage);

  // Handle generate - calls Convex action
  const handleGenerate = useCallback(
    async (prompt: string) => {
      setIsGenerating(true);
      setGenerateError(null);

      try {
        // Export the composite image from the canvas
        const compositeImage = canvasRef.current?.exportComposite();

        if (!compositeImage && !baseImage) {
          throw new Error("No image to generate from");
        }

        const result = await generateImage({
          prompt,
          baseImage: compositeImage || baseImage || undefined,
          referenceImages: referenceImages.map((ref) => ({
            url: ref.url,
            label: ref.label,
          })),
        });

        if (result.url) {
          // Save objects before closing
          onObjectsChange?.(objects);
          // Call the onGenerate callback to add the new image to the canvas
          onGenerate?.(result.url, parentNodeId, compositeImage || null);
          // Close the editor after successful generation
          onClose();
        } else {
          throw new Error("No image returned");
        }
      } catch (error) {
        console.error("Generation error:", error);
        setGenerateError(
          error instanceof Error ? error.message : "Generation failed"
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [
      referenceImages,
      baseImage,
      parentNodeId,
      onGenerate,
      onClose,
      objects,
      onObjectsChange,
      generateImage,
    ]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop / Spotlight overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Editor container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            {/* Canvas wrapper */}
            <div
              className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200 pointer-events-auto bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <EditorCanvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                tool={tool}
                objects={objects}
                selectedIds={selectedIds}
                brushSettings={brushSettings}
                baseImage={baseImage}
                onObjectsChange={setObjects}
                onSelectionChange={setSelectedIds}
              />
              
              {/* Loading overlay */}
              <AnimatePresence>
                {isGenerating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                  >
                    {/* Loading frame animation */}
                    <div className="relative flex flex-col items-center gap-4">
                      <svg
                        width="120"
                        height="120"
                        viewBox="0 0 120 120"
                        className="loading-frame"
                      >
                        <rect
                          x="10"
                          y="10"
                          width="100"
                          height="100"
                          rx="8"
                          ry="8"
                          fill="none"
                          stroke="#FF0000"
                          strokeWidth="2"
                          strokeDasharray="8 6"
                          className="loading-frame-rect"
                        />
                      </svg>
                      <span
                        style={{
                          color: '#FF0000',
                          fontSize: '14px',
                          fontWeight: 500,
                          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                        }}
                      >
                        Generating...
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Floating pill toolbar - bottom center */}
          <ToolDock
            currentTool={tool}
            onToolChange={handleToolChange}
            brushSettings={brushSettings}
            onBrushSettingsChange={setBrushSettings}
            onClose={handleClose}
            onImportAssets={handleImportAssets}
            onGenerate={() => {
              // Trigger generate with current prompt
              handleGenerate(currentPrompt);
            }}
            canGenerate={!!baseImage || objects.length > 0}
            isGenerating={isGenerating}
          />

          {/* Reference images panel - right side (shown when setting tool is active) */}
          {showSettings && (
            <ReferencePanel
              images={referenceImages}
              onUpdateLabel={handleUpdateRefLabel}
              onRemove={handleRemoveRef}
            />
          )}

          {/* Global prompt bar - bottom (shown when prompt tool is active) */}
          {showPromptBar && (
            <GlobalPromptBar
              onGenerate={(prompt) => {
                setCurrentPrompt(prompt);
                handleGenerate(prompt);
              }}
              isGenerating={isGenerating}
              error={generateError}
              initialPrompt={currentPrompt}
              onPromptChange={setCurrentPrompt}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
