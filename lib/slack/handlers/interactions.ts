import { completeTask, deleteTask } from '@/lib/services/tasks';
import { refreshHomeTab } from './home';
import { findOrCreateUser } from '@/lib/services/user';

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
}

export async function handleInteraction(payload: InteractionPayload) {
  const { user: slackUser, team: slackTeam, actions, type } = payload;

  const user = await findOrCreateUser(slackUser.id, slackTeam.id);
  
  if (type === 'block_actions' && actions && actions.length > 0) {
    const action = actions[0];

    // Handle complete task button
    if (action.action_id.startsWith('complete_task_')) {
      const taskId = action.value;
      await completeTask(taskId, user.slackUserId);

      // Refresh home tab
      await refreshHomeTab(user.slackUserId, slackTeam.id);

      return {
        response_action: 'update',
        view: {},
      };
    }

    // Handle delete task button
    if (action.action_id.startsWith('delete_task_')) {
      const taskId = action.value;
      await deleteTask(taskId, user.  slackUserId);

      // Refresh home tab
      await refreshHomeTab(user.slackUserId, slackTeam.id);

      return {
        response_action: 'update',
        view: {},
      };
    }

    // Handle open add task modal
    if (action.action_id === 'open_add_task_modal') {
      // TODO: Open modal for adding task
      return {
        response_action: 'errors',
        errors: {
          task_title: 'Modal not implemented yet. Use /gtd add [task] instead.',
        },
      };
    }
  }

  return { ok: true };
}
