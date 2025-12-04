import {
  completeTask,
  createTask,
  deleteTask,
  getUserTasks,
  createContext,
  getUserContexts,
  createProject,
  getUserProjects,
} from "@/lib/services/tasks";
import { findOrCreateUser } from "@/lib/services/user";

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
  const subcommand = args[0]?.toLowerCase() || "help";
  const restText = args.slice(1).join(" ");

  switch (subcommand) {
    case "add":
    case "": {
      // If no subcommand or "add", treat the whole text as a task
      const taskTitle = subcommand === "add" ? restText : text;
      if (!taskTitle) {
        return {
          response_type: "ephemeral",
          text: "Please provide a task title. Usage: `/gtd add [task title]` or `/gtd [task title]`",
        };
      }

      const task = await createTask(user.slackUserId, taskTitle);
      return {
        response_type: "ephemeral",
        text: `✅ Task added: "${task.title}"`,
      };
    }

    case "list": {
      const tasks = await getUserTasks(user.slackUserId);
      if (tasks.length === 0) {
        return {
          response_type: "ephemeral",
          text: "You have no active tasks! 🎉",
        };
      }

      const taskList = tasks
        .map(
          (task, idx) =>
            `${idx + 1}. ${task.title} (ID: ${task.id.substring(0, 8)})`,
        )
        .join("\n");

      return {
        response_type: "ephemeral",
        text: `*Your active tasks:*\n${taskList}`,
      };
    }

    case "complete": {
      if (!restText) {
        return {
          response_type: "ephemeral",
          text: "Please provide a task ID. Usage: `/gtd complete [task-id]`",
        };
      }

      try {
        const task = await completeTask(restText, user.slackUserId);
        return {
          response_type: "ephemeral",
          text: `✅ Task completed: "${task.title}"`,
        };
      } catch (_error) {
        return {
          response_type: "ephemeral",
          text: "❌ Task not found or already completed.",
        };
      }
    }

    case "delete": {
      if (!restText) {
        return {
          response_type: "ephemeral",
          text: "Please provide a task ID. Usage: `/gtd delete [task-id]`",
        };
      }

      try {
        await deleteTask(restText, user.slackUserId);
        return {
          response_type: "ephemeral",
          text: "🗑️ Task deleted.",
        };
      } catch (_error) {
        return {
          response_type: "ephemeral",
          text: "❌ Task not found.",
        };
      }
    }

    case "add-context": {
      if (!restText) {
        return {
          response_type: "ephemeral",
          text: "Please provide a context name. Usage: `/gtd add-context [name]`\nExample: `/gtd add-context @computer`",
        };
      }

      const context = await createContext(user.slackUserId, restText);
      return {
        response_type: "ephemeral",
        text: `✅ Context added: "${context.name}" (ID: ${context.id})`,
      };
    }

    case "contexts": {
      const contexts = await getUserContexts(user.slackUserId);
      if (contexts.length === 0) {
        return {
          response_type: "ephemeral",
          text: "You have no contexts yet. Add one with `/gtd add-context [name]`",
        };
      }

      const contextList = contexts
        .map((context) => `• ${context.name} (ID: ${context.id})`)
        .join("\n");

      return {
        response_type: "ephemeral",
        text: `*Your contexts:*\n${contextList}`,
      };
    }

    case "add-project": {
      if (!restText) {
        return {
          response_type: "ephemeral",
          text: "Please provide a project name. Usage: `/gtd add-project [name]`\nExample: `/gtd add-project Website Redesign`",
        };
      }

      const project = await createProject(user.slackUserId, restText);
      return {
        response_type: "ephemeral",
        text: `✅ Project added: "${project.name}" (ID: ${project.id})`,
      };
    }

    case "projects": {
      const projects = await getUserProjects(user.slackUserId);
      if (projects.length === 0) {
        return {
          response_type: "ephemeral",
          text: "You have no projects yet. Add one with `/gtd add-project [name]`",
        };
      }

      const projectList = projects
        .map((project) => `• ${project.name} (ID: ${project.id})`)
        .join("\n");

      return {
        response_type: "ephemeral",
        text: `*Your projects:*\n${projectList}`,
      };
    }

    default: {
      return {
        response_type: "ephemeral",
        text: `*GTD Bot Commands:*

*Tasks:*
• \`/gtd [task]\` - Quick add a task
• \`/gtd add [task]\` - Add a new task
• \`/gtd list\` - List all active tasks
• \`/gtd complete [task-id]\` - Mark task as complete
• \`/gtd delete [task-id]\` - Delete a task

*Projects:*
• \`/gtd add-project [name]\` - Create a new project (e.g., Website Redesign)
• \`/gtd projects\` - List all your projects

*Contexts:*
• \`/gtd add-context [name]\` - Create a new context (e.g., @computer, @home)
• \`/gtd contexts\` - List all your contexts

• \`/gtd help\` - Show this help message`,
      };
    }
  }
}
