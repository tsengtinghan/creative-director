"use client";

import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type NodeTypes,
  type ReactFlowInstance,
  BackgroundVariant,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserButton, useAuth } from "@clerk/nextjs";
import { ImageNode } from "./ImageNode";
import { CreativeDirectionNode } from "./CreativeDirectionNode";
import { UploadButton } from "./UploadButton";
import { InspirationSidebar } from "./InspirationSidebar";
import { InspirationPickerModal } from "./InspirationPickerModal";

import { Editor } from "../editor";
import { AgentOverlay } from "../agent/AgentOverlay";
import type { ImageNode as ImageNodeType, CanvasNode, CanvasEdge, StructuredProductAnalysis } from "./types";
import type { Inspiration } from "./InspirationSidebar";
import type { EditorObject } from "../editor/types";

const nodeTypes: NodeTypes = {
  image: ImageNode,
  "creative-direction": CreativeDirectionNode,
};

// Estimated node dimensions by type
const NODE_SIZES: Record<string, { w: number; h: number }> = {
  image: { w: 210, h: 230 },
  "creative-direction": { w: 360, h: 480 },
};

/** Return a position near `desired` that doesn't overlap any existing node. */
function findNonOverlappingPosition(
  desired: { x: number; y: number },
  nodeType: string,
  existingNodes: CanvasNode[],
  padding = 20,
): { x: number; y: number } {
  const size = NODE_SIZES[nodeType] ?? { w: 200, h: 200 };

  const overlaps = (pos: { x: number; y: number }) =>
    existingNodes.some((n) => {
      const ns = NODE_SIZES[n.type ?? "image"] ?? { w: 200, h: 200 };
      return (
        pos.x < n.position.x + ns.w + padding &&
        pos.x + size.w + padding > n.position.x &&
        pos.y < n.position.y + ns.h + padding &&
        pos.y + size.h + padding > n.position.y
      );
    });

  if (!overlaps(desired)) return desired;

  // Try shifting right, then down-right, in increasing offsets
  for (let attempt = 1; attempt <= 20; attempt++) {
    const offsetX = attempt * (size.w + padding);
    // Try right
    const right = { x: desired.x + offsetX, y: desired.y };
    if (!overlaps(right)) return right;
    // Try left
    const left = { x: desired.x - offsetX, y: desired.y };
    if (!overlaps(left)) return left;
    // Try below
    const below = { x: desired.x, y: desired.y + attempt * (size.h + padding) };
    if (!overlaps(below)) return below;
  }

  // Fallback: just offset diagonally
  return { x: desired.x + 60, y: desired.y + 60 };
}

