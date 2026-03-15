import { internalMutation } from "./_generated/server";

// Collect all storage URLs referenced across all canvas states and products,
// then delete any storage files that are no longer referenced.
export const cleanupOrphanedStorage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const referencedUrls = new Set<string>();

    // Collect URLs from all canvas states
    const allCanvasStates = await ctx.db.query("canvasState").collect();
    for (const canvasState of allCanvasStates) {
      for (const node of canvasState.nodes as Array<Record<string, unknown>>) {
        const data = node.data as Record<string, unknown> | undefined;
        if (!data) continue;
        if (typeof data.imageUrl === "string") referencedUrls.add(data.imageUrl);
        if (typeof data.vibeImageUrl === "string") referencedUrls.add(data.vibeImageUrl);
        if (Array.isArray(data.referenceImageUrls)) {
          for (const url of data.referenceImageUrls) {
            if (typeof url === "string") referencedUrls.add(url);
          }
        }
      }
    }

    // Collect URLs from all products
    const allProducts = await ctx.db.query("products").collect();
    for (const product of allProducts) {
      for (const url of product.imageUrls) {
        referencedUrls.add(url);
      }
      referencedUrls.add(product.thumbnailUrl);
    }

    // Delete unreferenced storage files
    let deleted = 0;
    const allFiles = await ctx.db.system.query("_storage").collect();

    for (const file of allFiles) {
      const url = await ctx.storage.getUrl(file._id);
      if (url && !referencedUrls.has(url)) {
        await ctx.storage.delete(file._id);
        deleted++;
      }
    }

    console.log(`Storage cleanup: deleted ${deleted} orphaned files out of ${allFiles.length} total`);
    return { deleted, total: allFiles.length };
  },
});
