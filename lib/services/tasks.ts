import { and, desc, eq, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { contexts, projects, tasks, users } from "@/db/schema";

export async function createTask(
  userId: string,
  title: string,
  options?: {
    description?: string;
    projectId?: string;
    contextId?: string;
    dueDate?: Date;
    priority?: "high" | "medium" | "low";
    status?: "inbox" | "active" | "someday" | "waiting";
    delegatedTo?: string;
  },
) {
  const task = await db
    .insert(tasks)
    .values({
      id: nanoid(8), // 8 character short ID
      slackUserId: userId,
      title,
      description: options?.description,
      projectId: options?.projectId,
      contextId: options?.contextId,
      dueDate: options?.dueDate,
      priority: options?.priority || "medium",
      status: options?.status || "inbox", // Default to inbox for GTD workflow
      delegatedTo: options?.delegatedTo,
    })
    .returning();

  return task[0];
}

export async function getUserTasks(userId: string, status: string = "active") {
  return await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.slackUserId, userId), eq(tasks.status, status)))
    .orderBy(desc(tasks.createdAt));
}

export async function getTaskById(taskId: string, userId: string) {
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.slackUserId, userId)))
    .limit(1);

  return result[0];
}

export async function getUserTasksWithRelations(
  userId: string,
  status: string = "active",
) {
  const result = await db
    .select({
      task: tasks,
      project: projects,
      context: contexts,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(contexts, eq(tasks.contextId, contexts.id))
    .where(and(eq(tasks.slackUserId, userId), eq(tasks.status, status)))
    .orderBy(desc(tasks.createdAt));

  return result;
}

export async function completeTask(taskId: string, userId: string) {
  const task = await db
    .update(tasks)
    .set({
      status: "completed",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.slackUserId, userId)))
    .returning();

  return task[0];
}

export async function deleteTask(taskId: string, userId: string) {
  await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.slackUserId, userId)));
}

export async function updateTaskPriority(
  taskId: string,
  userId: string,
  priority: "high" | "medium" | "low",
) {
  const task = await db
    .update(tasks)
    .set({
      priority,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.slackUserId, userId)))
    .returning();

  return task[0];
}

export async function updateTaskProjectContext(
  taskId: string,
  userId: string,
  projectId: string | null,
  contextId: string | null,
) {
  const task = await db
    .update(tasks)
    .set({
      projectId,
      contextId,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.slackUserId, userId)))
    .returning();

  return task[0];
}

export async function clarifyTask(
  taskId: string,
  userId: string,
  options: {
    status: "active" | "someday" | "waiting" | "archived";
    priority?: "high" | "medium" | "low";
    dueDate?: Date;
    delegatedTo?: string;
  },
) {
  const task = await db
    .update(tasks)
    .set({
      status: options.status,
      priority: options.priority,
      dueDate: options.dueDate,
      delegatedTo: options.delegatedTo,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.slackUserId, userId)))
    .returning();

  return task[0];
}

export async function getUserProjects(userId: string) {
  return await db
    .select()
    .from(projects)
    .where(eq(projects.slackUserId, userId))
    .orderBy(desc(projects.createdAt));
}

export async function getUserContexts(userId: string) {
  return await db
    .select()
    .from(contexts)
    .where(eq(contexts.slackUserId, userId))
    .orderBy(desc(contexts.createdAt));
}

export async function createContext(userId: string, name: string) {
  const context = await db
    .insert(contexts)
    .values({
      id: nanoid(8),
      slackUserId: userId,
      name,
    })
    .returning();

  return context[0];
}

export async function createProject(
  userId: string,
  name: string,
  description?: string,
) {
  const project = await db
    .insert(projects)
    .values({
      id: nanoid(8),
      slackUserId: userId,
      name,
      description,
    })
    .returning();

  return project[0];
}

export async function getTasksDueSoon(hoursAhead: number = 24) {
  const now = new Date();
  const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const dueTasks = await db
    .select({
      task: tasks,
      user: users,
    })
    .from(tasks)
    .innerJoin(users, eq(tasks.slackUserId, users.slackUserId))
    .where(
      and(
        eq(tasks.status, "active"),
        lte(tasks.dueDate, future),
        gte(tasks.dueDate, now),
      ),
    );

  return dueTasks;
}

export async function getInboxTasksByUser() {
  const inboxTasks = await db
    .select({
      task: tasks,
      user: users,
    })
    .from(tasks)
    .innerJoin(users, eq(tasks.slackUserId, users.slackUserId))
    .where(eq(tasks.status, "inbox"))
    .orderBy(desc(tasks.createdAt));

  // Group tasks by user
  const tasksByUser = new Map<
    string,
    { user: typeof users.$inferSelect; tasks: (typeof tasks.$inferSelect)[] }
  >();

  for (const { task, user } of inboxTasks) {
    if (!tasksByUser.has(user.slackUserId)) {
      tasksByUser.set(user.slackUserId, { user, tasks: [] });
    }
    tasksByUser.get(user.slackUserId)!.tasks.push(task);
  }

  return Array.from(tasksByUser.values());
}

export async function getCompletedTaskCount(userId: string, daysAgo: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

  const result = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.slackUserId, userId),
        eq(tasks.status, "completed"),
        gte(tasks.completedAt, cutoffDate),
      ),
    );

  return result.length;
}

export async function getCompletedTasksWithRelations(userId: string) {
  const result = await db
    .select({
      task: tasks,
      project: projects,
      context: contexts,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(contexts, eq(tasks.contextId, contexts.id))
    .where(and(eq(tasks.slackUserId, userId), eq(tasks.status, "completed")))
    .orderBy(desc(tasks.completedAt));

  return result;
}
