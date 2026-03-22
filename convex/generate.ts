"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { buildThumbnailPrompt } from "./prompts";

// Helper to get image dimensions from base64 data
function getImageDimensions(
  base64Data: string
): { width: number; height: number } | null {
  try {
    const base64 = base64Data.includes(",")
      ? base64Data.split(",")[1]
      : base64Data;
    const buffer = Buffer.from(base64, "base64");

    // Check for PNG signature
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    // Check for JPEG signature
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        if (marker === 0xd8 || marker === 0xd9) {
          offset += 2;
        } else {
          const segmentLength = buffer.readUInt16BE(offset + 2);
          offset += 2 + segmentLength;
        }
      }
    }

    // Check for WebP signature
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      const chunkType = buffer.toString("ascii", 12, 16);
      if (chunkType === "VP8 ") {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { width, height };
      } else if (chunkType === "VP8L") {
        const bits = buffer.readUInt32LE(21);
        const width = (bits & 0x3fff) + 1;
        const height = ((bits >> 14) & 0x3fff) + 1;
        return { width, height };
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Calculate aspect ratio string from dimensions
function calculateAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.05) return "1:1";
  if (Math.abs(ratio - 4 / 3) < 0.05) return "4:3";
  if (Math.abs(ratio - 3 / 4) < 0.05) return "3:4";
  if (Math.abs(ratio - 16 / 9) < 0.05) return "16:9";
  if (Math.abs(ratio - 9 / 16) < 0.05) return "9:16";
  if (Math.abs(ratio - 3 / 2) < 0.05) return "3:2";
  if (Math.abs(ratio - 2 / 3) < 0.05) return "2:3";
  if (ratio > 1) {
    return ratio > 1.5 ? "16:9" : "4:3";
  } else {
    return ratio < 0.67 ? "9:16" : "3:4";
  }
}

// Strip data URL prefix to get raw base64
function stripDataUrlPrefix(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  return match ? match[1] : dataUrl;
}

// Get MIME type from data URL
function getMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:(image\/\w+);base64,/);
  return match ? match[1] : "image/png";
}

// Fetch a URL and return as data URL
async function urlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/png";
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

export const generateImage = action({
  args: {
    prompt: v.optional(v.string()),
    baseImage: v.optional(v.string()), // data URL or Convex storage URL
    referenceImages: v.optional(
      v.array(v.object({ url: v.string(), label: v.string() }))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    if (!args.prompt && !args.baseImage) {
      throw new Error("Either prompt or baseImage is required");
    }

    // Convert Convex storage URLs to data URLs if needed
    let baseImageDataUrl = args.baseImage;
    if (baseImageDataUrl && !baseImageDataUrl.startsWith("data:")) {
      baseImageDataUrl = await urlToDataUrl(baseImageDataUrl);
    }

    // Build the content parts array
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    if (args.prompt) {
      parts.push({ text: args.prompt });
    }

    if (baseImageDataUrl) {
      parts.push({
        inlineData: {
          mimeType: getMimeType(baseImageDataUrl),
          data: stripDataUrlPrefix(baseImageDataUrl),
        },
      });
    }

    // Add reference images
    if (args.referenceImages) {
      for (const refImage of args.referenceImages) {
        let refDataUrl = refImage.url;
        if (!refDataUrl.startsWith("data:")) {
          refDataUrl = await urlToDataUrl(refDataUrl);
        }
        parts.push({
          inlineData: {
            mimeType: getMimeType(refDataUrl),
            data: stripDataUrlPrefix(refDataUrl),
          },
        });
      }
    }

    // Determine aspect ratio from base image
    const dimensions = baseImageDataUrl
      ? getImageDimensions(baseImageDataUrl)
      : null;
    const aspectRatio = dimensions
      ? calculateAspectRatio(dimensions.width, dimensions.height)
      : "4:3";

    console.log("Image dimensions:", dimensions, "Aspect ratio:", aspectRatio);

    // Call Gemini 3 Pro Image Preview
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    if (!response.candidates?.[0]?.content?.parts) {
      throw new Error("No response from model");
    }

    let generatedImageBase64: string | null = null;
    let responseText: string | null = null;

    for (const part of response.candidates[0].content.parts) {
      if (part.text) {
        responseText = part.text;
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || "image/png";
        generatedImageBase64 = `data:${mimeType};base64,${imageData}`;
      }
    }

    if (!generatedImageBase64) {
      throw new Error(responseText || "No image generated");
    }

    // Upload generated image to Convex storage
    const base64Data = stripDataUrlPrefix(generatedImageBase64);
    const binaryData = Buffer.from(base64Data, "base64");
    const mimeType = getMimeType(generatedImageBase64);

    const blob = new Blob([binaryData], { type: mimeType });
    const storageId = await ctx.storage.store(blob);
    const url = await ctx.storage.getUrl(storageId);

    if (!url) {
      throw new Error("Failed to get storage URL");
    }

    return { url, text: responseText, storageId };
  },
});

export const generateThumbnail = action({
  args: {
    vibePrompt: v.string(),
    referenceImageUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    parts.push({
      text: buildThumbnailPrompt(args.vibePrompt),
    });

    // Add reference images for context
    for (const imageUrl of args.referenceImageUrls) {
      let dataUrl = imageUrl;
      if (!dataUrl.startsWith("data:")) {
        dataUrl = await urlToDataUrl(dataUrl);
      }
      parts.push({
        inlineData: {
          mimeType: getMimeType(dataUrl),
          data: stripDataUrlPrefix(dataUrl),
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    if (!response.candidates?.[0]?.content?.parts) {
      throw new Error("No response from model");
    }

    let generatedImageBase64: string | null = null;

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || "image/png";
        generatedImageBase64 = `data:${mimeType};base64,${imageData}`;
      }
    }

    if (!generatedImageBase64) {
      throw new Error("No thumbnail image generated");
    }

    // Upload to Convex storage
    const base64Data = stripDataUrlPrefix(generatedImageBase64);
    const binaryData = Buffer.from(base64Data, "base64");
    const mimeType = getMimeType(generatedImageBase64);

    const blob = new Blob([binaryData], { type: mimeType });
    const storageId = await ctx.storage.store(blob);
    const url = await ctx.storage.getUrl(storageId);

    if (!url) {
      throw new Error("Failed to get storage URL");
    }

    return { url, storageId };
  },
});
