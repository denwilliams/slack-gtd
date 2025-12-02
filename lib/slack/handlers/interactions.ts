import {
  completeTask,
  deleteTask,
  createTask,
  updateTaskPriority,
  clarifyTask,
} from "@/lib/services/tasks";
import { findOrCreateUser } from "@/lib/services/user";
import { refreshHomeTab } from "./home";
import { getSlackClient } from "@/lib/slack/client";
import {
  buildAddTaskModal,
  buildActionableModal,
  buildNotActionableModal,
} from "@/lib/slack/blocks";

interface BlockAction {
  type: string;
  action_id: string;
  value?: string;
  selected_option?: {
    value: string;
  };
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
      const taskId = action.value!;
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
      const taskId = action.value!;
      await deleteTask(taskId, user.slackUserId);

      // Refresh home tab
      await refreshHomeTab(user.slackUserId, slackTeam.id);

      return {
        response_action: "update",
        view: {},
      };
    }

    // Handle change priority
    if (action.action_id.startsWith("change_priority_")) {
      const taskId = action.action_id.replace("change_priority_", "");
      const priority = action.selected_option?.value as
        | "high"
        | "medium"
        | "low";

      if (priority) {
        await updateTaskPriority(taskId, user.slackUserId, priority);

        // Refresh home tab
        await refreshHomeTab(user.slackUserId, slackTeam.id);
      }

      return {
        response_action: "update",
        view: {},
      };
    }

    // Handle clarify actionable button
    if (action.action_id.startsWith("clarify_actionable_")) {
      const taskId = action.action_id.replace("clarify_actionable_", "");
      const slack = getSlackClient();
      const modalView = buildActionableModal(taskId);

      await slack.views.open({
        trigger_id: payload.trigger_id!,
        view: modalView,
      });

      return { ok: true };
    }

    // Handle clarify not actionable button
    if (action.action_id.startsWith("clarify_not_actionable_")) {
      const taskId = action.action_id.replace("clarify_not_actionable_", "");
      const slack = getSlackClient();
      const modalView = buildNotActionableModal(taskId);

      await slack.views.open({
        trigger_id: payload.trigger_id!,
        view: modalView,
      });

      return { ok: true };
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

  // Handle not actionable modal submission
  if (
    type === "view_submission" &&
    view?.callback_id.startsWith("not_actionable_modal_")
  ) {
    const taskId = view.callback_id.replace("not_actionable_modal_", "");
    const values = view.state.values;
    const action = values.action_block.action_input.selected_option?.value;

    if (action === "trash") {
      await deleteTask(taskId, user.slackUserId);
    } else if (action === "someday") {
      await clarifyTask(taskId, user.slackUserId, { status: "someday" });
    } else if (action === "reference") {
      await clarifyTask(taskId, user.slackUserId, { status: "archived" });
    }

    // Refresh home tab
    await refreshHomeTab(user.slackUserId, slackTeam.id);

    return {
      response_action: "clear",
    };
  }

  // Handle actionable modal submission
  if (
    type === "view_submission" &&
    view?.callback_id.startsWith("actionable_modal_")
  ) {
    const taskId = view.callback_id.replace("actionable_modal_", "");
    const values = view.state.values;
    const action = values.action_block.action_input.selected_option?.value;
    const dueDate = values.due_date_block?.due_date_input?.selected_date;
    const delegatedTo = values.delegated_to_block?.delegated_to_input?.value;

    if (action === "do_now") {
      await clarifyTask(taskId, user.slackUserId, {
        status: "active",
        priority: "high",
      });
    } else if (action === "do_later") {
      await clarifyTask(taskId, user.slackUserId, {
        status: "active",
        priority: "medium",
      });
    } else if (action === "schedule") {
      await clarifyTask(taskId, user.slackUserId, {
        status: "active",
        priority: "medium",
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
    } else if (action === "delegate") {
      await clarifyTask(taskId, user.slackUserId, {
        status: "waiting",
        delegatedTo: delegatedTo || undefined,
      });
    }

    // Refresh home tab
    await refreshHomeTab(user.slackUserId, slackTeam.id);

    return {
      response_action: "clear",
    };
  }

  return { ok: true };
}
