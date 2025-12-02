export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Slack GTD Bot</h1>
      <p>A Slack bot that helps you implement the Getting Things Done (GTD) methodology.</p>

      <h2>Features</h2>
      <ul>
        <li>Quick task capture with slash commands</li>
        <li>Organize tasks by projects and contexts</li>
        <li>Review and manage tasks</li>
        <li>Reminders for upcoming tasks</li>
      </ul>

      <h2>Available Commands</h2>
      <ul>
        <li><code>/gtd [task]</code> - Quick add a task</li>
        <li><code>/gtd add [task]</code> - Add a new task</li>
        <li><code>/gtd list</code> - List all active tasks</li>
        <li><code>/gtd complete [task-id]</code> - Mark task as complete</li>
        <li><code>/gtd delete [task-id]</code> - Delete a task</li>
        <li><code>/gtd help</code> - Show help message</li>
      </ul>

      <p>
        <a href="https://github.com/denwilliams/slack-gtd" style={{ color: '#0070f3' }}>
          View on GitHub
        </a>
      </p>
    </main>
  );
}
