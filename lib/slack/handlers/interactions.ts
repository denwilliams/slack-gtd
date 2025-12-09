import {
  completeTask,
  deleteTask,
  createTask,
  updateTaskPriority,
  clarifyTask,
  getUserProjects,
  getUserContexts,
  createProject,
  createContext,
  getTaskById,
  updateTaskProjectContext,
  updateTaskDetails,
  getCompletedTasksWithRelations,
} from "@/lib/services/tasks";
import { findOrCreateUser } from "@/lib/services/user";
import { refreshHomeTab } from "./home";
import { getSlackClient } from "@/lib/slack/client";
import {
  buildAddTaskModal,
  buildActionableModal,
  buildNotActionableModal,
  buildMoveTaskModal,
  buildAddProjectModal,
  buildAddContextModal,
  buildEditTaskModal,
  buildSetPriorityModal,
  buildReviewDoneModal,
  buildDeleteConfirmationModal,
  buildCreateTaskFromMessageModal,
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
        Record<
          string,
          {
            value?: string;
            selected_option?: { value: string };
            selected_date?: string;
          }
        >
      >;
    };
  };
  message?: {
    text: string;
    ts: string;
    permalink?: string;
  };
  channel?: {
    id: string;
  };
  callback_id?: string;
}

export async function handleInteraction(payload: InteractionPayload) {
  const { user: slackUser, team: slackTeam, actions, type, view } = payload;

  const user = await findOrCreateUser(slackUser.id, slackTeam.id);

  // Handle message shortcut
  if (type === "message_action" && payload.callback_id === "create_gtd_task") {
    const slack = getSlackClient();
    const message = payload.message!;
    const channelId = payload.channel!.id;

    // Build message permalink
    let messageLink = message.permalink || "";
    if (!messageLink && message.ts && channelId) {
      const teamDomain = slackTeam.id;
      messageLink = `https://slack.com/archives/${channelId}/p${message.ts.replace(".", "")}`;
    }

    // Fetch user's projects and contexts for the modal
    const projects = await getUserProjects(user.slackUserId);
    const contexts = await getUserContexts(user.slackUserId);

    const modalView = buildCreateTaskFromMessageModal(
      message.text,
      messageLink,
      projects,
      contexts,
    );

    await slack.views.open({
      trigger_id: payload.trigger_id!,
      view: modalView,
    });

    return { ok: true };
  }

  // Handle modal submission
  if (type === "view_submission" && view?.callback_id === "add_task_modal") {
    const values = view.state.values;

    const title = values.task_title_block.task_title_input.value;
    const description =
      values.task_description_block.task_description_input.value;
    const priority =
      values.task_priority_block.task_priority_input.selected_option?.value;
    const projectId =
      values.task_project_block?.task_project_input?.selected_option?.value;
    const contextId =
      values.task_context_block?.task_context_input?.selected_option?.value;
    const timeEstimate =
      values.task_time_estimate_block?.task_time_estimate_input?.selected_option?.value;
    const energyLevel =
      values.task_energy_level_block?.task_energy_level_input?.selected_option?.value;

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
      projectId: projectId || undefined,
      contextId: contextId || undefined,
      timeEstimate: (timeEstimate as "quick" | "30min" | "1hr" | "2hr+") || undefined,
      energyLevel: (energyLevel as "high" | "medium" | "low") || undefined,
    });

    // Refresh home tab
    await refreshHomeTab(user.slackUserId, slackTeam.id);

    return {
      response_action: "clear",
    };
  }

  // Handle create task from message modal submission
  if (
    type === "view_submission" &&
    view?.callback_id === "create_task_from_message_modal"
  ) {
    const values = view.state.values;

    const title = values.task_title_block.task_title_input.value;
    const description =
      values.task_description_block.task_description_input.value;
    const priority =
      values.task_priority_block.task_priority_input.selected_option?.value;
    const projectId =
      values.task_project_block?.task_project_input?.selected_option?.value;
    const contextId =
      values.task_context_block?.task_context_input?.selected_option?.value;

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
      projectId: projectId || undefined,
      contextId: contextId || undefined,
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

    // Handle activate task (move from Someday to Active)
    if (action.action_id.startsWith("activate_task_")) {
      const taskId = action.action_id.replace("activate_task_", "");
      await clarifyTask(taskId, user.slackUserId, {
        status: "active",
        priority: "medium",
      });

      // Refresh home tab
      await refreshHomeTab(user.slackUserId, slackTeam.id);

      return {
        response_action: "update",
        view: {},
      };
    }

    // Handle move task button
    if (action.action_id.startsWith("move_task_")) {
      const taskId = action.action_id.replace("move_task_", "");
      const slack = getSlackClient();
      const modalView = buildMoveTaskModal(taskId);

      await slack.views.open({
        trigger_id: payload.trigger_id!,
        view: modalView,
      });

      return { ok: true };
    }

    // Handle overflow menu (complete, set priority, edit, move, or delete)
    if (action.action_id.startsWith("task_overflow_")) {
      const selectedValue = action.selected_option?.value!;

      // Parse the value format: "complete:taskId", "set_priority:taskId", "edit:taskId", "move:taskId", or "delete:taskId"
      if (selectedValue.startsWith("complete:")) {
        const taskId = selectedValue.replace("complete:", "");
        await completeTask(taskId, user.slackUserId);

        // Refresh home tab
        await refreshHomeTab(user.slackUserId, slackTeam.id);

        return {
          response_action: "update",
          view: {},
        };
      } else if (selectedValue.startsWith("set_priority:")) {
        const taskId = selectedValue.replace("set_priority:", "");
        const slack = getSlackClient();
        const modalView = buildSetPriorityModal(taskId);

        await slack.views.open({
          trigger_id: payload.trigger_id!,
          view: modalView,
        });

        return { ok: true };
      } else if (selectedValue.startsWith("edit:")) {
        const taskId = selectedValue.replace("edit:", "");
        const slack = getSlackClient();

        // Fetch the task to get current details (title, description, project, context, time, energy)
        const task = await getTaskById(taskId, user.slackUserId);
        if (!task) {
          return { ok: true };
        }

        // Fetch user's projects and contexts for the modal
        const projects = await getUserProjects(user.slackUserId);
        const contexts = await getUserContexts(user.slackUserId);

        const modalView = buildEditTaskModal(
          taskId,
          task.title,
          task.description,
          task.projectId,
          task.contextId,
          task.timeEstimate,
          task.energyLevel,
          projects,
          contexts,
        );

        await slack.views.open({
          trigger_id: payload.trigger_id!,
          view: modalView,
        });

        return { ok: true };
      } else if (selectedValue.startsWith("move:")) {
        const taskId = selectedValue.replace("move:", "");
        const slack = getSlackClient();
        const modalView = buildMoveTaskModal(taskId);

        await slack.views.open({
          trigger_id: payload.trigger_id!,
          view: modalView,
        });

        return { ok: true };
      } else if (selectedValue.startsWith("delete:")) {
        const taskId = selectedValue.replace("delete:", "");
        const slack = getSlackClient();
        const modalView = buildDeleteConfirmationModal(taskId);

        await slack.views.open({
          trigger_id: payload.trigger_id!,
          view: modalView,
        });

        return { ok: true };
      }
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

      // Fetch user's projects and contexts for the modal
      const projects = await getUserProjects(user.slackUserId);
      const contexts = await getUserContexts(user.slackUserId);

      const modalView = buildAddTaskModal(projects, contexts);

      await slack.views.open({
        trigger_id: payload.trigger_id!,
        view: modalView,
      });

      return { ok: true };
    }

    // Handle open add project modal
    if (action.action_id === "open_add_project_modal") {
      const slack = getSlackClient();
      const modalView = buildAddProjectModal();

      await slack.views.open({
        trigger_id: payload.trigger_id!,
        view: modalView,
      });

      return { ok: true };
    }

    // Handle open add context modal
    if (action.action_id === "open_add_context_modal") {
      const slack = getSlackClient();
      const modalView = buildAddContextModal();

      await slack.views.open({
        trigger_id: payload.trigger_id!,
        view: modalView,
      });

      return { ok: true };
    }

    // Handle open review done modal
    if (action.action_id === "open_review_done_modal") {
      const slack = getSlackClient();

      // Fetch completed tasks for the user
      const completedTasks = await getCompletedTasksWithRelations(user.slackUserId);

      const modalView = buildReviewDoneModal(completedTasks);

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

  // Handle move task modal submission
  if (
    type === "view_submission" &&
    view?.callback_id.startsWith("move_task_modal_")
  ) {
    const taskId = view.callback_id.replace("move_task_modal_", "");
    const values = view.state.values;
    const moveTo = values.move_to_block.move_to_input.selected_option?.value;
    const dueDate = values.due_date_block?.due_date_input?.selected_date;
    const delegatedTo = values.delegated_to_block?.delegated_to_input?.value;

    if (moveTo === "next_actions") {
      await clarifyTask(taskId, user.slackUserId, {
        status: "active",
        dueDate: null,
      });
    } else if (moveTo === "scheduled") {
      await clarifyTask(taskId, user.slackUserId, {
        status: "active",
        dueDate: dueDate ? new Date(dueDate) : new Date(),
      });
    } else if (moveTo === "waiting") {
      await clarifyTask(taskId, user.slackUserId, {
        status: "waiting",
        delegatedTo: delegatedTo || undefined,
      });
    } else if (moveTo === "someday") {
      await clarifyTask(taskId, user.slackUserId, {
        status: "someday",
      });
    }

    // Refresh home tab
    await refreshHomeTab(user.slackUserId, slackTeam.id);

    return {
      response_action: "clear",
    };
  }

  // Handle add project modal submission
  if (
    type === "view_submission" &&
    view?.callback_id === "add_project_modal"
  ) {
    const values = view.state.values;

    const name = values.project_name_block.project_name_input.value;
    const description =
      values.project_description_block?.project_description_input?.value;

    if (!name) {
      return {
        response_action: "errors",
        errors: {
          project_name_block: "Project name is required",
        },
      };
    }

    await createProject(user.slackUserId, name, description || undefined);

    // Refresh home tab
    await refreshHomeTab(user.slackUserId, slackTeam.id);

    return {
      response_action: "clear",
    };
  }

  // Handle add context modal submission
  if (
    type === "view_submission" &&
    view?.callback_id === "add_context_modal"
  ) {
    const values = view.state.values;

    const name = values.context_name_block.context_name_input.value;

    if (!name) {
      return {
        response_action: "errors",
        errors: {
          context_name_block: "Context name is required",
        },
      };
    }

    await createContext(user.slackUserId, name);

    // Refresh home tab
    await refreshHomeTab(user.slackUserId, slackTeam.id);

    return {
      response_action: "clear",
    };
  }

  // Handle edit task modal submission
  if (
    type === "view_submission" &&
    view?.callback_id.startsWith("edit_task_modal_")
  ) {
    const taskId = view.callback_id.replace("edit_task_modal_", "");
    const values = view.state.values;

    // Get title and description
    const title = values.edit_task_title_block.edit_task_title_input.value;
    const description =
      values.edit_task_description_block.edit_task_description_input.value;

    // Get selected project (handle "none" value)
    const projectId =
      values.edit_task_project_block?.edit_task_project_input
        ?.selected_option?.value;
    const finalProjectId =
      projectId && projectId !== "none" ? projectId : null;

    // Get selected context (handle "none" value)
    const contextId =
      values.edit_task_context_block?.edit_task_context_input
        ?.selected_option?.value;
    const finalContextId =
      contextId && contextId !== "none" ? contextId : null;

    // Get selected time estimate (handle "none" value)
    const timeEstimate =
      values.edit_task_time_estimate_block?.edit_task_time_estimate_input
        ?.selected_option?.value;
    const finalTimeEstimate =
      timeEstimate && timeEstimate !== "none" ? (timeEstimate as "quick" | "30min" | "1hr" | "2hr+") : null;

    // Get selected energy level (handle "none" value)
    const energyLevel =
      values.edit_task_energy_level_block?.edit_task_energy_level_input
        ?.selected_option?.value;
    const finalEnergyLevel =
      energyLevel && energyLevel !== "none" ? (energyLevel as "high" | "medium" | "low") : null;

    // Validate title
    if (!title) {
      return {
        response_action: "errors",
        errors: {
          edit_task_title_block: "Task title is required",
        },
      };
    }

    await updateTaskDetails(taskId, user.slackUserId, {
      title,
      description: description || null,
      projectId: finalProjectId,
      contextId: finalContextId,
      timeEstimate: finalTimeEstimate,
      energyLevel: finalEnergyLevel,
    });

    // Refresh home tab
    await refreshHomeTab(user.slackUserId, slackTeam.id);

    return {
      response_action: "clear",
    };
  }

  // Handle set priority modal submission
  if (
    type === "view_submission" &&
    view?.callback_id.startsWith("set_priority_modal_")
  ) {
    const taskId = view.callback_id.replace("set_priority_modal_", "");
    const values = view.state.values;

    const priority = values.priority_block.priority_input.selected_option
      ?.value as "high" | "medium" | "low";

    if (priority) {
      await updateTaskPriority(taskId, user.slackUserId, priority);
    }

    // Refresh home tab
    await refreshHomeTab(user.slackUserId, slackTeam.id);

    return {
      response_action: "clear",
    };
  }

  // Handle delete confirmation modal submission
  if (
    type === "view_submission" &&
    view?.callback_id.startsWith("delete_confirmation_modal_")
  ) {
    const taskId = view.callback_id.replace("delete_confirmation_modal_", "");
    await deleteTask(taskId, user.slackUserId);

    // Refresh home tab
    await refreshHomeTab(user.slackUserId, slackTeam.id);

    return {
      response_action: "clear",
    };
  }

  return { ok: true };
}
