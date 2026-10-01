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

// Migration: Ensure projects table has category column
try {
  const pragma = db.pragma('table_info(projects)');
  const hasCategory = pragma.some(col => col.name === 'category');
  if (!hasCategory) {
    db.exec("ALTER TABLE projects ADD COLUMN category TEXT DEFAULT 'General'");
  }
} catch (e) {
  console.error('Migration notice (projects.category):', e.message);
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

// Migration: Ensure users table has employment_type column
try {
  const userCols = db.pragma('table_info(users)').map(col => col.name);
  if (!userCols.includes('employment_type')) {
    db.exec("ALTER TABLE users ADD COLUMN employment_type TEXT DEFAULT 'Full Time Contributor'");
  }
} catch (e) {
  console.error('Migration notice (users.employment_type):', e.message);
}

// Migration: Ensure user_profiles table exists
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY,
      full_name TEXT,
      role_title TEXT,
      experience TEXT,
      about TEXT,
      resume_name TEXT,
      resume_data TEXT,
      resume_type TEXT,
      resume_size TEXT,
      skills TEXT,
      avatar_url TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migrate missing columns if table already existed
  const tableCols = db.prepare("PRAGMA table_info(user_profiles)").all();
  if (!tableCols.some(c => c.name === 'resume_data')) {
    db.exec("ALTER TABLE user_profiles ADD COLUMN resume_data TEXT");
  }
  if (!tableCols.some(c => c.name === 'resume_type')) {
    db.exec("ALTER TABLE user_profiles ADD COLUMN resume_type TEXT");
  }
  if (!tableCols.some(c => c.name === 'resume_size')) {
    db.exec("ALTER TABLE user_profiles ADD COLUMN resume_size TEXT");
  }
} catch (e) {
  console.error('Migration notice (user_profiles table):', e.message);
}

export default db;
