import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('server/data.db');
db.serialize(() => {
  db.run("UPDATE tasks SET status = 'stalled' WHERE status = 'blocked'", function(err) {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`Updated ${this.changes} tasks in database.`);
    }
  });
});
db.close();
