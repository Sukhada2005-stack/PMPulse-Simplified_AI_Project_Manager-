import bcrypt from 'bcryptjs';
import db from '../db/database.js';

export const createPM = (req, res) => {
    try {
        const { full_name, email, password } = req.body;
        if (!full_name || !email || !password) {
            return res.status(400).json({ error: 'Full name, email, and password are required' });
        }

        const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
        if (existing) {
            return res.status(409).json({ error: 'A user with this email already exists' });
        }

        const password_hash = bcrypt.hashSync(password, 10);
        
        const stmt = db.prepare(`
            INSERT INTO users (email, password_hash, full_name, role_title, user_type, status, is_first_login)
            VALUES (?, ?, ?, 'Project Manager', 'pm', 'active', 1)
        `);
        const result = stmt.run(email, password_hash, full_name);

        const newPM = db.prepare(`
            SELECT id, email, full_name, role_title, user_type, status, created_at 
            FROM users WHERE id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json({ message: 'Project Manager created successfully', pm: newPM });
    } catch (err) {
        console.error('Create PM error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const getPMs = (req, res) => {
    try {
        const pms = db.prepare(`
            SELECT id, email, full_name, role_title, user_type, status, created_at
            FROM users
            WHERE user_type = 'pm'
            ORDER BY full_name ASC
        `).all();

        res.json({ pms });
    } catch (err) {
        console.error('Get PMs error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const deletePM = (req, res) => {
    try {
        const { id } = req.params;
        const pm = db.prepare('SELECT user_type FROM users WHERE id = ?').get(id);
        if (!pm) return res.status(404).json({ error: 'User not found' });
        if (pm.user_type !== 'pm') return res.status(400).json({ error: 'User is not a Project Manager' });
        
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        res.json({ message: 'Project Manager deleted successfully' });
    } catch (err) {
        console.error('Delete PM error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const updatePM = (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, email, status, role_title } = req.body;

        const pm = db.prepare('SELECT id, user_type FROM users WHERE id = ?').get(id);
        if (!pm) return res.status(404).json({ error: 'User not found' });
        if (pm.user_type !== 'pm') return res.status(400).json({ error: 'User is not a Project Manager' });

        if (email) {
            const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ?').get(email, id);
            if (existing) {
                return res.status(409).json({ error: 'A user with this email already exists' });
            }
        }

        const updates = [];
        const params = [];

        if (full_name !== undefined) {
            updates.push('full_name = ?');
            params.push(String(full_name).trim());
        }
        if (email !== undefined) {
            updates.push('email = ?');
            params.push(String(email).trim());
        }
        if (status !== undefined) {
            const normStatus = String(status).trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
            updates.push('status = ?');
            params.push(normStatus);
        }
        if (role_title !== undefined) {
            updates.push('role_title = ?');
            params.push(String(role_title).trim());
        }

        if (updates.length > 0) {
            params.push(id);
            db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }

        const updatedPM = db.prepare(`
            SELECT id, email, full_name, role_title, user_type, status, created_at 
            FROM users WHERE id = ?
        `).get(id);

        res.json({ message: 'Project Manager updated successfully', pm: updatedPM });
    } catch (err) {
        console.error('Update PM error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const getPMProjects = (req, res) => {
    try {
        const { id } = req.params;
        const pm = db.prepare('SELECT id, full_name, user_type FROM users WHERE id = ?').get(id);
        if (!pm) return res.status(404).json({ error: 'Project Manager not found' });

        const projects = db.prepare(`
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM project_members pm_members WHERE pm_members.project_id = p.id) as member_count,
                (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
                (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'in_progress') as active_task_count
            FROM projects p
            WHERE p.manager_id = ?
            ORDER BY p.created_at DESC
        `).all(id);

        const projectIds = projects.map(p => p.id);
        let allTasks = [];
        if (projectIds.length > 0) {
            const placeholders = projectIds.map(() => '?').join(',');
            allTasks = db.prepare(`SELECT * FROM tasks WHERE project_id IN (${placeholders})`).all(...projectIds);
        }

        const tasksByProject = new Map();
        allTasks.forEach(t => {
            if (!tasksByProject.has(t.project_id)) {
                tasksByProject.set(t.project_id, []);
            }
            tasksByProject.get(t.project_id).push(t);
        });

        const enrichedProjects = projects.map(p => ({
            ...p,
            tasks: tasksByProject.get(p.id) || []
        }));

        res.json({ projects: enrichedProjects });
    } catch (err) {
        console.error('Get PM projects error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const getPMWorkforce = (req, res) => {
    try {
        const { id } = req.params;
        const pm = db.prepare('SELECT id, full_name, user_type FROM users WHERE id = ?').get(id);
        if (!pm) return res.status(404).json({ error: 'Project Manager not found' });

        const employees = db.prepare(`
            SELECT 
                u.id, u.email, u.full_name, u.role_title, u.employment_type, u.user_type, u.status, u.avatar_url, u.created_at,
                (SELECT COUNT(*) FROM project_members pm_members JOIN projects p ON pm_members.project_id = p.id WHERE pm_members.user_id = u.id AND p.manager_id = ?) as project_count,
                (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON ta.task_id = t.id WHERE ta.user_id = u.id AND t.manager_id = ? AND LOWER(TRIM(t.status)) NOT IN ('completed', 'done', 'archived', 'closed', 'remove')) as active_task_count
            FROM users u
            WHERE u.user_type = 'employee' AND u.manager_id = ?
            ORDER BY u.full_name ASC
        `).all(id, id, id);

        res.json({ employees });
    } catch (err) {
        console.error('Get PM workforce error:', err);
        res.status(500).json({ error: err.message });
    }
};
