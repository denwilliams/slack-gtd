import type { tasks, users } from "@/db/schema";
import { getSlackClient } from "./client";

export async function sendTaskReminder(
  user: typeof users.$inferSelect,
  task: typeof tasks.$inferSelect,
) {
  try {
    const slackClient = getSlackClient();
    await slackClient.chat.postMessage({
      channel: user.slackUserId,
      text: `⏰ Reminder: You have a task due soon!\n\n*${task.title}*${
        task.description ? `\n${task.description}` : ""
      }\n\nDue: ${task.dueDate?.toLocaleString()}`,
    });
    return true;
  } catch (error) {
    console.error(`Failed to send reminder for task ${task.id}:`, error);
    return false;
  }
}

export async function sendTaskReminderBatch(
  dueTasks: Array<{
    task: typeof tasks.$inferSelect;
    user: typeof users.$inferSelect;
  }>,
) {
  const results = {
    sent: [] as string[],
    failed: [] as string[],
  };

  for (const { task, user } of dueTasks) {
    const success = await sendTaskReminder(user, task);
    if (success) {
      results.sent.push(task.id);
    } else {
      results.failed.push(task.id);
    }
  }

  return results;
}
