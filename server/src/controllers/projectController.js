import db from '../db/database.js';
import * as xlsx from 'xlsx';

const normalizeTaskTitle = (str) => {
    if (!str) return '';
    return String(str)
        .trim()
        .replace(/[\u2010-\u2015]/g, '-')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\s+/g, ' ')
        .toLowerCase();
};

// Create project (PM only)
export const createProject = (req, res) => {
    try {
        const { title, description, start_date, end_date, member_ids, priority } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Project title is required' });
        }

        const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
        const projectPriority = validPriorities.includes(priority) ? priority : 'Medium';

        const insertProject = db.prepare(`
            INSERT INTO projects (title, description, start_date, end_date, manager_id, status, priority)
            VALUES (?, ?, ?, ?, ?, 'active', ?)
        `);

        const result = insertProject.run(title, description || '', start_date || null, end_date || null, req.user.id, projectPriority);
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
        const isPM = req.user.user_type === 'pm' || req.user.user_type === 'superuser';
        const todayStr = new Date().toISOString().split('T')[0];

        let query;
        let params;

        if (isPM) {
            query = `
                SELECT DISTINCT
                    t.*,
                    p.title as project_title,
                    p.status as project_status,
                    (SELECT COUNT(*) FROM daily_logs dl WHERE dl.task_id = t.id AND dl.user_id = ?) as total_logged_by_me,
                    (SELECT dl.has_worked FROM daily_logs dl WHERE dl.task_id = t.id AND dl.user_id = ? AND dl.log_date = ?) as today_submission_status,
                    (SELECT dl.work_text FROM daily_logs dl WHERE dl.task_id = t.id AND dl.user_id = ? AND dl.log_date = ?) as today_work_text,
                    (SELECT dl.no_work_reason FROM daily_logs dl WHERE dl.task_id = t.id AND dl.user_id = ? AND dl.log_date = ?) as today_no_work_reason
                FROM tasks t
                JOIN projects p ON t.project_id = p.id
                LEFT JOIN task_assignees ta ON ta.task_id = t.id
                WHERE ta.user_id = ? OR p.manager_id = ?
                ORDER BY t.end_date ASC
            `;
            params = [userId, userId, todayStr, userId, todayStr, userId, todayStr, userId, userId];
        } else {
            query = `
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
            `;
            params = [userId, userId, todayStr, userId, todayStr, userId, todayStr, userId];
        }

        const tasks = db.prepare(query).all(...params);

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
        const { status, end_date, priority } = req.body;

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
        if (priority) {
            updates.push('priority = ?');
            params.push(priority);
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

// Get all tasks for a specific project
export const getProjectTasks = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        
        // Verify project exists
        const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const tasks = db.prepare(`
            SELECT t.*, u.full_name as assignee
            FROM tasks t
            LEFT JOIN task_assignees ta ON t.id = ta.task_id
            LEFT JOIN users u ON ta.user_id = u.id
            WHERE t.project_id = ?
        `).all(projectId);

        // Alias keys to match what frontend map expects
        const mappedTasks = tasks.map(t => ({
            ...t,
            'Issue / Task / Enhancement': t.title,
            'Added ': t.description,
            'Status': t.status || 'To Do',
            'status': t.status || 'To Do',
            'Responsible': t.assignee || 'Unassigned',
            'assignee': t.assignee || 'Unassigned',
            'Completed': t.due_date || t.end_date || '—',
            'dueDate': t.due_date || t.end_date || '',
            'due_date': t.due_date || t.end_date || '',
            'Priority': t.priority || 'Medium',
            'priority': t.priority || 'Medium',
            'Type': t.type || 'Task',
            'type': t.type || 'Task',
            'key': t.task_key || `VVM-${t.id}`,
            'task_key': t.task_key || `VVM-${t.id}`
        }));

        res.json({ tasks: mappedTasks });
    } catch (err) {
        console.error('getProjectTasks error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get all tasks across all projects managed by current PM
export const getAllProjectsTasks = (req, res) => {
    try {
        const pmId = req.user.id;
        const tasks = db.prepare(`
            SELECT t.*, u.full_name as assignee, p.title as project_title, p.status as project_status
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            LEFT JOIN task_assignees ta ON t.id = ta.task_id
            LEFT JOIN users u ON ta.user_id = u.id
            WHERE p.manager_id = ? AND (p.status IS NULL OR p.status != 'archived')
            ORDER BY t.created_at DESC
        `).all(pmId);

        // Deduplicate tasks that have multiple assignees
        const taskMap = new Map();
        for (const t of tasks) {
            if (!taskMap.has(t.id)) {
                taskMap.set(t.id, {
                    ...t,
                    assignees: t.assignee ? [t.assignee] : [],
                    'Issue / Task / Enhancement': t.title,
                    'Added ': t.description
                });
            } else {
                const existing = taskMap.get(t.id);
                if (t.assignee && !existing.assignees.includes(t.assignee)) {
                    existing.assignees.push(t.assignee);
                }
            }
        }

        const mappedTasks = Array.from(taskMap.values()).map(t => ({
            ...t,
            assignee: t.assignees.join(', ') || t.assignee || 'Unassigned'
        }));

        res.json({ tasks: mappedTasks });
    } catch (err) {
        console.error('getAllProjectsTasks error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Create a workspace task
export const createWorkspaceTask = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        const { title, description, status, priority, type, assignee, dueDate, due_date, key, task_key } = req.body;

        const taskTitle = title || req.body['Issue / Task / Enhancement'] || req.body.task || 'Untitled Task';
        const taskAdded = req.body['Added '] || description || new Date().toLocaleDateString('en-GB');
        const taskStatus = status || req.body['Status'] || 'in_progress';
        const taskPriority = priority || req.body['Priority'] || 'Medium';
        const taskType = type || req.body['Type'] || 'Task';
        const rawDue = dueDate || due_date || req.body['Completed'] || null;
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = (rawDue && rawDue !== '—') ? rawDue : new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
        const taskDueDate = (rawDue && rawDue !== '—') ? rawDue : endDate;
        const taskKey = key || task_key || null;

        // Verify project exists
        const project = db.prepare('SELECT id, manager_id FROM projects WHERE id = ?').get(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const managerId = project.manager_id || req.user.id;

        const insertTask = db.prepare(`
            INSERT INTO tasks (project_id, manager_id, title, description, start_date, end_date, status, priority, type, due_date, task_key)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = insertTask.run(projectId, managerId, taskTitle, taskAdded, startDate, endDate, taskStatus, taskPriority, taskType, taskDueDate, taskKey);
        const taskId = result.lastInsertRowid;

        // Automatically associate task with assignee if provided
        let targetUser = null;
        const directUserId = req.body.assignee_id || req.body.user_id;
        if (directUserId && !isNaN(Number(directUserId))) {
            targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(Number(directUserId));
        }

        const assigneeName = assignee || req.body['Responsible'];
        if (!targetUser && assigneeName && assigneeName !== 'Unassigned' && assigneeName !== 'unassigned') {
            const cleanName = String(assigneeName).replace(/\s*\(pm\)$/i, '').trim();
            targetUser = db.prepare(`
                SELECT u.id FROM users u
                LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = ?
                WHERE (TRIM(u.full_name) = ? COLLATE NOCASE OR u.email = ? COLLATE NOCASE OR CAST(u.id AS TEXT) = ?)
                ORDER BY CASE WHEN pm.project_id IS NOT NULL THEN 0 ELSE 1 END, u.id ASC
            `).get(projectId, cleanName, cleanName, cleanName);
        }

        if (targetUser) {
            db.prepare(`
                INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)
            `).run(taskId, targetUser.id);
            
            db.prepare(`
                INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)
            `).run(projectId, targetUser.id);
        }

        const createdTask = db.prepare(`
            SELECT t.*, u.full_name as assignee
            FROM tasks t
            LEFT JOIN task_assignees ta ON t.id = ta.task_id
            LEFT JOIN users u ON ta.user_id = u.id
            WHERE t.id = ?
        `).get(taskId);

        const mappedTask = {
            ...createdTask,
            'Issue / Task / Enhancement': createdTask.title,
            'Added ': createdTask.description,
            'Status': createdTask.status || 'To Do',
            'status': createdTask.status || 'To Do',
            'Responsible': createdTask.assignee || 'Unassigned',
            'assignee': createdTask.assignee || 'Unassigned',
            'Completed': createdTask.due_date || createdTask.end_date || '—',
            'dueDate': createdTask.due_date || createdTask.end_date || '',
            'due_date': createdTask.due_date || createdTask.end_date || '',
            'Priority': createdTask.priority || 'Medium',
            'priority': createdTask.priority || 'Medium',
            'Type': createdTask.type || 'Task',
            'type': createdTask.type || 'Task',
            'key': createdTask.task_key || `VVM-${createdTask.id}`,
            'task_key': createdTask.task_key || `VVM-${createdTask.id}`
        };

        res.status(201).json({ message: 'Task created successfully', task: mappedTask });
    } catch (err) {
        console.error('createWorkspaceTask error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Update a workspace task (assignee, status, dates, priority, type, etc.)
export const updateWorkspaceTask = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        const taskIdParam = req.params.taskId;
        const { assignee, status, dueDate, due_date, title, description, priority, type, key, task_key } = req.body;

        // Find task by ID or by title (whitespace-tolerant) or by key
        let task = null;
        if (taskIdParam && !isNaN(Number(taskIdParam))) {
            task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(taskIdParam, projectId);
        }
        if (!task && (key || task_key)) {
            task = db.prepare('SELECT * FROM tasks WHERE project_id = ? AND task_key = ?').get(projectId, key || task_key);
        }
        if (!task) {
            const rawTitle = (title || req.body['Issue / Task / Enhancement'] || req.body.task || '').trim();
            if (rawTitle) {
                task = db.prepare('SELECT * FROM tasks WHERE project_id = ? AND TRIM(title) = ?').get(projectId, rawTitle);
                if (!task) {
                    const normalized = normalizeTaskTitle(rawTitle);
                    const allProjectTasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(projectId);
                    task = allProjectTasks.find(pt => normalizeTaskTitle(pt.title) === normalized);
                }
            }
        }

        if (!task) {
            // Create if it doesn't exist yet in the database
            const taskTitle = title || req.body['Issue / Task / Enhancement'] || req.body.task || 'Untitled Task';
            const taskDesc = description || req.body['Added '] || '';
            const startDate = new Date().toISOString().split('T')[0];
            const rawDue = dueDate || due_date || req.body['Completed'] || null;
            const endDate = (rawDue && rawDue !== '—') ? rawDue : new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
            const taskDueDate = (rawDue && rawDue !== '—') ? rawDue : endDate;
            const taskStatus = status || req.body['Status'] || 'in_progress';
            const taskPriority = priority || req.body['Priority'] || 'Medium';
            const taskType = type || req.body['Type'] || 'Task';
            const taskKey = key || task_key || null;

            const project = db.prepare('SELECT id, manager_id FROM projects WHERE id = ?').get(projectId);
            const managerId = project?.manager_id || req.user.id;

            const insert = db.prepare(`
                INSERT INTO tasks (project_id, manager_id, title, description, start_date, end_date, status, priority, type, due_date, task_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(projectId, managerId, taskTitle, taskDesc, startDate, endDate, taskStatus, taskPriority, taskType, taskDueDate, taskKey);

            task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(insert.lastInsertRowid);
        } else {
            // Update fields if provided
            const updates = [];
            const values = [];

            if (title || req.body['Issue / Task / Enhancement']) {
                updates.push('title = ?');
                values.push(title || req.body['Issue / Task / Enhancement']);
            }
            if (description !== undefined || req.body['Added '] !== undefined) {
                updates.push('description = ?');
                values.push(description !== undefined ? description : req.body['Added ']);
            }
            if (status || req.body['Status']) {
                updates.push('status = ?');
                values.push(status || req.body['Status']);
            }
            if (dueDate !== undefined || due_date !== undefined || req.body['Completed'] !== undefined) {
                const targetDue = dueDate || due_date || req.body['Completed'];
                if (targetDue && targetDue !== '—') {
                    updates.push('due_date = ?');
                    values.push(targetDue);
                    updates.push('end_date = ?');
                    values.push(targetDue);
                }
            }
            if (priority || req.body['Priority']) {
                updates.push('priority = ?');
                values.push(priority || req.body['Priority']);
            }
            if (type || req.body['Type']) {
                updates.push('type = ?');
                values.push(type || req.body['Type']);
            }
            if (key || task_key) {
                updates.push('task_key = ?');
                values.push(key || task_key);
            }

            // Synchronize start_date to allocation date / today if allocated and start_date is not valid
            const targetAssignee = assignee !== undefined ? assignee : req.body['Responsible'];
            if (targetAssignee && targetAssignee !== 'Unassigned' && targetAssignee !== 'unassigned') {
                const todayStr = new Date().toISOString().split('T')[0];
                let effectiveStart = task.start_date;
                if (!effectiveStart || effectiveStart > todayStr) {
                    effectiveStart = todayStr;
                }
                updates.push('start_date = ?');
                values.push(effectiveStart);
            }

            if (updates.length > 0) {
                values.push(task.id);
                db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
            }
        }

        // Handle assignee
        const assigneeName = assignee !== undefined ? assignee : req.body['Responsible'];
        const directUserId = req.body.assignee_id !== undefined ? req.body.assignee_id : req.body.user_id;

        if (directUserId !== undefined || assigneeName !== undefined) {
            let targetUser = null;
            if (directUserId && !isNaN(Number(directUserId))) {
                targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(Number(directUserId));
            }

            if (!targetUser && assigneeName && assigneeName !== 'Unassigned' && assigneeName !== 'unassigned') {
                const cleanName = String(assigneeName).replace(/\s*\(pm\)$/i, '').trim();
                targetUser = db.prepare(`
                    SELECT u.id FROM users u
                    LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = ?
                    WHERE (TRIM(u.full_name) = ? COLLATE NOCASE OR u.email = ? COLLATE NOCASE OR CAST(u.id AS TEXT) = ?)
                    ORDER BY CASE WHEN pm.project_id IS NOT NULL THEN 0 ELSE 1 END, u.id ASC
                `).get(projectId, cleanName, cleanName, cleanName);
            }

            if (targetUser) {
                db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(task.id);
                db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)').run(task.id, targetUser.id);
                db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)').run(projectId, targetUser.id);
            } else if (assigneeName === '' || assigneeName === 'Unassigned' || assigneeName === 'unassigned' || directUserId === null) {
                db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(task.id);
            }
        }

        const updatedTask = db.prepare(`
            SELECT t.*, u.full_name as assignee
            FROM tasks t
            LEFT JOIN task_assignees ta ON t.id = ta.task_id
            LEFT JOIN users u ON ta.user_id = u.id
            WHERE t.id = ?
        `).get(task.id);

        const mappedTask = {
            ...updatedTask,
            'Issue / Task / Enhancement': updatedTask.title,
            'Added ': updatedTask.description,
            'Status': updatedTask.status || 'To Do',
            'status': updatedTask.status || 'To Do',
            'Responsible': updatedTask.assignee || 'Unassigned',
            'assignee': updatedTask.assignee || 'Unassigned',
            'Completed': updatedTask.due_date || updatedTask.end_date || '—',
            'dueDate': updatedTask.due_date || updatedTask.end_date || '',
            'due_date': updatedTask.due_date || updatedTask.end_date || '',
            'Priority': updatedTask.priority || 'Medium',
            'priority': updatedTask.priority || 'Medium',
            'Type': updatedTask.type || 'Task',
            'type': updatedTask.type || 'Task',
            'key': updatedTask.task_key || `VVM-${updatedTask.id}`,
            'task_key': updatedTask.task_key || `VVM-${updatedTask.id}`
        };

        res.json({ message: 'Task updated successfully', task: mappedTask });
    } catch (err) {
        console.error('updateWorkspaceTask error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Batch sync tasks from PMDashboard to SQLite
export const syncWorkspaceTasks = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        const { tasks } = req.body;

        if (!Array.isArray(tasks)) {
            return res.status(400).json({ error: 'Expected tasks array' });
        }

        const project = db.prepare('SELECT id, manager_id FROM projects WHERE id = ?').get(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const managerId = project.manager_id || req.user.id;

        // Process each task in transaction
        const syncTx = db.transaction((taskList) => {
            const synced = [];
            for (const t of taskList) {
                const title = t.title || t['Issue / Task / Enhancement'] || t.task || t.taskName || t.description;
                if (!title) continue;

                const assigneeName = t.assignee || t['Responsible'];
                const rawDue = t.dueDate || t.due_date || t['Completed'] || null;
                const status = t.status || t['Status'] || 'in_progress';
                const description = t.description || t['Added '] || '';
                const priority = t.priority || t['Priority'] || 'Medium';
                const type = t.type || t['Type'] || 'Task';
                const key = t.key || t.task_key || null;
                const startDate = new Date().toISOString().split('T')[0];

                let dbTask = null;
                if (t.id && !isNaN(Number(t.id)) && Number(t.id) < 1000000000) {
                    dbTask = db.prepare('SELECT id, start_date, end_date, due_date FROM tasks WHERE id = ? AND project_id = ?').get(t.id, projectId);
                }
                if (!dbTask && key) {
                    dbTask = db.prepare('SELECT id, start_date, end_date, due_date FROM tasks WHERE project_id = ? AND task_key = ?').get(projectId, key);
                }
                if (!dbTask) {
                    const rawTitle = title.trim();
                    dbTask = db.prepare('SELECT id, start_date, end_date, due_date FROM tasks WHERE project_id = ? AND TRIM(title) = ?').get(projectId, rawTitle);
                    if (!dbTask) {
                        const normalized = normalizeTaskTitle(rawTitle);
                        const allProjectTasks = db.prepare('SELECT id, title, start_date, end_date, due_date FROM tasks WHERE project_id = ?').all(projectId);
                        dbTask = allProjectTasks.find(pt => normalizeTaskTitle(pt.title) === normalized);
                    }
                }

                let taskId;
                const todayStr = new Date().toISOString().split('T')[0];
                const isAllocated = assigneeName && assigneeName !== 'Unassigned' && assigneeName !== 'unassigned';

                if (dbTask) {
                    taskId = dbTask.id;
                    let effectiveStart = dbTask.start_date;
                    if (isAllocated && (!effectiveStart || effectiveStart > todayStr)) {
                        effectiveStart = todayStr;
                    } else if (!effectiveStart) {
                        effectiveStart = todayStr;
                    }

                    let effectiveEnd = (rawDue && rawDue !== '—') ? rawDue : dbTask.end_date;
                    if (!effectiveEnd || effectiveEnd < effectiveStart) {
                        effectiveEnd = effectiveStart;
                    }
                    const targetDue = (rawDue && rawDue !== '—') ? rawDue : (dbTask.due_date || effectiveEnd);

                    db.prepare(`
                        UPDATE tasks 
                        SET start_date = ?, end_date = ?, status = ?, priority = ?, type = ?, due_date = ?, task_key = COALESCE(?, task_key) 
                        WHERE id = ?
                    `).run(effectiveStart, effectiveEnd, status, priority, type, targetDue, key, taskId);
                } else {
                    const effectiveStart = todayStr;
                    const effectiveEnd = (rawDue && rawDue !== '—' && rawDue >= effectiveStart) ? rawDue : effectiveStart;
                    const targetDue = (rawDue && rawDue !== '—') ? rawDue : effectiveEnd;
                    const ins = db.prepare(`
                        INSERT INTO tasks (project_id, manager_id, title, description, start_date, end_date, status, priority, type, due_date, task_key)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(projectId, managerId, title, description, effectiveStart, effectiveEnd, status, priority, type, targetDue, key);
                    taskId = ins.lastInsertRowid;
                }

                let targetUser = null;
                const directUserId = t.assignee_id || t.user_id;
                if (directUserId && !isNaN(Number(directUserId))) {
                    targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(Number(directUserId));
                }

                if (!targetUser && assigneeName && assigneeName !== 'Unassigned' && assigneeName !== 'unassigned') {
                    const cleanName = String(assigneeName).replace(/\s*\(pm\)$/i, '').trim();
                    targetUser = db.prepare(`
                        SELECT u.id FROM users u
                        LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = ?
                        WHERE (TRIM(u.full_name) = ? COLLATE NOCASE OR u.email = ? COLLATE NOCASE OR CAST(u.id AS TEXT) = ?)
                        ORDER BY CASE WHEN pm.project_id IS NOT NULL THEN 0 ELSE 1 END, u.id ASC
                    `).get(projectId, cleanName, cleanName, cleanName);
                }

                if (targetUser) {
                    db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(taskId);
                    db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)').run(taskId, targetUser.id);
                    db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)').run(projectId, targetUser.id);
                } else {
                    db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(taskId);
                }

                synced.push({
                    originalId: t.id,
                    id: taskId,
                    key: key || `VVM-${taskId}`
                });
            }
            return synced;
        });

        const syncedResults = syncTx(tasks);

        res.json({ message: 'Tasks synchronized successfully', synced: syncedResults });
    } catch (err) {
        console.error('syncWorkspaceTasks error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Delete a single workspace task
export const deleteWorkspaceTask = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        const taskId = parseInt(req.params.taskId, 10);

        const project = db.prepare('SELECT id FROM projects WHERE id = ? AND manager_id = ?').get(projectId, req.user.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND project_id = ?').get(taskId, projectId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        db.transaction(() => {
            db.prepare('DELETE FROM daily_logs WHERE task_id = ?').run(taskId);
            db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(taskId);
            db.prepare('DELETE FROM tasks WHERE id = ? AND project_id = ?').run(taskId, projectId);
        })();

        res.json({ message: 'Task deleted successfully', taskId });
    } catch (err) {
        console.error('deleteWorkspaceTask error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Import tasks from XLSX
export const importProjectTasks = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const project = db.prepare('SELECT id FROM projects WHERE id = ? AND manager_id = ?').get(projectId, req.user.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const workbook = xlsx.read(file.buffer, { type: 'buffer' });
        const sheetName = 'ToDoTasks';
        const sheet = workbook.Sheets[sheetName];
        
        if (!sheet) {
            return res.status(400).json({ error: "Sheet 'ToDoTasks' not found in the uploaded file." });
        }
        
        const rows = xlsx.utils.sheet_to_json(sheet);

        const insertTask = db.prepare(`
            INSERT INTO tasks (project_id, manager_id, title, description, start_date, end_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        // Transaction for bulk insert
        const insertMany = db.transaction((tasksToInsert) => {
            for (const task of tasksToInsert) {
                const title = task['Issue / Task / Enhancement'] || 'Untitled Task';
                const description = task['Added '] || ''; // Store 'Added ' in description to preserve it
                const startDate = new Date().toISOString().split('T')[0];
                const endDate = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
                const status = 'in_progress';
                
                insertTask.run(projectId, req.user.id, title, description, startDate, endDate, status);
            }
        });

        insertMany(rows);

        const tasks = db.prepare(`
            SELECT t.*, u.full_name as assignee
            FROM tasks t
            LEFT JOIN task_assignees ta ON t.id = ta.task_id
            LEFT JOIN users u ON ta.user_id = u.id
            WHERE t.project_id = ?
        `).all(projectId);

        const mappedTasks = tasks.map(t => ({
            ...t,
            'Issue / Task / Enhancement': t.title,
            'Added ': t.description
        }));

        res.json({ message: 'Tasks imported successfully', tasks: mappedTasks });
    } catch (err) {
        console.error('importProjectTasks error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Delete all imported tasks for a specific project
export const deleteProjectTasks = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        
        // Verify project belongs to PM
        const project = db.prepare('SELECT id FROM projects WHERE id = ? AND manager_id = ?').get(projectId, req.user.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Use a transaction to safely clean up all tasks and related entries
        const deleteTasksTransaction = db.transaction(() => {
            // Delete daily_logs associated with these tasks
            db.prepare('DELETE FROM daily_logs WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)').run(projectId);
            // Delete task_assignees associated with these tasks
            db.prepare('DELETE FROM task_assignees WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)').run(projectId);
            // Finally delete the tasks themselves
            db.prepare('DELETE FROM tasks WHERE project_id = ?').run(projectId);
        });

        deleteTasksTransaction();

        res.json({ message: 'All imported tasks have been removed successfully' });
    } catch (err) {
        console.error('deleteProjectTasks error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Document Operations for Projects
export const getProjectDocs = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        const docs = db.prepare(`
            SELECT id, project_id, name, extension, size, upload_date as uploadDate, data_url as dataUrl, created_at
            FROM project_documents
            WHERE project_id = ?
            ORDER BY created_at DESC
        `).all(projectId);

        res.json({ docs: docs || [] });
    } catch (err) {
        console.error('getProjectDocs error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const createProjectDoc = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        const userId = req.user ? req.user.id : null;
        const { id, name, extension, size, uploadDate, dataUrl } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Document name is required' });
        }

        const ext = extension || name.split('.').pop().toLowerCase();
        const dateStr = uploadDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        let newDocId;
        if (Number.isInteger(Number(id)) && Number(id) > 0) {
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO project_documents (id, project_id, user_id, name, extension, size, upload_date, data_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(Number(id), projectId, userId, name, ext, size || '', dateStr, dataUrl || '');
            newDocId = Number(id);
        } else {
            const stmt = db.prepare(`
                INSERT INTO project_documents (project_id, user_id, name, extension, size, upload_date, data_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const info = stmt.run(projectId, userId, name, ext, size || '', dateStr, dataUrl || '');
            newDocId = info.lastInsertRowid;
        }

        res.json({
            success: true,
            doc: {
                id: newDocId,
                projectId,
                userId,
                name,
                extension: ext,
                size: size || '',
                uploadDate: dateStr,
                dataUrl: dataUrl || ''
            }
        });
    } catch (err) {
        console.error('createProjectDoc error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const deleteProjectDoc = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        const docId = parseInt(req.params.docId, 10);

        const stmt = db.prepare(`
            DELETE FROM project_documents
            WHERE id = ? AND project_id = ?
        `);
        stmt.run(docId, projectId);

        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (err) {
        console.error('deleteProjectDoc error:', err);
        res.status(500).json({ error: err.message });
    }
};
