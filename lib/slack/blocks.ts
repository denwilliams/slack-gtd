import type { Block, KnownBlock, View } from "@slack/web-api";
import type { tasks, projects, contexts } from "@/db/schema";

interface HomeView {
  type: "home";
  blocks: (KnownBlock | Block)[];
}

interface TaskWithRelations {
  task: typeof tasks.$inferSelect;
  project: typeof projects.$inferSelect | null;
  context: typeof contexts.$inferSelect | null;
}

interface GTDTasks {
  inbox: Array<TaskWithRelations>;
  active: Array<TaskWithRelations>;
  waiting: Array<TaskWithRelations>;
  someday: Array<TaskWithRelations>;
}

export function buildHomeTab(tasksByStatus: GTDTasks): HomeView {
  const {
    inbox: inboxTasks,
    active: allActiveTasks,
    waiting: waitingTasks,
    someday: somedayTasks,
  } = tasksByStatus;

  // Separate active tasks into scheduled (with due date) and next actions (without due date)
  const scheduledTasks = allActiveTasks.filter((t) => t.task.dueDate && t.task.dueDate.getTime() > Date.now());
  const nextActionTasks = allActiveTasks.filter((t) => !t.task.dueDate || t.task.dueDate.getTime() <= Date.now());

  // Sort next actions and scheduled tasks
  nextActionTasks.sort((a: TaskWithRelations, b: TaskWithRelations) => {
    // Sort function: priority first (high > medium > low), then oldest first
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.task.priority as keyof typeof priorityOrder] ?? 1;
    const bPriority = priorityOrder[b.task.priority as keyof typeof priorityOrder] ?? 1;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return new Date(a.task.createdAt).getTime() - new Date(b.task.createdAt).getTime();
  });
  scheduledTasks.sort((a: TaskWithRelations, b: TaskWithRelations) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.task.priority as keyof typeof priorityOrder] ?? 1;
    const bPriority = priorityOrder[b.task.priority as keyof typeof priorityOrder] ?? 1;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    return new Date(a.task.dueDate!).getTime() - new Date(b.task.dueDate!).getTime();
  });

  const blocks: (KnownBlock | Block)[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📋 Your GTD Dashboard",
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `📥 Inbox: *${inboxTasks.length}* • ✅ Next Actions: *${nextActionTasks.length}* • 📅 Scheduled: *${scheduledTasks.length}* • ⏳ Waiting: *${waitingTasks.length}* • 💭 Someday: *${somedayTasks.length}*`,
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "➕ Add New Task",
            emoji: true,
          },
          action_id: "open_add_task_modal",
          style: "primary",
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "📁 New Project",
            emoji: true,
          },
          action_id: "open_add_project_modal",
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "🏷️ New Context",
            emoji: true,
          },
          action_id: "open_add_context_modal",
        },
      ],
    },
    {
      type: "divider",
    },
  ];

  // Inbox section - items to clarify
  if (inboxTasks.length > 0) {
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: "📥 Inbox - Clarify Items",
        emoji: true,
      },
    });

    inboxTasks.slice(0, 5).forEach(({ task, project, context }) => {
      // Build task text with project and context info
      let taskText = `*${task.title}*`;
      if (task.description?.trim()) {
        taskText += `\n${task.description.trim()}`;
      }

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: taskText,
        },
      });

      // Add context with project and context info
      const contextElements: { type: "mrkdwn"; text: string }[] = [];
      if (project) {
        contextElements.push({
          type: "mrkdwn" as const,
          text: `📁 ${project.name}`,
        });
      }
      if (context) {
        contextElements.push({
          type: "mrkdwn" as const,
          text: `🏷️ ${context.name}`,
        });
      }
      contextElements.push({
        type: "mrkdwn" as const,
        text: "_Is this item actionable?_",
      });

      blocks.push({
        type: "context",
        elements: contextElements,
      });

      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Yes",
              emoji: true,
            },
            style: "primary",
            value: task.id,
            action_id: `clarify_actionable_${task.id}`,
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "No",
              emoji: true,
            },
            style: "danger",
            value: task.id,
            action_id: `clarify_not_actionable_${task.id}`,
          },
        ],
      });

      // Add divider between tasks
      blocks.push({
        type: "divider",
      });
    });

    if (inboxTasks.length > 5) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_Showing 5 of ${inboxTasks.length} inbox items._`,
          },
        ],
      });
    }

    blocks.push({
      type: "divider",
    });
  }

  // Next Actions section (active tasks without due dates)
  if (nextActionTasks.length > 0) {
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: "✅ Next Actions",
        emoji: true,
      },
    });

    nextActionTasks.slice(0, 10).forEach(({ task, project, context }) => {
      const taskBlock: KnownBlock | Block = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${task.title}*${task.description?.trim() ? `\n${task.description.trim()}` : ""}`,
        },
        accessory: {
          type: "overflow",
          options: [
            {
              text: {
                type: "plain_text",
                text: "✅ Complete",
                emoji: true,
              },
              value: `complete:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "🎯 Set Priority",
                emoji: true,
              },
              value: `set_priority:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "✏️ Edit",
                emoji: true,
              },
              value: `edit:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "📦 Move",
                emoji: true,
              },
              value: `move:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "🗑️ Delete",
                emoji: true,
              },
              value: `delete:${task.id}`,
            },
          ],
          action_id: `task_overflow_${task.id}`,
        },
      };

      blocks.push(taskBlock);

      // Add context with project, context, due date, and priority
      const contextElements: { type: "mrkdwn"; text: string }[] = [];
      if (project) {
        contextElements.push({
          type: "mrkdwn" as const,
          text: `📁 ${project.name}`,
        });
      }
      if (context) {
        contextElements.push({
          type: "mrkdwn" as const,
          text: `🏷️ ${context.name}`,
        });
      }
      if (task.dueDate) {
        contextElements.push({
          type: "mrkdwn" as const,
          text: `📅 ${task.dueDate.toISOString().split("T")[0]}`,
        });
      }
      contextElements.push({
        type: "mrkdwn" as const,
        text: `${getPriorityEmoji(task.priority || "medium")} ${task.priority || "medium"}`,
      });

      blocks.push({
        type: "context",
        elements: contextElements,
      });

      // Add divider between tasks
      blocks.push({
        type: "divider",
      });
    });

    if (nextActionTasks.length > 10) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_Showing 10 of ${nextActionTasks.length} tasks. Use \`/gtd list\` to see all._`,
          },
        ],
      });
    }
  } else {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "🎉 *No next actions!* Use `/gtd add [task]` to create one.",
      },
    });
  }

  blocks.push({
    type: "divider",
  });

  // Scheduled section (active tasks with due dates)
  if (scheduledTasks.length > 0) {
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: "📅 Scheduled",
        emoji: true,
      },
    });

    scheduledTasks.slice(0, 10).forEach(({ task, project, context }) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${task.title}*${task.description?.trim() ? `\n${task.description.trim()}` : ""}`,
        },
        accessory: {
          type: "overflow",
          options: [
            {
              text: {
                type: "plain_text",
                text: "✅ Complete",
                emoji: true,
              },
              value: `complete:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "🎯 Set Priority",
                emoji: true,
              },
              value: `set_priority:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "✏️ Edit",
                emoji: true,
              },
              value: `edit:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "📦 Move",
                emoji: true,
              },
              value: `move:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "🗑️ Delete",
                emoji: true,
              },
              value: `delete:${task.id}`,
            },
          ],
          action_id: `task_overflow_${task.id}`,
        },
      });

      // Add context with project, context, due date, and priority
      const contextElements: { type: "mrkdwn"; text: string }[] = [];
      if (project) {
        contextElements.push({
          type: "mrkdwn" as const,
          text: `📁 ${project.name}`,
        });
      }
      if (context) {
        contextElements.push({
          type: "mrkdwn" as const,
          text: `🏷️ ${context.name}`,
        });
      }
      contextElements.push({
        type: "mrkdwn" as const,
        text: `📅 ${task.dueDate!.toISOString().split("T")[0]}`,
      });
      contextElements.push({
        type: "mrkdwn" as const,
        text: `${getPriorityEmoji(task.priority || "medium")} ${task.priority || "medium"}`,
      });

      blocks.push({
        type: "context",
        elements: contextElements,
      });

      // Add divider between tasks
      blocks.push({
        type: "divider",
      });
    });

    blocks.push({
      type: "divider",
    });
  }

  // Waiting For section
  if (waitingTasks.length > 0) {
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: "⏳ Waiting For",
        emoji: true,
      },
    });

    waitingTasks.slice(0, 10).forEach(({ task, project, context }) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${task.title}*${task.description?.trim() ? `\n${task.description.trim()}` : ""}`,
        },
        accessory: {
          type: "overflow",
          options: [
            {
              text: {
                type: "plain_text",
                text: "✅ Mark as Done",
                emoji: true,
              },
              value: `complete:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "🎯 Set Priority",
                emoji: true,
              },
              value: `set_priority:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "✏️ Edit",
                emoji: true,
              },
              value: `edit:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "📦 Move",
                emoji: true,
              },
              value: `move:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "🗑️ Delete",
                emoji: true,
              },
              value: `delete:${task.id}`,
            },
          ],
          action_id: `task_overflow_${task.id}`,
        },
      });

      // Add context with project, context, and delegated person
      const contextElements: { type: "mrkdwn"; text: string }[] = [];
      if (project) {
        contextElements.push({
          type: "mrkdwn" as const,
          text: `📁 ${project.name}`,
        });
      }
      if (context) {
        contextElements.push({
          type: "mrkdwn" as const,
          text: `🏷️ ${context.name}`,
        });
      }
      if (task.delegatedTo) {
        contextElements.push({
          type: "mrkdwn" as const,
          text: `👤 Waiting for: ${task.delegatedTo}`,
        });
      }

      if (contextElements.length > 0) {
        blocks.push({
          type: "context",
          elements: contextElements,
        });
      }

      // Add divider between tasks
      blocks.push({
        type: "divider",
      });
    });

    blocks.push({
      type: "divider",
    });
  }

  // Someday/Maybe section
  if (somedayTasks.length > 0) {
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: "💭 Someday/Maybe",
        emoji: true,
      },
    });

    somedayTasks.slice(0, 10).forEach(({ task, project, context }) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${task.title}*${task.description?.trim() ? `\n${task.description.trim()}` : ""}`,
        },
        accessory: {
          type: "overflow",
          options: [
            {
              text: {
                type: "plain_text",
                text: "🎯 Set Priority",
                emoji: true,
              },
              value: `set_priority:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "✏️ Edit",
                emoji: true,
              },
              value: `edit:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "📦 Move",
                emoji: true,
              },
              value: `move:${task.id}`,
            },
            {
              text: {
                type: "plain_text",
                text: "🗑️ Delete",
                emoji: true,
              },
              value: `delete:${task.id}`,
            },
          ],
          action_id: `task_overflow_${task.id}`,
        },
      });

      // Add context with project and context info
      const contextElements: { type: "mrkdwn"; text: string }[] = [];
      if (project) {
        contextElements.push({
          type: "mrkdwn" as const,
          text: `📁 ${project.name}`,
        });
      }
      if (context) {
        contextElements.push({
          type: "mrkdwn" as const,
          text: `🏷️ ${context.name}`,
        });
      }

      if (contextElements.length > 0) {
        blocks.push({
          type: "context",
          elements: contextElements,
        });
      }

      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Move to Active",
              emoji: true,
            },
            style: "primary",
            value: task.id,
            action_id: `activate_task_${task.id}`,
          },
        ],
      });

      // Add divider between tasks
      blocks.push({
        type: "divider",
      });
    });

    blocks.push({
      type: "divider",
    });
  }

  return {
    type: "home",
    blocks,
  };
}

function getPriorityEmoji(priority: string): string {
  switch (priority) {
    case "high":
      return "🔴";
    case "medium":
      return "🟡";
    case "low":
      return "🟢";
    default:
      return "⚪";
  }
}

export function buildNotActionableModal(taskId: string): View {
  return {
    type: "modal",
    callback_id: `not_actionable_modal_${taskId}`,
    title: {
      type: "plain_text",
      text: "Not Actionable",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "Confirm",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "What would you like to do with this item?",
        },
      },
      {
        type: "input",
        block_id: "action_block",
        element: {
          type: "radio_buttons",
          action_id: "action_input",
          options: [
            {
              text: {
                type: "plain_text",
                text: "🗑️ Trash (Delete it)",
                emoji: true,
              },
              value: "trash",
            },
            {
              text: {
                type: "plain_text",
                text: "💭 Someday/Maybe (Review later)",
                emoji: true,
              },
              value: "someday",
            },
            {
              text: {
                type: "plain_text",
                text: "📚 Reference (Archive for reference)",
                emoji: true,
              },
              value: "reference",
            },
          ],
          initial_option: {
            text: {
              type: "plain_text",
              text: "🗑️ Trash (Delete it)",
              emoji: true,
            },
            value: "trash",
          },
        },
        label: {
          type: "plain_text",
          text: "Choose action",
          emoji: true,
        },
      },
    ],
  };
}

export function buildActionableModal(taskId: string): View {
  return {
    type: "modal",
    callback_id: `actionable_modal_${taskId}`,
    title: {
      type: "plain_text",
      text: "Actionable Item",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "Confirm",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "How would you like to handle this task?",
        },
      },
      {
        type: "input",
        block_id: "action_block",
        element: {
          type: "radio_buttons",
          action_id: "action_input",
          options: [
            {
              text: {
                type: "plain_text",
                text: "⏳ Someone else can do it - Delegate/Waiting for someone",
                emoji: true,
              },
              value: "delegate",
            },
            {
              text: {
                type: "plain_text",
                text: "⚡ I can do it now quickly (<2 minutes)",
                emoji: true,
              },
              value: "do_now",
            },
            {
              text: {
                type: "plain_text",
                text: "📝 Do it later (> 2 minutes)",
                emoji: true,
              },
              value: "do_later",
            },
            {
              text: {
                type: "plain_text",
                text: "📅 Schedule it (Set due date)",
                emoji: true,
              },
              value: "schedule",
            },
          ],
          initial_option: {
            text: {
              type: "plain_text",
              text: "📝 Do it later (> 2 minutes)",
              emoji: true,
            },
            value: "do_later",
          },
        },
        label: {
          type: "plain_text",
          text: "Choose action",
          emoji: true,
        },
      },
      {
        type: "input",
        block_id: "due_date_block",
        element: {
          type: "datepicker",
          action_id: "due_date_input",
          placeholder: {
            type: "plain_text",
            text: "Select a date",
          },
        },
        label: {
          type: "plain_text",
          text: "Due date (for scheduled tasks)",
          emoji: true,
        },
        optional: true,
      },
      {
        type: "input",
        block_id: "delegated_to_block",
        element: {
          type: "plain_text_input",
          action_id: "delegated_to_input",
          placeholder: {
            type: "plain_text",
            text: "Enter person's name",
          },
        },
        label: {
          type: "plain_text",
          text: "Delegated to (for waiting items)",
          emoji: true,
        },
        optional: true,
      },
    ],
  };
}

export function buildMoveTaskModal(taskId: string): View {
  return {
    type: "modal",
    callback_id: `move_task_modal_${taskId}`,
    title: {
      type: "plain_text",
      text: "Move Task",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "Move",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Where would you like to move this task?",
        },
      },
      {
        type: "input",
        block_id: "move_to_block",
        element: {
          type: "radio_buttons",
          action_id: "move_to_input",
          options: [
            {
              text: {
                type: "plain_text",
                text: "✅ Next Actions",
                emoji: true,
              },
              value: "next_actions",
            },
            {
              text: {
                type: "plain_text",
                text: "📅 Scheduled (set due date)",
                emoji: true,
              },
              value: "scheduled",
            },
            {
              text: {
                type: "plain_text",
                text: "⏳ Waiting For (delegate)",
                emoji: true,
              },
              value: "waiting",
            },
            {
              text: {
                type: "plain_text",
                text: "💭 Someday/Maybe",
                emoji: true,
              },
              value: "someday",
            },
          ],
        },
        label: {
          type: "plain_text",
          text: "Move to",
          emoji: true,
        },
      },
      {
        type: "input",
        block_id: "due_date_block",
        element: {
          type: "datepicker",
          action_id: "due_date_input",
          placeholder: {
            type: "plain_text",
            text: "Select a date",
          },
        },
        label: {
          type: "plain_text",
          text: "Due date (for Scheduled)",
          emoji: true,
        },
        optional: true,
      },
      {
        type: "input",
        block_id: "delegated_to_block",
        element: {
          type: "plain_text_input",
          action_id: "delegated_to_input",
          placeholder: {
            type: "plain_text",
            text: "Enter person's name",
          },
        },
        label: {
          type: "plain_text",
          text: "Delegated to (for Waiting For)",
          emoji: true,
        },
        optional: true,
      },
    ],
  };
}

export function buildAddTaskModal(
  userProjects: Array<typeof projects.$inferSelect> = [],
  userContexts: Array<typeof contexts.$inferSelect> = [],
): View {
  const blocks: any[] = [
    {
      type: "input",
      block_id: "task_title_block",
      element: {
        type: "plain_text_input",
        action_id: "task_title_input",
        placeholder: {
          type: "plain_text",
          text: "Enter task title",
        },
        max_length: 500,
      },
      label: {
        type: "plain_text",
        text: "Task Title",
        emoji: true,
      },
    },
    {
      type: "input",
      block_id: "task_description_block",
      element: {
        type: "plain_text_input",
        action_id: "task_description_input",
        multiline: true,
        placeholder: {
          type: "plain_text",
          text: "Add more details (optional)",
        },
      },
      label: {
        type: "plain_text",
        text: "Description",
        emoji: true,
      },
      optional: true,
    },
  ];

  // Add project selector if projects exist
  if (userProjects.length > 0) {
    blocks.push({
      type: "input",
      block_id: "task_project_block",
      element: {
        type: "static_select",
        action_id: "task_project_input",
        placeholder: {
          type: "plain_text",
          text: "Select project (optional)",
        },
        options: userProjects.map((project) => ({
          text: {
            type: "plain_text",
            text: project.name,
            emoji: true,
          },
          value: project.id,
        })),
      },
      label: {
        type: "plain_text",
        text: "Project",
        emoji: true,
      },
      optional: true,
    });
  }

  // Add context selector if contexts exist
  if (userContexts.length > 0) {
    blocks.push({
      type: "input",
      block_id: "task_context_block",
      element: {
        type: "static_select",
        action_id: "task_context_input",
        placeholder: {
          type: "plain_text",
          text: "Select context (optional)",
        },
        options: userContexts.map((context) => ({
          text: {
            type: "plain_text",
            text: context.name,
            emoji: true,
          },
          value: context.id,
        })),
      },
      label: {
        type: "plain_text",
        text: "Context",
        emoji: true,
      },
      optional: true,
    });
  }

  blocks.push({
    type: "input",
    block_id: "task_priority_block",
    element: {
      type: "static_select",
      action_id: "task_priority_input",
      placeholder: {
        type: "plain_text",
        text: "Select priority",
      },
      options: [
        {
          text: {
            type: "plain_text",
            text: "🔴 High",
            emoji: true,
          },
          value: "high",
        },
        {
          text: {
            type: "plain_text",
            text: "🟡 Medium",
            emoji: true,
          },
          value: "medium",
        },
        {
          text: {
            type: "plain_text",
            text: "🟢 Low",
            emoji: true,
          },
          value: "low",
        },
      ],
      initial_option: {
        text: {
          type: "plain_text",
          text: "🟡 Medium",
          emoji: true,
        },
        value: "medium",
      },
    },
    label: {
      type: "plain_text",
      text: "Priority",
      emoji: true,
    },
  });

  return {
    type: "modal",
    callback_id: "add_task_modal",
    title: {
      type: "plain_text",
      text: "Add New Task",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "Create",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    blocks,
  };
}

export function buildAddProjectModal(): View {
  return {
    type: "modal",
    callback_id: "add_project_modal",
    title: {
      type: "plain_text",
      text: "New Project",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "Create",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    blocks: [
      {
        type: "input",
        block_id: "project_name_block",
        element: {
          type: "plain_text_input",
          action_id: "project_name_input",
          placeholder: {
            type: "plain_text",
            text: "Enter project name",
          },
          max_length: 255,
        },
        label: {
          type: "plain_text",
          text: "Project Name",
          emoji: true,
        },
      },
      {
        type: "input",
        block_id: "project_description_block",
        element: {
          type: "plain_text_input",
          action_id: "project_description_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Add project description (optional)",
          },
        },
        label: {
          type: "plain_text",
          text: "Description",
          emoji: true,
        },
        optional: true,
      },
    ],
  };
}

export function buildAddContextModal(): View {
  return {
    type: "modal",
    callback_id: "add_context_modal",
    title: {
      type: "plain_text",
      text: "New Context",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "Create",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    blocks: [
      {
        type: "input",
        block_id: "context_name_block",
        element: {
          type: "plain_text_input",
          action_id: "context_name_input",
          placeholder: {
            type: "plain_text",
            text: "Enter context name (e.g., @home, @computer)",
          },
          max_length: 255,
        },
        label: {
          type: "plain_text",
          text: "Context Name",
          emoji: true,
        },
      },
    ],
  };
}

export function buildEditTaskModal(
  taskId: string,
  currentProjectId: string | null,
  currentContextId: string | null,
  userProjects: Array<typeof projects.$inferSelect>,
  userContexts: Array<typeof contexts.$inferSelect>,
): View {
  const blocks: any[] = [];

  // Add project selector
  if (userProjects.length > 0) {
    const projectOptions = userProjects.map((project) => ({
      text: {
        type: "plain_text",
        text: project.name,
        emoji: true,
      },
      value: project.id,
    }));

    // Add "None" option at the beginning
    projectOptions.unshift({
      text: {
        type: "plain_text",
        text: "None",
        emoji: true,
      },
      value: "none",
    });

    const projectBlock: any = {
      type: "input",
      block_id: "edit_task_project_block",
      element: {
        type: "static_select",
        action_id: "edit_task_project_input",
        placeholder: {
          type: "plain_text",
          text: "Select project",
        },
        options: projectOptions,
      },
      label: {
        type: "plain_text",
        text: "Project",
        emoji: true,
      },
      optional: true,
    };

    // Set initial option if task has a project
    if (currentProjectId) {
      const currentProject = userProjects.find((p) => p.id === currentProjectId);
      if (currentProject) {
        projectBlock.element.initial_option = {
          text: {
            type: "plain_text",
            text: currentProject.name,
            emoji: true,
          },
          value: currentProject.id,
        };
      }
    }

    blocks.push(projectBlock);
  }

  // Add context selector
  if (userContexts.length > 0) {
    const contextOptions = userContexts.map((context) => ({
      text: {
        type: "plain_text",
        text: context.name,
        emoji: true,
      },
      value: context.id,
    }));

    // Add "None" option at the beginning
    contextOptions.unshift({
      text: {
        type: "plain_text",
        text: "None",
        emoji: true,
      },
      value: "none",
    });

    const contextBlock: any = {
      type: "input",
      block_id: "edit_task_context_block",
      element: {
        type: "static_select",
        action_id: "edit_task_context_input",
        placeholder: {
          type: "plain_text",
          text: "Select context",
        },
        options: contextOptions,
      },
      label: {
        type: "plain_text",
        text: "Context",
        emoji: true,
      },
      optional: true,
    };

    // Set initial option if task has a context
    if (currentContextId) {
      const currentContext = userContexts.find((c) => c.id === currentContextId);
      if (currentContext) {
        contextBlock.element.initial_option = {
          text: {
            type: "plain_text",
            text: currentContext.name,
            emoji: true,
          },
          value: currentContext.id,
        };
      }
    }

    blocks.push(contextBlock);
  }

  // If no projects or contexts, show a message
  if (blocks.length === 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "You don't have any projects or contexts yet.\n\nCreate them using the buttons on the Home tab!",
      },
    });
  }

  return {
    type: "modal",
    callback_id: `edit_task_modal_${taskId}`,
    title: {
      type: "plain_text",
      text: "Edit Task",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "Save",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    blocks,
  };
}

export function buildSetPriorityModal(taskId: string): View {
  return {
    type: "modal",
    callback_id: `set_priority_modal_${taskId}`,
    title: {
      type: "plain_text",
      text: "Set Priority",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "Save",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    blocks: [
      {
        type: "input",
        block_id: "priority_block",
        element: {
          type: "radio_buttons",
          action_id: "priority_input",
          options: [
            {
              text: {
                type: "plain_text",
                text: "🔴 High Priority",
                emoji: true,
              },
              value: "high",
            },
            {
              text: {
                type: "plain_text",
                text: "🟡 Medium Priority",
                emoji: true,
              },
              value: "medium",
            },
            {
              text: {
                type: "plain_text",
                text: "🟢 Low Priority",
                emoji: true,
              },
              value: "low",
            },
          ],
          initial_option: {
            text: {
              type: "plain_text",
              text: "🟡 Medium Priority",
              emoji: true,
            },
            value: "medium",
          },
        },
        label: {
          type: "plain_text",
          text: "Choose priority level",
          emoji: true,
        },
      },
    ],
  };
}
