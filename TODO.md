# TODO

## Project Setup
- [ ] Initialize Next.js 16 project with TypeScript (`npx create-next-app@latest`)
- [ ] Install dependencies (Hono, Drizzle ORM, Slack SDK, `@neondatabase/serverless`)
- [ ] Configure TypeScript with strict mode enabled
- [ ] Set up environment variables (.env.local for local dev) for Slack tokens and Neon database connection
- [ ] Create `.gitignore` (Next.js default includes node_modules, .env.local, .next, .vercel)
- [ ] Install Vercel CLI for local development and deployment

## Slack App Configuration
- [ ] Create Slack app in Slack API portal
- [ ] Configure OAuth scopes (commands, chat:write, users:read, etc.)
- [ ] Configure webhook URL pointing to Vercel deployment URL
- [ ] Set up slash commands in Slack app settings pointing to Vercel API endpoints
- [ ] Enable Home Tab in app settings
- [ ] Configure Interactivity & Shortcuts with Vercel URL
- [ ] Set up Event Subscriptions with Vercel URL
- [ ] Configure bot token and signing secret in Vercel environment variables

## Database Setup
- [ ] Create Neon database project
- [ ] Design database schema for tasks, projects, contexts, and users
- [ ] Create Drizzle schema definitions
- [ ] Configure database connection with `@neondatabase/serverless`
- [ ] Set up connection pooling using Neon's serverless driver
- [ ] Create initial migration scripts
- [ ] Implement database seeding (if needed)
- [ ] Add Neon database URL to Vercel environment variables

## Core Task Management
- [ ] Create Task model with fields: id, userId, title, description, project, context, dueDate, priority, status, createdAt, updatedAt
- [ ] Create Project model
- [ ] Create Context model
- [ ] Implement task CRUD operations
- [ ] Implement user identification and data isolation

## Slack Commands
- [ ] Implement `/gtd add [task]` - Quick task capture (the word add should be optional)
- [ ] Implement `/gtd list` - Show all tasks
- [ ] Implement `/gtd projects` - List all projects
- [ ] Implement `/gtd contexts` - List all contexts
- [ ] Implement `/gtd complete [task-id]` - Mark task as complete
- [ ] Implement `/gtd delete [task-id]` - Delete a task
- [ ] Implement `/gtd help` - Show available commands

## Home Tab Interface
- [ ] Design Home Tab UI layout with Slack Block Kit
- [ ] Display user's tasks grouped by project/context
- [ ] Add interactive buttons for task actions (complete, delete, edit)
- [ ] Implement "Add Task" button with modal
- [ ] Show task counts and statistics
- [ ] Handle button click interactions
- [ ] Refresh Home Tab after task updates

## Task Organization Features
- [ ] Implement project assignment for tasks
- [ ] Implement context/tag system for tasks
- [ ] Add due date parsing and storage
- [ ] Add priority levels (high, medium, low)
- [ ] Implement task filtering and sorting

## Reminder System
- [ ] Design reminder scheduling system using Vercel Cron Jobs
- [ ] Create cron endpoint in `app/api/cron/reminders/route.ts`
- [ ] Configure cron schedule in `vercel.json` (e.g., daily at 9 AM)
- [ ] Implement function to check due dates and send reminders
- [ ] Send Slack DM reminders for upcoming tasks
- [ ] Allow users to configure reminder preferences
- [ ] Handle reminder acknowledgment

## Next.js + Hono API Routes Setup
- [ ] Install Hono and Vercel adapter: `npm i hono @hono/node-server`
- [ ] Create catch-all route: `app/api/[[...route]]/route.ts`
- [ ] Set up Hono app with `new Hono().basePath('/api')`
- [ ] Import and use `handle` from `hono/vercel` to export GET, POST handlers
- [ ] Define Hono routes for Slack:
  - `/slack/events` - Slack events endpoint
  - `/slack/commands` - Slash commands endpoint
  - `/slack/interactions` - Button clicks and modals
- [ ] Implement Slack request signature verification using Hono middleware
- [ ] Add error handling middleware in Hono
- [ ] Set up proper logging (Vercel logs or external service like Axiom)
- [ ] Implement deferred responses for operations taking >3 seconds
- [ ] Test locally using `npm run dev`

## Testing & Quality
- [ ] Set up testing framework (Jest or Vitest)
- [ ] Write unit tests for task operations
- [ ] Write integration tests for Slack commands
- [ ] Test multi-user data isolation
- [ ] Test reminder system
- [ ] Add linting (ESLint) and formatting (Prettier)

## Documentation
- [ ] Create setup instructions in README
- [ ] Document environment variables needed
- [ ] Document Slack app configuration steps
- [ ] Add API documentation for internal functions
- [ ] Create user guide for Slack commands

## Deployment
- [ ] Deploy to Vercel using `vercel --prod`
- [ ] Configure production environment variables in Vercel dashboard
- [ ] Set up Neon database for production (or use same database with separate schema)
- [ ] Run database migrations on production
- [ ] Configure Vercel function timeout and memory settings if needed
- [ ] Update Slack app URLs to use production Vercel URL
- [ ] Test all Slack commands and interactions in production
- [ ] Set up Vercel Analytics and monitoring
- [ ] Configure Vercel GitHub integration for automatic deployments
- [ ] Set up preview deployments for testing before production
