import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function getAuthUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("canvasState")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

export const save = mutation({
  args: {
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
    nodeCounter: v.number(),
    projectName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const existing = await ctx.db
      .query("canvasState")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        nodes: args.nodes,
        edges: args.edges,
        nodeCounter: args.nodeCounter,
        projectName: args.projectName,
      });
    } else {
      await ctx.db.insert("canvasState", {
        userId,
        nodes: args.nodes,
        edges: args.edges,
        nodeCounter: args.nodeCounter,
        projectName: args.projectName,
      });
    }
  },
});

export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    const existing = await ctx.db
      .query("canvasState")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getStorageUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await getAuthUserId(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});

