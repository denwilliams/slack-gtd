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
      status: "active",
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
