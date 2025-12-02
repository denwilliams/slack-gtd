import type { Block, KnownBlock, View } from "@slack/web-api";
import type { tasks } from "@/db/schema";

interface HomeView {
  type: "home";
  blocks: (KnownBlock | Block)[];
}

interface GTDTasks {
  inbox: Array<typeof tasks.$inferSelect>;
  active: Array<typeof tasks.$inferSelect>;
  waiting: Array<typeof tasks.$inferSelect>;
  someday: Array<typeof tasks.$inferSelect>;
}

export function buildHomeTab(tasksByStatus: GTDTasks): HomeView {
  const {
    inbox: inboxTasks,
    active: allActiveTasks,
    waiting: waitingTasks,
    someday: somedayTasks,
  } = tasksByStatus;

  // Separate active tasks into scheduled (with due date) and next actions (without due date)
  const scheduledTasks = allActiveTasks.filter((t) => t.dueDate);
  const nextActionTasks = allActiveTasks.filter((t) => !t.dueDate);

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
        },
      ],
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

    inboxTasks.slice(0, 5).forEach((task) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${task.title}*${task.description ? `\n${task.description}` : ""}`,
        },
      });

      // Add label and "Is it actionable?" buttons
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "_Is this item actionable?_",
          },
        ],
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

    nextActionTasks.slice(0, 10).forEach((task) => {
      const taskBlock: KnownBlock | Block = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${task.title}*${task.description ? `\n${task.description}` : ""}${
            task.dueDate ? `\n📅 Due: ${task.dueDate.toLocaleDateString()}` : ""
          }`, // \n${getPriorityEmoji(task.priority || "medium")} ${task.priority || "medium"} priority`,
        },
        accessory: {
          type: "overflow",
          options: [
            {
              text: {
                type: "plain_text",
                text: "🗑️ Delete",
                emoji: true,
              },
              value: task.id,
            },
          ],
          action_id: `task_overflow_${task.id}`,
        },
      };

      blocks.push(taskBlock);

      // Add priority, move, and complete buttons
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "static_select",
            placeholder: {
              type: "plain_text",
              text: `${getPriorityEmoji(task.priority || "medium")} ${task.priority || "medium"}`,
              emoji: true,
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
            action_id: `change_priority_${task.id}`,
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Move",
              emoji: true,
            },
            value: task.id,
            action_id: `move_task_${task.id}`,
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Complete",
              emoji: true,
            },
            style: "primary",
            value: task.id,
            action_id: `complete_task_${task.id}`,
          },
        ],
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

    scheduledTasks.slice(0, 10).forEach((task) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${task.title}*${task.description ? `\n${task.description}` : ""}\n📅 Due: ${task.dueDate!.toLocaleDateString()}`, // \n${getPriorityEmoji(task.priority || "medium")} ${task.priority || "medium"} priority`,
        },
        accessory: {
          type: "overflow",
          options: [
            {
              text: {
                type: "plain_text",
                text: "🗑️ Delete",
                emoji: true,
              },
              value: task.id,
            },
          ],
          action_id: `task_overflow_${task.id}`,
        },
      });

      blocks.push({
        type: "actions",
        elements: [
          {
            type: "static_select",
            placeholder: {
              type: "plain_text",
              text: `${getPriorityEmoji(task.priority || "medium")} ${task.priority || "medium"}`,
              emoji: true,
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
            action_id: `change_priority_${task.id}`,
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Complete",
              emoji: true,
            },
            style: "primary",
            value: task.id,
            action_id: `complete_task_${task.id}`,
          },
        ],
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

    waitingTasks.slice(0, 10).forEach((task) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${task.title}*${task.description ? `\n${task.description}` : ""}${task.delegatedTo ? `\n👤 Waiting for: ${task.delegatedTo}` : ""}`,
        },
      });

      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Mark as Done",
              emoji: true,
            },
            style: "primary",
            value: task.id,
            action_id: `complete_task_${task.id}`,
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Delete",
              emoji: true,
            },
            style: "danger",
            value: task.id,
            action_id: `delete_task_${task.id}`,
            confirm: {
              title: {
                type: "plain_text",
                text: "Are you sure?",
              },
              text: {
                type: "mrkdwn",
                text: "Do you want to delete this task?",
              },
              confirm: {
                type: "plain_text",
                text: "Delete",
              },
              deny: {
                type: "plain_text",
                text: "Cancel",
              },
            },
          },
        ],
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

    somedayTasks.slice(0, 10).forEach((task) => {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${task.title}*${task.description ? `\n${task.description}` : ""}`,
        },
      });

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
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Delete",
              emoji: true,
            },
            style: "danger",
            value: task.id,
            action_id: `delete_task_${task.id}`,
            confirm: {
              title: {
                type: "plain_text",
                text: "Are you sure?",
              },
              text: {
                type: "mrkdwn",
                text: "Do you want to delete this task?",
              },
              confirm: {
                type: "plain_text",
                text: "Delete",
              },
              deny: {
                type: "plain_text",
                text: "Cancel",
              },
            },
          },
        ],
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

export function buildAddTaskModal(): View {
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
    blocks: [
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
      {
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
      },
    ],
  };
}
