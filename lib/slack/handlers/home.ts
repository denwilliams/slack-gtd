import { getUserTasksWithRelations } from "@/lib/services/tasks";
import { findOrCreateUser } from "@/lib/services/user";
import { buildHomeTab } from "@/lib/slack/blocks";
import { getSlackClient } from "@/lib/slack/client";

export async function handleAppHomeOpened(userId: string, teamId: string) {
  try {
    // Ensure user exists
    const user = await findOrCreateUser(userId, teamId);

    // Get user's tasks by status with project and context info
    const inboxTasks = await getUserTasksWithRelations(user.slackUserId, "inbox");
    const activeTasks = await getUserTasksWithRelations(user.slackUserId, "active");
    const waitingTasks = await getUserTasksWithRelations(user.slackUserId, "waiting");
    const somedayTasks = await getUserTasksWithRelations(user.slackUserId, "someday");

    // Build home tab view
    const view = buildHomeTab({
      inbox: inboxTasks,
      active: activeTasks,
      waiting: waitingTasks,
      someday: somedayTasks,
    });

    // Publish the view
    const slackClient = getSlackClient();
    await slackClient.views.publish({
      user_id: userId,
      view,
    });
  } catch (error) {
    console.error("Error updating home tab:", error);
    throw error;
  }
}

export async function refreshHomeTab(userId: string, teamId: string) {
  // Same as handleAppHomeOpened - refreshes the home tab
  await handleAppHomeOpened(userId, teamId);
}
