import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up orphaned storage files every hour
crons.interval("cleanup orphaned storage", { hours: 1 }, internal.storage.cleanupOrphanedStorage);

export default crons;
