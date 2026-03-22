"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import {
  CREATIVE_DIRECTION_SYSTEM_PROMPT,
  CREATIVE_DIRECTION_BOLD_PROMPT,
  PRODUCT_ANALYSIS_PROMPT,
  buildAdaptInspirationPrompt,
  buildDirectionPromptsPrompt,
  buildIterateDirectionPrompt,
} from "./prompts";

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

const responseSchema = {
  type: "object" as const,
  properties: {
    directions: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          brief: { type: "string" as const },
          vibePrompt: { type: "string" as const },
        },
        required: ["title", "brief", "vibePrompt"],
      },
      minItems: 5,
      maxItems: 5,
    },
  },
  required: ["directions"],
};

const productAnalysisSchema = {
  type: "object" as const,
  properties: {
    productName: { type: "string" as const },
    brandName: { type: "string" as const },
    visibleText: { type: "array" as const, items: { type: "string" as const } },
    logoDescription: { type: "string" as const },
    shape: { type: "string" as const },
    primaryColors: { type: "array" as const, items: { type: "string" as const } },
    materials: { type: "array" as const, items: { type: "string" as const } },
    sizeImpression: { type: "string" as const },
    category: { type: "string" as const },
    distinguishingFeatures: { type: "string" as const },
    visualDescription: { type: "string" as const },
  },
  required: [
    "productName", "brandName", "visibleText", "logoDescription", "shape",
    "primaryColors", "materials", "sizeImpression", "category",
    "distinguishingFeatures", "visualDescription",
  ],
};

export const analyzeProductVisuals = action({
  args: {
    imageUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });

    if (!args.imageUrls || args.imageUrls.length === 0) {
      throw new Error("At least one image is required");
    }

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    parts.push({ text: PRODUCT_ANALYSIS_PROMPT });

    for (const imageUrl of args.imageUrls) {
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
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: productAnalysisSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from model");

    return JSON.parse(text);
  },
});

const adaptInspirationSchema = {
  type: "object" as const,
  properties: {
    title: { type: "string" as const },
    brief: { type: "string" as const },
    vibePrompt: { type: "string" as const },
  },
  required: ["title", "brief", "vibePrompt"],
};

export const adaptInspirationPrompt = action({
  args: {
    templatePrompt: v.string(),
    userNote: v.optional(v.string()),
    productAnalysis: v.object({
      productName: v.string(),
      brandName: v.string(),
      visibleText: v.array(v.string()),
      logoDescription: v.string(),
      shape: v.string(),
      primaryColors: v.array(v.string()),
      materials: v.array(v.string()),
      sizeImpression: v.string(),
      category: v.string(),
      distinguishingFeatures: v.string(),
      visualDescription: v.string(),
    }),
    imageUrls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { GoogleGenAI } = await import("@google/genai");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    parts.push({
      text: buildAdaptInspirationPrompt({
        templatePrompt: args.templatePrompt,
        productAnalysis: args.productAnalysis,
        userNote: args.userNote,
      }),
    });

    for (const imageUrl of args.imageUrls) {
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
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: adaptInspirationSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from model");

    return JSON.parse(text) as {
      title: string;
      brief: string;
      vibePrompt: string;
    };
  },
});

interface DirectionResult {
  title: string;
  brief: string;
  vibePrompt: string;
}

export const analyzeProduct = action({
  args: {
    imageUrls: v.array(v.string()),
    brief: v.optional(v.string()),
    visualDescription: v.string(),
    boldMode: v.optional(v.boolean()),
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

    if (!args.imageUrls || args.imageUrls.length === 0) {
      throw new Error("At least one image is required");
    }

    // Build content parts
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];

    let textPart = args.boldMode ? CREATIVE_DIRECTION_BOLD_PROMPT : CREATIVE_DIRECTION_SYSTEM_PROMPT;
    textPart += `\n\nProduct visual description (from prior analysis):\n${args.visualDescription}`;
    if (args.brief) {
      textPart += `\n\nUser brief: ${args.brief}`;
    }
    parts.push({ text: textPart });

    // Add images — convert URLs to data URLs if needed
    for (const imageUrl of args.imageUrls) {
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
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from model");
    }

    const parsed = JSON.parse(text) as {
      directions: DirectionResult[];
    };

    return {
      directions: parsed.directions,
    };
  },
});

const promptBuilderSchema = {
  type: "object" as const,
  properties: {
    prompts: {
      type: "array" as const,
      items: { type: "string" as const },
      minItems: 4,
      maxItems: 4,
    },
  },
  required: ["prompts"],
};

export const buildDirectionPrompts = action({
  args: {
    title: v.string(),
    brief: v.string(),
    vibePrompt: v.string(),
    productDescription: v.string(),
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
      text: buildDirectionPromptsPrompt({
        productDescription: args.productDescription,
        title: args.title,
        brief: args.brief,
        vibePrompt: args.vibePrompt,
      }),
    });

    // Add reference images
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
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: promptBuilderSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from model");
    }

    const parsed = JSON.parse(text) as { prompts: string[] };
    return { prompts: parsed.prompts };
  },
});

const iterateSchema = {
  type: "object" as const,
  properties: {
    title: { type: "string" as const },
    brief: { type: "string" as const },
    vibePrompt: { type: "string" as const },
  },
  required: ["title", "brief", "vibePrompt"],
};

export const iterateDirection = action({
  args: {
    title: v.string(),
    brief: v.string(),
    vibePrompt: v.string(),
    productDescription: v.string(),
    referenceImageUrls: v.array(v.string()),
    feedback: v.string(),
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
      text: buildIterateDirectionPrompt({
        title: args.title,
        brief: args.brief,
        vibePrompt: args.vibePrompt,
        productDescription: args.productDescription,
        feedback: args.feedback,
      }),
    });

    // Add reference images
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
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: iterateSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from model");
    }

    const parsed = JSON.parse(text) as {
      title: string;
      brief: string;
      vibePrompt: string;
    };

    return parsed;
  },
});
