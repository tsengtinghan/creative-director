export type Tool = "select" | "brush" | "eraser" | "text" | "prompt" | "setting";

export interface ReferenceImage {
  id: string;
  url: string;
  label: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface BaseObject {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface StrokeObject extends BaseObject {
  type: "stroke";
  points: number[]; // flat array [x1, y1, x2, y2, ...]
  color: string;
  strokeWidth: number;
}

// TextRegionObject combines text prompt with a mask region
// The region defines where the text/prompt applies in the image
export interface TextRegionObject extends BaseObject {
  type: "textRegion";
  text: string;
  width: number; // region width
  height: number; // region height
  fontSize: number;
  fontFamily: string;
  // Label position and size (independent of frame)
  labelOffsetX: number;
  labelOffsetY: number;
  labelWidth: number;
  labelScaleX: number;
  labelScaleY: number;
}

export type EditorObject = StrokeObject | TextRegionObject;

export interface BrushSettings {
  color: string;
  strokeWidth: number;
}

export interface EditorState {
  tool: Tool;
  objects: EditorObject[];
  selectedIds: string[];
  brushSettings: BrushSettings;
  baseImage: string | null; // data URL or null for blank canvas
}

export const DEFAULT_BRUSH_SETTINGS: BrushSettings = {
  color: "#ffffff",
  strokeWidth: 4,
};

// Text region overlay color - soft pink/peach with transparency
export const TEXT_REGION_COLOR = "rgba(255, 0, 0, 0.10)"; // 10% red fill as per reference
export const TEXT_REGION_BORDER_COLOR = "#FF0000"; // Pure red stroke

export const TOOL_ICONS: Record<Tool, string> = {
  select: "cursor",
  brush: "brush",
  eraser: "eraser",
  text: "text",
  prompt: "prompt",
  setting: "setting",
};
