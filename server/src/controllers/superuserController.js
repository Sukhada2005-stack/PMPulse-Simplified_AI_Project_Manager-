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
