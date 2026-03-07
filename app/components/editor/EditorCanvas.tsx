"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Stage,
  Layer,
  Line,
  Text,
  Image as KonvaImage,
  Rect,
  Transformer,
} from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import type {
  Tool,
  EditorObject,
  StrokeObject,
  TextRegionObject,
  BrushSettings,
  Point,
} from "./types";
import { TEXT_REGION_COLOR, TEXT_REGION_BORDER_COLOR } from "./types";
import { Group } from "react-konva";

interface EditorCanvasProps {
  width: number;
  height: number;
  tool: Tool;
  objects: EditorObject[];
  selectedIds: string[];
  brushSettings: BrushSettings;
  baseImage: string | null;
  onObjectsChange: (objects: EditorObject[]) => void;
  onSelectionChange: (ids: string[]) => void;
}

// Ref handle type for external access
export interface EditorCanvasRef {
  exportComposite: () => string | null;
}

// Generate unique IDs
let idCounter = 0;
const generateId = () => `obj-${Date.now()}-${idCounter++}`;

export const EditorCanvas = forwardRef<EditorCanvasRef, EditorCanvasProps>(
  function EditorCanvas(
    {
      width,
      height,
      tool,
      objects,
      selectedIds,
      brushSettings,
      baseImage,
      onObjectsChange,
      onSelectionChange,
    },
    ref
  ) {
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);

    // Expose exportComposite method to parent via ref
    useImperativeHandle(ref, () => ({
      exportComposite: () => {
        const stage = stageRef.current;
        if (!stage) return null;

        // Hide transformer before export
        const transformer = transformerRef.current;
        transformer?.hide();

        // Export the stage as a data URL (PNG)
        const dataUrl = stage.toDataURL({
          pixelRatio: 1,
          mimeType: "image/png",
        });

        // Show transformer again
        transformer?.show();

        return dataUrl;
      },
    }));
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStroke, setCurrentStroke] = useState<number[]>([]);
    const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(
      null
    );
    const [selectionRect, setSelectionRect] = useState<{
      x: number;
      y: number;
      width: number;
      height: number;
      visible: boolean;
    } | null>(null);
    const selectionStartRef = useRef<Point | null>(null);
    const [isDraggingSelection, setIsDraggingSelection] = useState(false);
    const dragStartRef = useRef<Point | null>(null);

    // Text region creation state
    const [textRegionRect, setTextRegionRect] = useState<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null);
    const textRegionStartRef = useRef<Point | null>(null);
    const [editingTextRegionId, setEditingTextRegionId] = useState<
      string | null
    >(null);
    const isFinishingEditRef = useRef<boolean>(false);
    const [recentlyFinishedEditing, setRecentlyFinishedEditing] = useState<string | null>(null);

    // Load base image
    useEffect(() => {
      if (baseImage) {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.src = baseImage;
        img.onload = () => setLoadedImage(img);
      } else {
        setLoadedImage(null);
      }
    }, [baseImage]);

    // Calculate image scale and position to fit within canvas
    const getImageTransform = useCallback(() => {
      if (!loadedImage) return { x: 0, y: 0, scaleX: 1, scaleY: 1 };

      const imgWidth = loadedImage.width;
      const imgHeight = loadedImage.height;

      // Calculate scale to fit the image within the canvas
      const scaleX = width / imgWidth;
      const scaleY = height / imgHeight;
      const scale = Math.min(scaleX, scaleY);

      // Calculate position to center the scaled image
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;
      const x = (width - scaledWidth) / 2;
      const y = (height - scaledHeight) / 2;

      return { x, y, scaleX: scale, scaleY: scale };
    }, [loadedImage, width, height]);

    // Update transformer when selection changes
    useEffect(() => {
      if (!transformerRef.current || !stageRef.current) return;

      const stage = stageRef.current;
      const selectedNodes = selectedIds
        .map((id) => stage.findOne(`#${id}`))
        .filter(Boolean) as Konva.Node[];

      transformerRef.current.nodes(selectedNodes);
      // Configure rotation handle offset to make it much shorter
      // @ts-expect-error - rotationHandleOffset exists on Konva Transformer but not in types
      if (transformerRef.current.rotationHandleOffset) {
        // @ts-expect-error
        transformerRef.current.rotationHandleOffset(10); // Much shorter - default is usually 30-40
      }
      transformerRef.current.getLayer()?.batchDraw();
    }, [selectedIds, objects]);

    // Stop editing when selection is cleared or when switching to frame
    useEffect(() => {
      if (editingTextRegionId) {
        const labelId = `${editingTextRegionId}-label`;
        if (!selectedIds.includes(labelId)) {
          setEditingTextRegionId(null);
        }
      }
    }, [selectedIds, editingTextRegionId]);

    // Handle text region editing with HTML textarea overlay
    useEffect(() => {
      if (!editingTextRegionId || !stageRef.current) return;

      const stage = stageRef.current;
      const obj = objects.find((o) => o.id === editingTextRegionId) as
        | TextRegionObject
        | undefined;
      if (!obj || obj.type !== "textRegion") {
        setEditingTextRegionId(null);
        return;
      }

      // Find the label node (not the frame)
      const labelNode = stage.findOne(`#${obj.id}-label`);
      if (!labelNode) return;

      // Hide transformer while editing
      transformerRef.current?.hide();

      const labelPosition = labelNode.getAbsolutePosition();
      const stageBox = stage.container().getBoundingClientRect();
      const scale = labelNode.getAbsoluteScale();

      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);

      textarea.value = obj.text;
      textarea.placeholder = "Describe what it is...";
      textarea.style.position = "absolute";
      // Position textarea at the label position
      textarea.style.top = `${stageBox.top + labelPosition.y}px`;
      textarea.style.left = `${stageBox.left + labelPosition.x}px`;
      // Use label width
      const labelWidth = obj.labelWidth || obj.width;
      textarea.style.width = `${labelWidth * scale.x}px`;
      textarea.style.minHeight = `${40 * scale.y}px`;
      textarea.style.height = "auto"; // Allow height to grow
      textarea.style.maxHeight = "none"; // No max height limit
      textarea.style.fontSize = `${10 * scale.y}px`;
      textarea.style.fontFamily = obj.fontFamily;
      textarea.style.color = "#000000"; // 100% black when typing
      textarea.style.background = "#FFE5E5";
      textarea.style.border = "none"; // No stroke
      textarea.style.borderRadius = "0px";
      textarea.style.padding = "8px 12px";
      textarea.style.outline = "none";
      textarea.style.resize = "none";
      textarea.style.zIndex = "1000";
      textarea.style.transformOrigin = "left top";
      textarea.style.transform = `rotate(${labelNode.rotation()}deg)`;
      textarea.style.boxShadow = "none";
      textarea.style.lineHeight = "1.4";
      textarea.style.overflow = "hidden"; // Hide scrollbar, let it grow
      
      // Set placeholder color to 20% black
      const style = document.createElement("style");
      style.textContent = `
        textarea::placeholder {
          color: rgba(0, 0, 0, 0.2) !important;
        }
      `;
      document.head.appendChild(style);
      
      // Auto-resize height based on content
      const autoResize = () => {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      };
      
      // Store autoResize reference for cleanup
      (textarea as any).__autoResize = autoResize;
      
      textarea.addEventListener("input", autoResize);
      autoResize(); // Initial resize

      textarea.focus();
      if (obj.text) {
        textarea.select();
      }

      let isFinished = false;

      const finishEditing = (e?: Event) => {
        if (isFinished) return;
        isFinished = true;
        isFinishingEditRef.current = true;

        // Prevent click event from propagating after blur
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }

        const newText = textarea.value.trim();

        textarea.removeEventListener("blur", finishEditing);
        textarea.removeEventListener("keydown", handleKeyDown);
        const autoResizeFn = (textarea as any).__autoResize;
        if (autoResizeFn) {
          textarea.removeEventListener("input", autoResizeFn);
        }

        // Remove style element
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }

        if (document.body.contains(textarea)) {
          document.body.removeChild(textarea);
        }

        // Small delay to prevent click events from affecting position
        setTimeout(() => {
          transformerRef.current?.show();

          // Update or delete the object - preserve all position properties
          if (newText !== obj.text) {
            if (newText === "" && obj.text === "") {
              // If still empty after first edit, delete the object
              onObjectsChange(objects.filter((o) => o.id !== obj.id));
              onSelectionChange([]);
            } else {
              // Preserve all position and transform properties when updating text
              const updatedObjects = objects.map((o) =>
                o.id === obj.id 
                  ? { 
                      ...o, 
                      text: newText,
                      // Explicitly preserve position and transform
                      x: obj.x,
                      y: obj.y,
                      rotation: obj.rotation,
                      scaleX: obj.scaleX,
                      scaleY: obj.scaleY,
                      labelOffsetX: obj.labelOffsetX,
                      labelOffsetY: obj.labelOffsetY,
                    } 
                  : o
              );
              onObjectsChange(updatedObjects);
            }
          }

          setEditingTextRegionId(null);
          // Mark as recently finished to prevent dragging
          setRecentlyFinishedEditing(obj.id);
          // Reset flag after a longer delay to prevent accidental dragging after editing
          setTimeout(() => {
            isFinishingEditRef.current = false;
            setRecentlyFinishedEditing(null);
          }, 300);
        }, 50);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          // Cancel editing, delete if empty
          if (obj.text === "") {
            onObjectsChange(objects.filter((o) => o.id !== obj.id));
            onSelectionChange([]);
          }
          isFinished = true;
          textarea.removeEventListener("blur", finishEditing);
          textarea.removeEventListener("keydown", handleKeyDown);
          const autoResizeFn = (textarea as any).__autoResize;
          if (autoResizeFn) {
            textarea.removeEventListener("input", autoResizeFn);
          }
          // Remove style element
          if (document.head.contains(style)) {
            document.head.removeChild(style);
          }
          if (document.body.contains(textarea)) {
            document.body.removeChild(textarea);
          }
          transformerRef.current?.show();
          setEditingTextRegionId(null);
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          finishEditing();
        }
      };

      textarea.addEventListener("blur", finishEditing);
      textarea.addEventListener("keydown", handleKeyDown);

      return () => {
        if (!isFinished && document.body.contains(textarea)) {
          textarea.removeEventListener("blur", finishEditing);
          textarea.removeEventListener("keydown", handleKeyDown);
          const autoResizeFn = (textarea as any).__autoResize;
          if (autoResizeFn) {
            textarea.removeEventListener("input", autoResizeFn);
          }
          // Remove style element
          if (document.head.contains(style)) {
            document.head.removeChild(style);
          }
          document.body.removeChild(textarea);
        }
      };
    }, [editingTextRegionId, objects, onObjectsChange, onSelectionChange]);

    const getPointerPosition = useCallback((): Point | null => {
      const stage = stageRef.current;
      if (!stage) return null;
      const pos = stage.getPointerPosition();
      return pos ? { x: pos.x, y: pos.y } : null;
    }, []);

    // Check if a point is within the bounding box of selected objects
    const isPointInSelectionBounds = useCallback(
      (point: Point): boolean => {
        if (selectedIds.length === 0 || !stageRef.current) return false;

        const stage = stageRef.current;
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;

        for (const id of selectedIds) {
          const node = stage.findOne(`#${id}`);
          if (node) {
            const box = node.getClientRect();
            minX = Math.min(minX, box.x);
            minY = Math.min(minY, box.y);
            maxX = Math.max(maxX, box.x + box.width);
            maxY = Math.max(maxY, box.y + box.height);
          }
        }

        // Add some padding for easier clicking
        const padding = 4;
        return (
          point.x >= minX - padding &&
          point.x <= maxX + padding &&
          point.y >= minY - padding &&
          point.y <= maxY + padding
        );
      },
      [selectedIds]
    );

    const handleMouseDown = useCallback(
      (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        const pos = getPointerPosition();
        if (!pos) return;

        // Prevent mouse events from affecting position immediately after finishing edit
        if (isFinishingEditRef.current) {
          return;
        }

        // Check if we clicked on an editable object (stroke, mask, or text)
        const targetId = e.target.id?.() || "";
        const isEditableObject = targetId.startsWith("obj-");
        const clickedOnTransformer =
          e.target.getParent()?.className === "Transformer";

        // If we clicked on transformer handles, let the transformer handle it
        if (clickedOnTransformer) return;

        // Prompt and setting tools don't interact with canvas
        if (tool === "prompt" || tool === "setting") {
          return;
        }

        if (tool === "select") {
          // If clicking on an already-selected object, start dragging
          if (isEditableObject && selectedIds.includes(targetId)) {
            setIsDraggingSelection(true);
            dragStartRef.current = pos;
            return;
          }

          if (!isEditableObject) {
            // Check if clicking within the selection bounds - start dragging selection
            if (selectedIds.length > 0 && isPointInSelectionBounds(pos)) {
              setIsDraggingSelection(true);
              dragStartRef.current = pos;
              return;
            }
            // Start box selection on empty area
            selectionStartRef.current = pos;
            setSelectionRect({
              x: pos.x,
              y: pos.y,
              width: 0,
              height: 0,
              visible: true,
            });
            onSelectionChange([]);
          }
          return;
        }

        if (tool === "eraser") {
          // Handled in shape click handlers
          return;
        }

        if (tool === "text") {
          if (!isEditableObject) {
            // Start drawing text region rectangle
            textRegionStartRef.current = pos;
            setTextRegionRect({
              x: pos.x,
              y: pos.y,
              width: 0,
              height: 0,
            });
            onSelectionChange([]);
          }
          return;
        }

        if (tool === "brush") {
          setIsDrawing(true);
          setCurrentStroke([pos.x, pos.y]);
          onSelectionChange([]);
        }
      },
      [
        tool,
        objects,
        selectedIds,
        brushSettings,
        getPointerPosition,
        isPointInSelectionBounds,
        onObjectsChange,
        onSelectionChange,
      ]
    );

    const handleMouseMove = useCallback(
      (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        const pos = getPointerPosition();
        if (!pos) return;

        // Handle dragging selected objects by clicking within selection bounds
        if (tool === "select" && isDraggingSelection && dragStartRef.current) {
          const dx = pos.x - dragStartRef.current.x;
          const dy = pos.y - dragStartRef.current.y;

          // Update all selected objects' positions
          const updatedObjects = objects.map((obj) =>
            selectedIds.includes(obj.id)
              ? { ...obj, x: obj.x + dx, y: obj.y + dy }
              : obj
          );
          onObjectsChange(updatedObjects);
          dragStartRef.current = pos;
          return;
        }

        // Handle box selection
        if (
          tool === "select" &&
          selectionStartRef.current &&
          selectionRect?.visible
        ) {
          const start = selectionStartRef.current;
          setSelectionRect({
            x: Math.min(start.x, pos.x),
            y: Math.min(start.y, pos.y),
            width: Math.abs(pos.x - start.x),
            height: Math.abs(pos.y - start.y),
            visible: true,
          });
          return;
        }

        // Handle text region rectangle drawing
        if (tool === "text" && textRegionStartRef.current && textRegionRect) {
          const start = textRegionStartRef.current;
          setTextRegionRect({
            x: Math.min(start.x, pos.x),
            y: Math.min(start.y, pos.y),
            width: Math.abs(pos.x - start.x),
            height: Math.abs(pos.y - start.y),
          });
          return;
        }

        // Update cursor for select tool
        if (tool === "select" && !isDraggingSelection) {
          if (selectedIds.length > 0 && isPointInSelectionBounds(pos)) {
            setHoverCursor("move");
          } else {
            setHoverCursor("default");
          }
        }

        if (!isDrawing) return;

        if (tool === "brush") {
          setCurrentStroke((prev) => [...prev, pos.x, pos.y]);
        }
      },
      [
        tool,
        isDrawing,
        isDraggingSelection,
        selectionRect,
        textRegionRect,
        objects,
        selectedIds,
        getPointerPosition,
        isPointInSelectionBounds,
        onObjectsChange,
      ]
    );

    const handleMouseUp = useCallback(() => {
      // Handle end of selection dragging
      if (isDraggingSelection) {
        setIsDraggingSelection(false);
        dragStartRef.current = null;
        return;
      }

      // Handle box selection completion
      if (tool === "select" && selectionRect?.visible) {
        const stage = stageRef.current;
        if (stage && selectionRect.width > 5 && selectionRect.height > 5) {
          // Find objects within selection rectangle
          const box = {
            x: selectionRect.x,
            y: selectionRect.y,
            width: selectionRect.width,
            height: selectionRect.height,
          };

          const selected = objects.filter((obj) => {
            const node = stage.findOne(`#${obj.id}`);
            if (!node) return false;
            const nodeBox = node.getClientRect();
            return (
              nodeBox.x >= box.x &&
              nodeBox.y >= box.y &&
              nodeBox.x + nodeBox.width <= box.x + box.width &&
              nodeBox.y + nodeBox.height <= box.y + box.height
            );
          });

          onSelectionChange(selected.map((obj) => obj.id));
        }

        selectionStartRef.current = null;
        setSelectionRect(null);
        return;
      }

      // Handle text region completion
      if (tool === "text" && textRegionRect) {
        if (textRegionRect.width > 20 && textRegionRect.height > 20) {
          // Create new text region object with placeholder text
          // Default label position is below the box (positive Y offset)
          const newTextRegion: TextRegionObject = {
            id: generateId(),
            type: "textRegion",
            x: textRegionRect.x,
            y: textRegionRect.y,
            width: textRegionRect.width,
            height: textRegionRect.height,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            text: "",
            fontSize: 16,
            fontFamily: "Inter, system-ui, sans-serif",
            labelOffsetX: 0,
            labelOffsetY: textRegionRect.height + 4, // Position below the box by default
            labelWidth: textRegionRect.width, // Same width as frame initially
            labelScaleX: 1,
            labelScaleY: 1,
          };
          onObjectsChange([...objects, newTextRegion]);
          // Select the label for transform after creation
          onSelectionChange([`${newTextRegion.id}-label`]);
          // Automatically start editing the new text region
          setEditingTextRegionId(newTextRegion.id);
        }
        textRegionStartRef.current = null;
        setTextRegionRect(null);
        return;
      }

      if (!isDrawing) return;

      if (tool === "brush" && currentStroke.length >= 4) {
        const newStroke: StrokeObject = {
          id: generateId(),
          type: "stroke",
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          points: currentStroke,
          color: brushSettings.color,
          strokeWidth: brushSettings.strokeWidth,
        };

        onObjectsChange([...objects, newStroke]);
      }

      setIsDrawing(false);
      setCurrentStroke([]);
    }, [
      tool,
      isDrawing,
      isDraggingSelection,
      currentStroke,
      objects,
      brushSettings,
      selectionRect,
      textRegionRect,
      onObjectsChange,
      onSelectionChange,
    ]);

    const handleObjectClick = useCallback(
      (e: KonvaEventObject<MouseEvent | TouchEvent>, obj: EditorObject) => {
        e.cancelBubble = true;

        if (tool === "eraser") {
          // Delete the object
          onObjectsChange(objects.filter((o) => o.id !== obj.id));
          onSelectionChange(selectedIds.filter((id) => id !== obj.id));
          return;
        }

        if (tool === "select") {
          const isSelected = selectedIds.includes(obj.id);
          const isShiftKey = "shiftKey" in e.evt && e.evt.shiftKey;

          if (isShiftKey) {
            // Toggle selection
            if (isSelected) {
              onSelectionChange(selectedIds.filter((id) => id !== obj.id));
            } else {
              onSelectionChange([...selectedIds, obj.id]);
            }
          } else {
            // Select only this object
            onSelectionChange([obj.id]);
          }
        }
      },
      [tool, objects, selectedIds, onObjectsChange, onSelectionChange]
    );

    const handleTextRegionDblClick = useCallback(
      (e: KonvaEventObject<MouseEvent | TouchEvent>, obj: TextRegionObject) => {
        if (tool !== "select") return;

        e.cancelBubble = true;
        setEditingTextRegionId(obj.id);
      },
      [tool]
    );

    const handleTransformEnd = useCallback(
      (e: KonvaEventObject<Event>, obj: EditorObject) => {
        const node = e.target;
        
        // For text regions, update actual width/height instead of scale
        if (obj.type === "textRegion") {
          const textRegion = obj as TextRegionObject;
          const newWidth = Math.max(50, textRegion.width * node.scaleX());
          const newHeight = Math.max(30, textRegion.height * node.scaleY());
          
          const updatedObjects = objects.map((o) =>
            o.id === obj.id
              ? {
                  ...o,
                  x: node.x(),
                  y: node.y(),
                  rotation: node.rotation(),
                  width: newWidth,
                  height: newHeight,
                  scaleX: 1,
                  scaleY: 1,
                }
              : o
          );
          
          // Reset the node's scale after updating dimensions
          node.scaleX(1);
          node.scaleY(1);
          
          onObjectsChange(updatedObjects);
        } else {
          const updatedObjects = objects.map((o) =>
            o.id === obj.id
              ? {
                  ...o,
                  x: node.x(),
                  y: node.y(),
                  rotation: node.rotation(),
                  scaleX: node.scaleX(),
                  scaleY: node.scaleY(),
                }
              : o
          );
          onObjectsChange(updatedObjects);
        }
      },
      [objects, onObjectsChange]
    );

    // Handle dragging the text label within a text region
    const handleLabelDragEnd = useCallback(
      (e: KonvaEventObject<DragEvent>, obj: TextRegionObject) => {
        const node = e.target;
        const updatedObjects = objects.map((o) =>
          o.id === obj.id
            ? {
                ...o,
                labelOffsetX: node.x(),
                labelOffsetY: node.y(),
              }
            : o
        );
        onObjectsChange(updatedObjects);
      },
      [objects, onObjectsChange]
    );

    const [hoverCursor, setHoverCursor] = useState<string>("default");

    const getCursor = () => {
      if (isDraggingSelection) return "grabbing";
      if (tool === "select" && hoverCursor === "move") return "grab";
      if (tool === "prompt" || tool === "setting") return "default";
      switch (tool) {
        case "brush":
          return "crosshair";
        case "eraser":
          return "pointer";
        case "text":
          return "crosshair"; // Crosshair for drawing text regions
        default:
          return "default";
      }
    };

    return (
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        style={{ cursor: getCursor() }}
      >
        <Layer>
          {/* Background - light/white to match reference */}
          <Rect x={0} y={0} width={width} height={height} fill="#ffffff" />

          {/* Base image - scaled to fit canvas */}
          {loadedImage &&
            (() => {
              const transform = getImageTransform();
              return (
                <KonvaImage
                  image={loadedImage}
                  x={transform.x}
                  y={transform.y}
                  scaleX={transform.scaleX}
                  scaleY={transform.scaleY}
                />
              );
            })()}

          {/* Render all objects */}
          {objects.map((obj) => {
            if (obj.type === "stroke") {
              return (
                <Line
                  key={obj.id}
                  id={obj.id}
                  x={obj.x}
                  y={obj.y}
                  points={obj.points}
                  stroke={obj.color}
                  strokeWidth={obj.strokeWidth}
                  hitStrokeWidth={Math.max(obj.strokeWidth, 20)}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  rotation={obj.rotation}
                  scaleX={obj.scaleX}
                  scaleY={obj.scaleY}
                  draggable={false}
                  onClick={(e) => handleObjectClick(e, obj)}
                  onTap={(e) => handleObjectClick(e, obj)}
                  onTransformEnd={(e) => handleTransformEnd(e, obj)}
                />
              );
            }

            if (obj.type === "textRegion") {
              // Frame and label are rendered as separate transformable groups
              const frameId = `${obj.id}-frame`;
              const labelId = `${obj.id}-label`;
              const isFrameSelected = selectedIds.includes(frameId);
              const isLabelSelected = selectedIds.includes(labelId);
              
              // Calculate label dimensions
              const labelText = obj.text || "Describe what it is...";
              const fontSize = 10;
              const lineHeight = fontSize * 1.4;
              const labelWidth = obj.labelWidth || obj.width;
              const charsPerLine = Math.floor((labelWidth - 24) / (fontSize * 0.55));
              const estimatedLines = obj.text ? Math.ceil(labelText.length / charsPerLine) : 1;
              const numLines = Math.max(1, estimatedLines);
              const labelHeight = numLines * lineHeight + 8;

              return (
                <Group key={obj.id}>
                  {/* Frame - independently transformable */}
                  <Group
                    id={frameId}
                    x={obj.x}
                    y={obj.y}
                    rotation={obj.rotation}
                    scaleX={obj.scaleX}
                    scaleY={obj.scaleY}
                    draggable={tool === "select" && isFrameSelected}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (tool === "eraser") {
                        onObjectsChange(objects.filter((o) => o.id !== obj.id));
                        onSelectionChange(selectedIds.filter((id) => !id.startsWith(obj.id)));
                        return;
                      }
                      if (tool === "select") {
                        const isShiftKey = "shiftKey" in e.evt && e.evt.shiftKey;
                        if (isShiftKey) {
                          if (isFrameSelected) {
                            onSelectionChange(selectedIds.filter((id) => id !== frameId));
                          } else {
                            onSelectionChange([...selectedIds, frameId]);
                          }
                        } else {
                          onSelectionChange([frameId]);
                        }
                      }
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      if (tool === "select") {
                        onSelectionChange([frameId]);
                      }
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const newWidth = Math.max(50, obj.width * node.scaleX());
                      const newHeight = Math.max(30, obj.height * node.scaleY());
                      const updatedObjects = objects.map((o) =>
                        o.id === obj.id
                          ? {
                              ...o,
                              x: node.x(),
                              y: node.y(),
                              rotation: node.rotation(),
                              width: newWidth,
                              height: newHeight,
                              scaleX: 1,
                              scaleY: 1,
                            }
                          : o
                      );
                      node.scaleX(1);
                      node.scaleY(1);
                      onObjectsChange(updatedObjects);
                    }}
                    onDragEnd={(e) => {
                      const node = e.target;
                      const updatedObjects = objects.map((o) =>
                        o.id === obj.id
                          ? { ...o, x: node.x(), y: node.y() }
                          : o
                      );
                      onObjectsChange(updatedObjects);
                    }}
                  >
                    <Rect
                      width={obj.width}
                      height={obj.height}
                      fill={TEXT_REGION_COLOR}
                      stroke={TEXT_REGION_BORDER_COLOR}
                      strokeWidth={1.4}
                      dash={[5.64, 5.64]}
                      cornerRadius={4}
                    />
                  </Group>
                  
                  {/* Label - independently transformable */}
                  <Group
                    id={labelId}
                    x={obj.x + obj.labelOffsetX}
                    y={obj.y + obj.labelOffsetY}
                    scaleX={obj.labelScaleX || 1}
                    scaleY={obj.labelScaleY || 1}
                    draggable={tool === "select" && isLabelSelected && editingTextRegionId !== obj.id && recentlyFinishedEditing !== obj.id}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      if (tool === "eraser") {
                        onObjectsChange(objects.filter((o) => o.id !== obj.id));
                        onSelectionChange(selectedIds.filter((id) => !id.startsWith(obj.id)));
                        return;
                      }
                      if (tool === "select") {
                        onSelectionChange([labelId]);
                      }
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      if (tool === "select") {
                        onSelectionChange([labelId]);
                      }
                    }}
                    onDblClick={(e) => {
                      e.cancelBubble = true;
                      if (tool === "select") {
                        setEditingTextRegionId(obj.id);
                      }
                    }}
                    onDblTap={(e) => {
                      e.cancelBubble = true;
                      if (tool === "select") {
                        setEditingTextRegionId(obj.id);
                      }
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const newLabelWidth = Math.max(50, labelWidth * node.scaleX());
                      const updatedObjects = objects.map((o) =>
                        o.id === obj.id
                          ? {
                              ...o,
                              labelOffsetX: node.x() - obj.x,
                              labelOffsetY: node.y() - obj.y,
                              labelWidth: newLabelWidth,
                              labelScaleX: 1,
                              labelScaleY: node.scaleY(),
                            }
                          : o
                      );
                      node.scaleX(1);
                      onObjectsChange(updatedObjects);
                    }}
                    onDragEnd={(e) => {
                      const node = e.target;
                      const updatedObjects = objects.map((o) =>
                        o.id === obj.id
                          ? {
                              ...o,
                              labelOffsetX: node.x() - obj.x,
                              labelOffsetY: node.y() - obj.y,
                            }
                          : o
                      );
                      onObjectsChange(updatedObjects);
                    }}
                  >
                    <Rect
                      width={labelWidth}
                      height={labelHeight}
                      fill="#FFE5E5"
                      stroke={undefined}
                      strokeWidth={0}
                      cornerRadius={0}
                    />
                    {obj.text ? (
                      <Text
                        x={12}
                        y={6}
                        width={labelWidth - 24}
                        text={obj.text}
                        fontSize={10}
                        fontFamily={obj.fontFamily}
                        fill="#000000"
                        wrap="word"
                        lineHeight={1.4}
                      />
                    ) : (
                      editingTextRegionId !== obj.id && (
                        <Text
                          x={12}
                          y={6}
                          width={labelWidth - 24}
                          text="Describe what it is..."
                          fontSize={10}
                          fontFamily={obj.fontFamily}
                          fill="rgba(0, 0, 0, 0.2)"
                          fontStyle="italic"
                        />
                      )
                    )}
                  </Group>
                </Group>
              );
            }

            return null;
          })}

          {/* Current stroke being drawn */}
          {isDrawing && currentStroke.length >= 2 && (
            <Line
              points={currentStroke}
              stroke={brushSettings.color}
              strokeWidth={brushSettings.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Text region being drawn - only when frame tool is active */}
          {textRegionRect && tool === "text" && (
            <Rect
              x={textRegionRect.x}
              y={textRegionRect.y}
              width={textRegionRect.width}
              height={textRegionRect.height}
              fill={TEXT_REGION_COLOR}
              stroke={TEXT_REGION_BORDER_COLOR}
              strokeWidth={1.4}
              dash={[5.64, 5.64]}
              cornerRadius={4}
            />
          )}

          {/* Selection rectangle */}
          {selectionRect?.visible && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill="rgba(255, 0, 0, 0.1)"
              stroke="#FF0000"
              strokeWidth={1}
              dash={[4, 4]}
            />
          )}

          {/* Transformer for selected objects */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit resize
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
            rotateEnabled={true}
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
              "middle-left",
              "middle-right",
              "top-center",
              "bottom-center",
            ]}
            borderStroke="#FF0000"
            anchorFill="#ffffff"
            anchorStroke="#FF0000"
            anchorSize={8}
            anchorCornerRadius={2}
          />
        </Layer>
      </Stage>
    );
  }
);
