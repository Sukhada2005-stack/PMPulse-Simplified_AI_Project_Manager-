import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../data.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schemaPath = path.resolve(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Migration: Ensure projects table has priority column
try {
  const pragma = db.pragma('table_info(projects)');
  const hasPriority = pragma.some(col => col.name === 'priority');
  if (!hasPriority) {
    db.exec("ALTER TABLE projects ADD COLUMN priority TEXT DEFAULT 'Medium'");
  }
} catch (e) {
  console.error('Migration notice (projects.priority):', e.message);
}

// Migration: Ensure tasks table has priority, type, due_date, task_key columns
try {
  const taskCols = db.pragma('table_info(tasks)').map(col => col.name);
  if (!taskCols.includes('priority')) {
    db.exec("ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'Medium'");
  }
  if (!taskCols.includes('type')) {
    db.exec("ALTER TABLE tasks ADD COLUMN type TEXT DEFAULT 'Task'");
  }
  if (!taskCols.includes('due_date')) {
    db.exec("ALTER TABLE tasks ADD COLUMN due_date DATE");
  }
  if (!taskCols.includes('task_key')) {
    db.exec("ALTER TABLE tasks ADD COLUMN task_key TEXT");
  }
} catch (e) {
  console.error('Migration notice (tasks columns):', e.message);
}

export default db;
