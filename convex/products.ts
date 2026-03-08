import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function getAuthUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const products = await ctx.db
      .query("products")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    return products.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const save = mutation({
  args: {
    name: v.string(),
    imageUrls: v.array(v.string()),
    thumbnailUrl: v.string(),
    analysis: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    // Dedupe by checking if same imageUrls exist
    const existing = await ctx.db
      .query("products")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const duplicate = existing.find(
      (p) => JSON.stringify(p.imageUrls.sort()) === JSON.stringify([...args.imageUrls].sort())
    );

    if (duplicate) {
      await ctx.db.patch(duplicate._id, {
        name: args.name,
        analysis: args.analysis,
      });
      return duplicate._id;
    }

    return await ctx.db.insert("products", {
      userId,
      name: args.name,
      imageUrls: args.imageUrls,
      thumbnailUrl: args.thumbnailUrl,
      analysis: args.analysis,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await getAuthUserId(ctx);
    await ctx.db.delete(args.id);
  },
});
