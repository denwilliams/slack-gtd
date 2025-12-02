import type { Block, KnownBlock, View } from "@slack/web-api";
import type { tasks } from "@/db/schema";

interface HomeView {
  type: "home";
  blocks: (KnownBlock | Block)[];
}

export function buildHomeTab(
  userTasks: Array<typeof tasks.$inferSelect>,
): HomeView {
  const activeTasks = userTasks.filter((t) => t.status === "active");
  const completedTasks = userTasks.filter((t) => t.status === "completed");

  const blocks: (KnownBlock | Block)[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📋 Your GTD Tasks",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `You have *${activeTasks.length}* active tasks and *${completedTasks.length}* completed tasks.`,
      },
    },
    {
      type: "divider",
    },
  ];

  // Active tasks section
  if (activeTasks.length > 0) {
    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: "✅ Active Tasks",
        emoji: true,
      },
    });

    activeTasks.slice(0, 10).forEach((task) => {
      const taskBlock: KnownBlock | Block = {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${task.title}*${task.description ? `\n${task.description}` : ""}${
            task.dueDate ? `\n📅 Due: ${task.dueDate.toLocaleDateString()}` : ""
          }\n${getPriorityEmoji(task.priority || "medium")} ${task.priority || "medium"} priority`,
        },
        accessory: {
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
      };

      blocks.push(taskBlock);

      // Add priority and delete buttons
      blocks.push({
        type: "actions",
        elements: [
          {
            type: "static_select",
            placeholder: {
              type: "plain_text",
              text: "Change priority",
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

    if (activeTasks.length > 10) {
      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_Showing 10 of ${activeTasks.length} tasks. Use \`/gtd list\` to see all._`,
          },
        ],
      });
    }
  } else {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "🎉 *No active tasks!* Use `/gtd add [task]` to create one.",
      },
    });
  }

  blocks.push({
    type: "divider",
  });

  // Add task button
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "➕ Add New Task",
          emoji: true,
        },
        style: "primary",
        action_id: "open_add_task_modal",
      },
    ],
  });

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