export function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<CanvasEdge>([]);
  const [nodeCounter, setNodeCounter] = useState(0);
  const [projectName, setProjectName] = useState("Title");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAgentOpen, setIsAgentOpen] = useState(true);
  const isInitialized = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reactFlowInstanceRef = useRef<ReactFlowInstance<any, CanvasEdge> | null>(null);
  
  // Store user on first access (wait until Clerk auth is ready)
  const { isSignedIn } = useAuth();
  const storeUser = useMutation(api.users.store);
  const storeUserCalled = useRef(false);
  useEffect(() => {
    if (!isSignedIn || storeUserCalled.current) return;
    storeUserCalled.current = true;
    storeUser().catch(console.error);
  }, [isSignedIn, storeUser]);

  // Convex queries and mutations
  const savedState = useQuery(api.canvas.get);
  const saveState = useMutation(api.canvas.save);
  const clearState = useMutation(api.canvas.clear);
  const analyzeProduct = useAction(api.agent.analyzeProduct);
  const generateThumbnail = useAction(api.generate.generateThumbnail);
  const buildDirectionPrompts = useAction(api.agent.buildDirectionPrompts);
  const generateImage = useAction(api.generate.generateImage);
  const iterateDirectionAction = useAction(api.agent.iterateDirection);
  const adaptInspirationPrompt = useAction(api.agent.adaptInspirationPrompt);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inspiration picker modal state
  const [inspirationPickerOpen, setInspirationPickerOpen] = useState(false);
  const [pendingProductData, setPendingProductData] = useState<{
    imageUrls: string[];
    productAnalysis: StructuredProductAnalysis;
  } | null>(null);

  // Undo/Redo history
  const [history, setHistory] = useState<Array<{ nodes: CanvasNode[]; edges: CanvasEdge[]; nodeCounter: number; projectName: string }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySize = 50;
  const isUndoingRef = useRef(false);

  // Load state from Convex on mount
  useEffect(() => {
    // savedState is undefined while loading, null if no document exists
    if (savedState === undefined) return;
    if (isInitialized.current) return;

    if (savedState) {
      setNodes(savedState.nodes as CanvasNode[]);
      setEdges(savedState.edges as CanvasEdge[]);
      setNodeCounter(savedState.nodeCounter);
      setProjectName(savedState.projectName);
      setHistory([{
        nodes: JSON.parse(JSON.stringify(savedState.nodes)),
        edges: JSON.parse(JSON.stringify(savedState.edges)),
        nodeCounter: savedState.nodeCounter,
        projectName: savedState.projectName,
      }]);
      setHistoryIndex(0);
    } else {
      setHistory([{
        nodes: [],
        edges: [],
        nodeCounter: 0,
        projectName: "Title",
      }]);
      setHistoryIndex(0);
    }
    setIsLoading(false);
    isInitialized.current = true;
  }, [savedState, setNodes, setEdges]);

  // Auto-save to Convex when state changes (debounced)
  useEffect(() => {
    if (!isInitialized.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveState({
        nodes: nodes as unknown[],
        edges: edges as unknown[],
        nodeCounter,
        projectName,
      });
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, nodeCounter, projectName, saveState]);

  // Save state to history before making changes
  const saveToHistory = useCallback((currentNodes: CanvasNode[], currentEdges: CanvasEdge[], currentCounter: number, currentProjectName: string) => {
    if (isUndoingRef.current) {
      isUndoingRef.current = false;
      return;
    }
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({
        nodes: JSON.parse(JSON.stringify(currentNodes)),
        edges: JSON.parse(JSON.stringify(currentEdges)),
        nodeCounter: currentCounter,
        projectName: currentProjectName,
      });
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        setHistoryIndex((prev) => prev - 1);
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, maxHistorySize - 1));
  }, [historyIndex]);

  // Undo/Redo function
  const handleUndoRedo = useCallback((e: KeyboardEvent) => {
    // Check if user is typing in an input/textarea
    const activeElement = document.activeElement;
    const isTyping =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement?.getAttribute("contenteditable") === "true";

    if (isTyping) return;

    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (historyIndex > 0) {
        isUndoingRef.current = true;
        const prevState = history[historyIndex - 1];
        setNodes(prevState.nodes);
        setEdges(prevState.edges);
        setNodeCounter(prevState.nodeCounter);
        setProjectName(prevState.projectName);
        setHistoryIndex((prev) => prev - 1);
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        isUndoingRef.current = true;
        const nextState = history[historyIndex + 1];
        setNodes(nextState.nodes);
        setEdges(nextState.edges);
        setNodeCounter(nextState.nodeCounter);
        setProjectName(nextState.projectName);
        setHistoryIndex((prev) => prev + 1);
      }
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Set up keyboard listeners for undo/redo
  useEffect(() => {
    window.addEventListener('keydown', handleUndoRedo);
    return () => {
      window.removeEventListener('keydown', handleUndoRedo);
    };
  }, [handleUndoRedo]);

  // Save to history when state changes (debounced)
  useEffect(() => {
    if (!isInitialized.current) return;
    const timeoutId = setTimeout(() => {
      saveToHistory(nodes, edges, nodeCounter, projectName);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, nodeCounter, projectName, saveToHistory]);

  // Sync selectedNodeId with ReactFlow nodes
  const handleNodeSelect = useCallback(
    (nodeId: string | null) => {
      setSelectedNodeId(nodeId);
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: node.id === nodeId,
        }))
      );
    },
    [setNodes]
  );

  // Sync selectedNodeId from ReactFlow nodes when they change
  useEffect(() => {
    const selectedNode = nodes.find((n) => n.selected);
    if (selectedNode && selectedNode.id !== selectedNodeId) {
      setSelectedNodeId(selectedNode.id);
    } else if (!selectedNode && selectedNodeId !== null) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingImageDimensions, setEditingImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [editingInitialObjects, setEditingInitialObjects] = useState<
    EditorObject[] | undefined
  >(undefined);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const handleImageUpload = useCallback(
    (imageUrl: string) => {
      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        const desired = { x: 100 + nodeCounter * 50, y: 100 + nodeCounter * 50 };
        const position = findNonOverlappingPosition(desired, "image", nodes);
        const newNode: ImageNodeType = {
          id: `image-${nodeCounter}`,
          type: "image",
          position,
          data: {
            imageUrl,
            label: `Image ${nodeCounter + 1}`,
            width: img.naturalWidth,
            height: img.naturalHeight,
          },
        };
        setNodes((nds) => [...nds, newNode]);
        setNodeCounter((c) => c + 1);
      };
      img.src = imageUrl;
    },
    [nodeCounter, setNodes, nodes]
  );

  const handleCreateBlank = useCallback(() => {
    setEditingImage(null);
    setEditingNodeId(null);
    setIsEditorOpen(true);
  }, []);

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: CanvasNode) => {
      if (node.type !== "image") return;
      const imageData = node.data as ImageNodeType["data"];
      setEditingImage(imageData.imageUrl);
      setEditingNodeId(node.id);
      setEditingImageDimensions(
        imageData.width && imageData.height
          ? { width: imageData.width, height: imageData.height }
          : null
      );
      setEditingInitialObjects(imageData.editorObjects);
      setIsEditorOpen(true);
    },
    []
  );

  const handleEditorClose = useCallback(() => {
    setIsEditorOpen(false);
    setEditingImage(null);
    setEditingNodeId(null);
    setEditingImageDimensions(null);
    setEditingInitialObjects(undefined);
  }, []);

  // Handle editor save - save composite image and objects to node
  const handleEditorSave = useCallback(
    (objects: EditorObject[], compositeImage: string) => {
      // Load composite image to get dimensions
      const img = new Image();
      img.onload = () => {
        if (editingNodeId) {
          // Update existing node - preserve original imageUrl, only update editorObjects
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === editingNodeId && node.type === "image") {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    editorObjects: objects,
                    width: (node.data as ImageNodeType["data"]).width || img.naturalWidth,
                    height: (node.data as ImageNodeType["data"]).height || img.naturalHeight,
                  },
                } as ImageNodeType;
              }
              return node;
            })
          );
        } else {
          // Create new node for blank sketch - use composite image for new sketches
          const newNodeId = `image-${nodeCounter}`;
          const desired = { x: 100 + nodeCounter * 50, y: 100 + nodeCounter * 50 };
          const position = findNonOverlappingPosition(desired, "image", nodes);
          const newNode: ImageNodeType = {
            id: newNodeId,
            type: "image",
            position,
            data: {
              imageUrl: compositeImage,
              label: `Sketch ${nodeCounter + 1}`,
              editorObjects: objects,
              width: img.naturalWidth,
              height: img.naturalHeight,
            },
          };
          setNodes((nds) => [...nds, newNode]);
          setNodeCounter((c) => c + 1);
        }
      };
      img.src = compositeImage;
    },
    [editingNodeId, setNodes, nodeCounter, nodes]
  );

  // Handle editor objects change - save back to node
  const handleEditorObjectsChange = useCallback(
    (objects: EditorObject[]) => {
      if (!editingNodeId) return;

      // Capture editingImage to preserve it
      const currentEditingImage = editingImage;

      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === editingNodeId && node.type === "image") {
            const imageData = node.data as ImageNodeType["data"];
            const imageUrlToPreserve = imageData.imageUrl || currentEditingImage || "";
            return {
              ...node,
              data: {
                ...imageData,
                editorObjects: objects,
                imageUrl: imageUrlToPreserve,
              },
            } as ImageNodeType;
          }
          return node;
        })
      );
    },
    [editingNodeId, setNodes, editingImage]
  );

  // Handle clearing the canvas - reset all state and clear Convex
  const handleClearCanvas = useCallback(async () => {
    await clearState();
    setNodes([]);
    setEdges([]);
    setNodeCounter(0);
    setProjectName("Title");
    setSelectedNodeId(null);
  }, [setNodes, setEdges, clearState]);

  // Handle deleting a single node
  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    // Also remove any edges connected to this node
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    // Clear selection if the deleted node was selected
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  }, [setNodes, setEdges, selectedNodeId]);

  // Handle updating a field on a creative-direction node
  const handleUpdateNodeField = useCallback((nodeId: string, field: string, value: string | string[]) => {
    setNodes(nds => nds.map(node => {
      if (node.id === nodeId && node.type === "creative-direction") {
        return { ...node, data: { ...node.data, [field]: value } };
      }
      return node;
    }));
  }, [setNodes]);

  // Handle iterating a creative direction — create a copy to the right with iterate input
  const handleIterateDirection = useCallback((nodeId: string) => {
    const sourceNode = nodes.find(n => n.id === nodeId);
    if (!sourceNode || sourceNode.type !== "creative-direction") return;
    const srcData = sourceNode.data as import("./types").CreativeDirectionNodeData;

    const newId = `direction-${nodeCounter}`;
    const desiredPos = { x: sourceNode.position.x + 400, y: sourceNode.position.y };
    const position = findNonOverlappingPosition(desiredPos, "creative-direction", nodes);
    const newNode: CanvasNode = {
      id: newId,
      type: "creative-direction" as const,
      position,
      data: {
        title: srcData.title,
        brief: srcData.brief,
        vibePrompt: srcData.vibePrompt,
        vibeImageUrl: srcData.vibeImageUrl,
        productDescription: srcData.productDescription,
        referenceImageUrls: srcData.referenceImageUrls ? [...srcData.referenceImageUrls] : undefined,
        generationPrompts: undefined,
        promptsReady: false,
        isExpanded: false,
        isLoading: false,
        isIterating: true,
        sourceNodeId: nodeId,
      },
    };

    // Add edge from source to new node
    const newEdge: CanvasEdge = {
      id: `edge-iterate-${nodeId}-${newId}`,
      source: nodeId,
      target: newId,
      type: "bezier",
      style: { stroke: "#d1d5db", strokeWidth: 1.5, strokeDasharray: "4 4" },
    };

    setNodes(nds => [...nds, newNode]);
    setEdges(eds => [...eds, newEdge]);
    setNodeCounter(c => c + 1);
  }, [nodes, nodeCounter, setNodes, setEdges]);

  // Handle iterate submit — regenerate the direction with user feedback
  const handleIterateSubmit = useCallback(async (nodeId: string, feedback: string) => {
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode || targetNode.type !== "creative-direction") return;
    const nodeData = targetNode.data as import("./types").CreativeDirectionNodeData;

    // Set loading state, hide iterate input
    setNodes(nds => nds.map(node => {
      if (node.id !== nodeId) return node;
      return {
        ...node,
        data: {
          ...node.data,
          isIterating: false,
          isLoading: true,
          title: "Iterating...",
          brief: feedback,
          vibeImageUrl: undefined,
        },
      } as CanvasNode;
    }));

    try {
      // Call the iterate action to get new direction data
      const result = await iterateDirectionAction({
        title: nodeData.title,
        brief: nodeData.brief,
        vibePrompt: nodeData.vibePrompt,
        productDescription: nodeData.productDescription || "",
        referenceImageUrls: nodeData.referenceImageUrls || [],
        feedback,
      });

      // Update the node with the new direction
      setNodes(nds => nds.map(node => {
        if (node.id !== nodeId) return node;
        return {
          ...node,
          data: {
            ...node.data,
            title: result.title,
            brief: result.brief,
            vibePrompt: result.vibePrompt,
            isLoading: true,
            productDescription: nodeData.productDescription,
            referenceImageUrls: nodeData.referenceImageUrls,
          },
        } as CanvasNode;
      }));

      // Generate thumbnail
      generateThumbnail({
        vibePrompt: result.vibePrompt,
        referenceImageUrls: nodeData.referenceImageUrls || [],
      })
        .then(({ url }) => {
          setNodes(nds => nds.map(node => {
            if (node.id !== nodeId) return node;
            return {
              ...node,
              data: { ...node.data, vibeImageUrl: url, isLoading: false },
            } as CanvasNode;
          }));
        })
        .catch(() => {
          setNodes(nds => nds.map(node => {
            if (node.id !== nodeId) return node;
            return {
              ...node,
              data: { ...node.data, isLoading: false },
            } as CanvasNode;
          }));
        });

      // Build prompts
      buildDirectionPrompts({
        title: result.title,
        brief: result.brief,
        vibePrompt: result.vibePrompt,
        productDescription: nodeData.productDescription || "",
        referenceImageUrls: nodeData.referenceImageUrls || [],
      })
        .then(({ prompts }) => {
          setNodes(nds => nds.map(node => {
            if (node.id !== nodeId) return node;
            return {
              ...node,
              data: { ...node.data, generationPrompts: prompts, promptsReady: true },
            } as CanvasNode;
          }));
        })
        .catch((err) => {
          console.error(`Prompt building failed for iterated direction:`, err);
        });
    } catch (err) {
      console.error("Iterate direction failed:", err);
      // Revert to original data on failure
      setNodes(nds => nds.map(node => {
        if (node.id !== nodeId) return node;
        return {
          ...node,
          data: {
            ...node.data,
            title: nodeData.title,
            brief: nodeData.brief,
            vibePrompt: nodeData.vibePrompt,
            vibeImageUrl: nodeData.vibeImageUrl,
            isLoading: false,
            isIterating: true,
          },
        } as CanvasNode;
      }));
    }
  }, [nodes, setNodes, iterateDirectionAction, generateThumbnail, buildDirectionPrompts]);

  // Handle expanding a creative direction into 4 generated images
  const handleExpandDirection = useCallback(async (nodeId: string) => {
    // Find the direction node
    const directionNode = nodes.find(n => n.id === nodeId);
    if (!directionNode || directionNode.type !== "creative-direction") return;
    const dirData = directionNode.data as import("./types").CreativeDirectionNodeData;

    // Mark as expanded immediately
    setNodes(nds => nds.map(node => {
      if (node.id !== nodeId) return node;
      return { ...node, data: { ...node.data, isExpanded: true } } as CanvasNode;
    }));

    // Build prompts — use pre-built, or build them now (iterated node), or fallback
    let prompts: string[];
    if (dirData.generationPrompts && dirData.generationPrompts.length === 4) {
      prompts = dirData.generationPrompts;
    } else if (dirData.brief && dirData.vibePrompt) {
      // Iterated node: build prompts on the fly
      try {
        const result = await buildDirectionPrompts({
          title: dirData.title,
          brief: dirData.brief,
          vibePrompt: dirData.vibePrompt,
          productDescription: dirData.productDescription || "",
          referenceImageUrls: dirData.referenceImageUrls || [],
        });
        prompts = result.prompts;
        // Store prompts on the node
        setNodes(nds => nds.map(node => {
          if (node.id !== nodeId) return node;
          return { ...node, data: { ...node.data, generationPrompts: prompts, promptsReady: true } } as CanvasNode;
        }));
      } catch (err) {
        console.error("Prompt building failed during expand, using fallback:", err);
        prompts = [
          `Product photography: ${dirData.vibePrompt}. ${dirData.productDescription || ""} Shot from a front angle with studio lighting.`,
          `Product photography: ${dirData.vibePrompt}. ${dirData.productDescription || ""} Top-down flat lay composition.`,
          `Product photography: ${dirData.vibePrompt}. ${dirData.productDescription || ""} Close-up detail shot with shallow depth of field.`,
          `Product photography: ${dirData.vibePrompt}. ${dirData.productDescription || ""} Environmental lifestyle shot.`,
        ];
      }
    } else {
      prompts = [
        `Product photography: ${dirData.vibePrompt}. ${dirData.productDescription || ""} Shot from a front angle with studio lighting.`,
        `Product photography: ${dirData.vibePrompt}. ${dirData.productDescription || ""} Top-down flat lay composition.`,
        `Product photography: ${dirData.vibePrompt}. ${dirData.productDescription || ""} Close-up detail shot with shallow depth of field.`,
        `Product photography: ${dirData.vibePrompt}. ${dirData.productDescription || ""} Environmental lifestyle shot.`,
      ];
    }

    // Create 4 placeholder image nodes in a 2×2 grid below the direction node
    const nodeWidth = 340; // matches the direction node width
    const cellW = 220;
    const cellH = 220;
    const gridWidth = 2 * cellW;
    const desiredBaseX = directionNode.position.x + (nodeWidth - gridWidth) / 2;
    const desiredBaseY = directionNode.position.y + 500; // below the direction node
    // Check if the grid base overlaps; shift it if so
    const gridBase = findNonOverlappingPosition(
      { x: desiredBaseX, y: desiredBaseY },
      "image",
      nodes,
    );
    const baseX = gridBase.x;
    const baseY = gridBase.y;
    const currentCounter = nodeCounter;

    const placeholderNodes: CanvasNode[] = [];
    const newEdges: CanvasEdge[] = [];

    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const imgNodeId = `image-${currentCounter + i}`;

      placeholderNodes.push({
        id: imgNodeId,
        type: "image" as const,
        position: { x: baseX + col * cellW, y: baseY + row * cellH },
        data: {
          imageUrl: "",
          label: `${dirData.title} #${i + 1}`,
          parentId: nodeId,
          isLoading: true,
        },
      });

      newEdges.push({
        id: `edge-${nodeId}-${imgNodeId}`,
        source: nodeId,
        target: imgNodeId,
        type: "bezier",
        animated: true,
        style: { stroke: "#ffb4b0", strokeWidth: 2, strokeDasharray: "6 4" },
      });
    }

    setNodes(nds => [...nds, ...placeholderNodes]);
    setEdges(eds => [...eds, ...newEdges]);
    setNodeCounter(c => c + 4);

    // Build reference images for generateImage (product photos + thumbnail as style ref)
    const refImages = (dirData.referenceImageUrls || []).map(url => ({
      url,
      label: "product reference",
    }));
    if (dirData.vibeImageUrl) {
      refImages.push({ url: dirData.vibeImageUrl, label: "style reference" });
    }

    // Fire 4 generateImage calls in parallel
    prompts.forEach((prompt, i) => {
      const imgNodeId = `image-${currentCounter + i}`;
      generateImage({ prompt, referenceImages: refImages })
        .then(({ url }) => {
          // Update placeholder with real image
          setNodes(nds => nds.map(node => {
            if (node.id !== imgNodeId) return node;
            return {
              ...node,
              data: { ...node.data, imageUrl: url, isLoading: false },
            } as CanvasNode;
          }));
          // Stop edge animation
          setEdges(eds => eds.map(edge => {
            if (edge.id !== `edge-${nodeId}-${imgNodeId}`) return edge;
            return { ...edge, animated: false };
          }));
        })
        .catch((err) => {
          console.error(`Image generation failed for ${imgNodeId}:`, err);
          // Remove the failed placeholder
          setNodes(nds => nds.filter(node => node.id !== imgNodeId));
          setEdges(eds => eds.filter(edge => edge.target !== imgNodeId));
        });
    });
  }, [nodes, nodeCounter, setNodes, setEdges, generateImage, buildDirectionPrompts]);

  // Handle agent submission — non-blocking flow
  const handleAgentSubmit = useCallback((imageUrls: string[], brief: string, productAnalysis: import("./types").StructuredProductAnalysis, boldMode: boolean) => {
    setIsAgentOpen(false);

    const viewport = reactFlowInstanceRef.current?.getViewport();
    const centerX = viewport ? (-viewport.x + window.innerWidth / 2) / (viewport.zoom || 1) : 400;
    const centerY = viewport ? (-viewport.y + window.innerHeight / 2) / (viewport.zoom || 1) : 300;
    const count = 5;
    const totalWidth = (count - 1) * 400;
    const startX = centerX - totalWidth / 2;

    // Create placeholder loading nodes
    const placeholderIds = Array.from({ length: count }, (_, i) => `direction-${nodeCounter + i}`);
    const placeholderNodes: CanvasNode[] = placeholderIds.map((id, i) => ({
      id,
      type: "creative-direction" as const,
      position: { x: startX + i * 400, y: centerY },
      data: {
        title: "Loading...",
        brief: "Analyzing your product...",
        vibePrompt: "",
        isLoading: true,
      },
    }));

    setNodes(nds => [...nds, ...placeholderNodes]);
    setNodeCounter(c => c + count);
    setTimeout(() => reactFlowInstanceRef.current?.fitView({ duration: 500, padding: 0.2 }), 100);

    // Fire analysis (non-blocking)
    analyzeProduct({ imageUrls, brief: brief || undefined, visualDescription: productAnalysis.visualDescription, boldMode: boldMode || undefined })
      .then((result) => {
        // Update nodes with real data + productDescription/referenceImageUrls
        setNodes(nds => nds.map(node => {
          const idx = placeholderIds.indexOf(node.id);
          if (idx === -1) return node;
          const dir = result.directions[idx];
          if (!dir) return node;
          return {
            ...node,
            data: {
              ...node.data,
              title: dir.title,
              brief: dir.brief,
              vibePrompt: dir.vibePrompt,
              isLoading: true,
              productDescription: productAnalysis.visualDescription,
              referenceImageUrls: imageUrls,
            },
          } as CanvasNode;
        }));

        // Fire thumbnail generation in parallel for each direction
        result.directions.forEach((dir, idx) => {
          generateThumbnail({ vibePrompt: dir.vibePrompt, referenceImageUrls: imageUrls })
            .then(({ url }) => {
              setNodes(nds => nds.map(node => {
                if (node.id !== placeholderIds[idx]) return node;
                return {
                  ...node,
                  data: { ...node.data, vibeImageUrl: url, isLoading: false },
                } as CanvasNode;
              }));
            })
            .catch(() => {
              // On thumbnail failure, just clear loading state
              setNodes(nds => nds.map(node => {
                if (node.id !== placeholderIds[idx]) return node;
                return {
                  ...node,
                  data: { ...node.data, isLoading: false },
                } as CanvasNode;
              }));
            });
        });

        // Fire prompt building in parallel for each direction
        result.directions.forEach((dir, idx) => {
          buildDirectionPrompts({
            title: dir.title,
            brief: dir.brief,
            vibePrompt: dir.vibePrompt,
            productDescription: productAnalysis.visualDescription,
            referenceImageUrls: imageUrls,
          })
            .then(({ prompts }) => {
              setNodes(nds => nds.map(node => {
                if (node.id !== placeholderIds[idx]) return node;
                return {
                  ...node,
                  data: { ...node.data, generationPrompts: prompts, promptsReady: true },
                } as CanvasNode;
              }));
            })
            .catch((err) => {
              console.error(`Prompt building failed for direction ${idx}:`, err);
              // Don't block UI — expand will use fallback prompts
            });
        });
      })
      .catch((err) => {
        console.error("Analysis failed:", err);
        // Remove all placeholder nodes on failure
        setNodes(nds => nds.filter(node => !placeholderIds.includes(node.id)));
      });
  }, [nodeCounter, setNodes, analyzeProduct, generateThumbnail, buildDirectionPrompts]);

  // Handle "Start from Inspiration" — store product data and open picker modal
  const handleInspirationMode = useCallback((imageUrls: string[], productAnalysis: StructuredProductAnalysis) => {
    setIsAgentOpen(false);
    setPendingProductData({ imageUrls, productAnalysis });
    setInspirationPickerOpen(true);
  }, []);

  // Handle batch picking inspirations from the modal
  const handleInspirationBatchPick = useCallback((selections: Array<{ inspiration: Inspiration; note: string }>) => {
    if (!pendingProductData || selections.length === 0) return;

    const { imageUrls, productAnalysis } = pendingProductData;

    // Close modal
    setInspirationPickerOpen(false);
    setPendingProductData(null);

    // Position nodes spread horizontally
    const viewport = reactFlowInstanceRef.current?.getViewport();
    const centerX = viewport ? (-viewport.x + window.innerWidth / 2) / (viewport.zoom || 1) : 400;
    const centerY = viewport ? (-viewport.y + window.innerHeight / 2) / (viewport.zoom || 1) : 300;
    const count = selections.length;
    const totalWidth = (count - 1) * 400;
    const startX = centerX - totalWidth / 2;
    const currentCounter = nodeCounter;

    // Create loading placeholder nodes
    const placeholderNodes: CanvasNode[] = selections.map((sel, i) => ({
      id: `direction-${currentCounter + i}`,
      type: "creative-direction" as const,
      position: { x: startX + i * 400, y: centerY },
      data: {
        title: "Adapting...",
        brief: "Adapting inspiration to your product...",
        vibePrompt: "",
        isLoading: true,
        inspirationId: sel.inspiration.id,
        referenceImageUrls: imageUrls,
      },
    }));

    setNodes(nds => [...nds, ...placeholderNodes]);
    setNodeCounter(c => c + count);
    setTimeout(() => reactFlowInstanceRef.current?.fitView({ duration: 500, padding: 0.2 }), 100);

    // Fire adaptInspirationPrompt for each selection in parallel
    selections.forEach((sel, i) => {
      const nodeId = `direction-${currentCounter + i}`;

      adaptInspirationPrompt({
        templatePrompt: sel.inspiration.prompt,
        userNote: sel.note || undefined,
        productAnalysis,
        imageUrls,
      })
        .then((result) => {
          // Update node with adapted data
          setNodes(nds => nds.map(node => {
            if (node.id !== nodeId) return node;
            return {
              ...node,
              data: {
                ...node.data,
                title: result.title,
                brief: result.brief,
                vibePrompt: result.vibePrompt,
                isLoading: false,
                vibeImageUrl: sel.inspiration.image,
                productDescription: productAnalysis.visualDescription,
                referenceImageUrls: imageUrls,
              },
            } as CanvasNode;
          }));

          // Build direction prompts
          buildDirectionPrompts({
            title: result.title,
            brief: result.brief,
            vibePrompt: result.vibePrompt,
            productDescription: productAnalysis.visualDescription,
            referenceImageUrls: imageUrls,
          })
            .then(({ prompts }) => {
              setNodes(nds => nds.map(node => {
                if (node.id !== nodeId) return node;
                return {
                  ...node,
                  data: { ...node.data, generationPrompts: prompts, promptsReady: true },
                } as CanvasNode;
              }));
            })
            .catch((err) => {
              console.error(`Prompt building failed for adapted direction ${i}:`, err);
            });
        })
        .catch((err) => {
          console.error(`Adaptation failed for selection ${i}:`, err);
          setNodes(nds => nds.filter(node => node.id !== nodeId));
        });
    });
  }, [pendingProductData, nodeCounter, setNodes, adaptInspirationPrompt, buildDirectionPrompts]);

  // Inject onDelete callback into each node's data for rendering
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => {
      if (node.type === "creative-direction") {
        return {
          ...node,
          data: {
            ...node.data,
            onDelete: handleDeleteNode,
            onUpdateField: handleUpdateNodeField,
            onExpand: handleExpandDirection,
            onIterate: handleIterateDirection,
            onIterateSubmit: handleIterateSubmit,
          },
        } as CanvasNode;
      }
      return {
        ...node,
        data: { ...node.data, onDelete: handleDeleteNode },
      } as CanvasNode;
    });
  }, [nodes, handleDeleteNode, handleUpdateNodeField, handleExpandDirection, handleIterateDirection, handleIterateSubmit]);

  // Handle generated image from Nano Banana Pro API
  const handleImageGenerated = useCallback(
    (
      generatedImageUrl: string,
      parentNodeId: string | null,
      inputCompositeImage: string | null
    ) => {
      // If there's no parent node but we have an input composite, create an input node first
      // This preserves the user's sketch/annotations as a node on the canvas
      if (!parentNodeId && inputCompositeImage) {
        // Load input composite image to get dimensions
        const inputImg = new Image();
        inputImg.onload = () => {
          const inputNodeId = `image-${nodeCounter}`;
          const inputPosition = findNonOverlappingPosition(
            { x: 100 + nodeCounter * 50, y: 100 + nodeCounter * 50 },
            "image",
            nodes,
          );

          // Create node for the input composite (user's sketch/annotations)
          const inputNode: ImageNodeType = {
            id: inputNodeId,
            type: "image",
            position: inputPosition,
            data: {
              imageUrl: inputCompositeImage,
              label: `Input ${nodeCounter + 1}`,
              width: inputImg.naturalWidth,
              height: inputImg.naturalHeight,
            },
          };

          // Now load the generated image
          const generatedImg = new Image();
          generatedImg.onload = () => {
            const generatedNodeId = `image-${nodeCounter + 1}`;
            const generatedPosition = findNonOverlappingPosition(
              { x: inputPosition.x + 300, y: inputPosition.y + 50 },
              "image",
              [...nodes, inputNode],
            );

            // Create node for the generated image
            const generatedNode: ImageNodeType = {
              id: generatedNodeId,
              type: "image",
              position: generatedPosition,
              data: {
                imageUrl: generatedImageUrl,
                label: `Generated ${nodeCounter + 2}`,
                parentId: inputNodeId,
                width: generatedImg.naturalWidth,
                height: generatedImg.naturalHeight,
              },
            };

            // Create edge from input to generated
            const newEdge: CanvasEdge = {
              id: `edge-${inputNodeId}-${generatedNodeId}`,
              source: inputNodeId,
              target: generatedNodeId,
              type: "bezier",
              animated: false,
              style: { stroke: "#ffb4b0", strokeWidth: 2, strokeDasharray: "6 4" },
            };

            // Add both nodes and the edge
            setNodes((nds) => [...nds, inputNode, generatedNode]);
            setEdges((eds) => [...eds, newEdge]);
            setNodeCounter((c) => c + 2);
          };
          generatedImg.src = generatedImageUrl;
        };
        inputImg.src = inputCompositeImage;
      } else {
        // Original flow: parent node exists, just add the generated image
        const img = new Image();
        img.onload = () => {
          // Find parent node to position the new node nearby
          const parentNode = parentNodeId
            ? nodes.find((n) => n.id === parentNodeId)
            : null;

          // Position new node to the right and slightly below the parent
          const desired = parentNode
            ? {
                x: parentNode.position.x + 300,
                y: parentNode.position.y + 50,
              }
            : {
                x: 100 + nodeCounter * 50,
                y: 100 + nodeCounter * 50,
              };
          const position = findNonOverlappingPosition(desired, "image", nodes);

          const newNodeId = `image-${nodeCounter}`;

          // Create new node for the generated image
          const newNode: ImageNodeType = {
            id: newNodeId,
            type: "image",
            position,
            data: {
              imageUrl: generatedImageUrl,
              label: `Generated ${nodeCounter + 1}`,
              parentId: parentNodeId || undefined,
              width: img.naturalWidth,
              height: img.naturalHeight,
            },
          };

          setNodes((nds) => [...nds, newNode]);
          setNodeCounter((c) => c + 1);

          // Create edge from parent to new node if there's a parent
          if (parentNodeId) {
            const newEdge: CanvasEdge = {
              id: `edge-${parentNodeId}-${newNodeId}`,
              source: parentNodeId,
              target: newNodeId,
              type: "bezier",
              animated: false,
              style: { stroke: "#ffb4b0", strokeWidth: 2, strokeDasharray: "6 4" },
            };
            setEdges((eds) => [...eds, newEdge]);
          }
        };
        img.src = generatedImageUrl;
      }
    },
    [nodes, nodeCounter, setNodes, setEdges]
  );

  return (
    <div className="w-screen h-screen bg-white relative">
      {/* Logo */}
      <div className="fixed left-6 top-6 z-30">
        <div className="w-8 h-8">
          <img
            src="/logo.svg"
            alt="Logo"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Inspiration sidebar (browse-only) */}
      <InspirationSidebar />

      {/* User menu */}
      <div className="fixed right-6 top-6 z-30">
        <UserButton afterSignOutUrl="/" />
      </div>

      {/* Main Canvas Area */}
      <div className="w-full h-full relative bg-white overflow-hidden">
        {nodes.length === 0 && !isAgentOpen ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p
              style={{
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                fontSize: "20px",
                fontWeight: "400",
                color: "rgba(0, 0, 0, 0.2)",
                textAlign: "center",
              }}
            >
              Drop an image
              <br />
              or start a new sketch
            </p>
          </div>
        ) : null}

        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance;
          }}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeClick={(_event, node) => {
            handleNodeSelect(node.id);
          }}
          nodeTypes={nodeTypes}
          selectionMode={SelectionMode.Partial}
          selectionOnDrag
          panOnScroll
          zoomOnScroll
          fitView
          // Disable node deletion via keyboard while editor is open so Delete only affects editor frames
          deleteKeyCode={isEditorOpen ? null : ["Backspace", "Delete"]}
          defaultEdgeOptions={{
            type: "bezier",
            style: { stroke: "#525252", strokeWidth: 2, strokeDasharray: "6 4" },
            animated: false,
          }}
          proOptions={{ hideAttribution: true }}
          className="canvas-flow-white"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#e5e5e5"
          />
          <Controls
            className="!bg-white !border-gray-200 !rounded-lg !shadow-lg [&>button]:!bg-white [&>button]:!border-gray-200 [&>button]:!text-gray-600 [&>button:hover]:!bg-gray-50"
            showInteractive={false}
          />
        </ReactFlow>

        <UploadButton
          onImageUpload={handleImageUpload}
          onCreateBlank={handleCreateBlank}
          onClearCanvas={handleClearCanvas}
          onOpenAgent={() => setIsAgentOpen(true)}
          hasNodes={nodes.length > 0}
        />
      </div>

      <Editor
        isOpen={isEditorOpen}
        baseImage={editingImage}
        baseImageDimensions={editingImageDimensions}
        parentNodeId={editingNodeId}
        initialObjects={editingInitialObjects}
        onClose={handleEditorClose}
        onSave={handleEditorSave}
        onGenerate={handleImageGenerated}
        onObjectsChange={handleEditorObjectsChange}
      />

      <AgentOverlay
        isOpen={isAgentOpen}
        onClose={() => setIsAgentOpen(false)}
        onSubmit={handleAgentSubmit}
        onInspirationMode={handleInspirationMode}
      />

      <InspirationPickerModal
        isOpen={inspirationPickerOpen}
        onClose={() => { setInspirationPickerOpen(false); setPendingProductData(null); }}
        productName={pendingProductData?.productAnalysis.productName ?? ""}
        onSubmit={handleInspirationBatchPick}
      />
    </div>
  );
}
