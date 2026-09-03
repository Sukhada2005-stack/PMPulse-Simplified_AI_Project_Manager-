import bcrypt from 'bcryptjs';
import db from '../db/database.js';
import { signToken } from '../middleware/auth.js';

export const login = (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email credentials' });
        }

        const isMatch = bcrypt.compareSync(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = signToken(user);
        const { password_hash, ...safeUser } = user;

        res.json({
            message: 'Authentication successful',
            token,
            user: safeUser
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server authentication error' });
    }
};

export const getMe = (req, res) => {
    res.json({ user: req.user });
};

// Fast user switcher list for presentation & demonstration
export const listAllUsers = (req, res) => {
    try {
        const users = db.prepare(`
            SELECT id, email, full_name, role_title, user_type, status, avatar_url, created_at 
            FROM users 
            ORDER BY user_type DESC, full_name ASC
        `).all();
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
