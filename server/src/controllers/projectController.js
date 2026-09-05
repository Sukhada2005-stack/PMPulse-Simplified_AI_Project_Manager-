import db from '../db/database.js';

// Create project (PM only)
export const createProject = (req, res) => {
    try {
        const { title, description, start_date, end_date, member_ids } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Project title is required' });
        }

        const insertProject = db.prepare(`
            INSERT INTO projects (title, description, start_date, end_date, manager_id, status)
            VALUES (?, ?, ?, ?, ?, 'active')
        `);

        const result = insertProject.run(title, description || '', start_date || null, end_date || null, req.user.id);
        const projectId = result.lastInsertRowid;

        if (Array.isArray(member_ids) && member_ids.length > 0) {
            const insertMember = db.prepare(`
                INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)
            `);
            member_ids.forEach(uid => {
                insertMember.run(projectId, uid);
            });
        }

        const project = db.prepare('SELECT * FROM projects WHERE id = ? AND manager_id = ?').get(projectId, req.user.id);
        res.status(201).json({ message: 'Project created successfully', project });
    } catch (err) {
        console.error('Create project error:', err);
        res.status(500).json({ error: err.message });
    }
};

// List projects accessible to current user
export const getProjects = (req, res) => {
    try {
        let projects;
        if (req.user.user_type === 'pm') {
            projects = db.prepare(`
                SELECT 
                    p.*,
                    (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
                    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
                    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'in_progress') as active_task_count
                FROM projects p
                WHERE p.manager_id = ?
                ORDER BY p.created_at DESC
            `).all(req.user.id);
        } else {
            projects = db.prepare(`
                SELECT 
                    p.*,
                    (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count,
                    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
                    (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'in_progress') as active_task_count
                FROM projects p
                JOIN project_members pm ON p.id = pm.project_id
                WHERE pm.user_id = ?
                ORDER BY p.created_at DESC
            `).all(req.user.id);
        }

        // Fetch assigned members avatars for each project
        const enhancedProjects = projects.map(p => {
            const members = db.prepare(`
                SELECT u.id, u.full_name, u.role_title, u.avatar_url, u.email
                FROM project_members pm
                JOIN users u ON pm.user_id = u.id
                WHERE pm.project_id = ?
            `).all(p.id);
            return {
                ...p,
                members
            };
        });

        res.json({ projects: enhancedProjects });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get single project with tasks and members
export const getProjectById = (req, res) => {
    try {
        const projectId = req.params.id;
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const members = db.prepare(`
            SELECT u.id, u.full_name, u.role_title, u.avatar_url, u.email
            FROM project_members pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
        `).all(projectId);

        const tasks = db.prepare(`
            SELECT t.*,
                (SELECT COUNT(*) FROM daily_logs dl WHERE dl.task_id = t.id AND dl.has_worked = 1) as green_logs_count,
                (SELECT COUNT(*) FROM daily_logs dl WHERE dl.task_id = t.id AND dl.has_worked = 0) as blocker_logs_count
            FROM tasks t
            WHERE t.project_id = ?
            ORDER BY t.start_date ASC
        `).all(projectId);

        const tasksWithAssignees = tasks.map(task => {
            const assignees = db.prepare(`
                SELECT u.id, u.full_name, u.role_title, u.avatar_url, u.email
                FROM task_assignees ta
                JOIN users u ON ta.user_id = u.id
                WHERE ta.task_id = ?
            `).all(task.id);
            return {
                ...task,
                assignees
            };
        });

        res.json({ project: { ...project, members, tasks: tasksWithAssignees } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create task in a project (PM only)
export const createTask = (req, res) => {
    try {
        const projectId = req.params.id;
        const { title, description, start_date, end_date, assignee_ids } = req.body;

        if (!title || !start_date || !end_date) {
            return res.status(400).json({ error: 'Task title, start date, and end date are required' });
        }

        const project = db.prepare('SELECT id FROM projects WHERE id = ? AND manager_id = ?').get(projectId, req.user.id);
        if (!project) {
            return res.status(404).json({ error: 'Target project does not exist' });
        }

        const insertTask = db.prepare(`
            INSERT INTO tasks (project_id, manager_id, title, description, start_date, end_date, status)
            VALUES (?, ?, ?, ?, ?, 'in_progress')
        `);

        const result = insertTask.run(projectId, req.user.id, title, description || '', start_date, end_date);
        const taskId = result.lastInsertRowid;

        if (Array.isArray(assignee_ids) && assignee_ids.length > 0) {
            const insertAssignee = db.prepare(`
                INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)
            `);
            const insertMember = db.prepare(`
                INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)
            `);
            assignee_ids.forEach(uid => {
                insertAssignee.run(taskId, uid);
                insertMember.run(projectId, uid); // ensure member is part of project team
            });
        }

        const createdTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        res.status(201).json({ message: 'Task provisioned successfully', task: createdTask });
    } catch (err) {
        console.error('Create task error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get tasks assigned to current employee (with active countdown tags)
export const getMyTasks = (req, res) => {
    try {
        const userId = req.user.id;
        const todayStr = new Date().toISOString().split('T')[0];

        const tasks = db.prepare(`
            SELECT 
                t.*,
                p.title as project_title,
                p.status as project_status,
                (SELECT COUNT(*) FROM daily_logs dl WHERE dl.task_id = t.id AND dl.user_id = ?) as total_logged_by_me,
                (SELECT dl.has_worked FROM daily_logs dl WHERE dl.task_id = t.id AND dl.user_id = ? AND dl.log_date = ?) as today_submission_status,
                (SELECT dl.work_text FROM daily_logs dl WHERE dl.task_id = t.id AND dl.user_id = ? AND dl.log_date = ?) as today_work_text,
                (SELECT dl.no_work_reason FROM daily_logs dl WHERE dl.task_id = t.id AND dl.user_id = ? AND dl.log_date = ?) as today_no_work_reason
            FROM task_assignees ta
            JOIN tasks t ON ta.task_id = t.id
            JOIN projects p ON t.project_id = p.id
            WHERE ta.user_id = ?
            ORDER BY t.end_date ASC
        `).all(userId, userId, todayStr, userId, todayStr, userId, todayStr, userId);

        // Compute active window & countdown tags
        const enhancedTasks = tasks.map(task => {
            const today = new Date();
            const start = new Date(task.start_date);
            const end = new Date(task.end_date);
            
            const diffTime = end.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let countdownTag = '';
            let isWithinActiveWindow = true; // allow friendly logging in demo

            if (diffDays < 0) {
                countdownTag = `Ended ${Math.abs(diffDays)}d ago`;
            } else if (diffDays === 0) {
                countdownTag = 'Due Today';
            } else {
                countdownTag = `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
            }

            return {
                ...task,
                countdown_tag: countdownTag,
                days_remaining: diffDays,
                has_submitted_today: task.today_submission_status !== null && task.today_submission_status !== undefined,
                is_within_active_window: isWithinActiveWindow
            };
        });

        res.json({ tasks: enhancedTasks, today: todayStr });
    } catch (err) {
        console.error('getMyTasks error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Add a member to a project (PM only)
export const addProjectMember = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }

        const project = db.prepare('SELECT id, title FROM projects WHERE id = ? AND manager_id = ?').get(projectId, req.user.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const employee = db.prepare(`SELECT id, full_name FROM users WHERE id = ? AND user_type = 'employee'`).get(user_id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Check if already a member
        const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, user_id);
        if (existing) {
            return res.status(409).json({ error: `${employee.full_name} is already a member of this project` });
        }

        db.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)').run(projectId, user_id);

        res.status(201).json({ message: `${employee.full_name} has been added to "${project.title}" successfully.` });
    } catch (err) {
        console.error('addProjectMember error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Update project status or deadline (PM only)
export const updateProject = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        const { status, end_date } = req.body;

        const project = db.prepare('SELECT id FROM projects WHERE id = ? AND manager_id = ?').get(projectId, req.user.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const updates = [];
        const params = [];
        if (status) {
            updates.push('status = ?');
            params.push(status);
        }
        if (end_date) {
            updates.push('end_date = ?');
            params.push(end_date);
        }

        if (updates.length > 0) {
            params.push(projectId);
            db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
        res.json({ message: 'Project updated successfully', project: updatedProject });
    } catch (err) {
        console.error('updateProject error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Delete a project (PM only)
export const deleteProject = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);

        const project = db.prepare('SELECT id FROM projects WHERE id = ? AND manager_id = ?').get(projectId, req.user.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Delete associated records first (due to lack of ON DELETE CASCADE in SQLite setup)
        db.prepare('DELETE FROM daily_logs WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)').run(projectId);
        db.prepare('DELETE FROM task_assignees WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)').run(projectId);
        db.prepare('DELETE FROM tasks WHERE project_id = ?').run(projectId);
        db.prepare('DELETE FROM project_members WHERE project_id = ?').run(projectId);
        db.prepare('DELETE FROM project_messages WHERE project_id = ?').run(projectId);

        // Finally delete the project
        db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        console.error('deleteProject error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Remove a member from a project (PM only)
export const removeProjectMember = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        const userId = parseInt(req.params.userId, 10);

        const project = db.prepare('SELECT id FROM projects WHERE id = ? AND manager_id = ?').get(projectId, req.user.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Use a transaction to clean up all related records for this user in this project
        const removeMemberTransaction = db.transaction(() => {
            // Unassign from all tasks in this project
            db.prepare('DELETE FROM task_assignees WHERE user_id = ? AND task_id IN (SELECT id FROM tasks WHERE project_id = ?)').run(userId, projectId);
            // Remove from project members
            db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(projectId, userId);
        });

        removeMemberTransaction();

        res.json({ message: 'Member removed from project successfully' });
    } catch (err) {
        console.error('removeProjectMember error:', err);
        res.status(500).json({ error: err.message });
    }
};
