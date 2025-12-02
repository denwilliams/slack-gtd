import { completeTask, deleteTask, createTask } from "@/lib/services/tasks";
import { findOrCreateUser } from "@/lib/services/user";
import { refreshHomeTab } from "./home";
import { getSlackClient } from "@/lib/slack/client";
import { buildAddTaskModal } from "@/lib/slack/blocks";

interface BlockAction {
  type: string;
  action_id: string;
  value: string;
}

interface InteractionPayload {
  type: string;
  user: {
    id: string;
  };
  team: {
    id: string;
  };
  actions?: BlockAction[];
  trigger_id?: string;
  view?: {
    callback_id: string;
    state: {
      values: Record<
        string,
        Record<string, { value?: string; selected_option?: { value: string } }>
      >;
    };
  };
}

export async function handleInteraction(payload: InteractionPayload) {
  const { user: slackUser, team: slackTeam, actions, type, view } = payload;

  const user = await findOrCreateUser(slackUser.id, slackTeam.id);

  // Handle modal submission
  if (type === "view_submission" && view?.callback_id === "add_task_modal") {
    const values = view.state.values;

    const title = values.task_title_block.task_title_input.value;
    const description =
      values.task_description_block.task_description_input.value;
    const priority =
      values.task_priority_block.task_priority_input.selected_option?.value;

    if (!title) {
      return {
        response_action: "errors",
        errors: {
          task_title_block: "Task title is required",
        },
      };
    }

    await createTask(user.slackUserId, title, {
      description: description || undefined,
      priority: (priority as "high" | "medium" | "low") || "medium",
    });

    // Refresh home tab
    await refreshHomeTab(user.slackUserId, slackTeam.id);

    return {
      response_action: "clear",
    };
  }

  if (type === "block_actions" && actions && actions.length > 0) {
    const action = actions[0];

    // Handle complete task button
    if (action.action_id.startsWith("complete_task_")) {
      const taskId = action.value;
      await completeTask(taskId, user.slackUserId);

      // Refresh home tab
      await refreshHomeTab(user.slackUserId, slackTeam.id);

      return {
        response_action: "update",
        view: {},
      };
    }

    // Handle delete task button
    if (action.action_id.startsWith("delete_task_")) {
      const taskId = action.value;
      await deleteTask(taskId, user.slackUserId);

      // Refresh home tab
      await refreshHomeTab(user.slackUserId, slackTeam.id);

      return {
        response_action: "update",
        view: {},
      };
    }

    // Handle open add task modal
    if (action.action_id === "open_add_task_modal") {
      const slack = getSlackClient();
      const modalView = buildAddTaskModal();

      await slack.views.open({
        trigger_id: payload.trigger_id!,
        view: modalView,
      });

      return { ok: true };
    }
  }

  return { ok: true };
}
