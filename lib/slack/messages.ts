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

export async function sendInboxReminder(
  user: typeof users.$inferSelect,
  inboxTasks: (typeof tasks.$inferSelect)[],
) {
  try {
    const slackClient = getSlackClient();
    const taskCount = inboxTasks.length;

    // Format task list (show up to 5 tasks, then indicate if there are more)
    const taskList = inboxTasks
      .slice(0, 5)
      .map((task, index) => `${index + 1}. ${task.title}`)
      .join("\n");

    const moreTasksText = taskCount > 5 ? `\n_...and ${taskCount - 5} more_` : "";

    await slackClient.chat.postMessage({
      channel: user.slackUserId,
      text: `📥 *Inbox Reminder*\n\nYou have *${taskCount}* ${taskCount === 1 ? "item" : "items"} waiting in your inbox to be organized:\n\n${taskList}${moreTasksText}\n\n_Process your inbox to clarify and organize these items into your GTD system._`,
    });
    return true;
  } catch (error) {
    console.error(`Failed to send inbox reminder to user ${user.slackUserId}:`, error);
    return false;
  }
}

export async function sendInboxReminderBatch(
  usersWithInbox: Array<{
    user: typeof users.$inferSelect;
    tasks: (typeof tasks.$inferSelect)[];
  }>,
) {
  const results = {
    sent: [] as string[],
    failed: [] as string[],
  };

  for (const { user, tasks } of usersWithInbox) {
    const success = await sendInboxReminder(user, tasks);
    if (success) {
      results.sent.push(user.slackUserId);
    } else {
      results.failed.push(user.slackUserId);
    }
  }

  return results;
}
