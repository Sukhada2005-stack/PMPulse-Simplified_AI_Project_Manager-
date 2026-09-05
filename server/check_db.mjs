import db from './src/db/database.js';

const projects = db.prepare(`
    SELECT 
        p.*,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'in_progress') as active_task_count
    FROM projects p
    WHERE p.manager_id = ?
    ORDER BY p.created_at DESC
`).all(2);

console.log('✅ Projects returned:', projects.length);
projects.forEach(p => console.log(` - [${p.id}] ${p.title} | tasks: ${p.task_count} | members: ${p.member_count}`));
