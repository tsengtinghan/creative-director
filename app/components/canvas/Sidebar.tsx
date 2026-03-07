"use client";

import { useState, useRef, useEffect } from "react";
import type { CanvasNode } from "./types";

interface SidebarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  nodes: CanvasNode[];
  onNodeSelect?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  onNodeDoubleClick?: (nodeId: string) => void;
}

export function Sidebar({
  projectName,
  onProjectNameChange,
  nodes,
  onNodeSelect,
  selectedNodeId,
  onNodeDoubleClick,
}: SidebarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(projectName);
  }, [projectName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    onProjectNameChange(editValue || "Untitled");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditValue(projectName);
      setIsEditing(false);
    }
  };

  return (
    <div 
      className="fixed left-6 top-6 bottom-6 bg-white flex flex-col z-30"
      style={{
        borderRadius: '36px',
        width: '256px',
        border: '1px solid rgba(0, 0, 0, 0.32)',
      }}
    >
      {/* Logo and Menu */}
      <div className="flex items-center justify-between p-4">
        <div className="w-8 h-8 relative">
          <img
            src="/logo.svg"
            alt="Logo"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Title Section */}
      <div className="px-4 pb-3 border-b border-gray-200">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full text-gray-800 bg-transparent border-none outline-none focus:outline-none p-0"
            style={{ 
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
            }}
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full text-left text-gray-800 hover:text-gray-900"
            style={{ 
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {projectName}
          </button>
        )}
      </div>

      {/* Layers Section */}
      <div className="flex-1 overflow-y-auto px-4 pt-3">
        <div 
          className="text-gray-800 mb-2" 
          style={{ 
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Layers
        </div>
        <div className="space-y-1">
          {nodes.length > 0 && nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => onNodeSelect?.(node.id)}
                onDoubleClick={() => onNodeDoubleClick?.(node.id)}
                className={`w-full text-left px-2 py-1.5 text-gray-600 transition-colors ${
                  selectedNodeId === node.id ? "" : "hover:bg-gray-50"
                }`}
                style={{ 
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  fontSize: '12px',
                  fontWeight: '400',
                  borderRadius: selectedNodeId === node.id ? '32px' : '32px',
                  border: selectedNodeId === node.id ? '1px solid #FF0000' : '1px solid transparent',
                  backgroundColor: selectedNodeId === node.id ? 'transparent' : 'transparent',
                }}
              >
                {node.type === "creative-direction"
                  ? (node.data as { title: string }).title
                  : (node.data as { label?: string }).label || `Layer ${node.id}`}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
