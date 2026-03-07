import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  }).index("by_clerkId", ["clerkId"]),

  canvasState: defineTable({
    userId: v.string(),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
    nodeCounter: v.number(),
    projectName: v.string(),
  }).index("by_userId", ["userId"]),
});
