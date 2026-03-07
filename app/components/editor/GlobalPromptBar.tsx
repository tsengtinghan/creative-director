"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface GlobalPromptBarProps {
  onGenerate: (prompt: string) => void;
  isGenerating?: boolean;
  error?: string | null;
  initialPrompt?: string;
  onPromptChange?: (prompt: string) => void;
}

const DEFAULT_PROMPT = `You are an image editor that interprets visual instructions marked directly on an image.

YOUR TASK:

1. Identify all pink-marked regions and follow their associated text instructions
2. Generate the requested content at the exact location of each marked region
3. Follow any brushstroke guides for shape, position, or composition
4. Preserve all unmarked areas of the original image exactly as they appear

- Do NOT include the pink region markers or the text instructions in the output

The final image should look like a clean, finished result with only the requested changes applied`;

const SUGGESTION_CHIPS = [
  "Default Prompt",
  "Create a logo",
  "Iterate details",
];

export function GlobalPromptBar({
  onGenerate,
  isGenerating = false,
  error,
  initialPrompt = DEFAULT_PROMPT,
  onPromptChange,
}: GlobalPromptBarProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  // Update prompt when initialPrompt changes
  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  // Hide scrollbar for textarea
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .prompt-textarea::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handlePromptChange = (newPrompt: string) => {
    setPrompt(newPrompt);
    onPromptChange?.(newPrompt);
    // Clear selection when user types
    if (newPrompt !== initialPrompt && !SUGGESTION_CHIPS.some(s => newPrompt.includes(s))) {
      setSelectedSuggestion(null);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSelectedSuggestion(suggestion);
    if (suggestion === "Default Prompt") {
      handlePromptChange(DEFAULT_PROMPT);
    } else {
      // For other suggestions, replace prompt
      handlePromptChange(suggestion);
    }
  };

  const hasText = prompt.trim().length > 0 && prompt !== DEFAULT_PROMPT;
  const isActive = hasText || selectedSuggestion !== null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-full max-w-3xl px-4"
    >
      <div className="flex flex-col gap-3">
        {/* Suggestion chips - aligned to left */}
        <div className="flex items-center gap-2 justify-start">
          {SUGGESTION_CHIPS.map((suggestion) => {
            const isSelected = selectedSuggestion === suggestion;
            return (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => {}}
                className={`
                  px-4 py-1.5 rounded-full border transition-all duration-200 text-sm shadow-sm
                  ${
                    isSelected
                      ? "bg-white/95 backdrop-blur-xl border-[#FF0000] text-[#FF0000] font-medium"
                      : "bg-white/95 backdrop-blur-xl border-gray-200 text-gray-700 hover:border-[#FF0000] hover:text-[#FF0000]"
                  }
                `}
              >
                {suggestion}
              </button>
            );
          })}
        </div>

        {/* Input row */}
        <div className="bg-white/95 backdrop-blur-xl rounded-full px-4 py-2 shadow-lg border border-[#FF0000]">
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add prompt to image..."
            rows={3}
            disabled={isGenerating}
            className="prompt-textarea w-full bg-transparent text-gray-900 placeholder-gray-400 rounded-xl px-2 py-2 text-sm resize-none focus:outline-none disabled:opacity-50"
            style={{
              scrollbarWidth: 'none', /* Firefox */
              msOverflowStyle: 'none', /* IE and Edge */
            }}
          />
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-xs text-red-500">{error}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
