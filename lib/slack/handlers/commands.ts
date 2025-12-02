import { findOrCreateUser } from '@/lib/services/user';
import { createTask, getUserTasks, completeTask, deleteTask } from '@/lib/services/tasks';

interface SlackCommandPayload {
  team_id: string;
  user_id: string;
  command: string;
  text: string;
  response_url: string;
}

export async function handleSlashCommand(payload: SlackCommandPayload) {
  const { team_id, user_id, text } = payload;

  // Ensure user exists
  const user = await findOrCreateUser(user_id, team_id);

  // Parse command and arguments
  const args = text.trim().split(/\s+/);
  const subcommand = args[0]?.toLowerCase() || 'help';
  const restText = args.slice(1).join(' ');

  switch (subcommand) {
    case 'add':
    case '': {
      // If no subcommand or "add", treat the whole text as a task
      const taskTitle = subcommand === 'add' ? restText : text;
      if (!taskTitle) {
        return {
          response_type: 'ephemeral',
          text: 'Please provide a task title. Usage: `/gtd add [task title]` or `/gtd [task title]`',
        };
      }

      const task = await createTask(user.id, taskTitle);
      return {
        response_type: 'ephemeral',
        text: `✅ Task added: "${task.title}"`,
      };
    }

    case 'list': {
      const tasks = await getUserTasks(user.id);
      if (tasks.length === 0) {
        return {
          response_type: 'ephemeral',
          text: 'You have no active tasks! 🎉',
        };
      }

      const taskList = tasks
        .map((task, idx) => `${idx + 1}. ${task.title} (ID: ${task.id.substring(0, 8)})`)
        .join('\n');

      return {
        response_type: 'ephemeral',
        text: `*Your active tasks:*\n${taskList}`,
      };
    }

    case 'complete': {
      if (!restText) {
        return {
          response_type: 'ephemeral',
          text: 'Please provide a task ID. Usage: `/gtd complete [task-id]`',
        };
      }

      try {
        const task = await completeTask(restText, user.id);
        return {
          response_type: 'ephemeral',
          text: `✅ Task completed: "${task.title}"`,
        };
      } catch (error) {
        return {
          response_type: 'ephemeral',
          text: '❌ Task not found or already completed.',
        };
      }
    }

    case 'delete': {
      if (!restText) {
        return {
          response_type: 'ephemeral',
          text: 'Please provide a task ID. Usage: `/gtd delete [task-id]`',
        };
      }

      try {
        await deleteTask(restText, user.id);
        return {
          response_type: 'ephemeral',
          text: '🗑️ Task deleted.',
        };
      } catch (error) {
        return {
          response_type: 'ephemeral',
          text: '❌ Task not found.',
        };
      }
    }

    case 'help':
    default: {
      return {
        response_type: 'ephemeral',
        text: `*GTD Bot Commands:*
• \`/gtd [task]\` - Quick add a task
• \`/gtd add [task]\` - Add a new task
• \`/gtd list\` - List all active tasks
• \`/gtd complete [task-id]\` - Mark task as complete
• \`/gtd delete [task-id]\` - Delete a task
• \`/gtd help\` - Show this help message`,
      };
    }
  }
}
