import Database from 'better-sqlite3';
const db = new Database('data.db');
const stmt = db.prepare("UPDATE tasks SET status = 'stalled' WHERE status = 'blocked'");
const info = stmt.run();
console.log(`Updated ${info.changes} tasks in database.`);
db.close();
