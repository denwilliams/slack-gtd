# Slack GTD Bot

A Slack bot that helps you implement the Getting Things Done (GTD) methodology by allowing you to capture tasks, organize them, and review your to-do lists directly within Slack.

## Features

- Capture tasks quickly using Slack commands.
- Organize tasks into projects, contexts, and due dates.
- Review and manage your tasks with simple commands.
- Receive reminders for upcoming tasks. 
- User-friendly "Home" interface within Slack that displays your tasks and projects with buttons for actions.
- Supports multiple users on the same Slack workspace (each user has their own task list).

### Future Enhancement Ideas
- Integrate with other productivity tools.
- Support collaborative task management.
- Customizable settings to fit your workflow.
- Automated task prioritization based on deadlines and importance.
- Integration with calendar apps for seamless scheduling.
- Customizable notifications and alerts.
- Collaboration features for team task management.
- Backup and export options for task data.
- API access for advanced integrations.
- Support for keyboard shortcuts to enhance productivity.
- Integration with voice assistants for hands-free task management.
- Custom task templates for recurring tasks.

### Future Goals
- Regular updates and improvements based on user feedback.
- Open-source and community-driven development.
- Comprehensive documentation and support.
- Easy installation and setup process.
- Scalable architecture to handle growing user bases.
- Analytics and reporting features to track productivity.
- Multi-language support for global users.
- Mobile-friendly design for on-the-go task management.
- Regular security updates to protect user data.
- Open architecture for third-party plugin development.
- Community forums for user support and idea sharing.
- Free to use with optional premium features.
- Active development with frequent feature additions.
- Comprehensive testing to ensure reliability and performance.
- User feedback-driven roadmap for future enhancements.
- Cross-platform compatibility for various devices and operating systems.
- Detailed changelog documenting all updates and changes.

# Technologies Used

- Next.js 16
- Hono (web framework)
- Node.js
- Slack API
- Drizzle ORM
- Neon (serverless PostgreSQL)
- Vercel (serverless deployment)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Neon Database

1. Create a Neon database at [neon.tech](https://neon.tech)
2. Copy the connection string

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Slack Bot Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret

# Neon Database
DATABASE_URL=postgres://username:password@hostname/database?sslmode=require

# Cron Job Security (required for reminders)
CRON_SECRET=your-random-cron-secret-here
API_SECRET=your-random-api-secret-here
```

### 4. Run Database Migrations

```bash
npm run db:generate
npm run db:push
```

### 5. Set Up Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Under **OAuth & Permissions**, add these Bot Token Scopes:
   - `commands`
   - `chat:write`
   - `users:read`
3. Under **Slash Commands**, create a command:
   - Command: `/gtd`
   - Request URL: `https://your-app.vercel.app/api/slack/commands`
   - Description: "Manage your GTD tasks"
4. Under **Event Subscriptions**, enable events:
   - Request URL: `https://your-app.vercel.app/api/slack/events`
5. Under **Interactivity & Shortcuts**, enable interactivity:
   - Request URL: `https://your-app.vercel.app/api/slack/interactions`
6. Install the app to your workspace and copy the Bot Token

### 6. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the landing page.

### 7. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Then deploy to production
vercel --prod
```

## Available Commands

- `/gtd [task]` - Quick add a task
- `/gtd add [task]` - Add a new task
- `/gtd list` - List all active tasks
- `/gtd complete [task-id]` - Mark task as complete
- `/gtd delete [task-id]` - Delete a task
- `/gtd help` - Show help message

## Task Reminders & Cron Jobs

The bot automatically sends daily reminders for tasks due in the next 24 hours.

### Automated Reminders (Vercel Cron)

The app uses Vercel's cron job feature to automatically check for upcoming tasks and send reminders:

- **Schedule**: Daily at 9:00 AM UTC
- **Endpoint**: `/api/cron/reminders` (GET)
- **Configuration**: Defined in `vercel.json`
- **Vercel Plan**: Hobby accounts are limited to once-per-day cron jobs

#### Setup for Vercel Cron

1. **Set the CRON_SECRET environment variable** in your Vercel dashboard:
   ```bash
   CRON_SECRET=your-random-secret-here
   ```

2. The cron job is already configured in `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/reminders",
         "schedule": "0 9 * * *"
       }
     ]
   }
   ```

3. Deploy to Vercel - the cron job will automatically run daily

### Manual Trigger (External Schedulers)

If you want more frequent reminders or want to use an external scheduler (GitHub Actions, cron-job.org, etc.), you can call the manual trigger endpoint:

- **Endpoint**: `/api/trigger/reminders` (POST)
- **Authentication**: Bearer token with `API_SECRET`

#### Setup for Manual Triggers

1. **Set the API_SECRET environment variable** in your Vercel dashboard:
   ```bash
   API_SECRET=your-api-secret-here
   ```

2. **Call the endpoint** from your external scheduler:
   ```bash
   curl -X POST https://your-app.vercel.app/api/trigger/reminders \
     -H "Authorization: Bearer your-api-secret-here"
   ```

#### Example: GitHub Actions Workflow

Create `.github/workflows/task-reminders.yml`:

```yaml
name: Send Task Reminders

on:
  schedule:
    # Run every 4 hours
    - cron: '0 */4 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Reminder Endpoint
        run: |
          curl -X POST https://your-app.vercel.app/api/trigger/reminders \
            -H "Authorization: Bearer ${{ secrets.API_SECRET }}"
```

Then add `API_SECRET` to your GitHub repository secrets.

### Reminder Response

Both endpoints return the same JSON response:

```json
{
  "success": true,
  "remindersSent": 5,
  "remindersFailed": 0,
  "tasksChecked": 10,
  "triggeredAt": "2025-12-07T09:00:00.000Z"
}
```

### Security Notes

- **CRON_SECRET**: Used by Vercel's cron service automatically - keep this secret
- **API_SECRET**: Used for manual triggers - set to a strong random value
- Both secrets should be different and stored securely in environment variables
- Never commit secrets to your repository
