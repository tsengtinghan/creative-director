import type { Node, Edge } from "@xyflow/react";
import type { EditorObject } from "../editor/types";

export type ImageNodeData = {
  imageUrl: string;
  label?: string;
  parentId?: string;
  width?: number;
  height?: number;
  editorObjects?: EditorObject[];
  isLoading?: boolean;
  onDelete?: (nodeId: string) => void;
  [key: string]: unknown;
};

export type ImageNode = Node<ImageNodeData, "image">;

export type CreativeDirectionNodeData = {
  title: string;
  brief: string;
  vibePrompt: string;
  keywords: string[];
  vibeImageUrl?: string;
  isLoading?: boolean;
  productDescription?: string;
  referenceImageUrls?: string[];
  generationPrompts?: string[];
  promptsReady?: boolean;
  isExpanded?: boolean;
  autoEditBrief?: boolean;
  iterateFeedback?: string;
  isIterating?: boolean;
  sourceNodeId?: string;
  onDelete?: (nodeId: string) => void;
  onUpdateField?: (nodeId: string, field: string, value: string | string[]) => void;
  onExpand?: (nodeId: string) => void;
  onIterate?: (nodeId: string) => void;
  onIterateSubmit?: (nodeId: string, feedback: string) => void;
  [key: string]: unknown;
};

export type CreativeDirectionNode = Node<CreativeDirectionNodeData, "creative-direction">;
export type CanvasNode = ImageNode | CreativeDirectionNode;

export type CanvasEdge = Edge;

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeIds: string[];
}
