import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { exportUrls, tasks, projects, contexts } from "@/db/schema";

/**
 * Generate a cryptographically secure random ID for export URLs
 */
function generateExportId(): string {
  return randomBytes(32).toString("hex"); // 64 character hex string
}

/**
 * Create a new export URL for a user
 * Returns the generated export ID
 */
export async function createExportUrl(userId: string): Promise<string> {
  const exportId = generateExportId();

  await db.insert(exportUrls).values({
    id: exportId,
    slackUserId: userId,
  });

  return exportId;
}

/**
 * Get the user ID associated with an export URL
 * Returns null if the export URL doesn't exist
 */
export async function getUserIdByExportId(
  exportId: string,
): Promise<string | null> {
  const result = await db
    .select()
    .from(exportUrls)
    .where(eq(exportUrls.id, exportId))
    .limit(1);

  return result.length > 0 ? result[0].slackUserId : null;
}

/**
 * Get all tasks for a user by export ID
 * Returns tasks grouped by status with their related project and context
 */
export async function getTasksByExportId(exportId: string) {
  const userId = await getUserIdByExportId(exportId);

  if (!userId) {
    return null;
  }

  // Get all tasks with their relations
  const allTasks = await db
    .select({
      task: tasks,
      project: projects,
      context: contexts,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(contexts, eq(tasks.contextId, contexts.id))
    .where(eq(tasks.slackUserId, userId));

  // Group tasks by status
  const tasksByStatus = {
    inbox: [] as typeof allTasks,
    active: [] as typeof allTasks,
    waiting: [] as typeof allTasks,
    someday: [] as typeof allTasks,
    completed: [] as typeof allTasks,
    archived: [] as typeof allTasks,
  };

  allTasks.forEach((taskWithRelations) => {
    const status = taskWithRelations.task.status;
    if (status in tasksByStatus) {
      tasksByStatus[status as keyof typeof tasksByStatus].push(
        taskWithRelations,
      );
    }
  });

  return {
    userId,
    tasksByStatus,
    totalTasks: allTasks.length,
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Get the current export URL for a user (if one exists)
 * Returns the export ID or null if no export URL exists
 */
export async function getExistingExportUrl(
  userId: string,
): Promise<string | null> {
  const result = await db
    .select()
    .from(exportUrls)
    .where(eq(exportUrls.slackUserId, userId))
    .limit(1);

  return result.length > 0 ? result[0].id : null;
}
