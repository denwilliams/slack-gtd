# Slack GTD Bot

A Slack bot that helps you implement the Getting Things Done (GTD) methodology by allowing you to capture tasks, organize them, and review your to-do lists directly within Slack.

## Features

- Capture tasks quickly using Slack commands.
- Organize tasks into projects, contexts, and due dates.
- Review and manage your tasks with simple commands.
- **Automated Reminders:**
  - Daily reminders at 9 AM UTC for tasks due within 24 hours
  - Hourly inbox reminders (every hour on the hour) for unprocessed items in your inbox
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

# Cron Job Security (required for Vercel deployment)
CRON_SECRET=your-random-secret-here
```

**Note:** Generate a strong random secret for `CRON_SECRET` (e.g., using `openssl rand -base64 32`)

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

# Set environment variables in Vercel dashboard:
# - SLACK_BOT_TOKEN
# - SLACK_SIGNING_SECRET
# - DATABASE_URL
# - CRON_SECRET

# Then deploy to production
vercel --prod
```

**Important:** Automated reminders require Vercel's Cron Jobs feature, which is available on Pro and Enterprise plans only. The bot will still work without cron jobs, but you won't receive automated reminders.

## Available Commands

- `/gtd [task]` - Quick add a task
- `/gtd add [task]` - Add a new task
- `/gtd list` - List all active tasks
- `/gtd complete [task-id]` - Mark task as complete
- `/gtd delete [task-id]` - Delete a task
- `/gtd help` - Show help message

## Automated Reminders

The bot includes two automated reminder systems to help you stay on top of your tasks:

### 1. Daily Due Task Reminders
- **Schedule:** Every day at 9:00 AM UTC
- **Purpose:** Reminds you of tasks that are due within the next 24 hours
- **Message format:** Shows task title, description, and due date
- **Delivery:** Sent as a Slack DM to each user with upcoming tasks

### 2. Hourly Inbox Reminders
- **Schedule:** Every hour on the hour (0:00, 1:00, 2:00, etc.)
- **Purpose:** Reminds you to process items sitting in your inbox (following GTD methodology)
- **Message format:** Shows count of inbox items and lists up to 5 tasks
- **Delivery:** Sent as a Slack DM only to users who have items in their inbox
- **Benefit:** Encourages regular inbox processing to keep your GTD system flowing

Both reminder systems require:
- Vercel Pro or Enterprise plan (for cron job support)
- `CRON_SECRET` environment variable configured in Vercel
