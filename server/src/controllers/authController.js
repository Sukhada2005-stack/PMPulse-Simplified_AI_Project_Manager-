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

        if (user.is_first_login === 1) {
            return res.json({
                message: 'Password verified. Please set a permanent password.',
                requires_password_change: true,
                user: { email: user.email }
            });
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

export const setPermanentPassword = (req, res) => {
    try {
        const { email, initial_password, new_password } = req.body;
        if (!email || !initial_password || !new_password) {
            return res.status(400).json({ error: 'Email, initial password, and new password are required' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.is_first_login !== 1) {
            return res.status(400).json({ error: 'Permanent password already set' });
        }

        const isMatch = bcrypt.compareSync(initial_password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid initial password' });
        }

        const password_hash = bcrypt.hashSync(new_password, 10);
        
        db.prepare('UPDATE users SET password_hash = ?, is_first_login = 0 WHERE id = ?').run(password_hash, user.id);

        const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
        const token = signToken(updatedUser);
        const { password_hash: _ph, ...safeUser } = updatedUser;

        res.json({
            message: 'Permanent password set successfully',
            token,
            user: safeUser
        });
    } catch (err) {
        console.error('Set permanent password error:', err);
        res.status(500).json({ error: 'Internal server error setting password' });
    }
};

export const getMe = (req, res) => {
    res.json({ user: req.user });
};

export const checkRole = (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = db.prepare('SELECT user_type, is_first_login FROM users WHERE email = ? COLLATE NOCASE').get(email);
        if (!user) {
            return res.status(404).json({ error: 'Email not found in enterprise directory' });
        }

        res.json({
            message: 'User found',
            role: user.user_type,
            is_first_login: user.is_first_login === 1
        });
    } catch (err) {
        console.error('Check role error:', err);
        res.status(500).json({ error: 'Internal server error checking role' });
    }
};

export const changePassword = (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'New password is required' });
        }

        const password_hash = bcrypt.hashSync(password, 10);
        
        const stmt = db.prepare('UPDATE users SET password_hash = ?, is_first_login = 0 WHERE id = ?');
        stmt.run(password_hash, req.user.id);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Internal server error changing password' });
    }
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
